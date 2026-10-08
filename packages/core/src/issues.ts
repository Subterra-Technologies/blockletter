import type { BlockBase } from './types';

/**
 * A soft warning about a block, of the kind an editor shows while the block is chosen ("Add alt
 * text…"): its English, and for the built-in blocks a stable code and the values in it, so an
 * editor in another language can word the same warning itself.
 */
export interface BlockIssue {
  /** Stable from release to release. Absent for an issue a definition gives only in words. */
  code?: string;
  message: string;
  /** What `message` was made from beyond its code: a limit, or which field it is about. */
  values?: Readonly<Record<string, string | number>>;
}

type Issues = (block: BlockBase) => string[];
type Check = (block: BlockBase) => BlockIssue[];

/** Each `issues` made by `issuesFrom`, and the coded issues it reads its words from. */
const CHECKS = new WeakMap<Issues, Check>();

/**
 * A definition's `issues` that keeps its coded issues within reach of `codedIssues`. They stay
 * found for as long as a definition carries this very function, so a host that spreads a built-in
 * block into one of its own keeps them, while one that writes `issues` of its own has its words
 * shown as they are.
 */
export function issuesFrom<B extends BlockBase>(
  check: (block: B) => BlockIssue[],
): (block: B) => string[] {
  const issues = (block: B): string[] => check(block).map((issue) => issue.message);
  // Safe: the editor and the renderer only ever give a definition blocks of its own type.
  CHECKS.set(issues as unknown as Issues, check as unknown as Check);
  return issues;
}

/** The coded issues behind an `issues` made by `issuesFrom`; undefined for any other. */
export const codedIssues = (issues: Issues): Check | undefined => CHECKS.get(issues);
