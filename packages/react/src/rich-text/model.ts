/**
 * The rich-text field's document, apart from any DOM: a list of paragraphs, each optionally an item
 * of a bulleted or numbered list, holding runs of text and line breaks. Every command the field
 * offers (bold, a link, a list, Enter, a paste) is a pure function from one document to the next,
 * so each can be tested without a browser, and what the field shows is always drawn from a
 * document rather than left as whatever markup a browser's own editing produced.
 *
 * A place in the document is a paragraph's index and an offset in it, where each character and
 * each line break counts one.
 */

/** Text, and the formatting it carries. */
export interface TextRun {
  text: string;
  bold?: true;
  italic?: true;
  /** A link: an address `isSafeLinkHref` accepts. */
  href?: string;
}

/** A line break inside a paragraph (Shift+Enter). */
export interface LineBreak {
  br: true;
}

export type Inline = TextRun | LineBreak;

export type ListKind = 'ul' | 'ol';

/** A paragraph, or with `list`, an item of a bulleted (`ul`) or numbered (`ol`) list. */
export interface Paragraph {
  list?: ListKind;
  inlines: Inline[];
}

/** Never empty: an empty field is one empty paragraph. */
export type RichText = Paragraph[];

export interface TextPoint {
  paragraph: number;
  offset: number;
}

/** Where a selection starts (`anchor`) and where it ends (`focus`), in either order. */
export interface TextSelection {
  anchor: TextPoint;
  focus: TextPoint;
}

export type Mark = 'bold' | 'italic';

/** The formatting text typed at a place takes. */
export interface Marks {
  bold: boolean;
  italic: boolean;
  href?: string;
}

/** A document after a change, and where the selection is in it. */
export interface Edit {
  doc: RichText;
  selection: TextSelection;
}

const EMPTY: Paragraph = { inlines: [] };

export const isBreak = (inline: Inline): inline is LineBreak => 'br' in inline;

const lengthOf = (inline: Inline): number => (isBreak(inline) ? 1 : inline.text.length);

const totalLength = (inlines: readonly Inline[]): number =>
  inlines.reduce((total, inline) => total + lengthOf(inline), 0);

export const paragraphLength = (paragraph: Paragraph): number => totalLength(paragraph.inlines);

/** The paragraph at `index`, or an empty one: callers keep indexes in range, the type cannot. */
const paragraphAt = (doc: RichText, index: number): Paragraph => doc[index] ?? EMPTY;

export const comparePoints = (a: TextPoint, b: TextPoint): number =>
  a.paragraph - b.paragraph || a.offset - b.offset;

/** The selection's two ends in document order. */
export function selectionRange(selection: TextSelection): [TextPoint, TextPoint] {
  return comparePoints(selection.anchor, selection.focus) <= 0
    ? [selection.anchor, selection.focus]
    : [selection.focus, selection.anchor];
}

export const isCollapsed = (selection: TextSelection): boolean =>
  comparePoints(selection.anchor, selection.focus) === 0;

export const caretAt = (point: TextPoint): TextSelection => ({ anchor: point, focus: point });

/** `point` moved to the nearest place `doc` has, for a selection kept across a change. */
export function clampPoint(doc: RichText, point: TextPoint): TextPoint {
  const paragraph = Math.min(Math.max(point.paragraph, 0), Math.max(doc.length - 1, 0));
  const length = paragraphLength(paragraphAt(doc, paragraph));
  return { paragraph, offset: Math.min(Math.max(point.offset, 0), length) };
}

export const clampSelection = (doc: RichText, selection: TextSelection): TextSelection => ({
  anchor: clampPoint(doc, selection.anchor),
  focus: clampPoint(doc, selection.focus),
});

const sameFormatting = (a: TextRun, b: TextRun): boolean =>
  a.bold === b.bold && a.italic === b.italic && a.href === b.href;

/** Merges neighbouring runs that are formatted alike and drops empty ones. */
export function normalizeInlines(inlines: readonly Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const inline of inlines) {
    if (isBreak(inline)) {
      out.push(inline);
      continue;
    }
    if (!inline.text) continue;
    const last = out[out.length - 1];
    if (last && !isBreak(last) && sameFormatting(last, inline)) {
      out[out.length - 1] = { ...last, text: last.text + inline.text };
    } else {
      out.push(inline);
    }
  }
  return out;
}

/** The inlines between two offsets, the text runs at either end cut to fit. */
export function sliceInlines(inlines: readonly Inline[], from: number, to = Infinity): Inline[] {
  const out: Inline[] = [];
  let position = 0;
  for (const inline of inlines) {
    const start = position;
    const length = lengthOf(inline);
    position += length;
    if (position <= from || start >= to) continue;
    if (isBreak(inline)) {
      out.push(inline);
      continue;
    }
    const text = inline.text.slice(Math.max(0, from - start), Math.min(length, to - start));
    out.push({ ...inline, text });
  }
  return out;
}

