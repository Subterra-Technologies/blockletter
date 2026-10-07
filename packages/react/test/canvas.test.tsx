import { createRef, type ComponentProps } from 'react';
import { act, createEvent, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BlockBase } from '@subterra-technologies/blockletter';
import { NewsletterCanvas, type NewsletterCanvasHandle } from '../src/canvas/canvas';
import type { EditorBlockDefinition } from '../src/editor/types';
import { CANVAS_DEFINITIONS, SHOUT_DEFINITION, shout } from './helpers/canvas-registry';
import { TEST_SOURCES, testBlock } from './helpers/fixtures';
import { renderInEditor } from './helpers/render';

const BLOCKS: BlockBase[] = [
  testBlock('header', { title: 'Book club news', issueLabel: 'November 2026' }),
  testBlock('letter', {
    heading: 'From the chair',
    body: 'Autumn is our busiest season.',
    signature: 'Ana Park, Chair',
  }),
  testBlock('event_tiles', {
    source: 'events',
    items: [{ ref: 'e1', title: 'Author reading night', date: '2026-11-05', time: '7:00 PM' }],
  }),
  testBlock('footer'),
];

type CanvasProps = ComponentProps<typeof NewsletterCanvas>;

function renderCanvas(
  props: Partial<CanvasProps> = {},
  context: { definitions?: readonly EditorBlockDefinition[]; readOnly?: boolean } = {},
) {
  return renderInEditor(<NewsletterCanvas blocks={BLOCKS} {...props} />, {
    context: {
      definitions: CANVAS_DEFINITIONS,
      sources: [TEST_SOURCES.events],
      ...context,
    },
  });
}

/**
 * jsdom builds a `dragover` from the Event constructor, which drops `clientY`, and the canvas
 * needs it to decide whether the pointer is in a row's top or bottom half. The event is created
 * and the coordinate defined on it before dispatch.
 */
function dragOverAt(element: Element, clientY: number): void {
  const event = createEvent.dragOver(element, { dataTransfer: dataTransfer() });
  Object.defineProperty(event, 'clientY', { value: clientY });
  fireEvent(element, event);
}

/** jsdom has no DataTransfer, so each drag test supplies the minimum the handlers read. */
function dataTransfer(payload = '') {
  return {
    getData: () => payload,
    setData: vi.fn(),
    effectAllowed: '',
    dropEffect: '',
  };
}

