import { absoluteUrl, escapeHtml } from './html';

/**
 * The Markdown a free-text field understands, read into a small tree that the email renderer, its
 * plain-text twin and an editor's canvas all draw, so the three cannot disagree.
 *
 * Inline: `**bold**` / `__bold__`, `*italic*` / `_italic_`, `~~strike~~` and `[label](address)`,
 * plus the few harmless tags a paste carries, `<b>`, `<strong>`, `<i>` and `<em>`, with no
 * attributes. Blocks: `#`, `##` and `###` headings (deeper ones read as `###`), bullet lists
 * (`- `, `* `, `• `), numbered lists (`1. `, `1) `), `> ` quotes and `---` dividers; everything
 * else is a paragraph, exactly as plain text always was: a blank line starts a new one and a single
 * line break stays a line break. Pasted `<br>` and `<p>`, with no attributes, become the breaks they
 * mean.
 *
 * Nothing here writes markup of its own from what was typed: the tree holds text runs, and whoever
 * draws one escapes it, so any other tag, or markup inside the marks, stays visible text. Inline
 * code, images, tables and backslash escapes are not read and stay as typed.
 */

/*
 * The renderer may run on a server, on text from strangers, so reading is linear in the length of
 * the input: no search is retried from each later position after failing on a long scan. Each
 * "where does this close" question is answered by a pointer that only moves forward, or by one
 * pass done up front, and runs of marks are paired with a stack rather than by scanning ahead.
 */

/** A run of formatted text. `link.url` is as typed; whoever draws it makes it safe. */
export type InlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'bold' | 'italic' | 'strike'; children: InlineNode[] }
  | { kind: 'link'; url: string; children: InlineNode[] };

/** One block of a body. Each `text` is read with `parseInline`; it may hold line breaks. */
export type MarkdownBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'list'; ordered: boolean; start: number; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'divider' };

type Mark = 'bold' | 'italic' | 'strike';

/** Formatting nested deeper than this is drawn as its text: real writing never nests so far. */
const MAX_DEPTH = 8;

const SAFE_TAGS: readonly { name: string; kind: Mark }[] = [
  { name: 'strong', kind: 'bold' },
  { name: 'em', kind: 'italic' },
  { name: 'b', kind: 'bold' },
  { name: 'i', kind: 'italic' },
];

const isSpace = (char: string | undefined): boolean => char === undefined || /\s/.test(char);
/** Letters and digits: marks touching one on the outside are part of a word, not formatting. */
const isWord = (char: string | undefined): boolean =>
  char !== undefined && /[\p{L}\p{N}]/u.test(char);

/** Whether `source` holds `word` (lowercase ASCII) at `at`, ignoring ASCII case. */
function holdsAt(source: string, at: number, word: string): boolean {
  if (at + word.length > source.length) return false;
  for (let index = 0; index < word.length; index += 1) {
    const code = source.charCodeAt(at + index);
    const lower = code >= 65 && code <= 90 ? code + 32 : code;
    if (lower !== word.charCodeAt(index)) return false;
  }
  return true;
}

/**
 * The index of the `)` that closes each `(`, within the stretch of text around it that holds no
 * whitespace, or -1: a link's address may hold balanced brackets (as many encyclopaedia addresses
 * do) but never a space. One pass with a stack.
 */
function matchParens(source: string): Int32Array {
  const match = new Int32Array(source.length).fill(-1);
  const open: number[] = [];
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') open.push(index);
    else if (char === ')') {
      const start = open.pop();
      if (start !== undefined) match[start] = index;
    } else if (isSpace(char)) open.length = 0;
  }
  return match;
}

/** A pointer to the next occurrence of `needle` at or after a position that only ever grows. */
function forwardFinder(source: string, needle: string): (from: number) => number {
  let found = -2;
  return (from) => {
    if (found === -1) return -1;
    if (found < from) found = source.indexOf(needle, from);
    return found;
  };
}

/** Like `forwardFinder`, for a closing tag in any letter case. */
function closingTagFinder(source: string, name: string): (from: number) => number {
  const find = forwardFinder(source, '</');
  const closing = `</${name}>`;
  let found = -2;
  return (from) => {
    if (found === -1 || found >= from) return found;
    let at = from;
    for (;;) {
      at = find(at);
      if (at === -1 || holdsAt(source, at, closing)) break;
      at += 2;
    }
    found = at;
    return found;
  };
}

