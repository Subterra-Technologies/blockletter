import { createElement, useState, type ReactNode } from 'react';
import { act, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
const DIVIDER = testBlock('divider');
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

/**
 * The hook over a document held in state, inside a root for its toasts. `copies`: the host stores
 * each document and reads it back, so what it passes back is an equal copy, not the same object.
 */
function setup(
  initial: NewsletterDocument<BlockBase>,
  options: Partial<UseNewsletterEditorOptions<BlockBase>> = {},
  { copies = false }: { copies?: boolean } = {},
) {
  const onChange = vi.fn<(next: NewsletterDocument<BlockBase>) => void>();
  let replace: (next: NewsletterDocument<BlockBase>) => void = () => undefined;
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(BlockletterRoot, null, children);
  const view = renderHook(
    () => {
      const [value, setValue] = useState(initial);
      replace = setValue;
      return useNewsletterEditor<BlockBase>({
        value,
        onChange: (next) => {
          onChange(next);
          setValue(copies ? (JSON.parse(JSON.stringify(next)) as typeof next) : next);
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
  /** The host putting a document of its own in the editor: another issue, or a reload. */
  const load = (next: NewsletterDocument<BlockBase>) => act(() => replace(next));
  return { ...view, onChange, types, load };
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

  it('deletes a block at once, handing the selection to its neighbour, with Undo in its toast', async () => {
    const user = userEvent.setup();
    const { result, types } = setup(doc([HEADER, TEXT, FOOTER]));
    act(() => result.current.select(TEXT.id));

    act(() => result.current.remove(TEXT.id));
    // Nothing is asked first: the deletion can be undone.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(types()).toEqual(['header', 'footer']);
    expect(result.current.selectedId).toBe(FOOTER.id);

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('Text deleted.');
    await user.click(within(toast).getByRole('button', { name: 'Undo' }));
    expect(types()).toEqual(['header', 'text', 'footer']);
    expect(result.current.selectedId).toBe(TEXT.id);
    expect(await screen.findByText('Undid: deleted the Text block.')).toBeInTheDocument();
    expect(screen.queryByText('Text deleted.')).not.toBeInTheDocument();
  });

  it('never deletes a structural block', () => {
    const { result, types, onChange } = setup(doc([HEADER, TEXT, FOOTER]));
    act(() => result.current.remove(HEADER.id));
    act(() => result.current.remove(FOOTER.id));
    expect(types()).toEqual(['header', 'text', 'footer']);
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.canUndo).toBe(false);
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
      result.current.remove(TEXT.id);
      result.current.setSubject('Nope');
      result.current.undo();
      result.current.redo();
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

describe('undo and redo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('undoes an insertion, choosing the block chosen before it, and redoes it', () => {
    const { result, types } = setup(doc([HEADER, TEXT, FOOTER]));
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.select(HEADER.id));
    act(() => result.current.insert('divider'));
    const divider = result.current.selectedId;
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(types()).toEqual(['header', 'text', 'footer']);
    expect(result.current.selectedId).toBe(HEADER.id);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(types()).toEqual(['header', 'text', 'divider', 'footer']);
    expect(result.current.selectedId).toBe(divider);
    expect(result.current.canRedo).toBe(false);
  });

  it('keeps the block chosen since when the change it undoes was made with none chosen', () => {
    const { result, types } = setup(doc([HEADER, TEXT, FOOTER]));
    act(() => result.current.insert('divider'));
    act(() => result.current.select(TEXT.id));
    act(() => result.current.undo());
    expect(types()).toEqual(['header', 'text', 'footer']);
    expect(result.current.selectedId).toBe(TEXT.id);
    // Undone from the block it added, nothing is left to choose.
    act(() => result.current.redo());
    act(() => result.current.undo());
    expect(result.current.selectedId).toBeNull();
  });

  it('undoes moves, copies and hiding one step at a time, choosing the block each changed', () => {
    const { result, types } = setup(doc([HEADER, TEXT, FOOTER]));
    act(() => result.current.move(1, 0));
    act(() => result.current.duplicate(TEXT.id));
    act(() => result.current.toggleHidden(HEADER.id));
    expect(types()).toEqual(['text', 'text', 'header', 'footer']);

    act(() => result.current.undo());
    expect(result.current.document.blocks[2]).toMatchObject({ type: 'header', hidden: false });
    expect(result.current.selectedId).toBe(HEADER.id);
    act(() => result.current.undo());
    expect(types()).toEqual(['text', 'header', 'footer']);
    expect(result.current.selectedId).toBe(TEXT.id);
    act(() => result.current.undo());
    expect(types()).toEqual(['header', 'text', 'footer']);
    expect(result.current.document.blocks).toEqual([HEADER, TEXT, FOOTER]);
  });

  it('joins typing in one field into one step until a pause, and keeps other fields apart', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-02T09:00:00Z'));
    const { result } = setup(doc([TEXT, FOOTER]));
    const type = (changes: Partial<typeof TEXT>) =>
      act(() => result.current.update({ ...result.current.document.blocks[0]!, ...changes }));
    const later = (ms: number) => vi.setSystemTime(Date.now() + ms);

    for (const body of ['D', 'Do', 'Doors', 'Doors open']) {
      type({ body });
      later(200);
    }
    // Straight on into another field: a step of its own.
    type({ heading: 'News' });
    later(2_000);
    type({ body: 'Doors open at eight.' });

    const text = () => result.current.document.blocks[0];
    act(() => result.current.undo());
    expect(text()).toMatchObject({ heading: 'News', body: 'Doors open' });
    act(() => result.current.undo());
    expect(text()).toMatchObject({ heading: TEXT.heading, body: 'Doors open' });
    act(() => result.current.undo());
    expect(text()).toBe(TEXT);
    expect(result.current.canUndo).toBe(false);
  });

  it('joins typing in the subject and the preview line, each a step of its own', () => {
    const { result } = setup(doc([FOOTER]));
    for (const subject of ['D', 'De', 'Dec']) act(() => result.current.setSubject(subject));
    for (const preheader of ['G', 'Gi']) act(() => result.current.setPreheader(preheader));
    act(() => result.current.undo());
    expect(result.current.document).toMatchObject({
      subject: 'Dec',
      preheader: 'Readings and a sale',
    });
    act(() => result.current.undo());
    expect(result.current.document.subject).toBe('November at the book club');
  });

  it('says what each undo and redo did, in a toast a screen reader reads out', async () => {
    const { result } = setup(doc([HEADER, TEXT, FOOTER]));
    act(() => result.current.move(1, 0));
    act(() => result.current.undo());
    expect(await screen.findByText('Undid: moved the Text block.')).toBeInTheDocument();
    act(() => result.current.redo());
    // One at a time: the newest replaces the last.
    expect(await screen.findByText('Redid: moved the Text block.')).toBeInTheDocument();
    expect(screen.queryByText('Undid: moved the Text block.')).not.toBeInTheDocument();
    expect(screen.getByText('Redid: moved the Text block.').closest('[aria-live]')).not.toBeNull();
  });

  it('undoes a restyle as a change to the block’s appearance', async () => {
    const { result } = setup(doc([TEXT, FOOTER]));
    act(() => result.current.update({ ...TEXT, style: { fullWidth: true } } as BlockBase));
    act(() => result.current.undo());
    expect(result.current.document.blocks[0]).toBe(TEXT);
    expect(
      await screen.findByText('Undid: changed the Text block’s appearance.'),
    ).toBeInTheDocument();
  });

  it('offers a deletion’s Undo only until something else changes', async () => {
    const { result } = setup(doc([HEADER, TEXT, DIVIDER, FOOTER]));
    act(() => result.current.remove(TEXT.id));
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
    // Its Undo would now take back the move, not the deletion, so it goes.
    act(() => result.current.move(1, 0));
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('starts over when the host loads a document it did not hand out', () => {
    const { result, load, onChange, types } = setup(doc([HEADER, TEXT, FOOTER]));
    act(() => result.current.insert('divider'));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);

    // Another issue, or this one reloaded: nothing of the history belongs to it.
    load(doc([TEXT, FOOTER], { subject: 'Another issue' }));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    onChange.mockClear();
    act(() => result.current.redo());
    act(() => result.current.undo());
    expect(onChange).not.toHaveBeenCalled();
    expect(types()).toEqual(['text', 'footer']);
  });

  it('keeps its history through a host that stores each document and passes back a copy', () => {
    const { result, types } = setup(doc([HEADER, TEXT, FOOTER]), {}, { copies: true });
    act(() => result.current.insert('divider'));
    act(() => result.current.move(1, 0));
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    act(() => result.current.undo());
    expect(types()).toEqual(['header', 'text', 'footer']);
    act(() => result.current.redo());
    expect(types()).toEqual(['header', 'text', 'divider', 'footer']);
  });

  it('undoes a refresh from a data source', async () => {
    const { result } = setup(doc([EVENTS, FOOTER]));
    await act(() => result.current.refresh(EVENTS.id));
    expect((result.current.document.blocks[0] as typeof EVENTS).items).toHaveLength(3);
    act(() => result.current.undo());
    expect(result.current.document.blocks[0]).toBe(EVENTS);
    expect(
      await screen.findByText('Undid: refreshed the Event tiles block from Club events.'),
    ).toBeInTheDocument();
  });

  it('puts back the dates and what they listed with one undo', async () => {
    const byPeriod: DataSource<'event_tiles'> = {
      ...TEST_SOURCES.events,
      items: ({ period }) => [{ title: `Events from ${period?.start}`, date: period?.start ?? '' }],
    };
    const { result } = setup(doc([EVENTS, TEXT, FOOTER]), { sources: [byPeriod] });
    const december = { start: '2026-12-01', end: '2026-12-31', lookaheadEnd: '2027-02-11' };
    await act(() => result.current.updatePeriod(december));
    expect(result.current.document.blocks[0]).toMatchObject({
      items: [{ title: 'Events from 2026-12-01' }],
    });

    act(() => result.current.undo());
    expect(result.current.document.period).toEqual(NOVEMBER);
    expect(result.current.document.blocks[0]).toBe(EVENTS);
    expect(result.current.canUndo).toBe(false);
  });

  it('leaves out what the sources gave for dates that were undone while they were read', async () => {
    let finish!: (items: EventTileItem[]) => void;
    const slow: DataSource<'event_tiles'> = {
      ...TEST_SOURCES.events,
      items: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    };
    const { result } = setup(doc([EVENTS, FOOTER]), { sources: [slow] });
    let update!: Promise<void>;
    act(() => {
      update = result.current.updatePeriod({ ...NOVEMBER, start: '2026-10-01' });
    });
    act(() => result.current.undo());
    await act(async () => {
      finish([{ title: 'For the undone dates', date: '2026-10-20' }]);
      await update;
    });
    expect(result.current.document.period).toEqual(NOVEMBER);
    expect(result.current.document.blocks[0]).toBe(EVENTS);
    expect(result.current.refreshing.size).toBe(0);
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
