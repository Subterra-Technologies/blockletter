import type { RichText, TextSelection } from './model';

/** The field as it was at one moment: what it said, and where the selection was. */
export interface Snapshot {
  doc: RichText;
  selection: TextSelection;
}

/** Keystrokes that join one undo step when they come close together. */
export type Burst = 'insert' | 'delete';

export interface RichTextHistory {
  /**
   * Remembers the field as it is before a change, as a step to undo back to. A change that
   * continues a `burst` of the same kind (typing, say, less than a second after the last key)
   * joins the step already recorded instead. `take` is only called when a step is recorded.
   */
  record(take: () => Snapshot, burst?: Burst): void;
  /** Ends the burst, so the next keystroke starts a step of its own. */
  seal(): void;
  /** The field as it was a step ago, given how it is now (kept for redo); undefined at the start. */
  undo(current: Snapshot): Snapshot | undefined;
  redo(current: Snapshot): Snapshot | undefined;
  /** Forgets every step: the field now shows something it did not edit itself. */
  clear(): void;
}

const same = (a: Snapshot, b: Snapshot): boolean => JSON.stringify(a.doc) === JSON.stringify(b.doc);

/**
 * The field's own undo history. The browser's cannot serve: it records the DOM changes its own
 * editing makes, and the field redraws its DOM from the document after each command, which
 * leaves the browser's record pointing at nodes that are gone, so its undo does nothing or brings
 * back text from before the redraw.
 */
export function createHistory({
  limit = 100,
  burstMs = 1000,
  now = () => Date.now(),
}: { limit?: number; burstMs?: number; now?: () => number } = {}): RichTextHistory {
  let past: Snapshot[] = [];
  let future: Snapshot[] = [];
  let burst: { kind: Burst; at: number } | undefined;

  return {
    record(take, kind) {
      const time = now();
      if (kind && burst?.kind === kind && time - burst.at < burstMs) {
        burst.at = time;
        return;
      }
      past.push(take());
      if (past.length > limit) past = past.slice(past.length - limit);
      future = [];
      burst = kind ? { kind, at: time } : undefined;
    },
    seal() {
      burst = undefined;
    },
    undo(current) {
      burst = undefined;
      // A step recorded for a change that turned out to change nothing is skipped.
      let previous = past.pop();
      while (previous && same(previous, current)) previous = past.pop();
      if (previous) future.push(current);
      return previous;
    },
    redo(current) {
      burst = undefined;
      const next = future.pop();
      if (next) past.push(current);
      return next;
    },
    clear() {
      past = [];
      future = [];
      burst = undefined;
    },
  };
}
