import { describe, expect, it } from 'vitest';
import {
  COALESCE_MS,
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  receive,
  record,
  redo,
  startHistory,
  undo,
  type EditHistory,
  type HistoryChange,
} from '../src/editor/history';
import { sameJson } from '../src/lib/json';

/**
 * The undo history on its own, over documents small enough to read: `{ text }`. The editor's own
 * documents go through exactly these functions (see the hook's and the editor's tests).
 */

interface Doc {
  text: string;
}

const doc = (text: string): Doc => ({ text });

/** A typing edit to the one field, `at` milliseconds in. */
const typed = (before: Doc, text: string, at: number): HistoryChange<Doc> => ({
  before,
  after: doc(text),
  label: 'edited the Text block',
  key: 'block:text-1:body',
  at,
});

/** Types each text in turn, `gap` milliseconds apart, from `start`. */
function typeAll(start: Doc, texts: string[], gap: number): EditHistory<Doc> {
  let history = startHistory(start);
  let current = start;
  texts.forEach((text, index) => {
    const change = typed(current, text, index * gap);
    history = record(history, change, { same: sameJson });
    current = change.after;
  });
  return history;
}

const texts = (history: EditHistory<Doc>) =>
  history.past.map((step) => [step.before.text, step.after.text]);

describe('the undo history', () => {
  it('undoes and redoes changes in order, handing out the document each step began or ended on', () => {
    const start = doc('');
    const first = doc('Doors open at eight.');
    let history = record(startHistory(start), {
      before: start,
      after: first,
      label: 'edited the Text block',
      at: 0,
    });
    history = record(history, { before: first, after: doc(''), label: 'cleared it', at: 5_000 });
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);

    const undone = undo(history);
    expect(undone?.step.label).toBe('cleared it');
    expect(undone?.history.emitted.at(-1)).toBe(first);
    const twice = undo(undone!.history);
    expect(twice?.history.emitted.at(-1)).toBe(start);
    expect(canUndo(twice!.history)).toBe(false);
    expect(undo(twice!.history)).toBeUndefined();

    const redone = redo(twice!.history);
    expect(redone?.step.label).toBe('edited the Text block');
    expect(redone?.history.emitted.at(-1)).toBe(first);
    expect(canRedo(redone!.history)).toBe(true);
  });

  it('makes one step of typing in one field, so one undo takes back the burst, not a letter', () => {
    const history = typeAll(doc(''), ['D', 'Do', 'Doo', 'Door', 'Doors'], 150);
    expect(texts(history)).toEqual([['', 'Doors']]);
    expect(history.past[0]?.at).toBe(600);
  });

  it('starts a new step after a pause longer than the coalescing window', () => {
    const history = typeAll(doc(''), ['Doors', 'Doors open'], COALESCE_MS + 1);
    expect(texts(history)).toEqual([
      ['', 'Doors'],
      ['Doors', 'Doors open'],
    ]);
    // The window runs from the last keystroke, so steady typing stays one step however long.
    expect(texts(typeAll(doc(''), ['a', 'ab', 'abc', 'abcd'], COALESCE_MS))).toHaveLength(1);
  });

  it('keeps edits to different fields, or with no key, as steps of their own', () => {
    const start = doc('');
    const heading = { ...typed(start, 'Hello', 0), key: 'block:text-1:heading' };
    let history = record(startHistory(start), heading);
    history = record(history, typed(heading.after, 'Hello there', 100));
    const unkeyed = { ...typed(doc('Hello there'), 'Hello there!', 200), key: undefined };
    history = record(history, unkeyed);
    expect(history.past).toHaveLength(3);
  });

  it('drops a step that ends where it began: typed, then erased', () => {
    const history = typeAll(doc('Hi'), ['Hi!', 'Hi'], 100);
    expect(canUndo(history)).toBe(false);
    // A change to nothing at all is no step either.
    expect(
      canUndo(record(startHistory(doc('a')), typed(doc('a'), 'a', 0), { same: sameJson })),
    ).toBe(false);
  });

  it('folds the rest of a change into the step it continues, however long it took', () => {
    const start = doc('September');
    const dates = { before: start, after: doc('October'), label: 'updated the period', at: 0 };
    let history = record(startHistory(start), dates);
    const step = history.past.at(-1);
    history = record(history, {
      before: dates.after,
      after: doc('October, refreshed'),
      label: 'updated the period',
      at: 60_000,
      continues: step,
    });
    expect(texts(history)).toEqual([['September', 'October, refreshed']]);

    // Once anything else has happened since, the rest is a step of its own.
    const withDates = record(startHistory(start), dates);
    const typedSince = record(withDates, typed(dates.after, 'Oct', 10));
    const late = record(typedSince, {
      before: doc('Oct'),
      after: doc('Oct, refreshed'),
      label: 'updated the period',
      at: 60_000,
      continues: withDates.past.at(-1),
    });
    expect(late.past).toHaveLength(3);
  });

  it('clears what could be redone when a new change is made', () => {
    let history = typeAll(doc(''), ['one', 'two', 'three'], COALESCE_MS + 1);
    history = undo(history)!.history;
    history = undo(history)!.history;
    expect(history.future).toHaveLength(2);

    history = record(history, typed(doc('one'), 'one, then something else', 99_000));
    expect(canRedo(history)).toBe(false);
    expect(texts(history)).toEqual([
      ['', 'one'],
      ['one', 'one, then something else'],
    ]);
  });

  it(`keeps at most ${HISTORY_LIMIT} steps, letting the oldest go`, () => {
    const many = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index) => `edit ${index + 1}`);
    const history = typeAll(doc(''), many, COALESCE_MS + 1);
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]?.after.text).toBe('edit 6');
    expect(history.past.at(-1)?.after.text).toBe(`edit ${HISTORY_LIMIT + 5}`);
    // A smaller limit, for a host that asks for one.
    const short = record(
      record(startHistory(doc('')), typed(doc(''), 'a', 0)),
      {
        ...typed(doc('a'), 'ab', 5_000),
      },
      { limit: 1 },
    );
    expect(texts(short)).toEqual([['a', 'ab']]);
  });
});

