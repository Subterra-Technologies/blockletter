import { describe, expect, it } from 'vitest';
import { parseInline } from '@subterra-technologies/blockletter';
import {
  insertLink,
  setLineFormat,
  toggleMark,
  type TextEdit,
} from '../../src/markdown/text-formatting';

/** Writes `[` and `]` where an edit's selection starts and ends, to read it at a glance. */
const show = ({ value, start, end }: TextEdit) =>
  `${value.slice(0, start)}[${value.slice(start, end)}]${value.slice(end)}`;

/** Runs an edit on a value written with its selection marked by `[` and `]`. */
const on = (marked: string, run: (value: string, start: number, end: number) => TextEdit) => {
  const start = marked.indexOf('[');
  const end = marked.indexOf(']') - 1;
  return show(run(marked.replace('[', '').replace(']', ''), start, end));
};

describe('toggleMark', () => {
  it('wraps the selection and keeps it selected', () => {
    expect(on('a [word] b', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe('a **[word]** b');
    expect(on('a [word] b', (v, s, e) => toggleMark(v, s, e, 'italic'))).toBe('a *[word]* b');
    expect(on('a [word] b', (v, s, e) => toggleMark(v, s, e, 'strike'))).toBe('a ~~[word]~~ b');
  });

  it('unwraps a selection that is already formatted', () => {
    expect(on('a **[word]** b', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe('a [word] b');
    expect(on('a *[word]* b', (v, s, e) => toggleMark(v, s, e, 'italic'))).toBe('a [word] b');
    expect(on('a ~~[word]~~ b', (v, s, e) => toggleMark(v, s, e, 'strike'))).toBe('a [word] b');
  });

  it('unwraps when the marks themselves are selected', () => {
    expect(on('a [**word**] b', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe('a [word] b');
  });

  it('adds italic to bold and takes either away from both', () => {
    expect(on('**[w]**', (v, s, e) => toggleMark(v, s, e, 'italic'))).toBe('***[w]***');
    expect(on('*[w]*', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe('***[w]***');
    expect(on('***[w]***', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe('*[w]*');
    expect(on('***[w]***', (v, s, e) => toggleMark(v, s, e, 'italic'))).toBe('**[w]**');
    // Bold is not mistaken for italic.
    expect(on('**[w]**', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe('[w]');
  });

  it('keeps spaces a double-click picked up outside the marks', () => {
    expect(on('a[ word ]b', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe('a **[word]** b');
  });

  it('widens a selection inside a word to the whole word, which is all core reads', () => {
    expect(on('un[believ]able', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe(
      '**[unbelievable]**',
    );
    expect(on('**wo[r]d**', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe('[word]');
  });

  it('puts the caret between new marks when nothing is selected', () => {
    expect(on('a [] b', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe('a **[]** b');
  });

  it('marks each line of a selection that spans lines, after any list marker', () => {
    expect(on('[- one\n- two]', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe(
      '[- **one**\n- **two**]',
    );
    expect(on('[- **one**\n- **two**]', (v, s, e) => toggleMark(v, s, e, 'bold'))).toBe(
      '[- one\n- two]',
    );
  });

  it('writes marks core reads as formatting', () => {
    for (const mark of ['bold', 'italic', 'strike'] as const) {
      const edit = toggleMark('Join us on Saturday', 11, 19, mark);
      expect(parseInline(edit.value)[1]).toEqual({
        kind: mark,
        children: [{ kind: 'text', text: 'Saturday' }],
      });
    }
  });
});

describe('setLineFormat', () => {
  it('makes the current line a heading, and changes its size', () => {
    expect(on('Intro\nTi[]tle\nMore', (v, s, e) => setLineFormat(v, s, e, 'h1'))).toBe(
      'Intro\n# Title[]\nMore',
    );
    expect(on('# Ti[]tle', (v, s, e) => setLineFormat(v, s, e, 'h3'))).toBe('### Title[]');
    expect(on('## Ti[]tle', (v, s, e) => setLineFormat(v, s, e, 'paragraph'))).toBe('Title[]');
  });

  it('turns lines into a bullet list and back', () => {
    expect(on('[one\ntwo]', (v, s, e) => setLineFormat(v, s, e, 'bullet'))).toBe('[- one\n- two]');
    expect(on('[- one\n- two]', (v, s, e) => setLineFormat(v, s, e, 'bullet'))).toBe('[one\ntwo]');
  });

  it('numbers lines, replacing bullets, and back', () => {
    expect(on('[- one\n\n- two]', (v, s, e) => setLineFormat(v, s, e, 'numbered'))).toBe(
      '[1. one\n\n2. two]',
    );
    expect(on('[1. one\n2. two]', (v, s, e) => setLineFormat(v, s, e, 'numbered'))).toBe(
      '[one\ntwo]',
    );
  });

  it('does not reach into the next line when a selection ends at a line break', () => {
    expect(on('[one\n]two', (v, s, e) => setLineFormat(v, s, e, 'bullet'))).toBe('[- one]\ntwo');
  });
});

describe('insertLink', () => {
  it('replaces the selection with [text](address) and puts the caret after it', () => {
    expect(on('See [here] now', (v, s, e) => insertLink(v, s, e, 'our events', '/events'))).toBe(
      'See [our events](/events)[] now',
    );
  });

  it('keeps the label and the address from breaking the link', () => {
    expect(on('[]', (v, s, e) => insertLink(v, s, e, 'a [b]\nc', ' https://x.test/a b) '))).toBe(
      '[a b c](https://x.test/a%20b%29)[]',
    );
  });

  it('uses the address as the text when no text is given', () => {
    expect(on('[]', (v, s, e) => insertLink(v, s, e, '  ', 'https://x.test'))).toBe(
      '[https://x.test](https://x.test)[]',
    );
  });
});
