import {
  Fragment,
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { EyeOffIcon } from 'lucide-react';
import {
  LIMITS,
  blockLabel,
  blockSummary,
  sourceFor,
  type BlockBase,
} from '@subterra-technologies/blockletter';
import { editorDefinition, useEditorContext } from '../editor/context';
import { cn } from '../lib/cn';
import { revealInScroller } from '../lib/scroll';
import { LiveRegion } from '../ui/live-region';
import { StatusBadge } from '../ui/status-badge';
import { CanvasBlock } from './canvas-block';
import { canvasTheme } from './canvas-theme';
import { CanvasToolbar } from './canvas-toolbar';

/** What is being dragged: a block already on the canvas, or a new one from the palette. */
type Dragging = { kind: 'move'; id: string; from: number } | { kind: 'new'; type: string };

/** Where a keyboard insertion should land, and how to say so ("above Event tiles"). */
export interface InsertTarget {
  index: number;
  label: string;
}

/**
 * The imperative surface an editor drives: the palette lives outside the canvas, so its drag
 * start and end, and its click to add, have to reach in.
 */
export interface NewsletterCanvasHandle {
  /** A palette drag started outside the canvas; show insertion points for it. */
  paletteDragStart: (type: string) => void;
  /** Clears the drag state; also called when a palette drag ends. */
  endDrag: () => void;
  /** Adds a block at the end of the body (before the footer): the palette's click path. */
  addAtEnd: (type: string) => void;
  /** Adds a block at a chosen slot: the palette's path for Insert above / below. */
  insertAt: (type: string, index: number) => void;
  /** Moves keyboard focus to a block's tab. */
  focusBlock: (id: string) => void;
  /**
   * Scrolls a block into view, leaving the focus where it is. Inside a scrolling pane (the
   * editor's fill layout), only that pane scrolls, never the page around it.
   */
  scrollToBlock: (id: string) => void;
}

export interface NewsletterCanvasProps {
  blocks: readonly BlockBase[];
  selectedId?: string | null;
  /** Nothing can be moved, added or changed. Defaults to the editor's own `readOnly`. */
  readOnly?: boolean;
  /** The block whose Refresh is running, which disables it. */
  refreshingId?: string | null;
  /** Id of the block editor while it is on screen, so each block tab can point at it. */
  editorPanelId?: string;
  maxBlocks?: number;
  /** A keyboard insertion point waiting for a palette choice; drawn as a line. */
  insertIndex?: number | null;
  /** `reveal: false` when the block was chosen by moving it, not by picking it. */
  onPick?: (id: string, options?: { reveal?: boolean }) => void;
  onReorder?: (move: { from: number; to: number }) => void;
  onInsert?: (insert: { type: string; index: number }) => void;
  onRequestInsert?: (target: InsertTarget) => void;
  onCancelInsert?: () => void;
  onToggleHidden?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onRemove?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  /**
   * Opens the selected block's form, for a layout where the inspector is out of view (the
   * editor's narrow fill layout). Given, the block's toolbar has an Edit button.
   */
  onEdit?: (id: string) => void;
  ref?: Ref<NewsletterCanvasHandle>;
}

/**
 * The newsletter as it will be emailed, drawn block by block on the email's own page colour and
 * 600px card. Each block is a drag source, a drop target and a click-to-select tab; the selected
 * one carries a toolbar. The selection outline, the name label, the insertion line and the
 * toolbar are the editor's; everything inside a block is the email's.
 *
 * Every drag gesture has a keyboard equivalent: the toolbar's arrows move a block, Alt + ↑/↓
 * does the same from the block itself, and Insert above / below sets an insertion point the
 * palette fills. Selection is a vertical tablist, so `aria-selected` is valid.
 *
 * The footer, which carries the unsubscribe line, stays last: it cannot be dragged, nothing moves
 * or drops below it, and an insertion after it lands just above it.
 *
 * A hidden block is left out of the email, so the canvas folds it to a bar that says so, rather
 * than fading it (faded text fails contrast, and still looks like part of the email).
 */
export function NewsletterCanvas({
  blocks,
  selectedId = null,
  readOnly,
  refreshingId = null,
  editorPanelId,
  maxBlocks = LIMITS.maxBlocks,
  insertIndex = null,
  onPick,
  onReorder,
  onInsert,
  onRequestInsert,
  onCancelInsert,
  onToggleHidden,
  onRefresh,
  onRemove,
  onDuplicate,
  onEdit,
  ref,
}: NewsletterCanvasProps) {
  const editor = useEditorContext();
  const { definitions, sources, brand, renderOptions } = editor;
  const locked = readOnly ?? editor.readOnly;
  const theme = useMemo(() => canvasTheme(brand, renderOptions), [brand, renderOptions]);
  const ids = useId();
  const headingId = `${ids}-heading`;
  const hintId = `${ids}-hint`;

  const tabsRef = useRef<(HTMLDivElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [dragging, setDragging] = useState<Dragging | null>(null);
  /** Insertion slot (0…count) the drop would land in, or `null` while nothing is dragging. */
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  /** Where the toolbar sits inside the stage, tracking the selected block's top right corner. */
  const [toolbarAt, setToolbarAt] = useState({ top: 0, right: 8 });

  const count = blocks.length;
  const footerIndex = blocks.findIndex((block) => block.type === 'footer');
  /** The last slot a block may land in: just above the footer, or the very end. */
  const lastSlot = footerIndex < 0 ? count : footerIndex;
  const bodyEnd = lastSlot - 1;
  const full = count >= maxBlocks;
  const label = useCallback((type: string) => blockLabel(type, definitions), [definitions]);

  const selectedIndex = blocks.findIndex((block) => block.id === selectedId);
  const selectedBlock = selectedIndex >= 0 ? blocks[selectedIndex] : undefined;

  // The toolbar lives outside the tablist, so it is placed by measuring the selected tab: when the
  // blocks or the selection change, and whenever the stage or that tab changes size (an edit that
  // grows the block, a narrower window).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const tab = tabsRef.current[selectedIndex];
    if (selectedIndex < 0 || !stage || !tab) return;
    const place = () => {
      const stageBox = stage.getBoundingClientRect();
      const tabBox = tab.getBoundingClientRect();
      const top = Math.max(4, Math.round(tabBox.top - stageBox.top - 18));
      const right = Math.max(4, Math.round(stageBox.right - tabBox.right + 8));
      setToolbarAt((current) =>
        current.top === top && current.right === right ? current : { top, right },
      );
    };
    place();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(place);
    observer.observe(stage);
    observer.observe(tab);
    return () => observer.disconnect();
  }, [blocks, selectedIndex]);

  const focusTab = useCallback((index: number) => {
    const tabs = tabsRef.current;
    const clamped = Math.max(0, Math.min(tabs.length - 1, index));
    tabs[clamped]?.focus();
  }, []);

  /**
   * A block moved from the keyboard (Alt + arrow), whose tab gets the focus back once it has
   * moved. Reordering moves some of the list's nodes in the document, and a browser drops the
   * focus of a node it moves: without this, Alt + ↓ would leave the keyboard on the page. Only
   * focus the move dropped is given back; focus that has gone somewhere else stays there.
   */
  const refocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = refocus.current;
    if (id === null) return;
    refocus.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    tabsRef.current[blocks.findIndex((block) => block.id === id)]?.focus();
  });

  const insertBlock = useCallback(
    (type: string, slot: number) => {
      if (locked || full) return;
      const index = Math.max(0, Math.min(slot, lastSlot));
      onInsert?.({ type, index });
      setAnnouncement(`${label(type)} inserted at position ${index + 1} of ${count + 1}.`);
    },
    [count, full, label, lastSlot, locked, onInsert],
  );

  /** Asks for the move and announces it; false when there is nowhere to move to. */
  const moveTo = useCallback(
    (from: number, to: number): boolean => {
      const block = blocks[from];
      if (!block || block.type === 'footer') return false;
      const destination = Math.min(to, bodyEnd);
      if (destination === from || destination < 0) return false;
      onReorder?.({ from, to: destination });
      setAnnouncement(`${label(block.type)} moved to position ${destination + 1} of ${count}.`);
      onPick?.(block.id, { reveal: false });
      return true;
    },
    [blocks, bodyEnd, count, label, onPick, onReorder],
  );

  /** Moves the block at `index` by `delta` positions and announces the result. */
  const move = useCallback(
    (index: number, delta: number): boolean => {
      const to = index + delta;
      if (locked || to < 0 || to >= count) return false;
      return moveTo(index, to);
    },
    [count, locked, moveTo],
  );

  const endDrag = useCallback(() => {
    setDragging(null);
    setDropIndex(null);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      paletteDragStart(type) {
        if (locked) return;
        setDragging({ kind: 'new', type });
      },
      endDrag,
      addAtEnd(type) {
        insertBlock(type, lastSlot);
      },
      insertAt(type, index) {
        insertBlock(type, index);
      },
      focusBlock(id) {
        const index = blocks.findIndex((block) => block.id === id);
        if (index >= 0) focusTab(index);
      },
      scrollToBlock(id) {
        const tab = tabsRef.current[blocks.findIndex((block) => block.id === id)];
        if (tab) revealInScroller(tab);
      },
    }),
    [blocks, endDrag, focusTab, insertBlock, lastSlot, locked],
  );

  // --- Pointer drag and drop ------------------------------------------------------------------

  function setDropEffect(event: DragEvent, current: Dragging | null): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.dropEffect = current?.kind === 'new' ? 'copy' : 'move';
  }

  function startMove(event: DragEvent<HTMLLIElement>, id: string, from: number): void {
    if (locked || blocks[from]?.type === 'footer') {
      event.preventDefault();
      return;
    }
    setDragging({ kind: 'move', id, from });
    event.dataTransfer?.setData('text/plain', `move:${id}`);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  function onRowDragOver(event: DragEvent<HTMLLIElement>, index: number): void {
    if (locked || !dragging) return;
    event.preventDefault();
    event.stopPropagation();
    const box = event.currentTarget.getBoundingClientRect();
    const after = event.clientY - box.top > box.height / 2;
    setDropIndex(Math.min(after ? index + 1 : index, lastSlot));
    setDropEffect(event, dragging);
  }

  function onSheetDragOver(event: DragEvent<HTMLOListElement>): void {
    if (locked || !dragging) return;
    event.preventDefault();
    if (dropIndex === null) setDropIndex(lastSlot);
    setDropEffect(event, dragging);
  }

  function onSheetLeave(event: DragEvent<HTMLOListElement>): void {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDropIndex(null);
  }

  function onDrop(event: DragEvent<HTMLOListElement>): void {
    event.preventDefault();
    const slot = dropIndex;
    const payload = event.dataTransfer?.getData('text/plain') ?? '';
    const current = dragging;
    endDrag();
    if (locked || slot === null) return;
    if (current?.kind === 'new' || payload.startsWith('new:')) {
      const type = current?.kind === 'new' ? current.type : payload.slice(4);
      if (type) insertBlock(type, slot);
      return;
    }
    const id = current?.kind === 'move' ? current.id : payload.slice(5);
    const from = blocks.findIndex((block) => block.id === id);
    if (from < 0) return;
    // The slot is an insertion point, so moving downwards closes the gap the block leaves behind.
    const to = slot > from ? slot - 1 : slot;
    if (to === from) return;
    moveTo(from, to);
  }

  // --- Keyboard equivalents -------------------------------------------------------------------

  function requestInsert(index: number, where: string): void {
    onRequestInsert?.({ index, label: where });
    setAnnouncement(`Insertion point set ${where}. Choose a block to insert.`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number, id: string): void {
    const { key, altKey } = event;
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      onPick?.(id);
      return;
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      const delta = key === 'ArrowDown' ? 1 : -1;
      // Alt + arrow is the keyboard replacement for dragging the block itself.
      if (altKey) {
        if (move(index, delta)) refocus.current = id;
        return;
      }
      focusTab(index + delta);
      return;
    }
    if (key === 'Home' || key === 'End') {
      event.preventDefault();
      focusTab(key === 'Home' ? 0 : count - 1);
      return;
    }
    if (key === 'Escape' && insertIndex !== null) {
      event.preventDefault();
      onCancelInsert?.();
    }
  }

  const markerAt = dropIndex ?? insertIndex;
  // A waiting keyboard insertion point says what it is; a drag line needs no words.
  const labelled = dropIndex === null && insertIndex !== null;
  const marker = (key: string) => (
    <li className="bl:relative bl:h-0" role="presentation" aria-hidden="true" key={key}>
      <span className="bl:absolute bl:inset-x-2 bl:-top-0.5 bl:z-[4] bl:block bl:h-1 bl:rounded-full bl:bg-canvas-mark bl:ring-2 bl:ring-white" />
      {labelled ? (
        // Above the line at the left, clear of the selected block's toolbar on the right.
        <span className="bl:absolute bl:bottom-1.5 bl:left-3 bl:z-[5] bl:rounded-full bl:bg-primary bl:px-2.5 bl:py-0.5 bl:font-sans bl:text-xs bl:font-medium bl:whitespace-nowrap bl:text-primary-foreground bl:ring-2 bl:ring-white">
          New block goes here
        </span>
      ) : null}
    </li>
  );

  return (
    <div className="bl:flex bl:flex-1 bl:flex-col" style={{ backgroundColor: theme.palette.page }}>
      <h2 id={headingId} className="bl:sr-only">
        Canvas
      </h2>
      <p className="bl:sr-only" id={hintId}>
        Choose a block to edit it. Drag a block to move it, or use its toolbar: the arrows move it,
        and Insert above or below adds a new block next to it. Alt with the up or down arrow moves
        the focused block too.
      </p>
      <LiveRegion>{announcement}</LiveRegion>

      <div ref={stageRef} className="bl:relative bl:flex-1 bl:px-2 bl:pt-7 bl:pb-12 bl:sm:px-6">
        {full ? (
          <p
            role="alert"
            className="bl:mx-auto bl:mb-3 bl:max-w-[600px] bl:rounded-md bl:border bl:bg-background bl:px-3 bl:py-2 bl:font-sans bl:text-[0.8125rem] bl:text-foreground"
          >
            This issue has {maxBlocks} blocks, the most an issue can hold. Delete one before adding
            another.
          </p>
        ) : null}
        <ol
          className="bl:@container/sheet bl:mx-auto bl:w-full bl:max-w-[600px] bl:overflow-hidden bl:rounded-[10px]"
          style={{
            backgroundColor: theme.palette.card,
            border: `1px solid ${theme.palette.border}`,
            fontFamily: theme.fonts.body,
          }}
          role="tablist"
          aria-orientation="vertical"
          aria-labelledby={headingId}
          aria-describedby={hintId}
          onDragOver={onSheetDragOver}
          onDrop={onDrop}
          onDragEnd={endDrag}
          onDragLeave={onSheetLeave}
        >
          {blocks.length === 0 ? (
            <li
              role="presentation"
              className="bl:px-6 bl:py-12 bl:text-center bl:font-sans bl:text-sm bl:text-muted-foreground"
            >
              <span className="bl:block bl:font-medium bl:text-foreground">
                This issue has no blocks yet
              </span>
              Add one from the block palette to start the layout.
            </li>
          ) : (
            blocks.map((block, index) => {
              const selected = selectedIndex === index;
              const nameId = `${ids}-name-${block.id}`;
              const statusId = `${ids}-status-${block.id}`;
              const name = label(block.type);
              const sourced = Boolean(sourceFor(block, sources));
              return (
                <Fragment key={block.id}>
                  {markerAt === index ? marker(`marker-${block.id}`) : null}
                  <li
                    className={cn(
                      'bl:relative bl:min-w-0',
                      dragging?.kind === 'move' && dragging.id === block.id && 'bl:opacity-40',
                    )}
                    role="presentation"
                    draggable={locked || block.type === 'footer' ? undefined : true}
                    onDragStart={(event) => startMove(event, block.id, index)}
                    onDragOver={(event) => onRowDragOver(event, index)}
                  >
                    {/* The email as it will look, for the eye. To assistive technology the block
                        is its tab; what it says is in the inspector's fields and the preview. */}
                    <div aria-hidden="true">
                      {block.hidden ? (
                        <HiddenBlock nameId={nameId} statusId={statusId} name={name} />
                      ) : (
                        <CanvasBlock
                          block={block}
                          definition={editorDefinition(block.type, definitions)}
                          definitions={definitions}
                          theme={theme}
                        />
                      )}
                    </div>
                    {/* The tab is laid over the drawing, not wrapped around it, so all it holds
                        is the name it is chosen by: the email's own words are no part of it. */}
                    <div
                      ref={(node) => {
                        tabsRef.current[index] = node;
                      }}
                      role="tab"
                      id={`${ids}-tab-${block.id}`}
                      aria-selected={selected}
                      aria-controls={editorPanelId}
                      aria-labelledby={block.hidden || sourced ? `${nameId} ${statusId}` : nameId}
                      // One tab stop: the selected block, else the first.
                      tabIndex={selected || (selectedIndex < 0 && index === 0) ? 0 : -1}
                      title={blockSummary(block, definitions)}
                      data-hidden={block.hidden || undefined}
                      onClick={() => onPick?.(block.id)}
                      onKeyDown={(event) => onKeyDown(event, index, block.id)}
                      className={cn(
                        'bl:group/block bl:absolute bl:inset-0 bl:z-[1] bl:cursor-pointer bl:scroll-my-12 bl:outline-none',
                        // The selection outline is drawn over the block, not around it, so it never
                        // moves the email's own layout. Two tones keep it visible on white and on the
                        // dark bands alike.
                        "bl:after:pointer-events-none bl:after:absolute bl:after:inset-0 bl:after:z-[2] bl:after:content-['']",
                        selected
                          ? 'bl:after:shadow-[inset_0_0_0_2px_var(--bl-canvas-mark),inset_0_0_0_3px_#ffffff]'
                          : 'bl:hover:after:shadow-[inset_0_0_0_1px_var(--bl-canvas-mark),inset_0_0_0_2px_rgba(255,255,255,0.8)]',
                        'bl:focus-visible:after:shadow-[inset_0_0_0_3px_var(--bl-canvas-mark),inset_0_0_0_5px_#ffffff]',
                      )}
                    >
                      {/* A hidden block's bar says its name already. */}
                      {block.hidden ? null : (
                        <span
                          className={cn(
                            'bl:pointer-events-none bl:absolute bl:top-0 bl:left-0 bl:z-[3] bl:flex bl:max-w-[calc(100%-1rem)] bl:items-center bl:gap-1 bl:rounded-br-md bl:bg-primary bl:px-2 bl:py-0.5 bl:font-sans bl:text-xs bl:leading-5 bl:font-medium bl:text-primary-foreground bl:transition-opacity bl:duration-150',
                            selected
                              ? 'bl:opacity-100'
                              : 'bl:opacity-0 bl:group-hover/block:opacity-100 bl:group-focus-visible/block:opacity-100',
                          )}
                        >
                          <span id={nameId} className="bl:truncate">
                            {name}
                          </span>
                          {sourced ? (
                            <span className="bl:shrink-0 bl:font-normal bl:whitespace-nowrap">
                              <span aria-hidden="true">· </span>
                              <span id={statusId}>Auto-filled</span>
                            </span>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </li>
                </Fragment>
              );
            })
          )}
          {markerAt !== null && markerAt >= count ? marker('marker-end') : null}
        </ol>
        {/* Outside the tablist: a tablist may own only tabs, and this keeps the toolbar the next
            Tab stop after the selected block. */}
        {selectedBlock && !locked ? (
          <div
            className="bl:absolute bl:z-10 bl:font-sans"
            style={{ top: `${toolbarAt.top}px`, right: `${toolbarAt.right}px` }}
          >
            <CanvasToolbar
              block={selectedBlock}
              index={selectedIndex}
              count={selectedBlock.type === 'footer' ? count : bodyEnd + 1}
              refreshing={refreshingId === selectedBlock.id}
              onMoveUp={() => move(selectedIndex, -1)}
              onMoveDown={() => move(selectedIndex, 1)}
              onInsertAbove={() =>
                requestInsert(selectedIndex, `above ${label(selectedBlock.type)}`)
              }
              onInsertBelow={() =>
                requestInsert(selectedIndex + 1, `below ${label(selectedBlock.type)}`)
              }
              onToggleHidden={() => onToggleHidden?.(selectedBlock.id)}
              onDuplicate={() => onDuplicate?.(selectedBlock.id)}
              onRefresh={() => onRefresh?.(selectedBlock.id)}
              onRemove={() => onRemove?.(selectedBlock.id)}
              onEdit={onEdit ? () => onEdit(selectedBlock.id) : undefined}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A hidden block: its name and "Hidden from email" on a dashed bar, at full contrast. */
function HiddenBlock({
  nameId,
  statusId,
  name,
}: {
  nameId: string;
  statusId: string;
  name: string;
}) {
  return (
    <div className="bl:flex bl:min-h-11 bl:min-w-0 bl:items-center bl:gap-2 bl:border bl:border-dashed bl:border-muted-foreground/60 bl:bg-muted bl:px-4 bl:py-2 bl:font-sans bl:text-[0.8125rem] bl:text-muted-foreground">
      <EyeOffIcon aria-hidden="true" className="bl:size-4 bl:shrink-0" />
      <span id={nameId} className="bl:min-w-0 bl:truncate bl:font-medium bl:text-foreground">
        {name}
      </span>
      <StatusBadge id={statusId} tone="neutral" className="bl:ml-auto">
        Hidden from email
      </StatusBadge>
    </div>
  );
}
