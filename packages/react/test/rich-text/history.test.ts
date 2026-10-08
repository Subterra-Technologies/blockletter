import { describe, expect, it } from 'vitest';
import { createHistory, type Snapshot } from '../../src/rich-text/history';

const at = (text: string): Snapshot => ({
  doc: text ? [{ inlines: [{ text }] }] : [{ inlines: [] }],
  selection: {
    anchor: { paragraph: 0, offset: text.length },
    focus: { paragraph: 0, offset: text.length },
  },
});

describe('createHistory', () => {
  it('undoes and redoes a step at a time', () => {
    const history = createHistory();
    history.record(() => at(''));
    history.record(() => at('a'));
    expect(history.undo(at('ab'))).toEqual(at('a'));
    expect(history.undo(at('a'))).toEqual(at(''));
    expect(history.undo(at(''))).toBeUndefined();
    expect(history.redo(at(''))).toEqual(at('a'));
    expect(history.redo(at('a'))).toEqual(at('ab'));
    expect(history.redo(at('ab'))).toBeUndefined();
  });

  it('joins keystrokes of one kind less than a second apart into one step', () => {
    let time = 0;
    const history = createHistory({ now: () => time });
    history.record(() => at(''), 'insert');
    time = 400;
    history.record(() => at('a'), 'insert');
    time = 2000;
    history.record(() => at('ab'), 'insert');
    time = 2100;
    history.record(() => at('abc'), 'delete');
    expect(history.undo(at('ab'))).toEqual(at('abc'));
    expect(history.undo(at('abc'))).toEqual(at('ab'));
    expect(history.undo(at('ab'))).toEqual(at(''));
  });

  it('starts a new step after a seal, and after anything that is not a keystroke', () => {
    const history = createHistory({ now: () => 0 });
    history.record(() => at(''), 'insert');
    history.seal();
    history.record(() => at('a'), 'insert');
    history.record(() => at('ab'));
    history.record(() => at('abc'), 'insert');
    expect(history.undo(at('abcd'))).toEqual(at('abc'));
    expect(history.undo(at('abc'))).toEqual(at('ab'));
    expect(history.undo(at('ab'))).toEqual(at('a'));
    expect(history.undo(at('a'))).toEqual(at(''));
  });

  it('skips steps that changed nothing, and drops redo once something new happens', () => {
    const history = createHistory();
    history.record(() => at('a'));
    history.record(() => at('ab'));
    history.record(() => at('ab'));
    expect(history.undo(at('ab'))).toEqual(at('a'));
    history.record(() => at('a'));
    expect(history.redo(at('ax'))).toBeUndefined();
  });

  it('keeps only the most recent steps, and forgets them all when cleared', () => {
    const history = createHistory({ limit: 2 });
    history.record(() => at('a'));
    history.record(() => at('ab'));
    history.record(() => at('abc'));
    expect(history.undo(at('abcd'))).toEqual(at('abc'));
    expect(history.undo(at('abc'))).toEqual(at('ab'));
    expect(history.undo(at('ab'))).toBeUndefined();
    history.clear();
    expect(history.redo(at('ab'))).toBeUndefined();
  });
});
