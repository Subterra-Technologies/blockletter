import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  DEFAULT_BRAND,
  LIMITS,
  blockLabel,
  createBlock,
  duplicateBlock,
  ensureFooter,
  fillBlockTokens,
  getDefinition,
  insertBlock,
  isStructural,
  moveBlock,
  periodTokens,
  refreshBlock,
  removeBlock,
  sourceFor,
  suggestPeriod,
  toggleHidden as toggleHiddenIn,
  updateBlock as updateBlockIn,
  type BlockBase,
  type BrandKit,
  type BuiltInBlock,
  type DataSource,
  type IssuePeriod,
  type NewsletterDocument,
} from '@subterra-technologies/blockletter';
import { builtInEditorBlocks } from '../blocks';
import type { InsertTarget, NewsletterCanvasHandle } from '../canvas/canvas';
import { focusedTextField, placeCaret, type TextField } from '../lib/caret';
import { errorMessage } from '../lib/errors';
import { nextFrame } from '../lib/focus';
import { changedPaths, sameJson } from '../lib/json';
import { todayInZone } from '../period/today';
import { useToasts } from '../ui/toast';
import {
  canRedo as canRedoIn,
  canUndo as canUndoIn,
  endStep as endStepIn,
  receive,
  record,
  redo as redoIn,
  startHistory,
  undo as undoIn,
  type EditHistory,
  type HistorySelection,
  type HistoryStep,
} from './history';
import type { EditorBlockDefinition } from './types';

/** The middle of the editor: the blocks to edit, or the email as recipients get it. */
export type EditorMode = 'canvas' | 'preview';

export interface UseNewsletterEditorOptions<B extends BlockBase = BuiltInBlock> {
  /**
   * The document, controlled: every change comes back through `onChange`. Pass back what it
   * hands you (or a copy of it): a document it did not hand out starts its undo history over.
   */
  value: NewsletterDocument<B>;
  onChange: (value: NewsletterDocument<B>) => void;
  /** Default `builtInEditorBlocks`. Keep the list stable between renders. */
  definitions?: readonly EditorBlockDefinition[];
  sources?: readonly DataSource[];
  /** Fills a new block's tokens (`{{org}}`). Default `DEFAULT_BRAND`. */
  brand?: BrandKit;
  /** Default `LIMITS.maxBlocks`. */
  maxBlocks?: number;
  /** Every operation does nothing. */
  readOnly?: boolean;
  defaultMode?: EditorMode;
  /**
   * A block to have selected from the start (a deep link), brought into view on the canvas
   * without taking the focus from the page. Read once, on mount.
   */
  defaultSelectedId?: string;
}

export interface NewsletterEditorApi<B extends BlockBase = BuiltInBlock> {
  /** The document as the editor shows it: `value`, with exactly one footer, visible and last. */
  document: NewsletterDocument<B>;
  selectedId: string | null;
  selected: BlockBase | undefined;
  /** Where the next palette choice lands, while Insert above / below waits for one. */
  insertTarget: InsertTarget | null;
  mode: EditorMode;
  /** Blocks whose refresh is running. */
  refreshing: ReadonlySet<string>;
  maxBlocks: number;
  /** The document holds `maxBlocks` blocks: nothing more can be added. */
  full: boolean;
  /** Give it to `NewsletterCanvas` as `ref`: the editor focuses blocks through it. */
  canvasRef: RefObject<NewsletterCanvasHandle | null>;
  select: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
  requestInsert: (target: InsertTarget) => void;
  /** Clears the insertion point and gives focus back to the selected block. */
  cancelInsert: () => void;
  /**
   * Adds a fresh block of `type`, its tokens filled for the document's period and brand, at
   * `index` (never below the footer; default just above it), then selects and focuses it. A
   * structural block the issue already has is not added again.
   */
  insert: (type: string, index?: number) => void;
  /** Moves a block between body positions; the footer stays last. */
  move: (from: number, to: number) => void;
  /** Copies a block (not a structural one) right after it, and selects the copy. */
  duplicate: (id: string) => void;
  /**
   * Deletes a block straight away, never a structural one; its neighbour takes the selection, and
   * a toast offers Undo for as long as nothing else has changed.
   */
  remove: (id: string) => void;
  /** Hides or shows a block. A visible footer cannot be hidden: it carries the unsubscribe line. */
  toggleHidden: (id: string) => void;
  /** Replaces the block with the same id. */
  update: (block: BlockBase) => void;
  /** Re-reads a block from the data source that fills it. */
  refresh: (id: string) => Promise<void>;
  /** Sets the period, then refreshes every block a registered source fills, for the new dates. */
  updatePeriod: (period: IssuePeriod) => Promise<void>;
  setSubject: (subject: string) => void;
  setPreheader: (preheader: string) => void;
  /**
   * Takes back the newest change to the document, any of the above, handing `onChange` the
   * document as it was and choosing again the block the change was made to. Typing in one field
   * joins into one change while it keeps coming, so an undo takes back a burst of typing, not a
   * letter. A toast says what was undone, and a screen reader reads it out.
   */
  undo: () => void;
  /** Puts back the change undone last. A new change clears whatever could be redone. */
  redo: () => void;
  /**
   * Closes the newest step, so the next change is a step of its own even where it would have
   * joined it as typing: for a field's own command, such as making words bold, which should undo
   * apart from the typing either side of it.
   */
  endStep: () => void;
  /** There is a change to undo. Never while read-only. */
  canUndo: boolean;
  /** There is an undone change to redo. Never while read-only. */
  canRedo: boolean;
}

