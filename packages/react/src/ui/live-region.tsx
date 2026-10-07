import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/**
 * A visually hidden polite live region: what an action did, said to a screen reader without
 * moving focus ("Image inserted at position 3 of 8.", "Button moved to position 2 of 8.").
 *
 * Render it once, empty, from the start, and change its text when something happens. A region
 * that mounts already holding its message is not announced, and neither is a message identical
 * to the one before it.
 */
export function LiveRegion({ className, ...props }: ComponentProps<'p'>) {
  return <p aria-live="polite" className={cn('bl:sr-only', className)} {...props} />;
}
