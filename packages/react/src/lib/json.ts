/**
 * Comparing plain-JSON values, which is all a newsletter document is. Both functions stop at a
 * shared part: two versions of a document keep every block an edit did not touch as the very
 * same object, so comparing them costs about the size of what changed, not of the issue.
 */

const isContainer = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The keys of an object, or the indexes of an array, that hold something. */
const keysOf = (value: unknown): string[] =>
  isContainer(value) ? Object.keys(value).filter((key) => value[key] !== undefined) : [];

/**
 * Whether two plain-JSON values are equal, key order aside. A key holding `undefined` counts as
 * absent, as it is once stored as JSON, so a document that went through a database and back is
 * the same document.
 */
export function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!isContainer(left) || !isContainer(right)) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => sameJson(item, right[index]))
    );
  }
  const keys = keysOf(left);
  return (
    keys.length === keysOf(right).length && keys.every((key) => sameJson(left[key], right[key]))
  );
}

/**
 * Where two plain-JSON values differ: the dotted paths of the leaves that changed, sorted
 * (`items.1.title`). A part added or removed whole counts by its own leaves, so the first
 * keystroke in an empty optional field and the next one both change `caption`, and the first
 * colour given to a block and every one after it change `style.background`.
 */
export function changedPaths(before: unknown, after: unknown): string[] {
  const paths: string[] = [];
  const walk = (left: unknown, right: unknown, path: string): void => {
    if (left === right) return;
    const keys = [...new Set([...keysOf(left), ...keysOf(right)])];
    // Two different leaves, or an empty object or list where something else was.
    if (keys.length === 0) {
      paths.push(path);
      return;
    }
    const child = (value: unknown, key: string) => (isContainer(value) ? value[key] : undefined);
    for (const key of keys) {
      walk(child(left, key), child(right, key), path ? `${path}.${key}` : key);
    }
  };
  walk(before, after, '');
  return paths.sort();
}