// --- Inline -------------------------------------------------------------------------------------

/** One piece of a line being read: text, a finished node, a run of marks, or marks paired up. */
interface Piece {
  prev: Piece | null;
  next: Piece | null;
  text?: string;
  node?: InlineNode;
  run?: Run;
  /** Marks paired around the pieces from `first` to `last`. */
  mark?: { kind: Mark; first: Piece | null; last: Piece | null };
}

/** A run of `*`, `_` or `~` that may open or close formatting. */
interface Run {
  char: string;
  /** Marks not yet paired. */
  count: number;
  canOpen: boolean;
  canClose: boolean;
  piece: Piece;
}

/** The pieces of one line, linked, so pairing two marks rewires them without copying. */
class Pieces {
  head: Piece | null = null;
  tail: Piece | null = null;

  push(piece: Omit<Piece, 'prev' | 'next'>): Piece {
    const linked: Piece = { ...piece, prev: this.tail, next: null };
    if (this.tail) this.tail.next = linked;
    else this.head = linked;
    this.tail = linked;
    return linked;
  }

  remove(piece: Piece): void {
    if (piece.prev) piece.prev.next = piece.next;
    else this.head = piece.next;
    if (piece.next) piece.next.prev = piece.prev;
    else this.tail = piece.prev;
  }

  /** Moves the pieces strictly between `opener` and `closer` into a new piece marked `kind`. */
  wrap(opener: Piece, closer: Piece, kind: Mark): void {
    const first = opener.next === closer ? null : opener.next;
    const last = first ? closer.prev : null;
    if (first) first.prev = null;
    if (last) last.next = null;
    const wrapped: Piece = { prev: opener, next: closer, mark: { kind, first, last } };
    opener.next = wrapped;
    closer.prev = wrapped;
  }
}

/** The runs that may still open formatting, in order, and the top one of each mark character. */
class Openers {
  private readonly all: Run[] = [];
  private readonly byChar = new Map<string, Run[]>();

  top(char: string): Run | undefined {
    const runs = this.byChar.get(char);
    return runs?.[runs.length - 1];
  }

  push(run: Run): void {
    this.all.push(run);
    const runs = this.byChar.get(run.char) ?? [];
    runs.push(run);
    this.byChar.set(run.char, runs);
  }

  /** Forgets every opener after `run`: marks inside a pair never pair with marks outside it. */
  popAbove(run: Run): void {
    while (this.all.length > 0 && this.all[this.all.length - 1] !== run) this.pop();
  }

  pop(): void {
    const run = this.all.pop();
    if (run) this.byChar.get(run.char)?.pop();
  }

  clear(): void {
    this.all.length = 0;
    this.byChar.clear();
  }
}

/**
 * Pairs a closing run with the nearest opener of the same character, as many times as its marks
 * allow: two marks make bold (or strikethrough), one italic, and `***both***` is bold around
 * italic. Each pairing takes marks off both runs, so this runs a bounded number of times per run.
 */
function close(run: Run, openers: Openers, pieces: Pieces): void {
  while (run.count > 0) {
    const opener = openers.top(run.char);
    if (!opener) break;
    const use =
      run.char === '~'
        ? 2
        : opener.count >= 3 && run.count >= 3
          ? 1
          : Math.min(opener.count, run.count) >= 2
            ? 2
            : 1;
    openers.popAbove(opener);
    pieces.wrap(
      opener.piece,
      run.piece,
      run.char === '~' ? 'strike' : use === 2 ? 'bold' : 'italic',
    );
    opener.count -= use;
    run.count -= use;
    if (opener.count === 0) {
      openers.pop();
      pieces.remove(opener.piece);
    }
  }
  if (run.count === 0) pieces.remove(run.piece);
  else if (run.canOpen) openers.push(run);
}

/** `[label](address)` at `at`, or null. The label holds no `]` and no line break. */
function readLink(
  source: string,
  at: number,
  nextBracket: (from: number) => number,
  nextBreak: (from: number) => number,
  parens: Int32Array,
): { label: string; url: string; end: number } | null {
  const close = nextBracket(at + 1);
  if (close <= at + 1) return null;
  const lineBreak = nextBreak(at + 1);
  if (lineBreak !== -1 && lineBreak < close) return null;
  if (source[close + 1] !== '(') return null;
  const end = parens[close + 1] ?? -1;
  if (end <= close + 2) return null;
  return { label: source.slice(at + 1, close), url: source.slice(close + 2, end), end: end + 1 };
}

