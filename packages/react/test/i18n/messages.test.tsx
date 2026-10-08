import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BUILT_IN_TEMPLATES,
  DEFAULT_BRAND,
  blockIssueDetails,
  blockIssues,
  blockSummary,
  builtInBlocks,
  createDocument,
  periodErrorCodes,
  periodErrors,
  renderEmail,
  styleSummary,
  validateBrandKit,
  type BlockBase,
  type BrandKit,
  type BuiltInBlock,
  type IssuePeriod,
  type RenderLabels,
} from '@subterra-technologies/blockletter';
import {
  BlockletterRoot,
  NewIssueDialog,
  NewsletterEditor,
  builtInEditorBlocks,
  enMessages,
  type EditorMessageOverrides,
} from '../../src';
import { blockName, blockTitle, definitionText } from '../../src/i18n/blocks';
import { englishMessages } from '../../src/i18n/context';
import {
  blockIssueText,
  brandKitIssueText,
  periodErrorText,
  styleSummaryText,
  warningText,
} from '../../src/i18n/core-words';
import { createFormat } from '../../src/i18n/format';
import { mergeMessages } from '../../src/i18n/resolve';
import { TEST_BRAND, TEST_SOURCES, everyBlock, testBlock } from '../helpers/fixtures';

/**
 * How the editor's words are given and found: the English by default, a host's laid over it, a
 * root inside another inheriting both, and `locale` writing numbers and dates. The sentences core
 * writes for a person come back word for word in English from their codes.
 */

const PERIOD: IssuePeriod = { start: '2026-09-01', end: '2026-09-30', lookaheadEnd: '2026-11-10' };

/** The README's example: a few groups in Spanish, the rest left English. */
const es: EditorMessageOverrides = {
  topBar: { view: 'Vista', canvas: 'Lienzo', preview: 'Vista previa', more: 'Más' },
  palette: {
    heading: 'Bloques',
    // The last argument writes numbers and dates the way `locale` does.
    blocksUsed: (count, max, { number }) => `${number(count)} de ${number(max)} bloques`,
    groups: { content: 'Contenido', layout: 'Diseño', graphics: 'Gráficos' },
  },
  history: {
    undo: 'Deshacer',
    redo: 'Rehacer',
    undid: (action) => `Deshecho: ${action}.`,
    deleted: (block) => `se eliminó el bloque ${block}`,
  },
  toasts: { deleted: (block) => `${block} eliminado.`, undo: 'Deshacer' },
  blocks: {
    text: { label: 'Texto', description: 'Un título y unos párrafos.' },
    quote: { label: 'Cita', description: 'Una cita destacada, con su autor.' },
  },
};

/** And the email's own words, from the same example. */
const labels: Partial<RenderLabels> = {
  readMore: 'Leer más',
  managePreferences: 'Preferencias',
  unsubscribe: 'Darse de baja',
  months: 'ene. feb. mar. abr. may. jun. jul. ago. sept. oct. nov. dic.'.split(' '),
};

