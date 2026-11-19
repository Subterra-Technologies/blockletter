/**
 * What the Markdown field's toolbar does to its text: pure edits of a value and its selection, so
 * the buttons, the keyboard shortcuts and the tests all go through the same code. The marks
 * written are the Markdown core reads (`parseMarkdown`), and nothing else: the text stays plain.
 */

/** A field's value with the selection to leave in it. */
export interface TextEdit {
  value: string;
  start: number;
  end: number;
}

export type InlineMark = 'bold' | 'italic' | 'strike';
export type LineFormat = 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'numbered';

const MARK: Readonly<Record<InlineMark, { char: string; size: number }>> = {
  bold: { char: '*', size: 2 },
  italic: { char: '*', size: 1 },
  strike: { char: '~', size: 2 },
};

/** A heading, list or quote marker at the start of a line. */
const LINE_PREFIX = /^ {0,3}(?:#{1,6}[ \t]|[-*•][ \t]|\d{1,3}[.)][ \t]|>[ \t]?)/;
const HEADING_OR_LIST = /^ {0,3}(?:#{1,6}[ \t]+|[-*•][ \t]+|\d{1,3}[.)][ \t]+)/;
const BULLET = /^ {0,3}[-*•][ \t]/;
const NUMBERED = /^ {0,3}\d{1,3}[.)][ \t]/;

/** Letters and digits: core reads no mark that touches one on its outside. */
const isWord = (char: string | undefined): boolean =>
  char !== undefined && /[\p{L}\p{N}]/u.test(char);
const isSpace = (char: string | undefined): boolean => char !== undefined && /\s/.test(char);

const runOf = (value: string, from: number, step: 1 | -1, char: string): number => {
  let count = 0;
  for (let at = step === 1 ? from : from - 1; value[at] === char; at += step) count += 1;
  return count;
};

/** Whether the text between start and end already carries the mark around it. */
function carries(value: string, start: number, end: number, mark: InlineMark): boolean {
  const { char } = MARK[mark];
  const before = runOf(value, start, -1, char);
  const after = runOf(value, end, 1, char);
  if (mark === 'italic') return before % 2 === 1 && after % 2 === 1;
  return before >= 2 && after >= 2;
}

/**
 * The stretch of one line a mark applies to: the selection without the spaces at its edges or a
 * list or heading marker, widened to whole words (a mark inside a word is not read as one).
 */
function segment(value: string, start: number, end: number, char: string) {
  let from = start;
  let to = end;
  const lineStart = value.lastIndexOf('\n', from - 1) + 1;
  if (from === lineStart) {
    const prefix = LINE_PREFIX.exec(value.slice(lineStart, to));
    if (prefix) from += prefix[0].length;
  }
  while (from < to && isSpace(value[from])) from += 1;
  while (to > from && isSpace(value[to - 1])) to -= 1;
  if (to > from) {
    while (from > lineStart && isWord(value[from - 1]) && isWord(value[from])) from -= 1;
    while (to < value.length && isWord(value[to - 1]) && isWord(value[to])) to += 1;
  }
  // Marks selected along with the words: look at the words inside them instead.
  const left = runOf(value, from, 1, char);
  const right = runOf(value, to, -1, char);
  if (left > 0 && right > 0 && to - from > left + right) {
    from += left;
    to -= right;
  }
  return { from, to };
}

/** Bold, italic or strikethrough on the selection, or off it if it already has it. */
export function toggleMark(value: string, start: number, end: number, mark: InlineMark): TextEdit {
  const { char, size } = MARK[mark];
  const marker = char.repeat(size);

  if (start === end) {
    const off = carries(value, start, end, mark) && runOf(value, start, -1, char) > 0;
    if (off && value.slice(start - size, start + size) === marker + marker) {
      return {
        value: value.slice(0, start - size) + value.slice(start + size),
        start: start - size,
        end: start - size,
      };
    }
    return {
      value: value.slice(0, start) + marker + marker + value.slice(start),
      start: start + size,
      end: start + size,
    };
  }

  // Each line separately: a mark never runs across a line break.
  const segments: { from: number; to: number }[] = [];
  let lineFrom = start;
  while (lineFrom <= end) {
    const lineEnd = value.indexOf('\n', lineFrom);
    const to = lineEnd === -1 || lineEnd > end ? end : lineEnd;
    const piece = segment(value, lineFrom, to, char);
    if (piece.to > piece.from) segments.push(piece);
    if (to === end) break;
    lineFrom = to + 1;
  }
  if (segments.length === 0) return { value, start, end };

  const remove = segments.every(({ from, to }) => carries(value, from, to, mark));
  let next = value;
  let shift = 0;
  let firstFrom = 0;
  let lastTo = 0;
  segments.forEach(({ from, to }, index) => {
    const at = from + shift;
    const until = to + shift;
    if (remove) {
      next = next.slice(0, at - size) + next.slice(at, until) + next.slice(until + size);
      if (index === 0) firstFrom = at - size;
      lastTo = until - size;
      shift -= 2 * size;
    } else if (carries(next, at, until, mark)) {
      if (index === 0) firstFrom = at;
      lastTo = until;
    } else {
      next = next.slice(0, at) + marker + next.slice(at, until) + marker + next.slice(until);
      if (index === 0) firstFrom = at + size;
      lastTo = until + size;
      shift += 2 * size;
    }
  });

  if (segments.length === 1) return { value: next, start: firstFrom, end: lastTo };
  // Several lines: keep the whole stretch selected, as it was.
  return { value: next, start, end: end + shift };
}

/** A heading, a list or plain text for the line(s) the selection touches. */
export function setLineFormat(
  value: string,
  start: number,
  end: number,
  format: LineFormat,
): TextEdit {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const stop = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const nextBreak = value.indexOf('\n', stop);
  const to = nextBreak === -1 ? value.length : nextBreak;
  const lines = value.slice(from, to).split('\n');
  const written = lines.filter((line) => line.trim());

  const turnOff =
    (format === 'bullet' && written.length > 0 && written.every((line) => BULLET.test(line))) ||
    (format === 'numbered' && written.length > 0 && written.every((line) => NUMBERED.test(line)));

  let number = 0;
  const changed = lines.map((line) => {
    if (!line.trim()) return line;
    const bare = line.replace(HEADING_OR_LIST, '');
    if (turnOff || format === 'paragraph') return bare;
    switch (format) {
      case 'h1':
        return `# ${bare}`;
      case 'h2':
        return `## ${bare}`;
      case 'h3':
        return `### ${bare}`;
      case 'bullet':
        return `- ${bare}`;
      case 'numbered':
        number += 1;
        return `${number}. ${bare}`;
    }
  });

  const block = changed.join('\n');
  const blockEnd = from + block.length;
  return {
    value: value.slice(0, from) + block + value.slice(to),
    start: start === end ? blockEnd : from,
    end: blockEnd,
  };
}

/**
 * `[text](address)` in place of the selection, with the caret after it. The label loses the
 * brackets and line breaks that would end it early, and the address the spaces and closing
 * brackets; with no text, the address is the label.
 */
export function insertLink(
  value: string,
  start: number,
  end: number,
  text: string,
  address: string,
): TextEdit {
  const url = address.trim().replace(/\s/g, '%20').replace(/\)/g, '%29');
  const label = text.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim() || url;
  const link = `[${label}](${url})`;
  const caret = start + link.length;
  return { value: value.slice(0, start) + link + value.slice(end), start: caret, end: caret };
}