/** The finished tree of a list of pieces, merging neighbouring text and capping the nesting. */
function toNodes(head: Piece | null): InlineNode[] {
  const root: InlineNode[] = [];
  const add = (into: InlineNode[], text: string): void => {
    const last = into[into.length - 1];
    if (last?.kind === 'text') last.text += text;
    else into.push({ kind: 'text', text });
  };
  // A walk with its own stack: the pieces may nest as deep as a stranger cares to type.
  const stack: { piece: Piece | null; into: InlineNode[]; depth: number }[] = [
    { piece: head, into: root, depth: 0 },
  ];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    const piece = frame.piece;
    if (!piece) {
      stack.pop();
      continue;
    }
    frame.piece = piece.next;
    if (piece.text !== undefined) add(frame.into, piece.text);
    else if (piece.run) add(frame.into, piece.run.char.repeat(piece.run.count));
    else if (piece.node) frame.into.push(piece.node);
    else if (piece.mark) {
      if (frame.depth >= MAX_DEPTH) {
        stack.push({ piece: piece.mark.first, into: frame.into, depth: frame.depth });
      } else {
        const children: InlineNode[] = [];
        frame.into.push({ kind: piece.mark.kind, children });
        stack.push({ piece: piece.mark.first, into: children, depth: frame.depth + 1 });
      }
    }
  }
  return root;
}

/**
 * Text as a tree of plain and formatted runs. Marks must hug what they format (`** no **` is text),
 * sit at the edges of words (so `snake_case`, `file_name`, `2*3*4` and `2 * 3` stay as written) and
 * never cross a line break. A pasted `<b>`, `<strong>`, `<i>` or `<em>` with no attributes formats
 * what lies between it and its closing tag; any other tag is text.
 */
export const parseInline = (source: string): InlineNode[] => readInline(source, 0);

function readInline(source: string, depth: number): InlineNode[] {
  const pieces = new Pieces();
  const openers = new Openers();
  const nextBracket = forwardFinder(source, ']');
  const nextBreak = forwardFinder(source, '\n');
  const closingTags = new Map(SAFE_TAGS.map(({ name }) => [name, closingTagFinder(source, name)]));
  let parens: Int32Array | undefined;
  let plain = '';
  const flush = (): void => {
    if (plain) pieces.push({ text: plain });
    plain = '';
  };
  // A link's label and a tag's content are read on their own; past a few levels they are text.
  const inner = (text: string): InlineNode[] =>
    depth >= MAX_DEPTH ? [{ kind: 'text', text }] : readInline(text, depth + 1);

  let at = 0;
  while (at < source.length) {
    const char = source[at]!;

    if (char === '[') {
      parens ??= matchParens(source);
      const link = readLink(source, at, nextBracket, nextBreak, parens);
      if (link) {
        flush();
        pieces.push({ node: { kind: 'link', url: link.url, children: inner(link.label) } });
        at = link.end;
        continue;
      }
    }

    if (char === '<') {
      const tag = SAFE_TAGS.find(({ name }) => holdsAt(source, at, `<${name}>`));
      if (tag) {
        const from = at + tag.name.length + 2;
        const closing = closingTags.get(tag.name)!(from);
        if (closing > from) {
          flush();
          pieces.push({
            node: { kind: tag.kind, children: inner(source.slice(from, closing)) },
          });
          at = closing + tag.name.length + 3;
          continue;
        }
      }
    }

    if (char === '*' || char === '_' || char === '~') {
      let end = at + 1;
      while (source[end] === char) end += 1;
      const count = end - at;
      const before = source[at - 1];
      const after = source[end];
      // Runs of four or more, and `~` other than a pair, are never marks.
      if (count <= 3 && (char !== '~' || count === 2)) {
        flush();
        const run: Run = {
          char,
          count,
          canOpen: !isSpace(after) && !isWord(before),
          canClose: !isSpace(before) && !isWord(after),
          piece: undefined as unknown as Piece,
        };
        run.piece = pieces.push({ run });
        if (run.canClose) close(run, openers, pieces);
        else if (run.canOpen) openers.push(run);
        at = end;
        continue;
      }
      plain += source.slice(at, end);
      at = end;
      continue;
    }

    if (char === '\n') openers.clear();
    plain += char;
    at += 1;
  }
  flush();
  return toNodes(pieces.head);
}

