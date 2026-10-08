import { isSafeLinkHref, sanitizeHtml } from '@subterra-technologies/blockletter';
import {
  clampPoint,
  isBreak,
  normalizeInlines,
  paragraphLength,
  type Inline,
  type ListKind,
  type Paragraph,
  type RichText,
  type TextPoint,
  type TextRun,
  type TextSelection,
} from './model';

/**
 * The rich-text field's document and the DOM. `readRichText` turns markup into a document: the
 * field's own after the browser has typed into it, or HTML from a paste or a stored body. Two
 * drawings come back out: `renderEditable`, the markup the field edits, and `richTextToHtml`, the
 * HTML it stores, which uses only `p`, `br`, `strong`, `em`, `a`, `ul`, `ol` and `li`, and which
 * `sanitizeHtml` leaves exactly as it is.
 */

/** Read past entirely: they hold no words a reader sees. */
const SKIPPED = new Set([
  'area',
  'audio',
  'base',
  'button',
  'canvas',
  'embed',
  'head',
  'iframe',
  'img',
  'input',
  'link',
  'map',
  'math',
  'meta',
  'noscript',
  'object',
  'option',
  'picture',
  'script',
  'select',
  'source',
  'style',
  'svg',
  'template',
  'textarea',
  'title',
  'track',
  'video',
]);

/** Elements that end one paragraph and start the next. */
const BLOCKS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'caption',
  'center',
  'dd',
  'details',
  'dialog',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'legend',
  'main',
  'nav',
  'p',
  'pre',
  'search',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
]);

/** Headings keep their weight, as bold paragraphs. */
const BOLD_BLOCKS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th']);

/** What the text inside an element is formatted as. */
interface Formatting {
  bold: boolean;
  italic: boolean;
  href: string | undefined;
  /** Inside `pre`: newlines are line breaks. */
  pre: boolean;
}

const PLAIN: Formatting = { bold: false, italic: false, href: undefined, pre: false };

/** A position in the DOM, as a `Selection` or `StaticRange` gives one. */
export interface DomPoint {
  node: Node;
  offset: number;
}

const isElement = (node: Node): node is Element => node.nodeType === 1;
const isText = (node: Node): node is Text => node.nodeType === 3;

/** Spaces, tabs and newlines; not the no-break space, which is meant to show. */
const COLLAPSIBLE = /[\t\n\r\f ]+/g;

/** The formatting inline content has inside `element`: from its tag, then its own style. */
function inlineFormatting(element: Element, outer: Formatting): Formatting {
  const tag = element.localName;
  let { bold, italic, href } = outer;
  if (tag === 'strong' || tag === 'b') bold = true;
  if (tag === 'em' || tag === 'i') italic = true;
  if (tag === 'a') {
    const address = element.getAttribute('href')?.trim();
    href = address && isSafeLinkHref(address) ? address : undefined;
  }
  // Pasted HTML often says it with styles: Google Docs wraps a whole copy in
  // `<b style="font-weight:normal">` and marks the real bold with `font-weight:700`.
  const style = (element as Partial<HTMLElement>).style;
  const weight = style?.fontWeight;
  if (weight) {
    if (/^(bold|bolder|[6-9]00)$/.test(weight)) bold = true;
    else if (/^(normal|lighter|[1-5]00)$/.test(weight)) bold = false;
  }
  const fontStyle = style?.fontStyle;
  if (fontStyle) {
    if (/^(italic|oblique)/.test(fontStyle)) italic = true;
    else if (fontStyle === 'normal') italic = false;
  }
  return { ...outer, bold, italic, href };
}

const runOf = (text: string, formatting: Formatting): TextRun => ({
  text,
  ...(formatting.bold ? { bold: true as const } : {}),
  ...(formatting.italic ? { italic: true as const } : {}),
  ...(formatting.href ? { href: formatting.href } : {}),
});

/** Has something that shows: a line break, or text that is not only collapsible space. */
const hasContent = (inlines: readonly Inline[]): boolean =>
  inlines.some((inline) => isBreak(inline) || /[^\t\n\r\f ]/.test(inline.text));

/**
 * Collapses spaces as a browser lays them out, and drops the ones at the start and end of each
 * line (no-break spaces at the end too, where browsers leave them while typing).
 */
