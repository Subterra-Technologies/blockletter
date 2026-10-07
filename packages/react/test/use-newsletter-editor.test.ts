import { createElement, useState, type ReactNode } from 'react';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  createDocument,
  type BlockBase,
  type DataSource,
  type EventTileItem,
  type NewsletterDocument,
} from '@subterra-technologies/blockletter';
import { builtInEditorBlocks } from '../src/blocks';
import {
  useNewsletterEditor,
  type UseNewsletterEditorOptions,
} from '../src/editor/use-newsletter-editor';
import { BlockletterRoot } from '../src/root';
import { TEST_BRAND, TEST_SOURCES, testBlock } from './helpers/fixtures';

const HEADER = testBlock('header', { title: 'Book club news', issueLabel: 'November 2026' });
const TEXT = testBlock('text', { body: 'Join us Friday at nine.' });
const EVENTS = testBlock('event_tiles', { source: 'events', items: [] });
const FOOTER = testBlock('footer');

const NOVEMBER = { start: '2026-11-01', end: '2026-11-30', lookaheadEnd: '2027-01-11' };

const doc = (blocks: BlockBase[], extra: Partial<NewsletterDocument<BlockBase>> = {}) =>
  createDocument({
    subject: 'November at the book club',
    preheader: 'Readings and a sale',
    period: NOVEMBER,
    ...extra,
    blocks,
  } as Partial<NewsletterDocument>) as NewsletterDocument<BlockBase>;

/** The hook over a document held in state, inside a root for its confirmation and toasts. */
function setup(
  initial: NewsletterDocument<BlockBase>,
  options: Partial<UseNewsletterEditorOptions<BlockBase>> = {},
) {
  const onChange = vi.fn<(next: NewsletterDocument<BlockBase>) => void>();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(BlockletterRoot, null, children);
  const view = renderHook(
    () => {
      const [value, setValue] = useState(initial);
      return useNewsletterEditor<BlockBase>({
        value,
        onChange: (next) => {
          onChange(next);
          setValue(next);
        },
        definitions: builtInEditorBlocks,
        sources: [TEST_SOURCES.events],
        brand: TEST_BRAND,
        ...options,
      });
    },
    { wrapper },
  );
  const types = () => view.result.current.document.blocks.map((block) => block.type);
  return { ...view, onChange, types };
}

