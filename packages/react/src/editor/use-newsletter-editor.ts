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
import { errorMessage } from '../lib/errors';
import { afterConfirmCloses } from '../lib/focus';
import { todayInZone } from '../period/today';
import { useConfirm } from '../ui/confirm';
import { useToasts } from '../ui/toast';
import type { EditorBlockDefinition } from './types';

/** The middle of the editor: the blocks to edit, or the email as recipients get it. */
export type EditorMode = 'canvas' | 'preview';

export interface UseNewsletterEditorOptions<B extends BlockBase = BuiltInBlock> {
  /** The document, controlled: every change comes back through `onChange`. */
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
  /** Deletes a block after asking, never a structural one; its neighbour takes the selection. */
  remove: (id: string) => Promise<void>;
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
}

const NO_SOURCES: readonly DataSource[] = [];
const NONE: ReadonlySet<string> = new Set();

const blockWord = (count: number): string => (count === 1 ? '1 block' : `${count} blocks`);

/**
 * The editor's state and operations, for `NewsletterEditor` and for a host laying the parts out
 * itself: selection, the insertion point, canvas or preview, running refreshes, and every edit,
 * each built on core's pure list operations and handed back through `onChange`.
 *
 * Call it inside a `BlockletterRoot`: deleting asks through its confirmation dialog, and refreshes
 * report through its toasts.
 *
 * The footer is repaired for display with `ensureFooter` (one footer, visible, last) and the repair
 * is written back with the next real edit; opening a document never changes it by itself. Each
 * operation works from the newest document it has handed out, so two refreshes that finish together
 * both land.
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
  const { toast } = useToasts();
  const confirm = useConfirm();
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

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    canvasRef.current?.focusBlock(id);
  });

  // The block the editor opened on, in view; once, on mount.
  useEffect(() => {
    if (initialSelection) canvasRef.current?.scrollToBlock(initialSelection);
  }, [initialSelection]);

  const commit = useCallback(
    (next: NewsletterDocument<BlockBase>) => {
      if (readOnly) return;
      latest.current = next as NewsletterDocument<B>;
      onChange(next as NewsletterDocument<B>);
    },
    [onChange, readOnly],
  );

  const setRunning = useCallback((ids: readonly string[], on: boolean) => {
    for (const id of ids) {
      if (on) running.current.add(id);
      else running.current.delete(id);
    }
    setRefreshing(new Set(running.current));
  }, []);

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
      commit({ ...doc, blocks: insertBlock<BlockBase>(doc.blocks, block, at) });
      setInsertTarget(null);
      setSelectedId(block.id);
      setMode('canvas');
      pendingFocus.current = block.id;
    },
    [brand, commit, definitions, maxBlocks, readOnly],
  );

  const move = useCallback(
    (from: number, to: number) => {
      const doc = latest.current;
      const block = doc.blocks[from];
      if (readOnly || !block || block.type === 'footer') return;
      const footerAt = doc.blocks.findIndex((item) => item.type === 'footer');
      const last = (footerAt < 0 ? doc.blocks.length : footerAt) - 1;
      const blocks = moveBlock<BlockBase>(doc.blocks, from, Math.max(0, Math.min(to, last)));
      if (blocks !== doc.blocks) commit({ ...doc, blocks });
    },
    [commit, readOnly],
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
      commit({ ...doc, blocks });
      setSelectedId(copy.id);
      pendingFocus.current = copy.id;
    },
    [commit, definitions, maxBlocks, readOnly, toast],
  );

  const remove = useCallback(
    async (id: string) => {
      const block = latest.current.blocks.find((item) => item.id === id);
      if (readOnly || !block || isStructural(block, definitions)) return;
      const name = blockLabel(block.type, definitions);
      const ok = await confirm({
        title: `Delete the ${name} block?`,
        description: 'Its content is removed from this issue. This can’t be undone.',
        confirmLabel: 'Delete block',
        destructive: true,
      });
      if (!ok) return;
      // Read again: the document may have changed while the question was open.
      const doc = latest.current;
      const at = doc.blocks.findIndex((item) => item.id === id);
      if (at < 0) return;
      const neighbour = doc.blocks[at + 1] ?? doc.blocks[at - 1];
      commit({ ...doc, blocks: removeBlock<BlockBase>(doc.blocks, id) });
      if (selection.current === id) {
        setSelectedId(neighbour?.id ?? null);
        // The toolbar that asked has gone with the block, so its neighbour takes the focus, once
        // the confirmation has handed focus back and closed.
        if (neighbour) afterConfirmCloses(() => canvasRef.current?.focusBlock(neighbour.id));
      }
      toast(`${name} deleted.`);
    },
    [commit, confirm, definitions, readOnly, toast],
  );

  const toggleHidden = useCallback(
    (id: string) => {
      const doc = latest.current;
      const block = doc.blocks.find((item) => item.id === id);
      if (readOnly || !block || (block.type === 'footer' && !block.hidden)) return;
      commit({ ...doc, blocks: toggleHiddenIn<BlockBase>(doc.blocks, id) });
    },
    [commit, readOnly],
  );

  const update = useCallback(
    (block: BlockBase) => {
      const doc = latest.current;
      const blocks = updateBlockIn<BlockBase>(doc.blocks, block);
      if (blocks !== doc.blocks) commit({ ...doc, blocks });
    },
    [commit],
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
        commit({ ...current, blocks: updateBlockIn<BlockBase>(current.blocks, next) });
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
    [commit, readOnly, setRunning, sources, toast],
  );

  const updatePeriod = useCallback(
    async (period: IssuePeriod) => {
      if (readOnly) return;
      const start = latest.current;
      commit({ ...start, period });
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
      if (blocks !== current.blocks) commit({ ...current, blocks });
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
    (subject: string) => commit({ ...latest.current, subject }),
    [commit],
  );
  const setPreheader = useCallback(
    (preheader: string) => commit({ ...latest.current, preheader }),
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
  };
}