export function tidyWhitespace(inlines: readonly Inline[]): Inline[] {
  const out: Inline[] = [];
  let lineStart = true;
  const trimLineEnd = () => {
    for (let last = out[out.length - 1]; last && !isBreak(last); last = out[out.length - 1]) {
      const text = last.text.replace(/[ \u00a0]+$/, '');
      if (text) {
        out[out.length - 1] = { ...last, text };
        return;
      }
      out.pop();
    }
  };
  for (const inline of inlines) {
    if (isBreak(inline)) {
      trimLineEnd();
      out.push(inline);
      lineStart = true;
      continue;
    }
    let text = inline.text.replace(COLLAPSIBLE, ' ');
    const previous = out[out.length - 1];
    const afterSpace = previous && !isBreak(previous) && previous.text.endsWith(' ');
    if (lineStart || afterSpace) text = text.replace(/^ /, '');
    if (!text) continue;
    out.push({ ...inline, text });
    lineStart = false;
  }
  trimLineEnd();
  return out;
}

/**
 * Reads markup into a document, and finds each of `points` in it.
 *
 * Paragraphs, list items, headings, table cells and the like each become a paragraph; inside a
 * list item, paragraphs become line breaks (Google Docs wraps every item in one), and a nested
 * list's items follow as items of their own. Bold, italics and links come from the tags and
 * their styles; links only with an address `isSafeLinkHref` accepts. Anything else keeps its
 * words and loses its formatting. The last line break in a paragraph is dropped: browsers show
 * none for it, and put one in an empty paragraph to give it height.
 *
 * `tidy` is for markup from elsewhere: spaces collapse as a browser lays them out, and empty
 * elements make no paragraph. The field's own markup is read without it, so that each DOM point
 * lands on the same character in the document.
 */
export function readRichText(
  root: Node,
  options: { tidy: boolean },
  points: readonly DomPoint[] = [],
): { doc: RichText; points: (TextPoint | undefined)[] } {
  const doc: RichText = [];
  const found: (TextPoint | undefined)[] = points.map(() => undefined);
  let waiting: number[] = [];
  let current: Paragraph | undefined;
  let length = 0;
  let list: ListKind | undefined;
  let inItem = false;

  const open = (): Paragraph => {
    current = list ? { list, inlines: [] } : { inlines: [] };
    length = 0;
    doc.push(current);
    for (const index of waiting) found[index] = { paragraph: doc.length - 1, offset: 0 };
    waiting = [];
    return current;
  };
  const close = () => {
    current = undefined;
  };
  const push = (inline: Inline) => {
    (current ?? open()).inlines.push(inline);
    length += isBreak(inline) ? 1 : inline.text.length;
  };
  const markPoint = (index: number, offset = length) => {
    if (current) found[index] = { paragraph: doc.length - 1, offset };
    else waiting.push(index);
  };
  const pointsAt = (node: Node, offset: number) => {
    points.forEach((point, index) => {
      if (point.node === node && point.offset === offset) markPoint(index);
    });
  };

  /** Text as runs, each newline in it a line break: one place long, as a character is. */
  const pushLines = (text: string, formatting: Formatting) => {
    text.split('\n').forEach((line, index) => {
      if (index > 0) push({ br: true });
      if (line) push(runOf(line, formatting));
    });
  };

  const readText = (node: Text, formatting: Formatting) => {
    const inside = points.flatMap((point, index) => (point.node === node ? [index] : []));
    if (!options.tidy) {
      // The field shows spaces and newlines as typed, so a newline is a line break here.
      if (!current) open();
      for (const index of inside) markPoint(index, length + (points[index]?.offset ?? 0));
      pushLines(node.data, formatting);
      return;
    }
    // Tidy reads map no points into text: collapsing spaces moves every offset after them.
    for (const index of inside) markPoint(index);
    if (formatting.pre) {
      pushLines(node.data, formatting);
      return;
    }
    const text = node.data.replace(COLLAPSIBLE, ' ');
    // Space between paragraphs is only how the markup was laid out.
    if (!current && text === ' ') return;
    if (text) push(runOf(text, formatting));
  };

  const readChildren = (parent: Node, formatting: Formatting) => {
    const children = parent.childNodes;
    for (let index = 0; index < children.length; index += 1) {
      pointsAt(parent, index);
      const child = children[index];
      if (child) read(child, formatting);
    }
    pointsAt(parent, children.length);
  };

  const readList = (element: Element, kind: ListKind, formatting: Formatting) => {
    close();
    const outer = { list, inItem };
    list = kind;
    inItem = false;
    readChildren(element, formatting);
    close();
    // Back in an item that held this list, what follows it starts an item of the outer list.
    list = outer.list;
    inItem = outer.inItem;
  };

  const readItem = (element: Element, formatting: Formatting) => {
    close();
    const outer = inItem;
    inItem = true;
    open();
    readChildren(element, formatting);
    close();
    inItem = outer;
  };

  const readBlock = (element: Element, tag: string, formatting: Formatting) => {
    const inner = {
      ...formatting,
      bold: formatting.bold || BOLD_BLOCKS.has(tag),
      pre: formatting.pre || tag === 'pre',
    };
    if (inItem) {
      if (current && hasContent(current.inlines) && !isBreak(current.inlines.at(-1)!)) {
        push({ br: true });
      }
      readChildren(element, inner);
      return;
    }
    close();
    const before = doc.length;
    if (tag !== 'hr') readChildren(element, inner);
    // An empty paragraph of the field's own is a line the caret can be on.
    if (!options.tidy && doc.length === before && tag !== 'hr') open();
    close();
  };

  const read = (node: Node, formatting: Formatting): void => {
    if (isText(node)) {
      readText(node, formatting);
      return;
    }
    if (!isElement(node)) return;
    const tag = node.localName;
    if (SKIPPED.has(tag)) return;
    if (tag === 'br') push({ br: true });
    else if (tag === 'ul' || tag === 'menu') readList(node, 'ul', formatting);
    else if (tag === 'ol') readList(node, 'ol', formatting);
    else if (tag === 'li') readItem(node, formatting);
    else if (BLOCKS.has(tag)) readBlock(node, tag, formatting);
    else readChildren(node, inlineFormatting(node, formatting));
  };

  readChildren(root, PLAIN);
  if (!doc.length) open();
  const last = doc.length - 1;
  for (const index of waiting) {
    found[index] = { paragraph: last, offset: paragraphLength(doc[last] ?? { inlines: [] }) };
  }

  const finished = doc.map((paragraph) => {
    let inlines = options.tidy ? tidyWhitespace(paragraph.inlines) : paragraph.inlines;
    if (inlines.length && isBreak(inlines[inlines.length - 1]!)) inlines = inlines.slice(0, -1);
    return { ...paragraph, inlines: normalizeInlines(inlines) };
  });
  return {
    doc: finished,
    points: found.map((point) => (point ? clampPoint(finished, point) : undefined)),
  };
}

