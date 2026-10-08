import type { EditorFormat, EditorMessageOverrides, EditorMessages } from './messages';

/**
 * The messages as the editor's parts call them: every phrase with the editor's `format` already
 * given, so a part passes only the values.
 */
export type BoundMessages<T = EditorMessages> = {
  readonly [K in keyof T]: T[K] extends (...args: [...infer Values, EditorFormat]) => string
    ? (...args: Values) => string
    : T[K] extends string
      ? string
      : T[K] extends readonly unknown[]
        ? T[K]
        : BoundMessages<T[K]>;
};

const isGroup = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The messages as the plain object of groups they are, to walk. */
const asGroup = (messages: EditorMessages): Record<string, unknown> =>
  messages as unknown as Record<string, unknown>;

/**
 * `base` with `overrides` laid over it, group by group. Only what the base already has is taken,
 * and only in its kind: a string for a string, a function for a function. A host written in plain
 * JavaScript that passes a string where a phrase is expected keeps the English rather than
 * breaking the editor.
 */
export function mergeMessages(
  base: EditorMessages,
  overrides: EditorMessageOverrides | undefined,
): EditorMessages {
  return overrides ? (merge(asGroup(base), overrides) as EditorMessages) : base;
}

function merge(base: Record<string, unknown>, overrides: Record<string, unknown>): unknown {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const current = base[key];
    if (value === undefined || !(key in base)) continue;
    if (isGroup(current) && isGroup(value)) merged[key] = merge(current, value);
    else if (typeof value === typeof current) merged[key] = value;
  }
  return merged;
}

/** `messages` with `format` handed to every phrase, for the parts to call. */
export function bindMessages(messages: EditorMessages, format: EditorFormat): BoundMessages {
  return bind(asGroup(messages), format) as BoundMessages;
}

function bind(group: Record<string, unknown>, format: EditorFormat): Record<string, unknown> {
  const bound: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(group)) {
    bound[key] =
      typeof value === 'function'
        ? (...values: unknown[]) => (value as (...args: unknown[]) => string)(...values, format)
        : isGroup(value)
          ? bind(value, format)
          : value;
  }
  return bound;
}