/** The paragraphs a selection formats: one that it only reaches the very start of is not one. */
function touchedParagraphs(selection: TextSelection): [number, number] {
  const [start, end] = selectionRange(selection);
  const last =
    end.paragraph > start.paragraph && end.offset === 0 ? end.paragraph - 1 : end.paragraph;
  return [start.paragraph, last];
}

/** The text runs between two points, cut at either end. */
function runsBetween(doc: RichText, start: TextPoint, end: TextPoint): TextRun[] {
  const runs: TextRun[] = [];
  for (let index = start.paragraph; index <= end.paragraph; index += 1) {
    const from = index === start.paragraph ? start.offset : 0;
    const to = index === end.paragraph ? end.offset : Infinity;
    for (const inline of sliceInlines(paragraphAt(doc, index).inlines, from, to)) {
      if (!isBreak(inline) && inline.text) runs.push(inline);
    }
  }
  return runs;
}

/** `doc` with `change` made to every text run between two points. */
function formatBetween(
  doc: RichText,
  start: TextPoint,
  end: TextPoint,
  change: (run: TextRun) => TextRun,
): RichText {
  return doc.map((paragraph, index) => {
    if (index < start.paragraph || index > end.paragraph) return paragraph;
    const from = index === start.paragraph ? start.offset : 0;
    const to = index === end.paragraph ? end.offset : Infinity;
    const inlines = [
      ...sliceInlines(paragraph.inlines, 0, from),
      ...sliceInlines(paragraph.inlines, from, to).map((inline) =>
        isBreak(inline) ? inline : change(inline),
      ),
      ...sliceInlines(paragraph.inlines, to),
    ];
    return { ...paragraph, inlines: normalizeInlines(inlines) };
  });
}

/** A run with a mark switched on or off. */
function withMark(run: TextRun, mark: Mark, on: boolean): TextRun {
  const next = { ...run };
  if (on) next[mark] = true;
  else delete next[mark];
  return next;
}

/** A run linked to `href`, or unlinked without one. */
function withHref(run: TextRun, href: string | undefined): TextRun {
  const next = { ...run };
  if (href) next.href = href;
  else delete next.href;
  return next;
}

/** The formatting of `marks` as run properties: `{ bold: true }`, never `{ bold: false }`. */
export function runMarks(marks: Marks): Omit<TextRun, 'text'> {
  return {
    ...(marks.bold ? { bold: true as const } : {}),
    ...(marks.italic ? { italic: true as const } : {}),
    ...(marks.href ? { href: marks.href } : {}),
  };
}

/**
 * Bold or italic over the selection: switched on unless every selected character already has
 * it, the way a word processor's button works. A collapsed selection changes nothing here; the
 * field keeps the mark for whatever is typed next instead.
 */
export function toggleMark(doc: RichText, selection: TextSelection, mark: Mark): RichText {
  const [start, end] = selectionRange(selection);
  const runs = runsBetween(doc, start, end);
  if (!runs.length) return doc;
  const on = !runs.every((run) => run[mark]);
  return formatBetween(doc, start, end, (run) => withMark(run, mark, on));
}

/** Gives the selected text exactly `marks`' bold and italics, whatever it had. */
export function applyMarks(
  doc: RichText,
  selection: TextSelection,
  marks: Pick<Marks, 'bold' | 'italic'>,
): RichText {
  const [start, end] = selectionRange(selection);
  return formatBetween(doc, start, end, (run) =>
    withMark(withMark(run, 'bold', marks.bold), 'italic', marks.italic),
  );
}

/** Links the selected text to `href`, or with no `href`, takes its links off. */
export function linkSelection(
  doc: RichText,
  selection: TextSelection,
  href: string | undefined,
): RichText {
  const [start, end] = selectionRange(selection);
  return formatBetween(doc, start, end, (run) => withHref(run, href));
}

/**
 * Takes bold, italics and links off the selection, or with nothing selected, off the whole
 * paragraph the caret is in. Lists are left alone: their own buttons take them off.
 */
export function clearFormatting(doc: RichText, selection: TextSelection): RichText {
  if (!isCollapsed(selection)) {
    const [start, end] = selectionRange(selection);
    return formatBetween(doc, start, end, (run) => ({ text: run.text }));
  }
  const paragraph = selection.anchor.paragraph;
  const end = { paragraph, offset: paragraphLength(paragraphAt(doc, paragraph)) };
  return formatBetween(doc, { paragraph, offset: 0 }, end, (run) => ({ text: run.text }));
}

