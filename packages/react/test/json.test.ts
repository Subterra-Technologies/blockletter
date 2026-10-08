import { describe, expect, it } from 'vitest';
import { changedPaths, sameJson } from '../src/lib/json';

describe('sameJson', () => {
  it('compares plain JSON by value, key order aside', () => {
    expect(sameJson({ a: 1, b: [1, { c: 'x' }] }, { b: [1, { c: 'x' }], a: 1 })).toBe(true);
    expect(sameJson({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameJson([1, 2], [2, 1])).toBe(false);
    expect(sameJson([], {})).toBe(false);
    expect(sameJson(null, {})).toBe(false);
    expect(sameJson('1', 1)).toBe(false);
  });

  it('counts a key holding undefined as absent, as JSON storage does', () => {
    expect(sameJson({ a: 1, caption: undefined }, { a: 1 })).toBe(true);
    expect(sameJson({ a: 1 }, { a: 1, caption: 'Hi' })).toBe(false);
    // A list keeps its length: JSON writes an empty place as null.
    expect(sameJson([1, undefined], [1])).toBe(false);
  });
});

describe('changedPaths', () => {
  it('names the leaves an edit changed, down through lists', () => {
    const before = { id: 'e-1', heading: 'Events', items: [{ title: 'A' }, { title: 'B' }] };
    expect(changedPaths(before, { ...before, heading: 'Upcoming' })).toEqual(['heading']);
    const items = [before.items[0], { title: 'B, renamed' }];
    expect(changedPaths(before, { ...before, items })).toEqual(['items.1.title']);
    expect(changedPaths(before, before)).toEqual([]);
  });

  it('counts a part added or removed whole by its own leaves', () => {
    const block = { id: 't-1', body: 'Hi' };
    expect(changedPaths(block, { ...block, caption: 'A' })).toEqual(['caption']);
    expect(changedPaths(block, { ...block, style: { background: '#fff' } })).toEqual([
      'style.background',
    ]);
    expect(changedPaths({ ...block, style: { background: '#fff', divider: true } }, block)).toEqual(
      ['style.background', 'style.divider'],
    );
  });
});
