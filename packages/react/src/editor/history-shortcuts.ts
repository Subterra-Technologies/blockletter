import { useSyncExternalStore } from 'react';
import { englishMessages } from '../i18n/context';
import type { BoundMessages } from '../i18n/resolve';

/**
 * The keyboard side of undo and redo: which key presses they are, how to write them for people
 * and for `aria-keyshortcuts`, and where in the editor the browser keeps its own.
 */

export type HistoryAction = 'undo' | 'redo';

/** As much of a keydown as a shortcut needs. */
export type KeyPress = Pick<
  KeyboardEvent,
  'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'isComposing'
>;

/**
 * Which history shortcut a key press is: Ctrl or ⌘ with Z undoes, with Shift as well it redoes,
 * and Ctrl+Y redoes too. A keyboard layout without Latin letters (Cyrillic, Greek) finds Z and Y
 * where they are on a US keyboard, as the browser's own shortcuts do. Alt is left alone: with
 * Ctrl, it is how a European keyboard types its third letter on a key.
 */
export function historyShortcut(event: KeyPress): HistoryAction | null {
  if (event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return null;
  const key = /^[a-z]$/i.test(event.key)
    ? event.key.toLowerCase()
    : event.code === 'KeyZ'
      ? 'z'
      : event.code === 'KeyY'
        ? 'y'
        : '';
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey) return 'redo';
  return null;
}

/** A shortcut written for people ("Ctrl+Z") and for `aria-keyshortcuts` ("Control+Z"). */
export interface ShortcutText {
  label: string;
  aria: string;
}

/**
 * Undo and redo's shortcuts as an Apple keyboard (⌘) or any other (Ctrl) has them: for people in
 * the editor's words (a German keyboard says Strg), and for `aria-keyshortcuts` in the names the
 * attribute takes, which are never translated.
 */
export function historyShortcuts(
  apple: boolean,
  messages: BoundMessages = englishMessages,
): Readonly<Record<HistoryAction, ShortcutText>> {
  const { shortcut } = messages.common;
  return {
    undo: { label: shortcut({ key: 'Z', apple }), aria: apple ? 'Meta+Z' : 'Control+Z' },
    redo: {
      label: shortcut({ key: 'Z', apple, shift: true }),
      aria: apple ? 'Meta+Shift+Z' : 'Control+Shift+Z Control+Y',
    },
  };
}

const NEVER_CHANGES = () => () => undefined;

function onApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const hints = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return /mac|iphone|ipad|ipod/i.test(hints?.platform || navigator.platform || '');
}

/**
 * Whether this is an Apple device, whose shortcuts use ⌘. A server render says no, and the
 * browser corrects it once it hydrates, so the two renders never disagree.
 */
export function useApplePlatform(): boolean {
  return useSyncExternalStore(NEVER_CHANGES, onApplePlatform, () => false);
}

/** Where a person types text, and where a browser keeps an undo of its own. */
const TEXT_ENTRY =
  'textarea, input:not([type]), input[type="text"], input[type="search"], input[type="url"], input[type="email"], input[type="tel"], input[type="password"], [contenteditable]:not([contenteditable="false"])';

/**
 * Whether an undo or redo asked for in `target`, by its keys or the browser's own menu, is the
 * browser's to answer rather than the editor's: typing in a field that holds a draft the document
 * has not received yet (an image address, a hex colour, the brand kit, all marked
 * `data-bl-draft`). The document's history knows nothing of that typing, so the browser undoes
 * it, as it would anywhere else.
 */
export function keepsNativeUndo(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.matches(TEXT_ENTRY) &&
    target.closest('[data-bl-draft]') !== null
  );
}