/**
 * The runs as plain text: the marks dropped, a link written "label (address)" with its address
 * from `url` (just the label when `url` gives nothing back).
 */
export function inlineText(nodes: readonly InlineNode[], url: (href: string) => string): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case 'text':
          return node.text;
        case 'link': {
          const label = inlineText(node.children, url);
          const address = url(node.url);
          if (!address) return label;
          return label.trim() === address ? address : `${label} (${address})`;
        }
        default:
          return inlineText(node.children, url);
      }
    })
    .join('');
}

// --- Blocks -------------------------------------------------------------------------------------

/** Pasted `<br>`, `<p>` and `</p>`: the only tags read before the text is split. */
const PASTED_BREAK = /<br\s*\/?>/gi;
const PASTED_PARAGRAPH = /<\/?p>/gi;
/** The split `splitParagraphs` has always made: a blank line, which may hold spaces. */
const BLANK_LINE = /\r?\n\s*\r?\n/;

/** Leading spaces a marker may sit behind; four or more and the line is text. */
function indentOf(line: string): number {
  let index = 0;
  while (index < 4 && line[index] === ' ') index += 1;
  return index;
}

const isBlank = (text: string): boolean => text.trim() === '';

/** A `---`, `***` or `___` line, spaces allowed between. */
function isDivider(rest: string): boolean {
  const mark = rest[0];
  if (mark !== '-' && mark !== '*' && mark !== '_') return false;
  let count = 0;
  for (const char of rest) {
    if (char === mark) count += 1;
    else if (char !== ' ' && char !== '\t') return false;
  }
  return count >= 3;
}

/** `# Title`, with any closing `#`s dropped; `#hashtag` is no heading. */
function readHeading(rest: string): { level: 1 | 2 | 3; text: string } | null {
  let level = 0;
  while (rest[level] === '#') level += 1;
  if (level === 0 || level > 6 || (rest[level] !== ' ' && rest[level] !== '\t')) return null;
  let text = rest.slice(level).trim();
  let end = text.length;
  while (end > 0 && text[end - 1] === '#') end -= 1;
  if (end < text.length && (end === 0 || text[end - 1] === ' ' || text[end - 1] === '\t')) {
    const shorter = text.slice(0, end).trim();
    if (shorter) text = shorter;
  }
  return text ? { level: Math.min(level, 3) as 1 | 2 | 3, text } : null;
}

/** `- item`, `* item` or `• item`. */
function readBullet(rest: string): string | null {
  const mark = rest[0];
  if (mark !== '-' && mark !== '*' && mark !== '•') return null;
  if (rest[1] !== ' ' && rest[1] !== '\t') return null;
  const item = rest.slice(2).trim();
  return item || null;
}

/** `1. item` or `1) item`, up to three digits. */
function readNumbered(rest: string): { start: number; item: string } | null {
  let digits = 0;
  while (digits < 4 && rest.charCodeAt(digits) >= 48 && rest.charCodeAt(digits) <= 57) digits += 1;
  if (digits === 0 || digits > 3) return null;
  if (rest[digits] !== '.' && rest[digits] !== ')') return null;
  if (rest[digits + 1] !== ' ' && rest[digits + 1] !== '\t') return null;
  const item = rest.slice(digits + 2).trim();
  return item ? { start: Number(rest.slice(0, digits)), item } : null;
}

/** `> quoted`, or `>` alone for a blank line in a quote. */
function readQuote(rest: string): string | null {
  if (rest[0] !== '>') return null;
  const text = rest[1] === ' ' || rest[1] === '\t' ? rest.slice(2) : rest.slice(1);
  return text.trimEnd();
}

/** A line without the `\r` a Windows line break leaves at its end. */
const withoutReturn = (line: string): string => (line.endsWith('\r') ? line.slice(0, -1) : line);

/**
 * A body as blocks. Text with none of the markers above is the paragraphs it always was, each
 * holding its lines exactly as typed.
 */