describe('useNewsletterEditor', () => {
  it('shows exactly one visible footer, last, without writing the repair until an edit', () => {
    const { result, onChange, types } = setup(
      doc([{ ...FOOTER, id: 'old-footer' }, HEADER, TEXT, { ...FOOTER, hidden: true }]),
    );
    expect(types()).toEqual(['header', 'text', 'footer']);
    expect(result.current.document.blocks.at(-1)).toMatchObject({ id: FOOTER.id, hidden: false });
    expect(onChange).not.toHaveBeenCalled();

    act(() => result.current.setSubject('Repaired'));
    expect(onChange.mock.calls[0]?.[0].blocks.map((block) => block.type)).toEqual([
      'header',
      'text',
      'footer',
    ]);
  });

  it('adds a block just above the footer, selects it, and fills its tokens', () => {
    const { result, types } = setup(doc([TEXT, FOOTER]));
    act(() => result.current.insert('header'));
    expect(types()).toEqual(['text', 'header', 'footer']);
    const header = result.current.document.blocks[1];
    expect(result.current.selectedId).toBe(header?.id);
    // `{{monthYear}}` from the document's period; a fresh header no longer shows the token.
    expect(header).toMatchObject({ issueLabel: 'November 2026' });
  });

  it('fills a fresh block’s tokens from this month when the document has no dates', () => {
    const { result } = setup(doc([FOOTER], { period: undefined }));
    act(() => result.current.insert('header'));
    expect(result.current.document.blocks[0]).toMatchObject({
      issueLabel: expect.stringMatching(/^[A-Z][a-z]+ \d{4}$/),
    });
  });

  it('never puts a block below the footer, and stops at the block limit', () => {
    const { result, types } = setup(doc([TEXT, FOOTER]), { maxBlocks: 3 });
    act(() => result.current.insert('divider', 99));
    expect(types()).toEqual(['text', 'divider', 'footer']);
    expect(result.current.full).toBe(true);
    act(() => result.current.insert('spacer'));
    expect(types()).toEqual(['text', 'divider', 'footer']);
  });

  it('adds no second header, since an issue holds one of each structural block', () => {
    const { result, onChange } = setup(doc([HEADER, TEXT, FOOTER]));
    act(() => result.current.insert('header', 0));
    act(() => result.current.insert('footer'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens on a block a host names, and on nothing for an id the issue lacks', () => {
    const { result } = setup(doc([HEADER, TEXT, FOOTER]), { defaultSelectedId: TEXT.id });
    expect(result.current.selectedId).toBe(TEXT.id);
    expect(result.current.selected).toBe(TEXT);
    // An id the issue does not have selects nothing.
    const missing = setup(doc([HEADER, TEXT, FOOTER]), { defaultSelectedId: 'gone-1' });
    expect(missing.result.current.selectedId).toBeNull();
  });

  it('moves blocks within the body, keeping the footer last', () => {
    const { result, types } = setup(doc([HEADER, TEXT, FOOTER]));
    act(() => result.current.move(0, 5));
    expect(types()).toEqual(['text', 'header', 'footer']);
    act(() => result.current.move(2, 0));
    expect(types()).toEqual(['text', 'header', 'footer']);
  });

  it('duplicates a block beside it and selects the copy, but never a structural one', () => {
    const { result, types } = setup(doc([HEADER, TEXT, FOOTER]));
    act(() => result.current.duplicate(TEXT.id));
    expect(types()).toEqual(['header', 'text', 'text', 'footer']);
    const copy = result.current.document.blocks[2];
    expect(copy?.id).not.toBe(TEXT.id);
    expect(copy).toMatchObject({ body: 'Join us Friday at nine.' });
    expect(result.current.selectedId).toBe(copy?.id);

    act(() => result.current.duplicate(HEADER.id));
    expect(types()).toEqual(['header', 'text', 'text', 'footer']);
  });

  it('says so rather than duplicating past the block limit', async () => {
    const { result, types } = setup(doc([TEXT, FOOTER]), { maxBlocks: 2 });
    act(() => result.current.duplicate(TEXT.id));
    expect(types()).toEqual(['text', 'footer']);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An issue holds at most 2 blocks. Delete one before adding another.',
    );
  });

  it('deletes a block once confirmed, handing the selection to its neighbour', async () => {
    const user = userEvent.setup();
    const { result, types } = setup(doc([HEADER, TEXT, FOOTER]));
    act(() => result.current.select(TEXT.id));

    let removal!: Promise<void>;
    act(() => {
      removal = result.current.remove(TEXT.id);
    });
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete the Text block?' });
    await user.click(screen.getByRole('button', { name: 'Delete block' }));
    await act(() => removal);
    expect(dialog).not.toBeInTheDocument();

    expect(types()).toEqual(['header', 'footer']);
    expect(result.current.selectedId).toBe(FOOTER.id);
    expect(await screen.findByText('Text deleted.')).toBeInTheDocument();
  });

  it('keeps the block when the deletion is declined, and never deletes a structural one', async () => {
    const user = userEvent.setup();
    const { result, types, onChange } = setup(doc([HEADER, TEXT, FOOTER]));
    let removal!: Promise<void>;
    act(() => {
      removal = result.current.remove(TEXT.id);
    });
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await act(() => removal);
    await act(() => result.current.remove(HEADER.id));
    await act(() => result.current.remove(FOOTER.id));
    expect(types()).toEqual(['header', 'text', 'footer']);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hides and shows a block, but never hides the footer', () => {
    const { result } = setup(doc([TEXT, FOOTER]));
    act(() => result.current.toggleHidden(TEXT.id));
    expect(result.current.document.blocks[0]?.hidden).toBe(true);
    act(() => result.current.toggleHidden(FOOTER.id));
    expect(result.current.document.blocks[1]?.hidden).toBe(false);
  });

  it('replaces an edited block, and writes nothing for an unchanged one', () => {
    const { result, onChange } = setup(doc([TEXT, FOOTER]));
    act(() => result.current.update(result.current.document.blocks[0]!));
    expect(onChange).not.toHaveBeenCalled();
    act(() => result.current.update({ ...TEXT, body: 'Changed.' } as BlockBase));
    expect(result.current.document.blocks[0]).toMatchObject({ body: 'Changed.' });
  });

  it('sets the subject and the preview line', () => {
    const { result } = setup(doc([FOOTER]));
    act(() => result.current.setSubject('December news'));
    act(() => result.current.setPreheader('Gifts and gatherings'));
    expect(result.current.document).toMatchObject({
      subject: 'December news',
      preheader: 'Gifts and gatherings',
    });
  });

  it('does nothing at all while read-only', () => {
    const { result, onChange } = setup(doc([HEADER, TEXT, FOOTER]), { readOnly: true });
    act(() => {
      result.current.insert('divider');
      result.current.move(0, 1);
      result.current.duplicate(TEXT.id);
      result.current.toggleHidden(TEXT.id);
      result.current.setSubject('Nope');
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('refreshing from a data source', () => {
  it('fills a block from its source and says so', async () => {
    const { result } = setup(doc([EVENTS, FOOTER]));
    await act(() => result.current.refresh(EVENTS.id));
    const tiles = result.current.document.blocks[0] as typeof EVENTS;
    expect(tiles.items.map((item) => item.title)).toEqual([
      'Author reading night',
      'Poetry swap',
      'Holiday book exchange',
    ]);
    expect(await screen.findByText('Refreshed from Club events.')).toBeInTheDocument();
  });

  it('reports a failure in the source’s words and leaves the block alone', async () => {
    const failing: DataSource<'event_tiles'> = {
      ...TEST_SOURCES.events,
      items: () => Promise.reject(new Error('The events service is down.')),
    };
    const { result, onChange } = setup(doc([EVENTS, FOOTER]), { sources: [failing] });
    await act(() => result.current.refresh(EVENTS.id));
    expect(await screen.findByRole('alert')).toHaveTextContent('The events service is down.');
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.refreshing.size).toBe(0);
  });

  it('keeps an edit made while the refresh was running', async () => {
    let finish!: (items: EventTileItem[]) => void;
    const slow: DataSource<'event_tiles'> = {
      ...TEST_SOURCES.events,
      items: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    };
    const { result } = setup(doc([EVENTS, FOOTER]), { sources: [slow] });
    let refresh!: Promise<void>;
    act(() => {
      refresh = result.current.refresh(EVENTS.id);
    });
    expect(result.current.refreshing.has(EVENTS.id)).toBe(true);
    act(() => result.current.update({ ...EVENTS, heading: 'Typed meanwhile' } as BlockBase));
    await act(async () => {
      finish([{ title: 'Late arrival', date: '2026-11-20' }]);
      await refresh;
    });
    expect(result.current.document.blocks[0]).toMatchObject({
      heading: 'Typed meanwhile',
      items: [],
    });
    expect(
      await screen.findByText(/The block changed while it was refreshing/),
    ).toBeInTheDocument();
  });

  it('keeps both refreshed blocks when two refreshes finish together', async () => {
    const second = testBlock('event_tiles', { id: 'event_tiles-2', source: 'events', items: [] });
    const { result } = setup(doc([EVENTS, second, FOOTER]));
    await act(async () => {
      await Promise.all([result.current.refresh(EVENTS.id), result.current.refresh(second.id)]);
    });
    const [first, other] = result.current.document.blocks as (typeof EVENTS)[];
    expect(first?.items).toHaveLength(3);
    expect(other?.items).toHaveLength(3);
  });

  it('updates the period and refreshes every sourced block for the new dates', async () => {
    const byPeriod: DataSource<'event_tiles'> = {
      ...TEST_SOURCES.events,
      items: ({ period }) => [{ title: `Events from ${period?.start}`, date: period?.start ?? '' }],
    };
    const initial = doc([EVENTS, TEXT, FOOTER]);
    const { result } = setup(initial, { sources: [byPeriod] });
    const december = { start: '2026-12-01', end: '2026-12-31', lookaheadEnd: '2027-02-11' };
    await act(() => result.current.updatePeriod(december));
    expect(result.current.document.period).toEqual(december);
    expect(result.current.document.blocks[0]).toMatchObject({
      items: [{ title: 'Events from 2026-12-01' }],
    });
    // What no source fills is left exactly as it was.
    expect(result.current.document.blocks[1]).toBe(initial.blocks[1]);
    await waitFor(() =>
      expect(
        screen.getByText('Period updated. 1 block refreshed for the new dates.'),
      ).toBeInTheDocument(),
    );
  });
});