/** The list every paragraph the selection touches is an item of, when they share one. */
export function listOf(doc: RichText, selection: TextSelection): ListKind | undefined {
  const [first, last] = touchedParagraphs(selection);
  const kinds = new Set(doc.slice(first, last + 1).map((paragraph) => paragraph.list));
  return kinds.size === 1 ? [...kinds][0] : undefined;
}

/** A paragraph as an item of `list`, or with no `list`, a plain paragraph again. */
function withList(paragraph: Paragraph, list: ListKind | undefined): Paragraph {
  return list ? { list, inlines: paragraph.inlines } : { inlines: paragraph.inlines };
}

/**
 * Makes every paragraph the selection touches an item of a `list`, or, when they all already
 * are, plain paragraphs again. Items of the other kind of list switch to this one.
 */
export function toggleList(doc: RichText, selection: TextSelection, list: ListKind): RichText {
  const [first, last] = touchedParagraphs(selection);
  const off = listOf(doc, selection) === list;
  return doc.map((paragraph, index) =>
    index < first || index > last ? paragraph : withList(paragraph, off ? undefined : list),
  );
}

/** Takes the paragraph the caret is in out of its list. */
export function liftListItem(doc: RichText, point: TextPoint): RichText {
  return doc.map((paragraph, index) =>
    index === point.paragraph ? withList(paragraph, undefined) : paragraph,
  );
}

/** The inline holding the character just before `offset`, or just after it. */
function inlineNear(paragraph: Paragraph, offset: number, side: 'before' | 'after') {
  const at = side === 'before' ? offset - 1 : offset;
  return at < 0 ? undefined : sliceInlines(paragraph.inlines, at, at + 1)[0];
}

/** The address of the link a caret is strictly inside: the characters either side share it. */
function linkInside(doc: RichText, point: TextPoint): string | undefined {
  const paragraph = paragraphAt(doc, point.paragraph);
  const before = inlineNear(paragraph, point.offset, 'before');
  const after = inlineNear(paragraph, point.offset, 'after');
  if (!before || !after || isBreak(before) || isBreak(after)) return undefined;
  return before.href && before.href === after.href ? before.href : undefined;
}

/**
 * The formatting text typed at a caret takes: the bold and italics of the character before it
 * (at the start of a line, of the one after it), and a link only strictly inside one, so typing
 * at either end of a link does not make the link longer.
 */
export function marksAt(doc: RichText, point: TextPoint): Marks {
  const paragraph = paragraphAt(doc, point.paragraph);
  const before = inlineNear(paragraph, point.offset, 'before');
  const after = inlineNear(paragraph, point.offset, 'after');
  const run = before && !isBreak(before) ? before : after && !isBreak(after) ? after : undefined;
  const href = linkInside(doc, point);
  return { bold: Boolean(run?.bold), italic: Boolean(run?.italic), ...(href ? { href } : {}) };
}

/** The formatting text typed over a selection takes: the first selected character's, unlinked. */
export function typedMarks(doc: RichText, selection: TextSelection): Marks {
  if (isCollapsed(selection)) return marksAt(doc, selection.anchor);
  const [start] = selectionRange(selection);
  const first = inlineNear(paragraphAt(doc, start.paragraph), start.offset, 'after');
  const run = first && !isBreak(first) ? first : undefined;
  return { bold: Boolean(run?.bold), italic: Boolean(run?.italic) };
}

/** A link and the stretch of one paragraph it covers. */
export interface LinkSpan {
  href: string;
  start: TextPoint;
  end: TextPoint;
}

/** Each stretch of a paragraph where neighbouring runs share a link. */
function linkSpans(paragraph: Paragraph): { href: string; start: number; end: number }[] {
  const spans: { href: string; start: number; end: number }[] = [];
  let position = 0;
  for (const inline of paragraph.inlines) {
    const start = position;
    position += lengthOf(inline);
    if (isBreak(inline) || !inline.href) continue;
    const last = spans[spans.length - 1];
    if (last && last.href === inline.href && last.end === start) last.end = position;
    else spans.push({ href: inline.href, start, end: position });
  }
  return spans;
}

/**
 * The whole link a caret is in or touches, or the one link a selection lies within: what the
 * Link button edits. A selection that takes in anything besides one link gets a new link.
 */