export function parseMarkdown(body: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const chunks = body
    .replace(PASTED_BREAK, '\n')
    .replace(PASTED_PARAGRAPH, '\n\n')
    .split(BLANK_LINE)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    let paragraph: string[] = [];
    let list: Extract<MarkdownBlock, { kind: 'list' }> | null = null;
    let quote: string[] | null = null;
    const flush = (): void => {
      if (paragraph.length > 0) blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
      if (list) blocks.push(list);
      if (quote) blocks.push({ kind: 'quote', text: quote.join('\n') });
      paragraph = [];
      list = null;
      quote = null;
    };

    for (const line of chunk.split('\n')) {
      const indent = indentOf(line);
      const rest = indent < 4 ? withoutReturn(line).slice(indent) : '';
      if (indent < 4 && isDivider(rest)) {
        flush();
        blocks.push({ kind: 'divider' });
        continue;
      }
      const heading = indent < 4 ? readHeading(rest) : null;
      if (heading) {
        flush();
        blocks.push({ kind: 'heading', ...heading });
        continue;
      }
      const bullet = indent < 4 ? readBullet(rest) : null;
      const numbered = indent < 4 && bullet === null ? readNumbered(rest) : null;
      if (bullet !== null || numbered) {
        const ordered = numbered !== null;
        if (!list || list.ordered !== ordered) {
          flush();
          list = { kind: 'list', ordered, start: numbered?.start ?? 1, items: [] };
        }
        list.items.push(numbered?.item ?? bullet ?? '');
        continue;
      }
      const quoted = indent < 4 ? readQuote(rest) : null;
      if (quoted !== null) {
        if (!quote) flush();
        quote ??= [];
        quote.push(quoted);
        continue;
      }
      if (list || quote) flush();
      paragraph.push(line);
    }
    flush();
  }
  return blocks.filter((block) => block.kind !== 'quote' || !isBlank(block.text));
}

/**
 * A body's plain-text twin, one entry per paragraph or line: headings as plain lines, list items
 * as "- item" or "1. item", quotes kept behind "> ", a divider as "---", and each link written
 * "label (address)" with its address from `url`.
 */
export function markdownTextLines(
  blocks: readonly MarkdownBlock[],
  url: (href: string) => string,
): string[] {
  const plain = (text: string): string => inlineText(parseInline(text), url);
  return blocks.flatMap((block): string[] => {
    switch (block.kind) {
      case 'paragraph':
      case 'heading':
        return [plain(block.text)];
      case 'list':
        return block.items.map(
          (item, index) => `${block.ordered ? `${block.start + index}.` : '-'} ${plain(item)}`,
        );
      case 'quote':
        return block.text.split('\n').map((line) => `> ${plain(line)}`.trimEnd());
      case 'divider':
        return ['---'];
    }
  });
}

/**
 * The plain text of a body with Markdown in it, for a search index, a one-line summary or a text
 * message: the marks dropped and links written "label (address)". Relative addresses stay as
 * typed, and unsafe ones become `#`.
 */
export function markdownToText(body: string): string {
  return markdownTextLines(parseMarkdown(body), (href) => absoluteUrl(href)).join('\n');
}

// --- Email HTML ---------------------------------------------------------------------------------

/** How a block draws its Markdown: what `RenderContext.markdown` is made from. */
export interface MarkdownTheme {
  /** Inline CSS of a paragraph; lists and quotes start from it. */
  paragraph: string;
  headingFont: string;
  headingColor: string;
  linkColor: string;
  /** The bar beside a quote. */
  quoteRule: string;
  /** A `---` line. */
  dividerColor: string;
  /** A font size in px, scaled for the block. */
  px(size: number): number;
  /** A safe absolute address for a link. */
  url(href: string): string;
}

/** Heading sizes before the block's font scale: Large, Medium and Small. */
export const MARKDOWN_HEADING_SIZES: Readonly<Record<1 | 2 | 3, number>> = Object.freeze({
  1: 24,
  2: 20,
  3: 17,
});

/**
 * Runs as email HTML, every text escaped. With `breaks`, line breaks become `<br>`; without, they
 * are left to the mail client, as a short field always left them.
 */
