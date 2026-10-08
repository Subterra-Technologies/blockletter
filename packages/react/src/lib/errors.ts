/**
 * The sentence to show when something the host was asked to do fails: saving a brand kit,
 * uploading an image, loading a data source.
 *
 * A refusal written for a person is shown as written — an `Error` the host threw with a message
 * of its own, a plain string, or a structured error carrying `data.message` (Convex's
 * `ConvexError`, among others). Anything else becomes `fallback`: a `TypeError` from a dropped
 * connection ("Failed to fetch"), or a message that reads like a server log (a request id, a
 * validator dump). Nobody can act on those, and they may say more than the host intended.
 */
/**
 * Text that belongs to a stack trace or a backend's internals rather than to a person. A frame's
 * indent is spaces and tabs only: with `\s`, a run of blank lines could be rescanned from each of
 * its newlines.
 */
const TECHNICAL = /\[CONVEX|Request ID|ArgumentValidationError|^[ \t]*at\s|\n[ \t]+at\s/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Built-in error types a program raises rather than a person meant to be read. */
const isProgramError = (cause: unknown): boolean =>
  cause instanceof TypeError ||
  cause instanceof RangeError ||
  cause instanceof ReferenceError ||
  cause instanceof SyntaxError;

function messageOf(cause: unknown): string {
  if (typeof cause === 'string') return cause;
  if (!isRecord(cause)) return '';
  const data = cause.data;
  if (isRecord(data) && typeof data.message === 'string') return data.message;
  if (typeof data === 'string') return data;
  if (cause instanceof Error) return isProgramError(cause) ? '' : cause.message;
  return '';
}

export function errorMessage(cause: unknown, fallback: string): string {
  const message = messageOf(cause).trim();
  return message && !TECHNICAL.test(message) ? message : fallback;
}