/** HTML from anywhere (a paste, a stored body), cleaned by `sanitizeHtml`, as a document. */
export function parseRichText(html: string): RichText {
  const template = document.createElement('template');
  // A template's content is inert: nothing in it loads or runs while it is read.
  template.innerHTML = sanitizeHtml(html);
  return readRichText(template.content, { tidy: true }).doc;
}

const escapeText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type Tag = 'strong' | 'em' | { href: string };

const sameTag = (a: Tag, b: Tag): boolean =>
  typeof a === 'string' || typeof b === 'string' ? a === b : a.href === b.href;

/** A run's tags, outermost first: a link, then bold, then italics. */
const tagsOf = (run: TextRun): Tag[] => [
  ...(run.href ? [{ href: run.href }] : []),
  ...(run.bold ? ['strong' as const] : []),
  ...(run.italic ? ['em' as const] : []),
];

// `rel` and `target` as `sanitizeHtml` writes every link, so stored HTML comes back unchanged.
const openTag = (tag: Tag): string =>
  typeof tag === 'string'
    ? `<${tag}>`
    : `<a href="${escapeText(tag.href)}" rel="noopener" target="_blank">`;
const closeTag = (tag: Tag): string => (typeof tag === 'string' ? `</${tag}>` : '</a>');

/** Inlines as markup, each tag opened once for a stretch of runs that share it. */
function renderInlines(inlines: readonly Inline[]): string {
  let html = '';
  const open: Tag[] = [];
  inlines.forEach((inline, index) => {
    let tags: Tag[];
    if (isBreak(inline)) {
      // A break stays inside the tags the text on both sides of it shares.
      const next = inlines.slice(index + 1).find((each): each is TextRun => !isBreak(each));
      const after = next ? tagsOf(next) : [];
      let shared = 0;
      while (
        shared < open.length &&
        shared < after.length &&
        sameTag(open[shared]!, after[shared]!)
      ) {
        shared += 1;
      }
      tags = open.slice(0, shared);
    } else {
      tags = tagsOf(inline);
    }
    let common = 0;
    while (common < open.length && common < tags.length && sameTag(open[common]!, tags[common]!)) {
      common += 1;
    }
    while (open.length > common) html += closeTag(open.pop()!);
    for (const tag of tags.slice(common)) {
      html += openTag(tag);
      open.push(tag);
    }
    html += isBreak(inline) ? '<br>' : escapeText(inline.text);
  });
  while (open.length) html += closeTag(open.pop()!);
  return html;
}