export function inlineHtml(
  nodes: readonly InlineNode[],
  theme: Pick<MarkdownTheme, 'linkColor' | 'url'>,
  breaks: boolean,
): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case 'text': {
          const text = escapeHtml(node.text);
          return breaks ? text.replace(/\r?\n/g, '<br>') : text;
        }
        case 'bold':
          return `<strong>${inlineHtml(node.children, theme, breaks)}</strong>`;
        case 'italic':
          return `<em>${inlineHtml(node.children, theme, breaks)}</em>`;
        case 'strike':
          return `<s style="text-decoration:line-through;">${inlineHtml(node.children, theme, breaks)}</s>`;
        case 'link':
          return `<a href="${escapeHtml(theme.url(node.url))}" style="color:${theme.linkColor};text-decoration:underline;">${inlineHtml(node.children, theme, breaks)}</a>`;
      }
    })
    .join('');
}

/** One block as email HTML. A paragraph is exactly what plain text always made. */
function blockHtml(block: MarkdownBlock, theme: MarkdownTheme): string {
  const inline = (text: string): string => inlineHtml(parseInline(text), theme, true);
  switch (block.kind) {
    case 'paragraph':
      return `<p style="${theme.paragraph}">${inline(block.text)}</p>`;
    case 'heading': {
      // The block's own heading is an <h2>, so the largest Markdown heading sits under it.
      const tag = `h${block.level + 1}`;
      return `<${tag} style="margin:0 0 10px 0;font-family:${theme.headingFont};font-size:${theme.px(MARKDOWN_HEADING_SIZES[block.level])}px;line-height:1.25;font-weight:${block.level === 3 ? 'bold' : 'normal'};color:${theme.headingColor};">${inline(block.text)}</${tag}>`;
    }
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const start = block.ordered && block.start !== 1 ? ` start="${block.start}"` : '';
      const items = block.items
        .map((item) => `<li style="margin:0 0 4px 0;">${inline(item)}</li>`)
        .join('');
      return `<${tag}${start} style="${theme.paragraph}padding:0 0 0 24px;">${items}</${tag}>`;
    }
    case 'quote':
      return `<blockquote style="${theme.paragraph}padding:0 0 0 14px;border-left:3px solid ${theme.quoteRule};">${inline(block.text)}</blockquote>`;
    case 'divider':
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 16px 0;"><tr><td height="1" style="height:1px;background:${theme.dividerColor};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
  }
}

/** Blocks as email HTML. */
export const markdownBlocksHtml = (
  blocks: readonly MarkdownBlock[],
  theme: MarkdownTheme,
): string => blocks.map((block) => blockHtml(block, theme)).join('');

// --- Rich text ----------------------------------------------------------------------------------

function richInline(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case 'text':
          return escapeHtml(node.text).replace(/\r?\n/g, '<br>');
        case 'bold':
          return `<strong>${richInline(node.children)}</strong>`;
        case 'italic':
          return `<em>${richInline(node.children)}</em>`;
        case 'strike':
          return `<s>${richInline(node.children)}</s>`;
        case 'link':
          return `<a href="${escapeHtml(absoluteUrl(node.url))}">${richInline(node.children)}</a>`;
      }
    })
    .join('');
}

/**
 * A body's Markdown as plain semantic HTML with no styles (`<p>`, `<strong>`, `<a>`, `<ul>`…), the
 * shape a text block's `format: 'html'` body takes: for moving a Markdown body into a rich-text
 * editor without losing its formatting. Relative addresses stay as typed; unsafe ones become `#`.
 */
export function markdownToHtml(body: string): string {
  return parseMarkdown(body)
    .map((block) => {
      const inline = (text: string): string => richInline(parseInline(text));
      switch (block.kind) {
        case 'paragraph':
          return `<p>${inline(block.text)}</p>`;
        case 'heading':
          return `<h${block.level + 1}>${inline(block.text)}</h${block.level + 1}>`;
        case 'list': {
          const tag = block.ordered ? 'ol' : 'ul';
          const start = block.ordered && block.start !== 1 ? ` start="${block.start}"` : '';
          return `<${tag}${start}>${block.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`;
        }
        case 'quote':
          return `<blockquote>${inline(block.text)}</blockquote>`;
        case 'divider':
          return '<hr>';
      }
    })
    .join('');
}
