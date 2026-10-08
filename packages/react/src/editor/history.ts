/**
 * The editor's undo history, as plain data and pure functions over it: what `useNewsletterEditor`
 * keeps, and what its tests drive directly.
 *
 * Every change the editor makes to the document is a step: the document before it and after it,
 * and what it did, in words an announcement can finish ("Undid: deleted the Quote block"). Undo
 * hands back a step's `before`, redo its `after`, and a new change clears whatever was undone.
 *
 * The history also keeps the documents it handed the host. The editor is controlled, so the host
 * passes each of them back as `value`; a `value` that is none of them (another issue, a reload,
 * the host's own edit) is a document the history knows nothing about, and it starts over rather
 * than undo into a different issue.
 */

/** How many steps are kept. Past it, the oldest go. */
export const HISTORY_LIMIT = 100;

/** Edits with one key this close together, in milliseconds, are one step: a burst of typing. */
export const COALESCE_MS = 1000;

/**
 * The block chosen before a change and after it: undo chooses the first again, redo the second,
 * so whoever undoes sees the block that changed.
 */
export interface HistorySelection {
  before: string | null;
  after: string | null;
}

/** One change, as undo and redo replay it. */
export interface HistoryStep<D> {
  before: D;
  after: D;
  /** What the change did, lower case and in the past: "deleted the Quote block". */
  label: string;
  /** Edits that share a key (one field of one block) join into one step while they keep coming. */
  key?: string;
  /** When the step last grew, in milliseconds. */
  at: number;
  /** Absent for a change to the issue as a whole, which leaves the choice of block alone. */
  selection?: HistorySelection;
}

/** A change the editor has made, for `record`. */
export interface HistoryChange<D> extends HistoryStep<D> {
  /**
   * The step this change finishes, such as a period's refreshed blocks arriving after its new
   * dates: folded into that step while it is still the newest, however long it took.
   */
  continues?: HistoryStep<D>;
}

export interface EditHistory<D> {
  /** Steps that can be undone, oldest first. */
  readonly past: readonly HistoryStep<D>[];
  /** Steps undone and not yet redone; the next to redo is last. */
  readonly future: readonly HistoryStep<D>[];
  /**
   * The documents handed to the host, oldest first: the one it last passed back as `value`, then
   * any it has not passed back yet.
   */
  readonly emitted: readonly D[];
  /** The newest step takes no more edits by key: the next one is a step of its own (`endStep`). */
  readonly ended?: boolean;
}

export interface RecordOptions<D> {
  /** Default `HISTORY_LIMIT`. */
  limit?: number;
  /** Default `COALESCE_MS`. */
  coalesceMs?: number;
  /** Whether two documents say the same; default identity. A change to nothing is no step. */
  same?: (left: D, right: D) => boolean;
}

/** A history with nothing to undo, starting from the host's `value`. */
export function startHistory<D>(value: D): EditHistory<D> {
  return { past: [], future: [], emitted: [value] };
}

export const canUndo = (history: EditHistory<unknown>): boolean => history.past.length > 0;
export const canRedo = (history: EditHistory<unknown>): boolean => history.future.length > 0;

/** `emitted` with `document` handed out after it, never longer than the history itself. */
function handOut<D>(emitted: readonly D[], document: D, limit: number): D[] {
  return [...emitted, document].slice(-(limit + 1));
}

/**
 * The history once `change` is made: a step of its own, or the newest step grown by it (an edit
 * with the newest step's key, within `coalesceMs` of it, or the rest of a change it continues).
 * Whatever was undone can no longer be redone. A step that ends where it began, typed and then
 * erased, is dropped.
 */
export function record<D>(
  history: EditHistory<D>,
  change: HistoryChange<D>,
  options: RecordOptions<D> = {},
): EditHistory<D> {
  const { limit = HISTORY_LIMIT, coalesceMs = COALESCE_MS, same = Object.is } = options;
  const { continues, ...step } = change;
  const emitted = handOut(history.emitted, change.after, limit);
  const last = history.past.at(-1);
  const joins =
    last !== undefined &&
    (continues === last ||
      (!history.ended &&
        step.key !== undefined &&
        step.key === last.key &&
        step.at - last.at <= coalesceMs));
  if (last && joins) {
    const earlier = history.past.slice(0, -1);
    if (same(last.before, step.after)) return { past: earlier, future: [], emitted };
    const grown: HistoryStep<D> = { ...last, after: step.after, at: step.at };
    if (last.selection && step.selection) {
      grown.selection = { before: last.selection.before, after: step.selection.after };
    }
    return { past: [...earlier, grown], future: [], emitted };
  }
  if (same(step.before, step.after)) return { ...history, emitted };
  return { past: [...history.past, step].slice(-limit), future: [], emitted };
}

/**
 * The history with its newest step closed to edits that would join it by key, however soon they
 * come: a field's own command (bold, a list) is a step apart from the typing either side of it.
 * The rest of a change it continues still folds in.
 */
export function endStep<D>(history: EditHistory<D>): EditHistory<D> {
  return history.past.length && !history.ended ? { ...history, ended: true } : history;
}

/**
 * The newest step taken back, its `before` handed out; undefined when there is none. What is
 * typed next is a step of its own, never part of the one before.
 */
export function undo<D>(
  history: EditHistory<D>,
  limit: number = HISTORY_LIMIT,
): { history: EditHistory<D>; step: HistoryStep<D> } | undefined {
  const step = history.past.at(-1);
  if (!step) return undefined;
  return {
    step,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, step],
      emitted: handOut(history.emitted, step.before, limit),
      ended: true,
    },
  };
}

/** The step undone last put back, its `after` handed out, and closed as `undo` leaves it. */
export function redo<D>(
  history: EditHistory<D>,
  limit: number = HISTORY_LIMIT,
): { history: EditHistory<D>; step: HistoryStep<D> } | undefined {
  const step = history.future.at(-1);
  if (!step) return undefined;
  return {
    step,
    history: {
      past: [...history.past, step],
      future: history.future.slice(0, -1),
      emitted: handOut(history.emitted, step.after, limit),
      ended: true,
    },
  };
}

/**
 * What the host passed back as `value`. A document the history handed out, or a copy of one
 * (`same`, for a host that stores it and reads it back), confirms it and every one before it,
 * which also lets a host that passes its documents back late keep its history. Anything else is a
 * document the editor did not make, and the history starts over from it.
 */
export function receive<D>(
  history: EditHistory<D>,
  value: D,
  same: (left: D, right: D) => boolean = Object.is,
): EditHistory<D> {
  const { emitted } = history;
  let at = emitted.lastIndexOf(value);
  for (let index = emitted.length - 1; at < 0 && index >= 0; index -= 1) {
    const document = emitted[index];
    if (document !== undefined && same(document, value)) at = index;
  }
  if (at < 0) return startHistory(value);
  if (at === 0 && emitted[0] === value) return history;
  return { ...history, emitted: [value, ...emitted.slice(at + 1)] };
}
