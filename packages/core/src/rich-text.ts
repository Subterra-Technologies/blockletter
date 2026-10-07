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

/** Removed together with everything inside them. */
const BLOCKED =
  'script|style|iframe|object|embed|form|meta|link|template|noscript|textarea|select|svg|math|frameset|frame|applet|base|title|head|xmp|noembed|noframes';
const BLOCKED_ELEMENTS = new RegExp(`<(${BLOCKED})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`, 'gi');
const BLOCKED_VOID_ELEMENTS = new RegExp(`<(${BLOCKED})\\b[^>]*\\/?>`, 'gi');
const COMMENTS = /<!--[\s\S]*?-->|<![^>]*>|<\?[^>]*>/g;

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

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ANCHORS = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
const HREF_ATTRIBUTE = /\s+href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;
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
  return html.replace(ANCHORS, (_, rawAttrs: string, inner: string) => {
    const match = HREF_ATTRIBUTE.exec(rawAttrs);
    const href = (match?.[2] ?? match?.[3] ?? match?.[4] ?? '').trim();
    if (!href || !isSafeLinkHref(href)) return inner;
    return `<a href="${escapeAttribute(href)}" rel="noopener" target="_blank">${inner}</a>`;
  });
}

/**
 * Removes anything executable from rich text: scripts, styles, frames, forms and their contents;
 * comments; tags formatted writing does not use (their text survives); event handlers and every
 * other attribute outside a short allowlist; image sources that are not http(s); unsafe links.
 */
export function sanitizeHtml(html: string): string {
  const withoutBlocked = untilStable(html, (value) =>
    value.replace(COMMENTS, '').replace(BLOCKED_ELEMENTS, '').replace(BLOCKED_VOID_ELEMENTS, ''),
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
    /<([a-z][a-z0-9]*)(\s[^>]*)?>/gi,
    (tag: string, rawName: string, rawAttrs: string | undefined) => {
      const name = rawName.toLowerCase();
      let attrs = rawAttrs ?? '';
      const extra: string[] = [];
      const classMatch = /\s+class\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      if (classMatch) {
        for (const className of (classMatch[2] ?? classMatch[3] ?? '').split(/\s+/)) {
          const style = classStyle(className);
          if (style) extra.push(style);
        }
        attrs = attrs.replace(classMatch[0], '');
      }
      const base = defaults[name];
      if (!base && extra.length === 0) return classMatch ? `<${rawName}${attrs}>` : tag;
      const styleMatch = /\s+style\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
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
 * The plain-text twin of rich text: paragraphs and headings become lines, list items get "- " or
 * "1. " markers, and links keep their address in parentheses.
 */
export function htmlToText(html: string): string {
  let text = sanitizeHtml(html);
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Numbered lists: number the items of each <ol> in order (nested lists are flattened).
  text = text.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, items: string) => {
    let index = 0;
    return `\n${items.replace(/<li\b[^>]*>/gi, () => `\n${++index}. `)}\n`;
  });
  text = text.replace(/<li\b[^>]*>/gi, '\n- ');
  text = text.replace(
    /<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,
    (_, __, doubleQuoted: string | undefined, singleQuoted: string | undefined, label: string) => {
      const href = decodeEntities((doubleQuoted ?? singleQuoted ?? '').trim());
      const plainLabel = label.replace(/<[^>]+>/g, '').trim();
      if (!href || href === '#' || href === plainLabel) return plainLabel;
      return `${plainLabel} (${href})`;
    },
  );
  // Blocks that are visually separated in the email get a blank line; list items one line.
  text = text.replace(/<\/(p|div|h[1-6]|blockquote|pre)\s*>/gi, '\n\n');
  text = text.replace(/<\/(ol|ul|tr)\s*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeEntities(text);
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
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