/** Paragraphs as markup: a list's consecutive items share one `ul` or `ol`. */
function renderParagraphs(doc: RichText, inner: (paragraph: Paragraph) => string): string {
  let html = '';
  for (let index = 0; index < doc.length;) {
    const paragraph = doc[index]!;
    const kind = paragraph.list;
    if (!kind) {
      html += `<p>${inner(paragraph)}</p>`;
      index += 1;
      continue;
    }
    html += `<${kind}>`;
    for (; index < doc.length && doc[index]!.list === kind; index += 1) {
      html += `<li>${inner(doc[index]!)}</li>`;
    }
    html += `</${kind}>`;
  }
  return html;
}

/**
 * The markup the field edits. An empty paragraph, or one ending in a line break, gets one more
 * `<br>`, the placeholder browsers give a line so it has height and the caret can sit on it.
 */
export function renderEditable(doc: RichText): string {
  return renderParagraphs(doc, (paragraph) => {
    const last = paragraph.inlines[paragraph.inlines.length - 1];
    const placeholder = !hasContent(paragraph.inlines) || (last && isBreak(last));
    return renderInlines(paragraph.inlines) + (placeholder ? '<br>' : '');
  });
}

/**
 * The HTML the field stores: spaces collapsed, nothing empty at the start or the end, no empty
 * list items, and an empty paragraph between others kept as `<p><br></p>`, the line it shows as.
 * An empty document is ''.
 */
export function richTextToHtml(doc: RichText): string {
  const paragraphs = doc
    .map((paragraph) => {
      const inlines = tidyWhitespace(paragraph.inlines);
      while (inlines.length && isBreak(inlines[inlines.length - 1]!)) inlines.pop();
      return { ...paragraph, inlines: normalizeInlines(inlines) };
    })
    .filter((paragraph) => !paragraph.list || paragraph.inlines.length);
  let first = 0;
  let last = paragraphs.length - 1;
  while (first <= last && !paragraphs[first]!.inlines.length) first += 1;
  while (last >= first && !paragraphs[last]!.inlines.length) last -= 1;
  if (first > last) return '';
  return renderParagraphs(paragraphs.slice(first, last + 1), (paragraph) =>
    paragraph.inlines.length ? renderInlines(paragraph.inlines) : '<br>',
  );
}

/** The elements of the field's markup that are paragraphs: each `p`, and each list's `li`s. */
function paragraphElements(root: Element): Element[] {
  return [...root.children].flatMap((child) =>
    child.localName === 'ul' || child.localName === 'ol' ? [...child.children] : [child],
  );
}

/** The text nodes and line breaks inside `element`, in order. */
function leavesOf(element: Element): (Text | Element)[] {
  const leaves: (Text | Element)[] = [];
  const visit = (node: Node) => {
    for (const child of node.childNodes) {
      if (isText(child)) leaves.push(child);
      else if (isElement(child)) {
        if (child.localName === 'br') leaves.push(child);
        else visit(child);
      }
    }
  };
  visit(element);
  return leaves;
}

const childIndex = (node: Node): number =>
  node.parentNode ? Array.prototype.indexOf.call(node.parentNode.childNodes, node) : 0;

/**
 * Where a point of the document is in markup `renderEditable` drew. Between two runs, it is the
 * end of the first, so typing there carries on that run's formatting, as word processors do.
 */
export function pointToDom(root: Element, point: TextPoint): DomPoint {
  const element = paragraphElements(root)[point.paragraph];
  if (!element) return { node: root, offset: root.childNodes.length };
  let remaining = point.offset;
  const leaves = leavesOf(element);
  for (let index = 0; index < leaves.length; index += 1) {
    const leaf = leaves[index]!;
    if (isText(leaf)) {
      if (remaining <= leaf.data.length) return { node: leaf, offset: remaining };
      remaining -= leaf.data.length;
      continue;
    }
    const parent = leaf.parentNode ?? element;
    if (remaining === 0) return { node: parent, offset: childIndex(leaf) };
    remaining -= 1;
    if (remaining === 0) {
      const next = leaves[index + 1];
      return next && isText(next)
        ? { node: next, offset: 0 }
        : { node: parent, offset: childIndex(leaf) + 1 };
    }
  }
  return { node: element, offset: element.childNodes.length };
}

