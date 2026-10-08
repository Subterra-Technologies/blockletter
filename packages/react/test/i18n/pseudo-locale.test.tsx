import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDocument,
  type BlockBase,
  type BrandKit,
  type BuiltInBlock,
  type NewsletterDocument,
} from '@subterra-technologies/blockletter';
import {
  BlockletterRoot,
  DuplicateIssueDialog,
  NewIssueDialog,
  NewsletterEditor,
  builtInEditorBlocks,
  type EditorBlockDefinition,
  type NewsletterEditorProps,
} from '../../src';
import { SHOUT_DEFINITION, shout } from '../helpers/canvas-registry';
import { testBlock } from '../helpers/fixtures';
import {
  PSEUDO_BRAND,
  PSEUDO_LABELS,
  PSEUDO_SOURCES,
  PSEUDO_TEMPLATES,
  content,
  markContent,
  pseudoBlocks,
  pseudoLocale,
  untranslated,
} from '../helpers/pseudo-locale';

/**
 * The editor in a pseudo-locale, through the states that show text: every word on screen, and
 * every name, tooltip, placeholder and description it gives, must have come from its messages
 * (or be the issue's or the host's own). A string written into a part rather than taken from
 * `EditorMessages` shows up here as untranslated.
 */

const PSEUDO = pseudoLocale();

const RENDER_OPTIONS = { labels: PSEUDO_LABELS };

/** A pseudo-locale message as the editor shows it: `⟦words⟧`. */
const said = (words: string): string => `⟦${words}⟧`;

/** Everything on screen is the messages', the issue's or the host's, and something was seen. */
function expectTranslated(root: ParentNode = document.body): void {
  const { found, marked } = untranslated(root);
  expect(found).toEqual([]);
  expect(marked).toBeGreaterThan(0);
}

const PERIOD = { start: '2026-09-01', end: '2026-09-30', lookaheadEnd: '2026-11-10' };

/**
 * An issue of `blocks`, ending in a footer of its own: one the editor had to add would start with
 * its definition's English compliance line, which is the issue's content rather than the editor's.
 */
const pseudoIssue = (blocks: BlockBase[] = pseudoBlocks()): NewsletterDocument<BlockBase> =>
  createDocument<BlockBase>({
    subject: content('November at the book club'),
    preheader: content('Readings, a sale, and new members'),
    period: PERIOD,
    blocks: blocks.some((block) => block.type === 'footer')
      ? blocks
      : [...blocks, markContent(testBlock('footer'))],
  });

type HostProps = Partial<Omit<NewsletterEditorProps<BlockBase>, 'value' | 'onChange'>>;

function renderPseudo(initial = pseudoIssue(), props: HostProps = {}) {
  function Host() {
    const [value, setValue] = useState(initial);
    return (
      <NewsletterEditor<BlockBase>
        value={value}
        onChange={setValue}
        brand={PSEUDO_BRAND}
        onBrandChange={() => undefined}
        sources={[PSEUDO_SOURCES.events, PSEUDO_SOURCES.members]}
        uploadImage={async () => ({ url: 'https://images.example/upload.png' })}
        renderOptions={RENDER_OPTIONS}
        onSaveAsTemplate={() => undefined}
        messages={PSEUDO}
        toolbar={<button type="button">Host’s own Save</button>}
        {...props}
      />
    );
  }
  const user = userEvent.setup();
  return { ...render(<Host />), user };
}

const canvasTabs = () =>
  within(screen.getByRole('tablist', { name: said('Canvas') })).getAllByRole('tab');
const inspector = () => screen.getByRole('region', { name: said('Inspector') });
const inspectorTab = (name: string) => within(inspector()).getByRole('tab', { name: said(name) });

/** Waits for every data source picker on screen to finish loading. */
const sourcesLoaded = () =>
  waitFor(() => expect(screen.queryByText(/^⟦Loading/)).not.toBeInTheDocument());

/** Every element in the editor measures `width` pixels, as its body does in a browser. */
function measureAt(width: number): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: 800,
    width,
    height: 800,
    toJSON: () => ({}),
  } as DOMRect);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Each scenario walks many states of the whole editor and scans every node after each step: about