type Doc = NewsletterDocument<BlockBase>;

/** What a change did, for the history: its words, and how it joins others and moves the choice. */
interface ChangeNote {
  label: string;
  key?: string;
  selection?: HistorySelection;
  continues?: HistoryStep<Doc>;
}

const NO_SOURCES: readonly DataSource[] = [];
const NONE: ReadonlySet<string> = new Set();

const blockWord = (count: number): string => (count === 1 ? '1 block' : `${count} blocks`);

/**
 * The editor's state and operations, for `NewsletterEditor` and for a host laying the parts out
 * itself: selection, the insertion point, canvas or preview, running refreshes, and every edit,
 * each built on core's pure list operations and handed back through `onChange`.
 *
 * Call it inside a `BlockletterRoot`: refreshes, deletions and undo report through its toasts.
 *
 * The footer is repaired for display with `ensureFooter` (one footer, visible, last) and the repair
 * is written back with the next real edit; opening a document never changes it by itself. Each
 * operation works from the newest document it has handed out, so two refreshes that finish together
 * both land.
 *
 * Every change is a step in an undo history (`undo`, `redo`), which holds the documents handed to
 * `onChange`. A `value` that is none of them, such as another issue or the same one reloaded,
 * starts the history over, so an undo can never reach into a document that is not on screen.
 */