export function linkAround(doc: RichText, selection: TextSelection): LinkSpan | undefined {
  const [start, end] = selectionRange(selection);
  if (start.paragraph !== end.paragraph) return undefined;
  const spans = linkSpans(paragraphAt(doc, start.paragraph));
  const span = isCollapsed(selection)
    ? (spans.find((each) => each.start < start.offset && start.offset <= each.end) ??
      spans.find((each) => each.start <= start.offset && start.offset < each.end))
    : spans.find((each) => each.start <= start.offset && end.offset <= each.end);
  if (!span) return undefined;
  const paragraph = start.paragraph;
  return {
    href: span.href,
    start: { paragraph, offset: span.start },
    end: { paragraph, offset: span.end },
  };
}

/** What the toolbar shows as on for a selection. */
export interface ActiveFormatting {
  bold: boolean;
  italic: boolean;
  link: boolean;
  list: ListKind | undefined;
}

export const NO_FORMATTING: ActiveFormatting = {
  bold: false,
  italic: false,
  link: false,
  list: undefined,
};

/**
 * Bold and italic are on when every selected character has them, or at a caret, when what is
 * typed there would (`pending`, the marks a button set for the next keystroke, wins). The link
 * is on inside one; a list when every paragraph touched is an item of it.
 */
export function activeFormatting(
  doc: RichText,
  selection: TextSelection,
  pending?: Pick<Marks, 'bold' | 'italic'>,
): ActiveFormatting {
  const [start, end] = selectionRange(selection);
  const runs = isCollapsed(selection) ? [] : runsBetween(doc, start, end);
  const marks = runs.length
    ? { bold: runs.every((run) => run.bold), italic: runs.every((run) => run.italic) }
    : (pending ?? marksAt(doc, start));
  return {
    bold: Boolean(marks.bold),
    italic: Boolean(marks.italic),
    link: Boolean(linkAround(doc, selection)),
    list: listOf(doc, selection),
  };
}

/** Removes everything between two points, joining the paragraphs at either end. */
export function deleteBetween(doc: RichText, start: TextPoint, end: TextPoint): RichText {
  if (comparePoints(start, end) >= 0) return doc;
  const first = paragraphAt(doc, start.paragraph);
  const last = paragraphAt(doc, end.paragraph);
  const joined: Paragraph = {
    ...first,
    inlines: normalizeInlines([
      ...sliceInlines(first.inlines, 0, start.offset),
      ...sliceInlines(last.inlines, end.offset),
    ]),
  };
  return [...doc.slice(0, start.paragraph), joined, ...doc.slice(end.paragraph + 1)];
}

/** Puts inlines in place of the selection, and the caret after them. */
export function insertInlines(
  doc: RichText,
  selection: TextSelection,
  inlines: readonly Inline[],
): Edit {
  const [start, end] = selectionRange(selection);
  const cleared = deleteBetween(doc, start, end);
  const paragraph = paragraphAt(cleared, start.paragraph);
  const next: Paragraph = {
    ...paragraph,
    inlines: normalizeInlines([
      ...sliceInlines(paragraph.inlines, 0, start.offset),
      ...inlines,
      ...sliceInlines(paragraph.inlines, start.offset),
    ]),
  };
  const caret = { paragraph: start.paragraph, offset: start.offset + totalLength(inlines) };
  return {
    doc: cleared.map((each, index) => (index === start.paragraph ? next : each)),
    selection: caretAt(caret),
  };
}

/**
 * Enter: splits the paragraph at the caret, both halves keeping its list. In an empty list item
 * it ends the list there instead, as word processors do.
 */
export function splitParagraph(doc: RichText, selection: TextSelection): Edit {
  const [start, end] = selectionRange(selection);
  const cleared = deleteBetween(doc, start, end);
  const paragraph = paragraphAt(cleared, start.paragraph);
  if (paragraph.list && paragraphLength(paragraph) === 0) {
    return { doc: liftListItem(cleared, start), selection: caretAt(start) };
  }
  const head = { ...paragraph, inlines: sliceInlines(paragraph.inlines, 0, start.offset) };
  const tail = { ...paragraph, inlines: sliceInlines(paragraph.inlines, start.offset) };
  return {
    doc: [...cleared.slice(0, start.paragraph), head, tail, ...cleared.slice(start.paragraph + 1)],
    selection: caretAt({ paragraph: start.paragraph + 1, offset: 0 }),
  };
}

/**
 * A paste. Text that is one paragraph goes in at the caret. More than that splits the paragraph
 * the caret is in: the first pasted paragraph continues the text before the caret, the last one
 * runs into the text after it, and the rest go between. Pasted into a list, plain paragraphs
 * become items of that list; a pasted list keeps its own kind.
 */
