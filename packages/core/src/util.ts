/** Freezes a value and everything in it, so a shared default cannot be edited by accident. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item);
  }
  return value;
}

/** A JSON-shaped value copied all the way down: documents and templates are plain data. */
export const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
