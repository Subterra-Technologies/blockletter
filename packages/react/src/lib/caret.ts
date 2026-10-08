/** A text field whose caret can be placed. */
export type TextField = HTMLInputElement | HTMLTextAreaElement;

/** The text field that has the focus, if one does. */
export function focusedTextField(): TextField | null {
  const active = typeof document === 'undefined' ? null : document.activeElement;
  return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
    ? active
    : null;
}

/**
 * Where a caret belongs once a field's text has changed from `before` to `after` by something
 * other than typing (an undo): just after the part that changed, which is where the browser's own
 * undo leaves it. Text taken out leaves it where the text was; text put back, after it.
 */
export function caretAfterChange(before: string, after: string): number {
  const shorter = Math.min(before.length, after.length);
  let start = 0;
  while (start < shorter && before[start] === after[start]) start += 1;
  let end = 0;
  while (
    end < shorter - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end += 1;
  }
  return after.length - end;
}

/**
 * Puts the caret of `field`, which still has the focus, where its text changed from `before`.
 * Setting a field's value from code throws its caret to the end otherwise. A field whose type
 * has no caret to place (an email address, in some browsers) keeps the browser's.
 */
export function placeCaret(field: TextField, before: string): void {
  if (field.ownerDocument.activeElement !== field || field.value === before) return;
  const at = caretAfterChange(before, field.value);
  try {
    field.setSelectionRange(at, at);
  } catch {
    // An input type without a selection, which the browser places by itself.
  }
}
