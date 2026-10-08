import { describe, expect, it } from 'vitest';
import {
  historyShortcut,
  historyShortcuts,
  keepsNativeUndo,
  type KeyPress,
} from '../src/editor/history-shortcuts';
import { caretAfterChange } from '../src/lib/caret';

const press = (key: string, modifiers: Partial<KeyPress> = {}): KeyPress => ({
  key,
  code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : '',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  isComposing: false,
  ...modifiers,
});

describe('historyShortcut', () => {
  it('undoes with Ctrl or ⌘ and Z, and redoes with Shift as well, or Ctrl+Y', () => {
    expect(historyShortcut(press('z', { ctrlKey: true }))).toBe('undo');
    expect(historyShortcut(press('z', { metaKey: true }))).toBe('undo');
    expect(historyShortcut(press('Z', { ctrlKey: true, shiftKey: true }))).toBe('redo');
    // A Mac reports ⇧⌘Z in lower case.
    expect(historyShortcut(press('z', { metaKey: true, shiftKey: true }))).toBe('redo');
    expect(historyShortcut(press('y', { ctrlKey: true }))).toBe('redo');
  });

  it('leaves every other key alone', () => {
    expect(historyShortcut(press('z'))).toBeNull();
    expect(historyShortcut(press('z', { shiftKey: true }))).toBeNull();
    // ⌘Y is the browser's history, not a redo.
    expect(historyShortcut(press('y', { metaKey: true }))).toBeNull();
    // Ctrl with Alt is AltGr, which types letters on European keyboards.
    expect(historyShortcut(press('z', { ctrlKey: true, altKey: true }))).toBeNull();
    expect(historyShortcut(press('x', { ctrlKey: true }))).toBeNull();
    expect(historyShortcut(press('z', { ctrlKey: true, isComposing: true }))).toBeNull();
  });

  it('finds Z where it is on the keyboard when the layout has no Latin letters', () => {
    expect(historyShortcut({ ...press('я', { ctrlKey: true }), code: 'KeyZ' })).toBe('undo');
    expect(historyShortcut({ ...press('н', { ctrlKey: true }), code: 'KeyY' })).toBe('redo');
  });
});

describe('historyShortcuts', () => {
  it('writes the shortcuts the way each platform does, for people and for aria-keyshortcuts', () => {
    expect(historyShortcuts(false)).toEqual({
      undo: { label: 'Ctrl+Z', aria: 'Control+Z' },
      redo: { label: 'Ctrl+Shift+Z', aria: 'Control+Shift+Z Control+Y' },
    });
    expect(historyShortcuts(true)).toEqual({
      undo: { label: '⌘Z', aria: 'Meta+Z' },
      redo: { label: '⇧⌘Z', aria: 'Meta+Shift+Z' },
    });
  });
});

describe('keepsNativeUndo', () => {
  it('leaves undo to the browser only while typing in a draft', () => {
    document.body.innerHTML = `
      <form data-bl-draft="">
        <input id="brand-name" type="text" />
        <button id="save" type="submit">Save</button>
      </form>
      <input id="image-url" type="url" data-bl-draft="" />
      <textarea id="body"></textarea>
      <input id="photo" type="checkbox" />`;
    const element = (id: string) => document.getElementById(id);
    expect(keepsNativeUndo(element('brand-name'))).toBe(true);
    expect(keepsNativeUndo(element('image-url'))).toBe(true);
    // A button in a draft is not typing, and a field outside one belongs to the document.
    expect(keepsNativeUndo(element('save'))).toBe(false);
    expect(keepsNativeUndo(element('body'))).toBe(false);
    expect(keepsNativeUndo(element('photo'))).toBe(false);
    expect(keepsNativeUndo(null)).toBe(false);
    document.body.innerHTML = '';
  });
});

describe('caretAfterChange', () => {
  it('puts the caret where the text changed: where it was taken out, or after it was put back', () => {
    expect(caretAfterChange('Doors open at eight.', 'Doors open.')).toBe(10);
    expect(caretAfterChange('Doors open.', 'Doors open at eight.')).toBe(19);
    expect(caretAfterChange('Join us Friday', 'Join us on Friday')).toBe(11);
    expect(caretAfterChange('', 'Hello')).toBe(5);
    expect(caretAfterChange('Hello', '')).toBe(0);
    expect(caretAfterChange('aaa', 'aaaa')).toBe(4);
  });
});
