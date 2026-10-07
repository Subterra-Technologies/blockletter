import type { BlockBase } from '@subterra-technologies/blockletter';

/**
 * The plumbing every block editor shares. An editor holds no copy of its block: each field reads
 * straight off the `block` prop and writes a whole next block through `onChange`, and the host
 * re-renders the editor with the block it stored. The one rule is the no-op guard — a change
 * that changes nothing is never emitted, so a host that saves on every change never loops.
 */

/** Structural equality for plain-JSON blocks. */
export function sameBlock(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** The two emitters an editor body uses: a whole replacement block, or a field merge. */
export interface BlockEditorApi<B extends BlockBase> {
  /** Emits `next` only when it differs from the current block. */
  commit: (next: B) => void;
  /** Merges `changes` onto the current block and emits it when something differs. */
  patch: (changes: Partial<B>) => void;
}

export function blockEditor<B extends BlockBase>(
  block: B,
  onChange: (block: B) => void,
): BlockEditorApi<B> {
  const commit = (next: B): void => {
    if (!sameBlock(next, block)) onChange(next);
  };
  return {
    commit,
    patch: (changes) => commit({ ...block, ...changes }),
  };
}

/**
 * Sets an optional text field, or drops it when the value is blank, so a stored block never
 * carries an empty `linkUrl` that validation and the renderer would each have to second-guess.
 */
export function withOptional<T extends object, K extends keyof T>(
  value: T,
  key: K,
  text: string | undefined,
): T {
  const next = { ...value };
  if (text?.trim()) {
    (next as Record<K, unknown>)[key] = text;
  } else {
    delete next[key];
  }
  return next;
}

/** Sets an optional image (or any optional field), or drops it when `next` is undefined. */
export function withImage<T extends object, K extends keyof T>(
  value: T,
  key: K,
  next: T[K] | undefined,
): T {
  const result = { ...value };
  if (next === undefined) delete result[key];
  else result[key] = next;
  return result;
}