export function useNewsletterEditor<B extends BlockBase = BuiltInBlock>({
  value,
  onChange,
  definitions = builtInEditorBlocks,
  sources = NO_SOURCES,
  brand = DEFAULT_BRAND,
  maxBlocks = LIMITS.maxBlocks,
  readOnly = false,
  defaultMode = 'canvas',
  defaultSelectedId,
}: UseNewsletterEditorOptions<B>): NewsletterEditorApi<B> {
  const { toast, dismiss } = useToasts();
  const [initialSelection] = useState(() =>
    value.blocks.some((block) => block.id === defaultSelectedId) ? defaultSelectedId : undefined,
  );
  const [selectedId, setSelectedId] = useState<string | null>(initialSelection ?? null);
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);
  const [mode, setMode] = useState<EditorMode>(defaultMode);
  const [refreshing, setRefreshing] = useState<ReadonlySet<string>>(NONE);
  const canvasRef = useRef<NewsletterCanvasHandle | null>(null);
  /** A block to focus on the canvas once the render that shows it is done. */
  const pendingFocus = useRef<string | null>(null);
  /** The same as `refreshing`, readable before React renders, so a refresh never runs twice. */
  const running = useRef(new Set<string>());

  /** The history itself, which every operation reads the moment it runs. */
  const history = useRef<EditHistory<Doc>>(startHistory<Doc>(value));
  /** Whether there is anything to undo or redo, as this render shows it. */
  const [undoable, setUndoable] = useState(false);
  const [redoable, setRedoable] = useState(false);
  /** The toast offering Undo for a deletion, withdrawn once anything else changes. */
  const offer = useRef<number | null>(null);
  /** The toast saying what the last undo or redo did, replaced by the next. */
  const said = useRef<number | null>(null);
  /** After the deletion toast's Undo, which goes with its toast: put the focus somewhere useful. */
  const recover = useRef(false);
  /** The text field an undo or redo began in, and what it said, to put its caret back after. */
  const caret = useRef<{ field: TextField; text: string } | null>(null);

  const footer = getDefinition('footer', definitions);
  const document = useMemo((): NewsletterDocument<B> => {
    if (!footer) return value;
    const blocks = ensureFooter<BlockBase>(value.blocks, (id) => ({
      ...footer.create(),
      id,
      type: 'footer',
      hidden: false,
    }));
    return blocks === value.blocks ? value : { ...value, blocks: blocks as B[] };
  }, [value, footer]);

  /**
   * The newest document: what was handed to `onChange` last, until the next render shows what the
   * host made of it. Async work (a refresh) reads this, never the render it started in.
   */
  const latest = useRef(document);
  /** The selection as of the last render, for an answer that arrives after an await. */
  const selection = useRef(selectedId);
  useLayoutEffect(() => {
    latest.current = document;
    selection.current = selectedId;
  });

  const keep = useCallback((next: EditHistory<Doc>) => {
    history.current = next;
    setUndoable(canUndoIn(next));
    setRedoable(canRedoIn(next));
  }, []);

  /** Takes back the deletion toast, whose Undo would now undo something else. */
  const withdrawOffer = useCallback(() => {
    if (offer.current === null) return;
    dismiss(offer.current);
    offer.current = null;
  }, [dismiss]);

  // What the host passed back. One of the documents handed out confirms it; anything else (another
  // issue, a reload) starts the history over. Before paint, so Undo is never offered for a
  // document that is not the one on screen.
  useLayoutEffect(() => {
    const current = history.current;
    const next = receive(current, value as Doc, sameJson);
    if (next === current) return;
    history.current = next;
    if (next.past === current.past && next.future === current.future) return;
    withdrawOffer();
    keep(next);
  }, [value, keep, withdrawOffer]);

  useLayoutEffect(() => {
    const pending = caret.current;
    if (!pending) return;
    caret.current = null;
    placeCaret(pending.field, pending.text);
  });

  useEffect(() => {
    const id = pendingFocus.current;
    if (id) {
      pendingFocus.current = null;
      canvasRef.current?.focusBlock(id);
    }
    if (!recover.current) return;
    recover.current = false;
    const active = globalThis.document.activeElement;
    if (selectedId && (!active || active === active.ownerDocument.body)) {
      canvasRef.current?.focusBlock(selectedId);
    }
  });

  // The block the editor opened on, in view; once, on mount. A frame later, so the layout the
  // editor settles on as it measures itself (its fill layout's panes) is the one scrolled.
  useEffect(() => {
    if (!initialSelection) return;
    return nextFrame(() => canvasRef.current?.scrollToBlock(initialSelection));
  }, [initialSelection]);

  /** Hands `next` to the host as a step in the history; returns the step it now belongs to. */
  const commit = useCallback(
    (next: Doc, note: ChangeNote): HistoryStep<Doc> | undefined => {
      if (readOnly) return undefined;
      const before = latest.current as Doc;
      withdrawOffer();
      keep(
        record(
          history.current,
          { ...note, before, after: next, at: Date.now() },
          { same: sameJson },
        ),
      );
      latest.current = next as NewsletterDocument<B>;
      onChange(next as NewsletterDocument<B>);
      const step = history.current.past.at(-1);
      return step?.after === next ? step : undefined;
    },
    [keep, onChange, readOnly, withdrawOffer],
  );

  /**
   * Hands back a document from the history (undo or redo), choosing `chosen` (`undefined` leaves
   * the choice alone) and saying what happened.
   */
  const restore = useCallback(
    (next: Doc, rest: EditHistory<Doc>, chosen: string | null | undefined, message: string) => {
      withdrawOffer();
      const field = focusedTextField();
      caret.current = field ? { field, text: field.value } : null;
      keep(rest);
      latest.current = next as NewsletterDocument<B>;
      onChange(next as NewsletterDocument<B>);
      // An insertion point counts positions in the document that has just been replaced.
      setInsertTarget(null);
      // The block the step chose; where it chose none, whatever is chosen now, while it is there.
      const present = (id: string | null): id is string =>
        id !== null && next.blocks.some((block) => block.id === id);
      if (chosen !== undefined) {
        setSelectedId((current) => (present(chosen) ? chosen : present(current) ? current : null));
      }
      if (said.current !== null) dismiss(said.current);
      said.current = toast(message, { tone: 'info' });
    },
    [dismiss, keep, onChange, toast, withdrawOffer],
  );

  const undo = useCallback(() => {
    if (readOnly) return;
    const result = undoIn(history.current);
    if (!result) return;
    const { step } = result;
    restore(step.before, result.history, step.selection?.before, `Undid: ${step.label}.`);
  }, [readOnly, restore]);

  const redo = useCallback(() => {
    if (readOnly) return;
    const result = redoIn(history.current);
    if (!result) return;
    const { step } = result;
    restore(step.after, result.history, step.selection?.after, `Redid: ${step.label}.`);
  }, [readOnly, restore]);

  const endStep = useCallback(() => {
    history.current = endStepIn(history.current);
  }, []);

  /** The newest `undo`, for a toast's Undo, which outlives the render that made it. */
  const latestUndo = useRef(undo);
  useLayoutEffect(() => {
    latestUndo.current = undo;
  });

  const setRunning = useCallback((ids: readonly string[], on: boolean) => {
    for (const id of ids) {
      if (on) running.current.add(id);
      else running.current.delete(id);
    }
    setRefreshing(new Set(running.current));
  }, []);

  const name = useCallback((type: string) => blockLabel(type, definitions), [definitions]);

  const insert = useCallback(
    (type: string, index?: number) => {
      const doc = latest.current;
      if (readOnly || doc.blocks.length >= maxBlocks || !getDefinition(type, definitions)) return;
      // An issue holds one of each structural block (its header, its footer).
      if (isStructural({ type }, definitions) && doc.blocks.some((item) => item.type === type)) {
        return;
      }
      // A document without dates still gets this month's in a fresh header's `{{monthYear}}`.
      const period = doc.period ?? suggestPeriod(todayInZone(undefined));
      const block = fillBlockTokens(createBlock(type, definitions), periodTokens(period, brand));
      const footerAt = doc.blocks.findIndex((item) => item.type === 'footer');
      const lastSlot = footerAt < 0 ? doc.blocks.length : footerAt;
      const at =
        index === undefined ? lastSlot : Math.max(0, Math.min(Math.trunc(index), lastSlot));
      commit(
        { ...doc, blocks: insertBlock<BlockBase>(doc.blocks, block, at) },
        {
          label: `added the ${name(type)} block`,
          selection: { before: selection.current, after: block.id },
        },
      );
      setInsertTarget(null);
      setSelectedId(block.id);
      setMode('canvas');
      pendingFocus.current = block.id;
    },
    [brand, commit, definitions, maxBlocks, name, readOnly],
  );

  const move = useCallback(
    (from: number, to: number) => {
      const doc = latest.current;
      const block = doc.blocks[from];
      if (readOnly || !block || block.type === 'footer') return;
      const footerAt = doc.blocks.findIndex((item) => item.type === 'footer');
      const last = (footerAt < 0 ? doc.blocks.length : footerAt) - 1;
      const blocks = moveBlock<BlockBase>(doc.blocks, from, Math.max(0, Math.min(to, last)));
      if (blocks === doc.blocks) return;
      commit(
        { ...doc, blocks },
        {
          label: `moved the ${name(block.type)} block`,
          selection: { before: block.id, after: block.id },
        },
      );
    },
    [commit, name, readOnly],
  );

  const duplicate = useCallback(
    (id: string) => {
      const doc = latest.current;
      const block = doc.blocks.find((item) => item.id === id);
      if (readOnly || !block || isStructural(block, definitions)) return;
      if (doc.blocks.length >= maxBlocks) {
        toast(`An issue holds at most ${maxBlocks} blocks. Delete one before adding another.`, {
          tone: 'error',
        });
        return;
      }
      const blocks = duplicateBlock<BlockBase>(doc.blocks, id);
      const copy = blocks[blocks.findIndex((item) => item.id === id) + 1];
      if (!copy) return;
      commit(
        { ...doc, blocks },
        {
          label: `duplicated the ${name(block.type)} block`,
          selection: { before: id, after: copy.id },
        },
      );
      setSelectedId(copy.id);
      pendingFocus.current = copy.id;
    },
    [commit, definitions, maxBlocks, name, readOnly, toast],
  );

  const remove = useCallback(
    (id: string) => {
      const doc = latest.current;
      const at = doc.blocks.findIndex((item) => item.id === id);
      const block = doc.blocks[at];
      if (readOnly || !block || isStructural(block, definitions)) return;
      const label = name(block.type);
      const chosen = selection.current === id;
      const neighbour = doc.blocks[at + 1] ?? doc.blocks[at - 1];
      const after = chosen ? (neighbour?.id ?? null) : selection.current;
      // No question first: the deletion is a step like any other, and Undo puts the block back.
      const step = commit(
        { ...doc, blocks: removeBlock<BlockBase>(doc.blocks, id) },
        { label: `deleted the ${label} block`, selection: { before: id, after } },
      );
      if (chosen) {
        setSelectedId(after);
        // The toolbar that deleted it has gone with the block, so its neighbour takes the focus.
        pendingFocus.current = after;
      }
      if (!step) return;
      offer.current = toast(`${label} deleted.`, {
        action: {
          label: 'Undo',
          // Only ever this deletion: the toast is withdrawn as soon as anything else changes.
          onSelect: () => {
            if (history.current.past.at(-1) !== step) return;
            recover.current = true;
            latestUndo.current();
          },
        },
      });
    },
    [commit, definitions, name, readOnly, toast],
  );

  const toggleHidden = useCallback(
    (id: string) => {
      const doc = latest.current;
      const block = doc.blocks.find((item) => item.id === id);
      if (readOnly || !block || (block.type === 'footer' && !block.hidden)) return;
      commit(
        { ...doc, blocks: toggleHiddenIn<BlockBase>(doc.blocks, id) },
        {
          label: `${block.hidden ? 'showed' : 'hid'} the ${name(block.type)} block`,
          selection: { before: id, after: id },
        },
      );
    },
    [commit, name, readOnly],
  );

  const update = useCallback(
    (block: BlockBase) => {
      const doc = latest.current;
      const previous = doc.blocks.find((item) => item.id === block.id);
      const blocks = updateBlockIn<BlockBase>(doc.blocks, block);
      if (!previous || blocks === doc.blocks) return;
      // Where the edit landed: typing on in the same field joins the same step. So does typing
      // after a first keystroke that set more besides (a plain text block's first edit also sets
      // its `format`): an edit to some of the newest step's paths is in the same field.
      const paths = changedPaths(previous, block);
      const look =
        paths.length > 0 && paths.every((path) => path === 'style' || path.startsWith('style.'));
      const field = `block:${block.id}:`;
      const newest = history.current.past.at(-1)?.key;
      const within = newest?.startsWith(field) ? newest.slice(field.length).split(' ') : [];
      commit(
        { ...doc, blocks },
        {
          label: look
            ? `changed the ${name(block.type)} block’s appearance`
            : `edited the ${name(block.type)} block`,
          key:
            newest && paths.every((path) => within.includes(path))
              ? newest
              : field + paths.join(' '),
          selection: { before: block.id, after: block.id },
        },
      );
    },
    [commit, name],
  );

  const refresh = useCallback(
    async (id: string) => {
      const doc = latest.current;
      const block = doc.blocks.find((item) => item.id === id);
      const source = block ? sourceFor(block, sources) : undefined;
      if (readOnly || !block || !source || running.current.has(id)) return;
      setRunning([id], true);
      try {
        const next = await refreshBlock(block, source, doc.period ? { period: doc.period } : {});
        const current = latest.current;
        const now = current.blocks.find((item) => item.id === id);
        if (!now) return;
        // Someone edited the block while it was refreshing: their edit wins over old data.
        if (now !== block) {
          toast(
            `The block changed while it was refreshing, so the ${source.label} data was not applied. Refresh it again to use it.`,
            { tone: 'info' },
          );
          return;
        }
        commit(
          { ...current, blocks: updateBlockIn<BlockBase>(current.blocks, next) },
          {
            label: `refreshed the ${name(block.type)} block from ${source.label}`,
            selection: { before: id, after: id },
          },
        );
        toast(`Refreshed from ${source.label}.`);
      } catch (cause: unknown) {
        toast(
          errorMessage(cause, `The block could not be refreshed from ${source.label}. Try again.`),
          { tone: 'error' },
        );
      } finally {
        setRunning([id], false);
      }
    },
    [commit, name, readOnly, setRunning, sources, toast],
  );

  const updatePeriod = useCallback(
    async (period: IssuePeriod) => {
      if (readOnly) return;
      const start = latest.current;
      // The step the refreshed blocks join, so one undo puts back the dates and what they listed.
      const step = commit({ ...start, period }, { label: 'updated the period' });
      const sourced = start.blocks.flatMap((block) => {
        const source = sourceFor(block, sources);
        return source ? [{ block: block as BlockBase, source }] : [];
      });
      if (sourced.length === 0) return;
      const ids = sourced.map(({ block }) => block.id);
      setRunning(ids, true);
      const results = await Promise.allSettled(
        sourced.map(({ block, source }) => refreshBlock(block, source, { period })),
      );
      const current = latest.current;
      // The dates were changed back meanwhile (an undo): what the sources gave for them is stale.
      if (!sameJson(current.period, period)) {
        setRunning(ids, false);
        return;
      }
      let blocks: BlockBase[] = current.blocks;
      let failed = 0;
      results.forEach((result, index) => {
        const original = sourced[index]?.block;
        if (result.status === 'rejected') {
          failed += 1;
          return;
        }
        // Anything edited meanwhile keeps its edit.
        if (!original || blocks.find((item) => item.id === original.id) !== original) return;
        blocks = updateBlockIn(blocks, result.value);
      });
      if (blocks !== current.blocks) {
        commit({ ...current, blocks }, { label: 'updated the period', continues: step });
      }
      setRunning(ids, false);
      if (failed) {
        toast(
          `${blockWord(failed)} could not be refreshed for the new dates. Refresh them again from the canvas.`,
          { tone: 'error' },
        );
      } else {
        toast(`Period updated. ${blockWord(sourced.length)} refreshed for the new dates.`);
      }
    },
    [commit, readOnly, setRunning, sources, toast],
  );

  const setSubject = useCallback(
    (subject: string) =>
      void commit({ ...latest.current, subject }, { label: 'edited the subject', key: 'subject' }),
    [commit],
  );
  const setPreheader = useCallback(
    (preheader: string) =>
      void commit(
        { ...latest.current, preheader },
        { label: 'edited the preview line', key: 'preheader' },
      ),
    [commit],
  );

  const select = useCallback((id: string | null) => setSelectedId(id), []);
  const requestInsert = useCallback((target: InsertTarget) => setInsertTarget(target), []);
  const cancelInsert = useCallback(() => {
    setInsertTarget(null);
    pendingFocus.current = selectedId;
  }, [selectedId]);

  return {
    document,
    selectedId,
    selected: document.blocks.find((block) => block.id === selectedId),
    insertTarget,
    mode,
    refreshing,
    maxBlocks,
    full: document.blocks.length >= maxBlocks,
    canvasRef,
    select,
    setMode,
    requestInsert,
    cancelInsert,
    insert,
    move,
    duplicate,
    remove,
    toggleHidden,
    update,
    refresh,
    updatePeriod,
    setSubject,
    setPreheader,
    undo,
    redo,
    endStep,
    canUndo: undoable && !readOnly,
    canRedo: redoable && !readOnly,
  };
}