describe('the documents handed to the host', () => {
  it('starts over from a value it never handed out: another issue, or the same one reloaded', () => {
    const history = typeAll(doc(''), ['one', 'two'], COALESCE_MS + 1);
    const other = doc('Another issue');
    const fresh = receive(history, other, sameJson);
    expect(canUndo(fresh)).toBe(false);
    expect(canRedo(fresh)).toBe(false);
    expect(fresh.emitted).toEqual([other]);

    // Undone first: what could be redone goes as well.
    expect(canRedo(receive(undo(history)!.history, other, sameJson))).toBe(false);
  });

  it('keeps its steps when the value is one it handed out, or a copy of one', () => {
    const history = typeAll(doc(''), ['one', 'two'], COALESCE_MS + 1);
    const handedOut = history.emitted.at(-1)!;
    const confirmed = receive(history, handedOut, sameJson);
    expect(confirmed.past).toBe(history.past);
    expect(confirmed.emitted).toEqual([handedOut]);
    expect(receive(confirmed, handedOut, sameJson)).toBe(confirmed);

    // A host that stores the document and reads it back passes a copy.
    const copy = { ...handedOut };
    expect(receive(history, copy, sameJson).past).toBe(history.past);
    // Compared by identity alone, a copy is a stranger.
    expect(canUndo(receive(history, copy))).toBe(false);
  });

  it('keeps its steps while a host passes back documents late, oldest first', () => {
    const history = typeAll(doc(''), ['one', 'two', 'three'], COALESCE_MS + 1);
    const [, one, two, three] = history.emitted;
    let caughtUp = receive(history, one!, sameJson);
    expect(caughtUp.emitted).toEqual([one, two, three]);
    caughtUp = receive(caughtUp, two!, sameJson);
    caughtUp = receive(caughtUp, three!, sameJson);
    expect(caughtUp.past).toBe(history.past);
    expect(caughtUp.emitted).toEqual([three]);
  });

  it('knows the documents undo and redo hand out as its own', () => {
    let history = typeAll(doc(''), ['one'], 0);
    history = receive(history, history.emitted.at(-1)!, sameJson);
    const undone = undo(history)!;
    const back = receive(undone.history, undone.step.before, sameJson);
    expect(canRedo(back)).toBe(true);
    const redone = redo(back)!;
    expect(canUndo(receive(redone.history, redone.step.after, sameJson))).toBe(true);
  });
});