const rowOf = (tab: HTMLElement): HTMLLIElement => {
  const row = tab.closest('li');
  if (!row) throw new Error('A canvas tab sits in a list item');
  return row;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NewsletterCanvas', () => {
  it('puts nothing above the email but keeps the keyboard lesson for screen readers', () => {
    // The canvas starts with the email itself; the block count lives in the palette. The
    // instructions stay off-screen, where the tablist points at them with aria-describedby.
    renderCanvas();
    expect(screen.getByRole('heading', { level: 2, name: 'Canvas' })).toHaveClass('bl:sr-only');
    const tablist = screen.getByRole('tablist');
    const hint = document.getElementById(tablist.getAttribute('aria-describedby') ?? '');
    expect(hint).toHaveClass('bl:sr-only');
    expect(hint?.textContent).toMatch(/choose a block to edit it/i);
  });

  it('names each block tab by its block, not by everything written in it', () => {
    renderCanvas();
    const letter = screen.getByRole('tab', { name: 'Letter' });
    // A filled block says so in its name, as its label does on screen.
    expect(screen.getByRole('tab', { name: 'Event tiles Auto-filled' })).toBeInTheDocument();
    // The drawing is for the eye, beside the tab rather than inside it: the tab's visible text is
    // all in its accessible name (WCAG 2.5.3), and it is not the whole letter.
    const drawn = within(rowOf(letter)).getByText('Autumn is our busiest season.');
    expect(letter).not.toContainElement(drawn);
    expect(drawn.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('folds a hidden block to a bar that says so, rather than fading it', () => {
    renderCanvas({
      blocks: BLOCKS.map((block) => (block.id === 'letter-1' ? { ...block, hidden: true } : block)),
    });
    const tab = screen.getByRole('tab', { name: 'Letter Hidden from email' });
    expect(tab).toHaveAttribute('data-hidden', 'true');
    expect(within(rowOf(tab)).getByText('Hidden from email')).toBeInTheDocument();
    // The letter itself is not drawn: it is not in the email.
    expect(within(rowOf(tab)).queryByText('Autumn is our busiest season.')).toBeNull();
  });

  it('exposes the blocks as a vertical tablist of tabs', () => {
    renderCanvas({ selectedId: 'letter-1', editorPanelId: 'panel-1' });
    const tablist = screen.getByRole('tablist', { name: 'Canvas' });
    expect(tablist).toHaveAttribute('aria-orientation', 'vertical');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(BLOCKS.length);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-controls', 'panel-1');
    expect(tabs[1]).toHaveAttribute('tabindex', '0');
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');
  });

  it('makes the first block the tab stop when nothing, or nothing still there, is selected', () => {
    const { unmount } = renderCanvas();
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('tabindex', '0');
    unmount();

    renderCanvas({ selectedId: 'deleted-block' });
    const stops = screen.getAllByRole('tab').filter((tab) => tab.tabIndex === 0);
    expect(stops).toEqual([screen.getAllByRole('tab')[0]]);
  });

  it('shows the empty sentence rather than a blank sheet', () => {
    renderCanvas({ blocks: [] });
    expect(screen.getByText('This issue has no blocks yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Add one from the block palette to start the layout\./),
    ).toBeInTheDocument();
  });

  it('drops the toolbar and dragging when read-only', () => {
    renderCanvas({ readOnly: true, selectedId: 'letter-1' });
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    expect(rowOf(screen.getAllByRole('tab')[1]!)).not.toHaveAttribute('draggable');
  });

  it('follows the editor’s own read-only state when not told otherwise', () => {
    renderCanvas({ selectedId: 'letter-1' }, { readOnly: true });
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('selects a block on click', async () => {
    const onPick = vi.fn();
    renderCanvas({ onPick });
    await userEvent.click(screen.getAllByRole('tab')[2]!);
    expect(onPick).toHaveBeenCalledWith('event_tiles-1');
  });

  it('marks a block its registered source fills as auto-filled', () => {
    renderCanvas({
      blocks: [
        ...BLOCKS.slice(0, 3),
        // A template can name a source the host never registered: that block stays manual.
        testBlock('dated_list', { id: 'calendar-1', source: 'calendar' }),
        BLOCKS[3]!,
      ],
    });
    expect(
      within(screen.getByRole('tab', { name: 'Event tiles Auto-filled' })).getByText('Auto-filled'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('tab', { name: 'Dated list' })).queryByText('Auto-filled'),
    ).toBeNull();
  });

  // --- Blocks without a drawing of their own ---------------------------------------------------

  it('draws a host block with no Canvas from its own email HTML, inert and sanitised', () => {
    const { container } = renderCanvas(
      { blocks: [shout('Doors open at seven'), BLOCKS[3]!] },
      { definitions: [...CANVAS_DEFINITIONS, SHOUT_DEFINITION] },
    );
    const tab = screen.getByRole('tab', { name: 'Shout' });
    expect(within(rowOf(tab)).getByText('DOORS OPEN AT SEVEN')).toBeInTheDocument();
    // A picture of the email: its link cannot be tabbed to or followed from the canvas.
    const link = within(rowOf(tab)).getByText('Read the shout');
    expect(link.closest('[inert]')).not.toBeNull();
    // Whatever the host's render passed through unescaped never reaches the editor's page.
    expect(container.querySelector('[onerror]')).toBeNull();
    expect((window as { __shouted?: boolean }).__shouted).toBeUndefined();
  });

  it('says so when a host block’s email shows nothing yet', () => {
    renderCanvas(
      { blocks: [shout('   ')] },
      { definitions: [...CANVAS_DEFINITIONS, SHOUT_DEFINITION] },
    );
    expect(
      screen.getByText(
        'Nothing to show yet. The block stays out of the email until it has content.',
      ),
    ).toBeInTheDocument();
  });

  it('labels a block nothing defines rather than dropping it', () => {
    renderCanvas({ blocks: [{ id: 'mystery-1', type: 'mystery', hidden: false }] });
    const tab = screen.getByRole('tab', { name: 'mystery' });
    expect(
      within(rowOf(tab)).getByText(
        'Unknown block “mystery”. Nothing defines it, so the email leaves it out.',
      ),
    ).toBeInTheDocument();
  });

  it('contains a host drawing that throws, and draws every other block', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken: EditorBlockDefinition = {
      ...SHOUT_DEFINITION,
      Canvas: () => {
        throw new Error('Broken drawing');
      },
    };
    renderCanvas(
      { blocks: [shout(), BLOCKS[1]!] },
      { definitions: [...CANVAS_DEFINITIONS, broken] },
    );
    expect(
      screen.getByText('The Shout block could not be drawn. The preview shows its email.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Autumn is our busiest season.')).toBeInTheDocument();
  });

  // --- Keyboard reordering: the accessible path ------------------------------------------------

  it('selects with Enter and with Space', () => {
    const onPick = vi.fn();
    renderCanvas({ onPick });
    fireEvent.keyDown(screen.getAllByRole('tab')[1]!, { key: 'Enter' });
    fireEvent.keyDown(screen.getAllByRole('tab')[2]!, { key: ' ' });
    expect(onPick).toHaveBeenNthCalledWith(1, 'letter-1');
    expect(onPick).toHaveBeenNthCalledWith(2, 'event_tiles-1');
  });

  it('moves focus with the arrow keys, and to the ends with Home and End', () => {
    renderCanvas();
    const tabs = screen.getAllByRole('tab');
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(tabs[1]);
    fireEvent.keyDown(tabs[1]!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(tabs[0]);
    fireEvent.keyDown(tabs[0]!, { key: 'End' });
    expect(document.activeElement).toBe(tabs.at(-1));
    fireEvent.keyDown(tabs.at(-1)!, { key: 'Home' });
    expect(document.activeElement).toBe(tabs[0]);
  });

  it('reorders with Alt + arrow, keeps the block selected and announces the move', () => {
    const onReorder = vi.fn();
    const onPick = vi.fn();
    renderCanvas({ onReorder, onPick });
    fireEvent.keyDown(screen.getAllByRole('tab')[1]!, { key: 'ArrowDown', altKey: true });
    expect(onReorder).toHaveBeenCalledWith({ from: 1, to: 2 });
    // Chosen by moving it, so the editor does not take the focus away from the block.
    expect(onPick).toHaveBeenCalledWith('letter-1', { reveal: false });
    expect(screen.getByText('Letter moved to position 3 of 4.')).toBeInTheDocument();
  });

  it('refuses to move the first block up or the last block down', () => {
    const onReorder = vi.fn();
    renderCanvas({ onReorder });
    const tabs = screen.getAllByRole('tab');
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowUp', altKey: true });
    fireEvent.keyDown(tabs.at(-1)!, { key: 'ArrowDown', altKey: true });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('does not reorder a read-only canvas', () => {
    const onReorder = vi.fn();
    renderCanvas({ onReorder, readOnly: true });
    fireEvent.keyDown(screen.getAllByRole('tab')[1]!, { key: 'ArrowDown', altKey: true });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('keeps the footer last when moving with the keyboard or dragging', () => {
    const onReorder = vi.fn();
    renderCanvas({ onReorder, selectedId: 'footer-1' });
    const tabs = screen.getAllByRole('tab');
    const footer = tabs.at(-1)!;
    expect(footer).toHaveAccessibleName('Footer');
    expect(rowOf(footer)).not.toHaveAttribute('draggable', 'true');
    fireEvent.keyDown(footer, { key: 'ArrowUp', altKey: true });
    fireEvent.keyDown(tabs.at(-2)!, { key: 'ArrowDown', altKey: true });
    expect(onReorder).not.toHaveBeenCalled();

    fireEvent.dragStart(rowOf(tabs[0]!), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(screen.getByRole('tablist'), { dataTransfer: dataTransfer() });
    fireEvent.drop(screen.getByRole('tablist'), { dataTransfer: dataTransfer() });
    expect(onReorder).toHaveBeenCalledWith({ from: 0, to: tabs.length - 2 });
  });

  it('moves a block from the floating toolbar', async () => {
    const onReorder = vi.fn();
    renderCanvas({ onReorder, selectedId: 'letter-1' });
    await userEvent.click(screen.getByRole('button', { name: 'Move Letter up' }));
    expect(onReorder).toHaveBeenCalledWith({ from: 1, to: 0 });
  });

  // --- The keyboard insertion point ------------------------------------------------------------

  it('asks for an insertion point above the selected block and announces it', async () => {
    const onRequestInsert = vi.fn();
    renderCanvas({ onRequestInsert, selectedId: 'letter-1' });
    await userEvent.click(screen.getByRole('button', { name: 'Insert a block above Letter' }));
    expect(onRequestInsert).toHaveBeenCalledWith({ index: 1, label: 'above Letter' });
    expect(
      screen.getByText('Insertion point set above Letter. Choose a block to insert.'),
    ).toBeInTheDocument();
  });

  it('asks for an insertion point below the selected block', async () => {
    const onRequestInsert = vi.fn();
    renderCanvas({ onRequestInsert, selectedId: 'letter-1' });
    await userEvent.click(screen.getByRole('button', { name: 'Insert a block below Letter' }));
    expect(onRequestInsert).toHaveBeenCalledWith({ index: 2, label: 'below Letter' });
  });

  it('draws the waiting insertion point, fills it through insertAt, and cancels with Escape', () => {
    const ref = createRef<NewsletterCanvasHandle>();
    const onInsert = vi.fn();
    const onCancelInsert = vi.fn();
    const { container } = renderCanvas({ ref, onInsert, onCancelInsert, insertIndex: 1 });
    expect(container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(1);
    expect(screen.getByText('New block goes here')).toBeInTheDocument();
    act(() => ref.current!.insertAt('text', 1));
    expect(onInsert).toHaveBeenCalledWith({ type: 'text', index: 1 });
    fireEvent.keyDown(screen.getAllByRole('tab')[1]!, { key: 'Escape' });
    expect(onCancelInsert).toHaveBeenCalled();
  });

  it('lands an insertion meant for after the footer just above it', () => {
    const ref = createRef<NewsletterCanvasHandle>();
    const onInsert = vi.fn();
    renderCanvas({ ref, onInsert });
    act(() => ref.current!.insertAt('text', 4));
    expect(onInsert).toHaveBeenCalledWith({ type: 'text', index: 3 });
  });

  // --- Pointer drag and drop -------------------------------------------------------------------

  it('carries a move: payload when a block drag starts', () => {
    renderCanvas();
    const row = rowOf(screen.getAllByRole('tab')[1]!);
    expect(row).toHaveAttribute('draggable', 'true');
    const transfer = dataTransfer();
    fireEvent.dragStart(row, { dataTransfer: transfer });
    expect(transfer.setData).toHaveBeenCalledWith('text/plain', 'move:letter-1');
    expect(transfer.effectAllowed).toBe('move');
  });

  it('marks the slot under the pointer and drops a block into it', () => {
    const onReorder = vi.fn();
    const { container } = renderCanvas({ onReorder });
    const rows = screen.getAllByRole('tab').map(rowOf);

    fireEvent.dragStart(rows[0]!, { dataTransfer: dataTransfer() });
    // Over the bottom half of row 2 → the insertion slot after it.
    vi.spyOn(rows[2]!, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 100,
    } as DOMRect);
    dragOverAt(rows[2]!, 80);
    expect(container.querySelector('li[aria-hidden="true"]')).toBeInTheDocument();

    fireEvent.drop(screen.getByRole('tablist'), { dataTransfer: dataTransfer('move:header-1') });
    // Slot 3 with the block leaving index 0 behind → index 2.
    expect(onReorder).toHaveBeenCalledWith({ from: 0, to: 2 });
  });

  it('drops a new palette block at the marked slot', () => {
    const onInsert = vi.fn();
    const ref = createRef<NewsletterCanvasHandle>();
    renderCanvas({ onInsert, ref });
    // The drag started in the palette, outside the canvas, so the editor reaches in.
    act(() => ref.current!.paletteDragStart('text'));

    const rows = screen.getAllByRole('tab').map(rowOf);
    // Top half of row 1 → the slot before it.
    vi.spyOn(rows[1]!, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 100,
    } as DOMRect);
    dragOverAt(rows[1]!, 10);
    fireEvent.drop(screen.getByRole('tablist'), { dataTransfer: dataTransfer('new:text') });
    expect(onInsert).toHaveBeenCalledWith({ type: 'text', index: 1 });
  });

  it('defaults the drop slot to the end of the body, just above the footer', () => {
    const ref = createRef<NewsletterCanvasHandle>();
    const onInsert = vi.fn();
    renderCanvas({ onInsert, ref });
    act(() => ref.current!.paletteDragStart('text'));
    fireEvent.dragOver(screen.getByRole('tablist'), { dataTransfer: dataTransfer() });
    fireEvent.drop(screen.getByRole('tablist'), { dataTransfer: dataTransfer('new:text') });
    expect(onInsert).toHaveBeenCalledWith({ type: 'text', index: 3 });
  });

  it('ignores a drop that lands back where the block started', () => {
    const onReorder = vi.fn();
    renderCanvas({ onReorder });
    const rows = screen.getAllByRole('tab').map(rowOf);
    fireEvent.dragStart(rows[1]!, { dataTransfer: dataTransfer() });
    vi.spyOn(rows[1]!, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 100,
    } as DOMRect);
    dragOverAt(rows[1]!, 10);
    fireEvent.drop(screen.getByRole('tablist'), { dataTransfer: dataTransfer('move:letter-1') });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('does not accept a drop on a read-only canvas', () => {
    const onReorder = vi.fn();
    renderCanvas({ onReorder, readOnly: true });
    fireEvent.drop(screen.getByRole('tablist'), { dataTransfer: dataTransfer('move:letter-1') });
    expect(onReorder).not.toHaveBeenCalled();
  });

  // --- The imperative surface the editor drives ------------------------------------------------

  it('adds a palette block before the footer through addAtEnd', () => {
    const ref = createRef<NewsletterCanvasHandle>();
    const onInsert = vi.fn();
    renderCanvas({ onInsert, ref });
    act(() => ref.current!.addAtEnd('text'));
    expect(onInsert).toHaveBeenCalledWith({ type: 'text', index: 3 });
    expect(screen.getByText('Text inserted at position 4 of 5.')).toBeInTheDocument();
  });

  it('appends at the very end when there is no footer', () => {
    const ref = createRef<NewsletterCanvasHandle>();
    const onInsert = vi.fn();
    renderCanvas({ onInsert, ref, blocks: BLOCKS.filter((block) => block.type !== 'footer') });
    act(() => ref.current!.addAtEnd('text'));
    expect(onInsert).toHaveBeenCalledWith({ type: 'text', index: 3 });
  });

  it('moves focus onto a block through focusBlock', () => {
    const ref = createRef<NewsletterCanvasHandle>();
    renderCanvas({ ref });
    act(() => ref.current!.focusBlock('event_tiles-1'));
    expect(document.activeElement).toBe(screen.getAllByRole('tab')[2]);
  });

  // --- The block ceiling -----------------------------------------------------------------------

  it('refuses to insert past the block ceiling and says so', () => {
    const ref = createRef<NewsletterCanvasHandle>();
    const onInsert = vi.fn();
    renderCanvas({ onInsert, ref, maxBlocks: 4 });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This issue has 4 blocks, the most an issue can hold. Delete one before adding another.',
    );
    act(() => ref.current!.addAtEnd('text'));
    expect(onInsert).not.toHaveBeenCalled();
  });
});
