import { newBlockId } from './ids';
import type { BlockBase } from './types';
import { cloneJson } from './util';

/**
 * Pure operations on a document's block list, shared by the editor and hosts. Each returns a new
 * array, or the very same array when nothing changed, so a state update can skip a no-op.
 */

/** Moves the block at `from` to `to`. Out-of-range or same-place moves change nothing. */
export function moveBlock<B extends BlockBase>(blocks: B[], from: number, to: number): B[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) {
    return blocks;
  }
  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  if (moved) next.splice(to, 0, moved);
  return next;
}

/**
 * Inserts `block` at `index` (clamped to the list). Without an index it goes at the end — before
 * a trailing footer, which stays last.
 */
export function insertBlock<B extends BlockBase>(blocks: B[], block: B, index?: number): B[] {
  const end = blocks.length - (blocks.at(-1)?.type === 'footer' ? 1 : 0);
  const at = index === undefined ? end : Math.min(Math.max(Math.trunc(index), 0), blocks.length);
  return [...blocks.slice(0, at), block, ...blocks.slice(at)];
}

/** Every block but the one with `id`. */
export function removeBlock<B extends BlockBase>(blocks: B[], id: string): B[] {
  return blocks.some((block) => block.id === id)
    ? blocks.filter((block) => block.id !== id)
    : blocks;
}

/** A deep copy of the block with `id`, with a fresh id, right after it. */
export function duplicateBlock<B extends BlockBase>(blocks: B[], id: string): B[] {
  const index = blocks.findIndex((block) => block.id === id);
  const original = blocks[index];
  if (!original) return blocks;
  const copy: B = { ...cloneJson(original), id: newBlockId(original.type) };
  return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
}

/** `block` in place of the block with the same id. */
export function updateBlock<B extends BlockBase>(blocks: B[], block: B): B[] {
  const index = blocks.findIndex((candidate) => candidate.id === block.id);
  if (index < 0 || blocks[index] === block) return blocks;
  const next = [...blocks];
  next[index] = block;
  return next;
}

/** Shows a hidden block, or hides a shown one, without deleting it. */
export function toggleHidden<B extends BlockBase>(blocks: B[], id: string): B[] {
  const index = blocks.findIndex((block) => block.id === id);
  const block = blocks[index];
  if (!block) return blocks;
  const next = [...blocks];
  next[index] = { ...block, hidden: !block.hidden };
  return next;
}

/**
 * Exactly one footer, visible and last, which is where the unsubscribe link lives. The last
 * footer in the list wins (inserting or duplicating happens before the original final one) and
 * keeps its content; every other block keeps its order and visibility. With no footer at all,
 * `createFooter` makes one. A pure repair: saving the result is the caller's decision.
 */
export function ensureFooter<T extends { id: string; type: string; hidden: boolean }>(
  blocks: T[],
  createFooter: (id: string) => T,
): T[] {
  const footers = blocks.filter((block) => block.type === 'footer');
  let footer = footers.at(-1);
  if (footer && footers.length === 1 && footer === blocks.at(-1) && !footer.hidden) return blocks;
  if (!footer) {
    const ids = new Set(blocks.map((block) => block.id));
    let id = 'required-footer';
    let suffix = 1;
    while (ids.has(id)) id = `required-footer-${suffix++}`;
    footer = createFooter(id);
  }
  return [
    ...blocks.filter((block) => block.type !== 'footer'),
    footer.hidden ? { ...footer, hidden: false } : footer,
  ];
}