// two seconds on a fast machine, and more than twice that on a shared CI runner. The default
// five-second limit would fail them for being thorough, not for being wrong.
describe('the editor in a pseudo-locale', { timeout: 30_000 }, () => {
  it('finds a string left in English, which is what makes the rest of these mean something', () => {
    render(
      <BlockletterRoot messages={PSEUDO}>
        <p>{said('Translated')}</p>
        <p>Left in English</p>
        <button type="button" aria-label="Also English" title={said('Fine')} />
        <p>{content('The issue’s own words')}</p>
      </BlockletterRoot>,
    );
    expect(untranslated().found).toEqual([
      'text in <p>: "Left in English"',
      'aria-label of <button>: "Also English"',
    ]);
  });

  it('names every block, and says every word of its form, in the Block tab', async () => {
    const unnamed = markContent(
      testBlock('image', {
        id: 'image-2',
        image: { url: 'https://images.example/a.png' },
        alt: '',
      }),
    );
    const { user } = renderPseudo(pseudoIssue([...pseudoBlocks(), unnamed]));
    expect(screen.getByText(said('Auto-filled'))).toBeInTheDocument();
    expectTranslated();
    for (const tab of canvasTabs()) {
      await user.click(tab);
      expectTranslated();
      await sourcesLoaded();
      expectTranslated();
    }
    // The image with no alt text has a warning, a built-in block's issue.
    await user.click(document.querySelector('[id$="-tab-image-2"]') as HTMLElement);
    expect(
      within(inspector()).getByText(said('Add alt text so screen readers can describe the image.')),
    ).toBeInTheDocument();
    // The event tiles' picker lists its source's events, each date written by the messages.
    await user.click(canvasTabs()[3] as HTMLElement);
    await sourcesLoaded();
    expect(screen.getByText(said(`Pick from ${content('Club events')} (2/4)`))).toBeInTheDocument();
    expect(screen.getByText(said(`Dec. 10 · ${content('6:00 PM')}`))).toBeInTheDocument();
  });

  it('translates the Appearance, Settings and Brand kit tabs, with their warnings', async () => {
    const styled = markContent(
      testBlock('text', {
        body: 'Styled.',
        style: {
          background: '#fff7ed',
          textColor: '#1f2937',
          align: 'center',
          paddingY: 'tight',
          fontSize: 'large',
          fullWidth: true,
          divider: true,
        },
      }),
    );
    const { user } = renderPseudo(pseudoIssue([styled, ...pseudoBlocks()]));
    await user.click(canvasTabs()[0] as HTMLElement);

    await user.click(inspectorTab('Appearance'));
    expect(screen.getByText(/^⟦background #fff7ed⟧ · ⟦text #1f2937⟧ · ⟦center⟧/)).toBeVisible();
    expectTranslated();
    await user.click(within(inspector()).getByRole('combobox', { name: said('Alignment') }));
    expect(await screen.findByRole('option', { name: said('Centre') })).toBeInTheDocument();
    expectTranslated();
    await user.keyboard('{Escape}');

    await user.click(inspectorTab('Settings'));
    expectTranslated();
    // A date past today is refused, and says why.
    fireEvent.change(screen.getByLabelText(said('Up to')), { target: { value: '2026-12-01' } });
    expect(screen.getByText(/^⟦An issue can only cover up to today/)).toBeInTheDocument();
    expectTranslated();
    fireEvent.change(screen.getByLabelText(said('Up to')), { target: { value: '2026-09-29' } });
    await user.click(screen.getByRole('button', { name: said('Update period') }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expectTranslated();
    await user.click(screen.getByRole('button', { name: said('Cancel') }));

    await user.click(inspectorTab('Brand kit'));
    expectTranslated();
    await user.clear(screen.getByLabelText(said('Organisation name')));
    await user.type(screen.getByLabelText(said('Email')), 'not an address');
    await user.click(screen.getByRole('button', { name: said('Add social link') }));
    const ink = screen.getByLabelText(said(`${said('Ink')} hex value`));
    await user.clear(ink);
    await user.type(ink, '#f5f5f4');
    await user.tab();
    await user.click(screen.getByRole('button', { name: said('Save brand kit') }));
    for (const error of [
      'Enter the organisation name.',
      'Enter a valid email address.',
      'Add the link.',
    ]) {
      expect(screen.getByText(said(error))).toBeInTheDocument();
    }
    expect(screen.getByText(/^⟦Ink on page is 1\.0:1/)).toBeInTheDocument();
    expectTranslated();
    const accent = screen.getByLabelText(said(`${said('Accent')} hex value`));
    await user.clear(accent);
    await user.type(accent, 'teal');
    await user.tab();
    expect(screen.getByText(/^⟦“teal” is not a six-digit hex colour/)).toBeInTheDocument();
    expectTranslated();
  });

  it('translates the palette, the canvas toolbar and their tooltips, and inserting', async () => {
    const { user } = renderPseudo();
    const text = canvasTabs().find((tab) => tab.textContent === said('Text'));
    await user.click(text as HTMLElement);
    const toolbar = screen.getByRole('toolbar', { name: said(`${said('Text')} block`) });
    for (const button of within(toolbar).getAllByRole('button')) {
      act(() => button.focus());
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
      expectTranslated();
    }
    for (const name of ['Undo', 'Redo']) {
      act(() => screen.getByRole('button', { name: said(name) }).focus());
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
      expectTranslated();
    }
    await user.click(
      within(toolbar).getByRole('button', {
        name: said(`Insert a block above ${said('Text')}`),
      }),
    );
    expect(screen.getByRole('button', { name: said('Cancel insert') })).toBeInTheDocument();
    expectTranslated();
  });

  it('translates the More menu, the template dialog, and the toasts undo and redo leave', async () => {
    const { user } = renderPseudo();
    await user.click(screen.getByRole('button', { name: said('More') }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expectTranslated();
    await user.click(screen.getByRole('menuitem', { name: said('Save as template…') }));
    const dialog = await screen.findByRole('dialog');
    expectTranslated();
    await user.clear(within(dialog).getByLabelText(said('Template name')));
    await user.click(within(dialog).getByRole('button', { name: said('Save template') }));
    expect(within(dialog).getByText(said('Give the template a name.'))).toBeInTheDocument();
    expectTranslated();
    await user.click(within(dialog).getByRole('button', { name: said('Cancel') }));

    const quote = canvasTabs().find((tab) => tab.textContent === said('Quote'));
    await user.click(quote as HTMLElement);
    await user.click(screen.getByRole('button', { name: said(`Delete ${said('Quote')}`) }));
    const toast = (await screen.findByText(said(`${said('Quote')} deleted.`))).closest(
      '[role="status"]',
    ) as HTMLElement;
    expectTranslated();
    await user.click(within(toast).getByRole('button', { name: said('Undo') }));
    expect(
      await screen.findByText(said(`Undid: ${said(`deleted the ${said('Quote')} block`)}.`)),
    ).toBeInTheDocument();
    expectTranslated();
    await user.click(screen.getAllByRole('button', { name: said('Redo') })[0] as HTMLElement);
    expect(
      await screen.findByText(said(`Redid: ${said(`deleted the ${said('Quote')} block`)}.`)),
    ).toBeInTheDocument();
    expectTranslated();
  });

  it('translates the one-pane layout’s tabs, its menu and its way back', async () => {
    measureAt(360);
    const { user } = renderPseudo(undefined, { fill: true });
    const panes = screen.getByRole('tablist', { name: said('Editor panes') });
    expectTranslated();
    await user.click(screen.getByRole('button', { name: said('More') }));
    expect(await screen.findByRole('menuitem', { name: said('Undo') })).toBeInTheDocument();
    expectTranslated();
    await user.keyboard('{Escape}');
    for (const pane of ['Blocks', 'Edit', 'Preview', 'Canvas']) {
      await user.click(within(panes).getByRole('tab', { name: said(pane) }));
      expectTranslated();
    }
    await user.click(canvasTabs()[2] as HTMLElement);
    await user.click(screen.getByRole('button', { name: said(`Edit ${said('Text')}`) }));
    expect(screen.getByRole('button', { name: said('Back to canvas') })).toBeVisible();
    expectTranslated();
  });

  it('translates the formatting toolbar, its tooltips and its link form', async () => {
    const formatted = testBlock('text', {
      body: `<h2>${content('Kept apart')}</h2><p>${content('Words.')}</p>`,
      format: 'html',
    });
    const { user } = renderPseudo(pseudoIssue([formatted]));
    await user.click(canvasTabs()[0] as HTMLElement);
    // Formatting the field cannot keep is pointed out.
    expect(screen.getByText(/^⟦This text has formatting/)).toBeInTheDocument();
    const tools = screen.getByRole('toolbar', { name: said(`${said('Text')} formatting`) });
    for (const button of within(tools).getAllByRole('button')) {
      act(() => button.focus());
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
      expectTranslated();
    }
    await user.click(within(tools).getByRole('button', { name: said('Link') }));
    const form = screen.getByRole('group', { name: said('Add a link') });
    expectTranslated();
    await user.click(within(form).getByRole('button', { name: said('Add link') }));
    expect(within(form).getByText(said('Enter the address to link to.'))).toBeInTheDocument();
    expectTranslated();
    await user.type(within(form).getByLabelText(said('Link address')), 'not a link{Enter}');
    expect(within(form).getByText(/^⟦Use a web address/)).toBeInTheDocument();
    expectTranslated();
  });

  it('translates an image field’s states and errors', async () => {
    const image = markContent(testBlock('image', { alt: '' }));
    const { user } = renderPseudo(pseudoIssue([image]));
    await user.click(canvasTabs()[0] as HTMLElement);
    expectTranslated();
    const address = screen.getByLabelText(said('Image URL'));
    await user.type(address, 'http://images.example/a.png');
    await user.tab();
    expect(screen.getByText(/^⟦Enter an image address that starts with/)).toBeInTheDocument();
    expectTranslated();
    await user.upload(
      screen.getByLabelText(said('Choose image')),
      new File(['png'], 'a.png', { type: 'image/png' }),
    );
    expect(await screen.findByText(said('Image uploaded.'))).toBeInTheDocument();
    // With an image and no alt text, the block's own warning shows.
    expect(screen.getByText(/^⟦Add alt text/)).toBeInTheDocument();
    expectTranslated();
    // `userEvent.upload` honours `accept`, so the wrong type is handed over as a change.
    fireEvent.change(screen.getByLabelText(said('Replace image')), {
      target: { files: [new File(['gif'], 'a.gif', { type: 'image/gif' })] },
    });
    expect(screen.getByText(said('Use a JPEG, PNG, or WebP image.'))).toBeInTheDocument();
    expectTranslated();
  });

  it('translates the preview, its widths and the renderer’s warnings', async () => {
    const unnamed = markContent(
      testBlock('image', { image: { url: 'https://images.example/a.png' }, alt: '' }),
    );
    const local = testBlock('image', { image: { url: 'blob:https://example.test/1' }, alt: 'x' });
    const relative = markContent(testBlock('button', { label: 'Go', url: '/go' }));
    const unknown = { id: 'carousel-1', type: 'carousel', hidden: false };
    const { user } = renderPseudo(pseudoIssue([unnamed, markContent(local), relative, unknown]));
    await user.click(screen.getByRole('button', { name: said('Preview') }));
    const warnings = screen.getByText(said('5 things to check'));
    expectTranslated();
    await user.click(warnings);
    expect(screen.getByText(/^⟦There is no unsubscribe link/)).toBeInTheDocument();
    expectTranslated();
    await user.click(
      screen.getByRole('button', { name: said(`${said('Phone')} · ${said('375px')}`) }),
    );
    expectTranslated();
  });

  it('translates what the canvas says about empty, hidden, unknown and broken blocks', () => {
    const empty = pseudoBlocks().map((block) => emptied(block));
    const notes: BlockBase[] = [
      ...empty,
      markContent(
        testBlock('callout', {
          id: 'callout-2',
          heading: 'Join',
          body: '',
          ctaLabel: 'Go',
          ctaUrl: '',
        }),
      ),
      markContent(testBlock('stats', { id: 'stats-2', items: [{ value: '1', label: '' }] })),
      { ...markContent(testBlock('quote', { quote: 'Hidden away' })), id: 'quote-2', hidden: true },
      shout(''),
      { id: 'broken-1', type: 'broken', hidden: false },
      // A type nothing defines is named by the type the issue gives it.
      { id: 'carousel-1', type: content('carousel'), hidden: false },
    ];
    // A host's own blocks bring their own words.
    const host: EditorBlockDefinition = {
      ...SHOUT_DEFINITION,
      label: content(SHOUT_DEFINITION.label),
      description: content(SHOUT_DEFINITION.description),
      group: content(SHOUT_DEFINITION.group),
    };
    const throwing: EditorBlockDefinition = {
      ...host,
      type: 'broken',
      label: content('Broken'),
      Canvas: () => {
        throw new Error('Drawing failed');
      },
    };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const bare: BrandKit = {
      ...PSEUDO_BRAND,
      name: '',
      contact: { address: '', phone: '', email: '', website: '' },
      social: [],
    };
    renderPseudo(pseudoIssue(notes), {
      brand: bare,
      definitions: [...builtInEditorBlocks, host, throwing],
    });
    for (const note of [
      /^⟦Unknown block “«carousel»”/,
      /^⟦The «Broken» block could not be drawn/,
      /^⟦Nothing to show yet/,
      /^⟦Empty article/,
      /^⟦Empty header/,
      /^⟦Empty footer/,
      /^⟦The button appears once it has a link/,
      /^⟦Label⟧$/,
      /^⟦Hidden from email⟧$/,
    ]) {
      expect(screen.getAllByText(note).length, String(note)).toBeGreaterThan(0);
    }
    expectTranslated();
  });

  it('translates a read-only issue, and a full one', async () => {
    const { user, unmount } = renderPseudo(undefined, { readOnly: true });
    await user.click(canvasTabs()[1] as HTMLElement);
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0);
    expectTranslated();
    unmount();

    const full = Array.from({ length: 30 }, (_, index) => ({
      ...markContent(testBlock('divider')),
      id: `divider-${index}`,
    }));
    renderPseudo(pseudoIssue(full));
    expect(screen.getByText(/^⟦This issue has 30 blocks/)).toBeInTheDocument();
    expectTranslated();
  });

  it('translates the new-issue and duplicate dialogs inside a host’s own root', async () => {
    const user = userEvent.setup();
    const templates = PSEUDO_TEMPLATES.map((template) => ({
      ...template,
      blocks: template.blocks.map((block) => markContent(block)),
    }));
    const { unmount } = render(
      <BlockletterRoot messages={PSEUDO}>
        <NewIssueDialog
          open
          onOpenChange={() => undefined}
          templates={templates}
          onCreate={() => undefined}
          onRenameTemplate={() => undefined}
          onDeleteTemplate={() => undefined}
        />
      </BlockletterRoot>,
    );
    expectTranslated();
    await user.click(screen.getByRole('combobox', { name: said('Period') }));
    expect(await screen.findByRole('option', { name: said('Last month') })).toBeInTheDocument();
    expectTranslated();
    await user.keyboard('{Escape}');

    fireEvent.change(screen.getByLabelText(said('From')), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(said('Up to')), { target: { value: '2026-12-01' } });
    await user.click(screen.getByRole('button', { name: said('Create issue') }));
    expectTranslated();

    const saved = templates[0]?.name ?? '';
    await user.click(screen.getByRole('button', { name: said(`Rename ${saved}`) }));
    const card = screen.getByLabelText(said('Template name')).closest('[data-template]');
    await user.clear(screen.getByLabelText(said('Template name')));
    await user.click(screen.getByRole('button', { name: said('Save') }));
    expect(screen.getByText(said('Give the template a name.'))).toBeInTheDocument();
    expectTranslated();
    await user.click(within(card as HTMLElement).getByRole('button', { name: said('Cancel') }));
    await user.click(screen.getByRole('button', { name: said(`Delete ${saved}`) }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expectTranslated();
    unmount();

    render(
      <BlockletterRoot messages={PSEUDO}>
        <DuplicateIssueDialog
          open
          onOpenChange={() => undefined}
          sourcePeriod={PERIOD}
          name={content('September 2026')}
          onDuplicate={() => undefined}
        />
      </BlockletterRoot>,
    );
    expectTranslated();
  });
});

/** A block with all its words blanked and its lists emptied, which the canvas draws as a note. */
function emptied(block: BuiltInBlock): BlockBase {
  const blank = (value: unknown, key?: string): unknown => {
    if (Array.isArray(value)) return [];
    if (typeof value === 'string') {
      return ['id', 'type', 'variant', 'thickness', 'size', 'imageSide', 'format'].includes(
        key ?? '',
      )
        ? value
        : '';
    }
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([field]) => !['image', 'photo', 'logo', 'source'].includes(field))
          .map(([field, item]) => [field, blank(item, field)]),
      );
    }
    return value;
  };
  return blank(block) as BlockBase;
}