function renderEditor(props: Partial<Parameters<typeof NewsletterEditor<BlockBase>>[0]> = {}) {
  const blocks = [testBlock('text', { body: 'Hello.' }), testBlock('quote'), testBlock('footer')];
  function Host() {
    const [value, setValue] = useState(createDocument<BlockBase>({ period: PERIOD, blocks }));
    return (
      <NewsletterEditor<BlockBase>
        value={value}
        onChange={setValue}
        brand={TEST_BRAND}
        sources={[TEST_SOURCES.events]}
        {...props}
      />
    );
  }
  return { ...render(<Host />), user: userEvent.setup() };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('messages', () => {
  it('lays a host’s words over the English, group by group', () => {
    renderEditor({ messages: es, locale: 'es' });
    const palette = within(screen.getByRole('region', { name: 'Block palette' }));
    expect(palette.getByRole('heading', { name: 'Bloques' })).toBeInTheDocument();
    expect(palette.getByText('3 de 30 bloques')).toBeInTheDocument();
    expect(palette.getByRole('heading', { name: 'Contenido' })).toBeInTheDocument();
    expect(palette.getByRole('button', { name: 'Texto' })).toHaveAccessibleDescription(
      'Un título y unos párrafos.',
    );
    // What the host left out stays English.
    expect(palette.getByRole('button', { name: 'Letter' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Vista' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument();
  });

  it('speaks the locale it was given, and says so for assistive technology', () => {
    const { container } = renderEditor({ messages: es, locale: 'es' });
    expect(container.querySelector('.bl-root')).toHaveAttribute('lang', 'es');
  });

  it('draws the email in its own words, which may be another language than the editor’s', () => {
    const posts = testBlock('post_list', {
      items: [{ title: 'Una lista', excerpt: 'Doce libros.', url: '/lista' }],
    });
    const events = testBlock('event_tiles', {
      items: [{ title: 'Lectura', date: '2026-11-05' }],
    });
    render(
      <NewsletterEditor
        value={createDocument({ blocks: [posts, events, testBlock('footer')] })}
        onChange={() => undefined}
        brand={TEST_BRAND}
        renderOptions={{ lang: 'es', labels, unsubscribeUrl: 'https://example.test/u' }}
      />,
    );
    const canvas = within(screen.getByRole('tablist', { name: 'Canvas' }));
    expect(canvas.getByText('Leer más')).toBeInTheDocument();
    expect(canvas.getByText('nov. 5')).toBeInTheDocument();
    expect(canvas.getByText('Darse de baja')).toBeInTheDocument();
    // The editor itself stays English.
    expect(screen.getByRole('heading', { name: 'Blocks' })).toBeInTheDocument();
  });

  it('leaves the host page’s language alone without a locale, and ignores one it cannot read', () => {
    const { container, unmount } = renderEditor();
    expect(container.querySelector('.bl-root')).not.toHaveAttribute('lang');
    unmount();
    const typo = renderEditor({ locale: 'not a locale!' });
    expect(typo.container.querySelector('.bl-root')).not.toHaveAttribute('lang');
    expect(screen.getByText('3 of 30 blocks')).toBeInTheDocument();
  });

  it('names a built-in block in the editor’s language unless the host renamed it', () => {
    const renamed = builtInEditorBlocks.map((definition) =>
      definition.type === 'quote' ? { ...definition, label: 'Pull quote' } : definition,
    );
    renderEditor({ messages: es, definitions: renamed });
    const palette = within(screen.getByRole('region', { name: 'Block palette' }));
    expect(palette.getByRole('button', { name: 'Texto' })).toBeInTheDocument();
    expect(palette.getByRole('button', { name: 'Pull quote' })).toBeInTheDocument();
    // The description the host kept is still the messages'.
    expect(palette.getByRole('button', { name: 'Pull quote' })).toHaveAccessibleDescription(
      'Una cita destacada, con su autor.',
    );
  });

  it('words an undo in the language the editor speaks when it is undone', async () => {
    function Host() {
      const [value, setValue] = useState(
        createDocument<BlockBase>({ blocks: [testBlock('quote'), testBlock('footer')] }),
      );
      const [spanish, setSpanish] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setSpanish(true)}>
            Español
          </button>
          <NewsletterEditor<BlockBase>
            value={value}
            onChange={setValue}
            brand={TEST_BRAND}
            {...(spanish ? { messages: es, locale: 'es' } : {})}
          />
        </>
      );
    }
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole('tab', { name: 'Quote' }));
    await user.click(screen.getByRole('button', { name: 'Delete Quote' }));
    expect(await screen.findByText('Quote deleted.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Español' }));
    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByText('Deshecho: se eliminó el bloque Cita.')).toBeInTheDocument();
  });

  it('reaches the parts inside a host’s own root, and a root inside it inherits them', async () => {
    const user = userEvent.setup();
    render(
      <BlockletterRoot messages={es} locale="es">
        <NewIssueDialog
          open
          onOpenChange={() => undefined}
          templates={BUILT_IN_TEMPLATES}
          onCreate={() => undefined}
        />
        <BlockletterRoot messages={{ palette: { heading: 'Piezas' } }}>
          <NewsletterEditor
            value={createDocument({ blocks: [testBlock('footer')] })}
            onChange={() => undefined}
            brand={DEFAULT_BRAND}
          />
        </BlockletterRoot>
      </BlockletterRoot>,
    );
    // The dialog is modal, so the editor behind it is out of the accessibility tree.
    expect(screen.getByText('Piezas')).toBeInTheDocument();
    expect(screen.getByText('1 de 30 bloques')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'New issue' });
    expect(within(dialog).getByRole('combobox', { name: 'Period' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  });

  it('takes only words the English has, and only of the same kind', () => {
    const merged = mergeMessages(enMessages, {
      common: { cancel: 'Annuler' },
      // A host in plain JavaScript can pass anything.
      palette: { blocksUsed: 'twelve' as never, unknown: 'x' } as never,
    } as EditorMessageOverrides);
    expect(merged.common.cancel).toBe('Annuler');
    expect(merged.common.save).toBe('Save');
    expect(merged.palette.blocksUsed).toBe(enMessages.palette.blocksUsed);
    expect('unknown' in merged.palette).toBe(false);
    expect(mergeMessages(enMessages, undefined)).toBe(enMessages);
    // The English is every editor's, so nothing can change it in place.
    expect(Object.isFrozen(enMessages.blocks.text)).toBe(true);
  });
});

describe('format', () => {
  it('writes what the editor always has without a locale', () => {
    const format = createFormat(undefined);
    expect(format.locale).toBeUndefined();
    expect(format.number(5000)).toBe('5,000');
    expect(format.number(4.5, 1)).toBe('4.5');
    expect(format.date('2026-09-05')).toBe('Sept. 5');
    expect(format.date('Every Saturday')).toBe('Every Saturday');
  });

  it('writes numbers and dates as the locale does', () => {
    const german = createFormat('de');
    expect(german.locale).toBe('de');
    expect(german.number(1234.5, 1)).toBe('1.234,5');
    expect(german.date('2026-11-05')).toBe('5. Nov.');
    // A bare date is the organisation's calendar date, never moved by a time zone.
    expect(createFormat('en-US').date('2026-01-01')).toBe('Jan 1');
    expect(createFormat('ar-EG').number(12)).toBe('١٢');
  });

  it('writes the source picker’s dates in the editor’s locale', async () => {
    const user = userEvent.setup();
    const events = testBlock('event_tiles', { source: 'events', items: [] });
    render(
      <NewsletterEditor
        value={createDocument({ period: PERIOD, blocks: [events, testBlock('footer')] })}
        onChange={() => undefined}
        brand={TEST_BRAND}
        sources={[TEST_SOURCES.events]}
        locale="de"
      />,
    );
    await user.click(screen.getByRole('tab', { name: 'Event tiles Auto-filled' }));
    await waitFor(() => expect(screen.getByText('5. Nov. · 7:00 PM')).toBeInTheDocument());
  });
});

describe('core’s words, from their codes', () => {
  const PHOTO = { url: 'https://images.example/photo.jpg' };
  const long = 'x'.repeat(5001);

  it('names and describes every built-in block as core does, and titles it on the canvas', () => {
    for (const definition of builtInBlocks) {
      expect(definitionText(definition, englishMessages)).toEqual({
        label: definition.label,
        description: definition.description,
      });
    }
    const long = testBlock('quote', { quote: 'A sentence that goes on '.repeat(5) });
    const blocks: BlockBase[] = [
      ...everyBlock(),
      long,
      testBlock('columns', { columns: [{ body: 'One' }] }),
      testBlock('photo_grid', { photos: [{ alt: 'One' }] }),
      { id: 'x', type: 'carousel', hidden: false },
    ];
    for (const block of blocks) {
      expect(blockTitle(block, builtInBlocks, englishMessages), block.type).toBe(
        blockSummary(block),
      );
    }
  });

  it('gives back a built-in block’s warnings word for word in English', () => {
    const troubled: BuiltInBlock[] = [
      testBlock('image', { image: PHOTO, alt: '' }),
      testBlock('article', { body: long, image: PHOTO, title: '' }),
      testBlock('letter', { body: long, photo: PHOTO, signature: '' }),
      testBlock('quote', { quote: long }),
      testBlock('columns', { columns: [{ body: long, image: PHOTO }] }),
      testBlock('photo_grid', { photos: [{ alt: '', image: PHOTO }] }),
      testBlock('sponsors', { items: [{ name: ' ', message: 'Thanks', logo: PHOTO }] }),
      testBlock('event_tiles', {
        items: Array.from({ length: 5 }, () => ({ title: 'E', date: '2026-10-01' })),
      }),
      testBlock('post_list', {
        items: Array.from({ length: 4 }, () => ({ title: 'P', excerpt: '', url: '/p' })),
      }),
      testBlock('stats', { items: [{ value: '1', label: 'One' }] }),
      testBlock('button', { label: ' ', url: '' }),
      testBlock('callout', { ctaLabel: 'Go', ctaUrl: '' }),
    ];
    let checked = 0;
    for (const block of troubled) {
      const english = blockIssues(block);
      expect(
        blockIssueDetails(block).map((issue) => blockIssueText(issue, englishMessages)),
      ).toEqual(english);
      checked += english.length;
    }
    expect(checked).toBeGreaterThanOrEqual(14);
  });

  it('gives back the renderer’s warnings word for word in English', () => {
    const { warnings, warningDetails } = renderEmail(
      createDocument<BlockBase>({
        blocks: [
          testBlock('image', { image: { url: 'blob:https://example.test/1' }, alt: '' }),
          testBlock('button', { label: 'Go', url: '/go' }),
          { id: 'x', type: 'carousel', hidden: false },
          ...Array.from({ length: 30 }, (_, index) => ({
            ...testBlock('text', { body: 'Words that go on. '.repeat(240) }),
            id: `text-${index}`,
          })),
        ],
      }),
    );
    const name = (type: string) => blockName(type, builtInBlocks, englishMessages);
    expect(warningDetails.map((warning) => warningText(warning, englishMessages, name))).toEqual(
      warnings,
    );
    expect(warningDetails.map((warning) => warning.code)).toEqual([
      'no_unsubscribe_url',
      'local_image',
      'missing_alt',
      'relative_link',
      'unknown_block',
      'gmail_clip',
    ]);
  });

  it('gives back the brand kit’s problems word for word in English', () => {
    const kits: unknown[] = [
      {
        name: ' ',
        logo: { url: 'ftp://files.example/logo.png' },
        colors: { ink: '#12345', accent: '#0f766e', highlight: 'gold', page: '#f5f5f4' },
        fonts: { heading: 'Comic Sans MS', body: 'Arial' },
        contact: { address: 'a'.repeat(201), phone: '1'.repeat(41), email: 'nope', website: '' },
        social: [
          { network: 'myspace', url: '' },
          { network: 'x', url: `https://${long}` },
        ],
      },
      { ...TEST_BRAND, name: 'n'.repeat(121), logo: 'logo.png' },
      { ...TEST_BRAND, logo: { url: ' ' }, contact: { ...TEST_BRAND.contact, website: long } },
      { ...TEST_BRAND, logo: { url: 'https://example.test/a.png', assetId: 3 } },
      { ...TEST_BRAND, logo: { assetId: 'a1' }, contact: { ...TEST_BRAND.contact, email: long } },
      'blue',
      { name: 'X' },
    ];
    let checked = 0;
    for (const kit of kits) {
      for (const issue of validateBrandKit(kit as BrandKit)) {
        expect(brandKitIssueText(issue, englishMessages), issue.path).toBe(issue.message);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  it('gives back a block’s appearance line word for word in English', () => {
    for (const style of [
      undefined,
      {},
      { align: 'left', paddingY: 'normal', fontSize: 'normal' } as const,
      {
        background: '#fff7ed',
        textColor: '#1f2937',
        align: 'right',
        paddingY: 'none',
        fontSize: 'small',
        fullWidth: true,
        divider: true,
      } as const,
      { align: 'center', paddingY: 'loose', fontSize: 'large' } as const,
    ]) {
      expect(styleSummaryText(style, englishMessages)).toBe(styleSummary(style));
    }
  });

  it('gives back a period’s problems word for word in English', () => {
    const today = '2026-09-28';
    for (const period of [
      { start: '', end: '', lookaheadEnd: '' },
      { start: '2026-09-01', end: '2026-10-01' },
      { start: '2026-09-20', end: '2026-09-10', lookaheadEnd: '2026-09-01' },
    ]) {
      expect(periodErrorText(periodErrorCodes(period, { today }), englishMessages)).toEqual(
        periodErrors(period, { today }),
      );
    }
  });
});