export function insertFragment(doc: RichText, selection: TextSelection, fragment: RichText): Edit {
  const [start, end] = selectionRange(selection);
  const cleared = deleteBetween(doc, start, end);
  const at = paragraphAt(cleared, start.paragraph);
  const pieces = fragment.map((piece) =>
    at.list && !piece.list ? withList(piece, at.list) : piece,
  );
  const first = pieces[0];
  if (!first) return { doc: cleared, selection: caretAt(start) };
  if (pieces.length === 1 && first.list === at.list) {
    return insertInlines(cleared, caretAt(start), first.inlines);
  }

  let middle = pieces;
  let head: Paragraph = { ...at, inlines: sliceInlines(at.inlines, 0, start.offset) };
  let keepHead = head.inlines.length > 0;
  if (first.list === at.list) {
    head = { ...head, inlines: normalizeInlines([...head.inlines, ...first.inlines]) };
    keepHead = true;
    middle = middle.slice(1);
  }
  let tail: Paragraph = { ...at, inlines: sliceInlines(at.inlines, start.offset) };
  let keepTail = tail.inlines.length > 0;
  const last = middle[middle.length - 1];
  let caretOffset: number | undefined;
  if (last && last.list === at.list) {
    caretOffset = paragraphLength(last);
    tail = { ...tail, inlines: normalizeInlines([...last.inlines, ...tail.inlines]) };
    keepTail = true;
    middle = middle.slice(0, -1);
  }

  const inserted = [...(keepHead ? [head] : []), ...middle];
  const paragraphs = [...inserted, ...(keepTail ? [tail] : [])];
  const before = start.paragraph;
  const caret =
    caretOffset !== undefined
      ? { paragraph: before + inserted.length, offset: caretOffset }
      : {
          paragraph: before + Math.max(inserted.length - 1, 0),
          offset: paragraphLength(inserted[inserted.length - 1] ?? EMPTY),
        };
  const next = [
    ...cleared.slice(0, before),
    ...(paragraphs.length ? paragraphs : [EMPTY]),
    ...cleared.slice(before + 1),
  ];
  return { doc: next, selection: caretAt(caret) };
}

/**
 * A document as a sequence of comparable units: each paragraph's start (with its list), each
 * line break, and each character with its formatting.
 */
function units(doc: RichText): string[] {
  return doc.flatMap((paragraph) => [
    `¶${paragraph.list ?? ''}`,
    ...paragraph.inlines.flatMap((inline) =>
      isBreak(inline)
        ? ['↵']
        : inline.text
            .split('')
            .map(
              (char) =>
                `${char}${inline.bold ? 'b' : ''}${inline.italic ? 'i' : ''}${inline.href ?? ''}`,
            ),
    ),
  ]);
}

/**
 * Where a caret belongs once the text has changed from `before` to `after` by something other
 * than typing in it (an undo): just after the part that changed, as `placeCaret` puts one in a
 * text field, and as the browser's own undo leaves it. Formatting counts as a change, so undoing
 * bold leaves the caret after the words it was on. Undefined when nothing changed.
 */
export function caretAfterChange(before: RichText, after: RichText): TextPoint | undefined {
  const old = units(before);
  const next = units(after);
  const shorter = Math.min(old.length, next.length);
  let start = 0;
  while (start < shorter && old[start] === next[start]) start += 1;
  if (start === old.length && start === next.length) return undefined;
  let end = 0;
  while (end < shorter - start && old[old.length - 1 - end] === next[next.length - 1 - end]) {
    end += 1;
  }
  // Count the units before the caret off paragraph by paragraph: each starts with its own.
  let remaining = next.length - end;
  for (let paragraph = 0; paragraph < after.length; paragraph += 1) {
    const length = paragraphLength(paragraphAt(after, paragraph));
    if (remaining <= length + 1) return { paragraph, offset: Math.max(0, remaining - 1) };
    remaining -= length + 1;
  }
  return clampPoint(after, { paragraph: after.length - 1, offset: Infinity });
}

/**
 * Plain text as a document: blank lines separate paragraphs and single newlines become line
 * breaks, as `plainTextToHtml` reads them. Each run takes `marks` (pasted text matches the
 * formatting where it lands).
 */
export function textToRichText(
  text: string,
  marks: Marks = { bold: false, italic: false },
): RichText {
  const trimmed = text.replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, '');
  if (!trimmed.trim()) return [];
  return trimmed
    .split(/\n{2,}/)
    .filter((part) => part.trim())
    .map((part) => ({
      inlines: normalizeInlines(
        part
          .split('\n')
          .flatMap((line, index): Inline[] => [
            ...(index > 0 ? [{ br: true } as const] : []),
            { text: line, ...runMarks(marks) },
          ]),
      ),
    }));
}
