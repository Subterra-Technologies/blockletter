import { DEFAULT_PALETTE, type Palette } from './brand';

/**
 * Rich text for email. The HTML a rich-text editor produces (semantic tags, plus Quill-style
 * alignment and indent classes) is cleaned of anything executable, its classes become the inline
 * styles email clients understand, and a plain-text twin is derived for the text part, search and
 * previews. Pure functions: no DOM, no network, so they run wherever the renderer does.
 *
 * The cleaner is also what makes rich text safe to put on an editor's canvas, so it keeps only
 * the tags and attributes formatted writing needs and rebuilds each tag from them, rather than
 * trying to recognise everything dangerous.
 */

/*
 * Every pattern here runs on text a stranger may have written, so none may fail after a long scan
 * and be retried from each later position: that is how a crafted paste makes a regular expression
 * take quadratic time. Where a construct can be left open, its pattern also accepts the end of the
 * input, so the first attempt succeeds; where a search could still run on in vain, a plain scan or
 * a bound on the input does the job instead.
 */

/** Removed together with everything inside them. */
const BLOCKED =
  'script|style|iframe|object|embed|form|meta|link|template|noscript|textarea|select|svg|math|frameset|frame|applet|base|title|head|xmp|noembed|noframes';
const BLOCKED_OPENING = new RegExp(`<(${BLOCKED})\\b`, 'gi');
/** A comment, declaration or processing instruction; one left open runs to the end, as in a browser. */
const COMMENTS = /<!--[\s\S]*?(?:-->|$)|<![^>]*(?:>|$)|<\?[^>]*(?:>|$)/g;

const ALLOWED_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'del',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'ins',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strike',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const ALLOWED_ATTRIBUTES = new Set([
  'align',
  'alt',
  'class',
  'colspan',
  'dir',
  'height',
  'href',
  'lang',
  'rel',
  'rowspan',
  'src',
  'start',
  'style',
  'target',
  'title',
  'type',
  'width',
]);

/** A tag left open at the end of the input runs to the end, as a browser reads it. */
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)(?:>|$)/g;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
/** Runs on rebuilt HTML, where no tag holds a `<` (attribute values escape it). */
const ANCHORS = /<a\b([^<>]*)>([\s\S]*?)<\/a\s*>/gi;
/** `(?<!\s)` starts the match at the beginning of a run of spaces, never inside it. */
const HREF_ATTRIBUTE = /(?<!\s)\s+href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;
const SAFE_LINK = /^(https?:\/\/|mailto:)/i;
const SAFE_IMAGE = /^https?:\/\//i;