/** The document in the field's markup, and the selection in it when the DOM's is inside. */
export function readSelection(root: Element): {
  doc: RichText;
  selection: TextSelection | undefined;
} {
  const selection = root.ownerDocument.getSelection();
  const points: DomPoint[] = [];
  if (selection && selection.rangeCount > 0) {
    const { anchorNode, focusNode } = selection;
    if (anchorNode && focusNode && root.contains(anchorNode) && root.contains(focusNode)) {
      points.push(
        { node: anchorNode, offset: selection.anchorOffset },
        { node: focusNode, offset: selection.focusOffset },
      );
    }
  }
  const read = readRichText(root, { tidy: false }, points);
  const [anchor, focus] = read.points;
  return { doc: read.doc, selection: anchor && focus ? { anchor, focus } : undefined };
}

/** Puts the DOM's selection where `selection` is, in markup `renderEditable` drew. */
export function writeSelection(root: Element, selection: TextSelection): void {
  const anchor = pointToDom(root, selection.anchor);
  const focus = pointToDom(root, selection.focus);
  root.ownerDocument
    .getSelection()
    ?.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
}

/**
 * Whether the field's markup is still the shape `renderEditable` draws: paragraphs and lists of
 * items holding text, line breaks, `strong`, `em` and safe links, with no other attributes, and
 * every line with something in it to give it height. Typing keeps it so; when a browser's own
 * editing has left anything else (a `span` with a style, a `div`, an empty line), the field
 * redraws it from the document.
 */
export function isTidy(root: Element): boolean {
  if (!root.firstChild) return false;
  for (const child of root.childNodes) {
    if (!isElement(child) || child.attributes.length) return false;
    if (child.localName === 'p') {
      if (!tidyParagraph(child)) return false;
    } else if (child.localName === 'ul' || child.localName === 'ol') {
      if (!child.firstChild) return false;
      for (const item of child.childNodes) {
        if (!isElement(item) || item.localName !== 'li' || !tidyParagraph(item)) return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

function tidyParagraph(element: Element): boolean {
  if (element.attributes.length) return false;
  let shows = false;
  const check = (node: Node, inLink: boolean): boolean => {
    for (const child of node.childNodes) {
      if (isText(child)) {
        // A newline shows as a line break, which the field draws as `<br>`.
        if (child.data.includes('\n')) return false;
        if (/[^\t\n\r\f ]/.test(child.data)) shows = true;
        continue;
      }
      if (!isElement(child)) return false;
      const tag = child.localName;
      if (tag === 'br') {
        if (child.attributes.length) return false;
        shows = true;
      } else if (tag === 'strong' || tag === 'em') {
        if (child.attributes.length || !check(child, inLink)) return false;
      } else if (tag === 'a') {
        if (inLink || !tidyLink(child) || !check(child, true)) return false;
      } else {
        return false;
      }
    }
    return true;
  };
  return check(element, false) && shows;
}

const LINK_ATTRIBUTES = new Set(['href', 'rel', 'target']);

function tidyLink(element: Element): boolean {
  const href = element.getAttribute('href');
  return (
    Boolean(href && isSafeLinkHref(href)) &&
    [...element.attributes].every((attribute) => LINK_ATTRIBUTES.has(attribute.name))
  );
}

/** The formatting the DOM itself gives text typed at a text position: from the elements around it. */
export function domMarksAt(
  root: Element,
  point: DomPoint,
): { bold: boolean; italic: boolean; href?: string } | undefined {
  // Between elements, which text node a browser types into is its own choice.
  if (!isText(point.node)) return undefined;
  let bold = false;
  let italic = false;
  let href: string | undefined;
  for (let node = point.node.parentNode; node && node !== root; node = node.parentNode) {
    if (!isElement(node)) continue;
    const tag = node.localName;
    if (tag === 'strong' || tag === 'b') bold = true;
    else if (tag === 'em' || tag === 'i') italic = true;
    else if (tag === 'a') href ??= node.getAttribute('href') ?? undefined;
  }
  return { bold, italic, ...(href ? { href } : {}) };
}

const EDITABLE_TAGS = new Set([
  'a',
  'b',
  'br',
  'div',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'ul',
]);
const LOST_ATTRIBUTES = /\s(?:align|class|start|style|type)\s*=/i;

/**
 * Whether HTML has formatting the field cannot keep (headings, tables, images, colours,
 * alignment, a numbered list that starts at 3), which editing it here would take away. Read from
 * the sanitised markup with no DOM, so it can run while rendering, on a server too.
 */
export function hasUnsupportedFormatting(html: string): boolean {
  for (const match of sanitizeHtml(html).matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    if (!EDITABLE_TAGS.has((match[1] ?? '').toLowerCase())) return true;
    if (LOST_ATTRIBUTES.test(match[2] ?? '')) return true;
  }
  return false;
}
