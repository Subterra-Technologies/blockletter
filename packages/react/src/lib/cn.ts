import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge has to be told about the `bl` prefix: without it no `bl:` class looks like
 * Tailwind to it, nothing is deduplicated, and a caller's `bl:p-4` could lose to a component's
 * own `bl:p-2` on stylesheet order alone.
 */
const merge = extendTailwindMerge({ prefix: 'bl' });

/**
 * Joins class names the way `clsx` does (strings, arrays, `{ class: condition }` objects) and
 * resolves conflicting Blockletter utilities so the last one wins: `cn('bl:p-2', 'bl:p-4')` is
 * `'bl:p-4'`. Use it to pass `className` overrides to the editor's parts.
 */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