/** Escapes an attribute value without escaping the entities already in it. */
const escapeAttribute = (value: string): string =>
  value
    .replace(/&(?!(?:[a-z][a-z0-9]*|#\d+|#x[0-9a-f]+);)/gi, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

/** True when rich text may link to the address: web pages and mail addresses only. */
export const isSafeLinkHref = (href: string): boolean => SAFE_LINK.test(href.trim());

/** Repeats a replacement until nothing changes, so a removal cannot reassemble what it removed. */
function untilStable(html: string, step: (value: string) => string): string {
  let current = html;
  for (let pass = 0; pass < 20; pass += 1) {
    const next = step(current);
    if (next === current) return next;
    current = next;
  }
  return current;
}

function cleanAttributes(raw: string): string {
  const seen = new Set<string>();
  let out = '';
  for (const match of raw.matchAll(ATTRIBUTE)) {
    const name = (match[1] ?? '').toLowerCase();
    if (!ALLOWED_ATTRIBUTES.has(name) || seen.has(name)) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (name === 'src' && !SAFE_IMAGE.test(value.trim())) continue;
    if (name === 'href' && !isSafeLinkHref(value)) continue;
    seen.add(name);
    out += ` ${name}="${escapeAttribute(value)}"`;
  }
  return out;
}

/**
 * Links keep only a safe `href` (`https?:` or `mailto:`) plus `rel="noopener"` and open in a new
 * tab; every other attribute is dropped. Anything else that looks like a link is unwrapped, so its
 * text survives without an address.
 */
function sanitizeAnchors(html: string): string {
  return replaceBefore(html, '</a>', ANCHORS, (_, rawAttrs: string, inner: string) => {
    const match = HREF_ATTRIBUTE.exec(rawAttrs);
    const href = (match?.[2] ?? match?.[3] ?? match?.[4] ?? '').trim();
    if (!href || !isSafeLinkHref(href)) return inner;
    return `<a href="${escapeAttribute(href)}" rel="noopener" target="_blank">${inner}</a>`;
  });
}

/**
 * `html.replace(pattern, replacer)`, run only on the text up to the end of the last `closing`
 * (compared without case). After it, an opening tag can have no closing tag, and a pattern that
 * pairs the two would scan to the end in vain from every such opening.
 */
function replaceBefore(
  html: string,
  closing: string,
  pattern: RegExp,
  replacer: (match: string, ...groups: string[]) => string,
): string {
  const last = html.toLowerCase().lastIndexOf(closing);
  if (last === -1) return html;
  const end = last + closing.length;
  return html.slice(0, end).replace(pattern, replacer) + html.slice(end);
}

/**
 * Where the closing tag `</name>` that pairs with an opening ends: the first one at or after
 * `from`, allowing spaces before its `>`, or -1. `lower` is the input in lower case.
 */
function closingTagEnd(lower: string, name: string, from: number): number {
  const prefix = `</${name}`;
  for (let at = lower.indexOf(prefix, from); at !== -1; at = lower.indexOf(prefix, at + 1)) {
    let end = at + prefix.length;
    while (end < lower.length && /\s/.test(lower.charAt(end))) end += 1;
    if (lower.charAt(end) === '>') return end + 1;
  }
  return -1;
}

/**
 * Removes blocked elements: with everything inside them when their closing tag follows, or just
 * the opening tag when none does, so the text after a stray `<embed>` survives. One pass from left
 * to right; whether any closing tag of a name follows is looked up once per name, so an opening tag
 * with no closing tag after it never sends a search to the end of the input.
 */
function removeBlockedElements(html: string): string {
  const lower = html.toLowerCase();
  const lastClosing = new Map<string, number>();
  let out = '';
  let cursor = 0;
  BLOCKED_OPENING.lastIndex = 0;
  for (let match = BLOCKED_OPENING.exec(html); match; match = BLOCKED_OPENING.exec(html)) {
    const name = (match[1] ?? '').toLowerCase();
    const tagEnd = html.indexOf('>', match.index);
    out += html.slice(cursor, match.index);
    // An opening tag left open runs to the end of the input, as a browser reads it.
    if (tagEnd === -1) return out;
    let end = tagEnd + 1;
    if (!lastClosing.has(name)) lastClosing.set(name, lastClosingTagEnd(lower, name));
    // A closing tag that ends after this opening tag also starts after it: a closing tag has
    // one `>`, at its end, so it cannot straddle the `>` that ended the opening tag.
    if ((lastClosing.get(name) ?? -1) > end) {
      const close = closingTagEnd(lower, name, end);
      if (close !== -1) end = close;
    }
    cursor = end;
    BLOCKED_OPENING.lastIndex = end;
  }
  return out + html.slice(cursor);
}

/** Where the last closing tag `</name>` in the input ends, or -1 when there is none. */
function lastClosingTagEnd(lower: string, name: string): number {
  const prefix = `</${name}`;
  for (let at = lower.lastIndexOf(prefix); at !== -1; at = lower.lastIndexOf(prefix, at - 1)) {
    let end = at + prefix.length;
    while (end < lower.length && /\s/.test(lower.charAt(end))) end += 1;
    if (lower.charAt(end) === '>') return end + 1;
    if (at === 0) break;
  }
  return -1;
}

/**
 * Removes anything executable from rich text: scripts, styles, frames, forms and their contents;
 * comments; tags formatted writing does not use (their text survives); event handlers and every
 * other attribute outside a short allowlist; image sources that are not http(s); unsafe links.
 */
export function sanitizeHtml(html: string): string {
  const withoutBlocked = untilStable(html, (value) =>
    removeBlockedElements(value.replace(COMMENTS, '')),
  );
  const rebuilt = withoutBlocked.replace(
    TAG,
    (_, slash: string, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return '';
      return slash ? `</${name}>` : `<${name}${cleanAttributes(rawAttrs)}>`;
    },
  );
  return sanitizeAnchors(rebuilt);
}

/**
 * The margins and colours each element gets in an email, where stylesheets do not survive, and
 * the limits that keep pasted content inside its column.
 */
const elementStyles = (palette: Palette): Record<string, string> => ({
  p: 'margin:0 0 12px;line-height:1.55',
  h1: 'margin:0 0 12px;font-size:24px;line-height:1.3',
  h2: 'margin:0 0 10px;font-size:20px;line-height:1.3',
  ol: 'margin:0 0 12px;padding-left:1.6em',
  ul: 'margin:0 0 12px;padding-left:1.6em',
  li: 'margin:0 0 4px;line-height:1.55',
  a: `color:${palette.link};text-decoration:underline`,
  blockquote: `margin:0 0 12px;padding-left:14px;border-left:4px solid ${palette.border};color:${palette.muted}`,
  // A pasted picture or preformatted line must not push the email wider than its column.
  img: 'max-width:100%;height:auto',
  pre: 'white-space:pre-wrap',
});

const classStyle = (className: string): string | undefined => {
  const align = /^ql-align-(center|right|justify)$/.exec(className);
  if (align) return `text-align:${align[1]}`;
  const indent = /^ql-indent-(\d)$/.exec(className);
  if (indent) return `padding-left:${Number(indent[1]) * 3}em`;
  return undefined;
};

/**
 * Email clients drop stylesheets, so alignment and indent classes become inline styles and every
 * block element gets a sensible default margin. Links and quotes take their colours from
 * `palette` (the default brand's when omitted). Classes are removed; an element's own style wins.
 */
export function inlineRichTextStyles(html: string, palette: Palette = DEFAULT_PALETTE): string {
  const defaults = elementStyles(palette);
  return html.replace(
    /<([a-z][a-z0-9]*)(\s[^<>]*)?>/gi,
    (tag: string, rawName: string, rawAttrs: string | undefined) => {
      const name = rawName.toLowerCase();
      let attrs = rawAttrs ?? '';
      const extra: string[] = [];
      const classMatch = /(?<!\s)\s+class\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      if (classMatch) {
        for (const className of (classMatch[2] ?? classMatch[3] ?? '').split(/\s+/)) {
          const style = classStyle(className);
          if (style) extra.push(style);
        }
        attrs = attrs.replace(classMatch[0], '');
      }
      const base = defaults[name];
      if (!base && extra.length === 0) return classMatch ? `<${rawName}${attrs}>` : tag;
      const styleMatch = /(?<!\s)\s+style\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      const own = (styleMatch?.[2] ?? styleMatch?.[3] ?? '').trim().replace(/;$/, '');
      if (styleMatch) attrs = attrs.replace(styleMatch[0], '');
      const style = [base, ...extra, own].filter(Boolean).join(';');
      return `<${rawName}${attrs} style="${style}">`;
    },
  );
}

const codePoint = (value: number): string =>
  Number.isInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '�';

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => codePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => codePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&');

/**
 * Removes tags as `/<[^>]+>/g` does: each `<` takes everything up to the next `>`, so taking one
 * tag out can never join the text around it into a new tag (`<scr<b>ipt>` must not become
 * `<script>`). Only the text up to the last `>` can hold a tag, and keeping the pattern to it means
 * no attempt scans to the end of the input in vain.
 */
const stripTags = (html: string): string => replaceBefore(html, '>', /<[^>]+>/g, () => '');

/** A line without the spaces and tabs at its end: a loop, as `/[ \t]+$/` is quadratic on long runs. */
function trimTrailingSpaces(line: string): string {
  let end = line.length;
  while (end > 0 && (line.charAt(end - 1) === ' ' || line.charAt(end - 1) === '\t')) end -= 1;
  return line.slice(0, end);
}

/**
 * The plain-text twin of rich text: paragraphs and headings become lines, list items get "- " or
 * "1. " markers, and links keep their address in parentheses.
 */
export function htmlToText(html: string): string {
  let text = sanitizeHtml(html);
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Numbered lists: number the items of each <ol> in order (nested lists are flattened).
  // The tags here are sanitizeHtml's own, which hold no `<`, so `[^<>]` ends every scan early.
  text = replaceBefore(text, '</ol>', /<ol\b[^<>]*>([\s\S]*?)<\/ol>/gi, (_, items = '') => {
    let index = 0;
    return `\n${items.replace(/<li\b[^<>]*>/gi, () => `\n${++index}. `)}\n`;
  });
  text = text.replace(/<li\b[^<>]*>/gi, '\n- ');
  text = replaceBefore(
    text,
    '</a>',
    /<a\b([^<>]*)>([\s\S]*?)<\/a>/gi,
    (whole, attrs = '', label = '') => {
      const match = /(?<!\s)\s+href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      // A link with no address is left for the tag stripping below, which keeps its text.
      if (!match) return whole;
      const href = decodeEntities((match[2] ?? match[3] ?? '').trim());
      const plainLabel = stripTags(label).trim();
      if (!href || href === '#' || href === plainLabel) return plainLabel;
      return `${plainLabel} (${href})`;
    },
  );
  // Blocks that are visually separated in the email get a blank line; list items one line.
  text = text.replace(/<\/(p|div|h[1-6]|blockquote|pre)\s*>/gi, '\n\n');
  text = text.replace(/<\/(ol|ul|tr)\s*>/gi, '\n');
  text = stripTags(text);
  text = decodeEntities(text);
  return text
    .split('\n')
    .map(trimTrailingSpaces)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Plain text as rich text: escaped, with blank lines as paragraphs and line breaks as `<br>`. */
export function plainTextToHtml(text: string): string {
  const escape = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  return text
    .trim()
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
