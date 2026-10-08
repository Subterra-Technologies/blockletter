import { ConvexError } from 'convex/values';

/**
 * What to tell the person when a Convex function refuses: the functions in `convex/` throw a
 * `ConvexError` with a message and the problems to fix, which reach the client intact.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const { message, problems } = error.data as { message: string; problems: string[] };
    return [message, ...problems].join(' ');
  }
  return 'Something went wrong. Try again.';
}
