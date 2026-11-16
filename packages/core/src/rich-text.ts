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

/**
 * A tag, reading quoted values whole so a `>` inside one does not end it. A tag or a quote left
 * open at the end of the input runs to the end, as a browser reads it, so every attempt succeeds
 * on its first try and none rescans the input.
 */
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b((?:[^>"']|"[^"]*(?:"|$)|'[^']*(?:'|$))*)(?:>|$)/g;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
/** Runs on rebuilt HTML, where no tag holds a `<` or `>` (attribute values escape both). */
const ANCHORS = /<a\b([^<>]*)>([\s\S]*?)<\/a\s*>/gi;
/** Every link's opening and closing tag in rebuilt HTML. */
const ANCHOR_TAGS = /<a\b[^<>]*>|<\/a>/g;
/** `(?<!\s)` starts the match at the beginning of a run of spaces, never inside it. */
const HREF_ATTRIBUTE = /(?<!\s)\s+href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;
const SAFE_LINK = /^(https?:\/\/|mailto:)/i;
/**
 * An image rich text may show: `https:` only, with a host. Not `http:`, which the editor shows as
 * mixed content and an inbox fetches in the clear; not `data:` or a relative path, which no inbox
 * can load.
 */
const SAFE_IMAGE = /^https:\/\/[^/\\?#\s]/i;
/** An image the renderer drew: `http:` and `https:`, as `RenderContext.image` allows. */
const SAFE_RENDERED_IMAGE = /^https?:\/\/[^/\\?#\s]/i;

/**
 * Which styles and classes `sanitizeHtml` keeps.
 *
 * - `formatting` (the default), for text a person typed or pasted or an assistant wrote: the
 *   inline styles formatted writing uses (colour, highlight, alignment, weight, slant and
 *   decoration, each with a plain value) and Quill's alignment and indent classes. Nothing that
 *   can move, cover or resize what is around it.
 * - `email`, for HTML the renderer wrote, such as a host's block drawn on the editor's canvas
 *   from its email HTML: the layout styles and classes an email is made of, without anything that
 *   can run or hide what it does (`expression()`, script URLs, CSS escapes, comments, bindings).
 */
export type SanitizeStyles = 'formatting' | 'email';

export interface SanitizeOptions {
  /** Default `formatting`. */
  styles?: SanitizeStyles;
}

/** A plain colour: hex, `rgb()`/`rgba()` with numbers, or a named colour. */
const COLOR_VALUE =
  /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*(0|1|0?\.\d+|\d{1,3}%)\s*)?\)|[a-z]{3,30})$/i;

/** The inline styles formatted writing uses, each with the values it may take. */
const FORMATTING_STYLES: Readonly<Record<string, RegExp>> = {
  color: COLOR_VALUE,
  'background-color': COLOR_VALUE,
  'text-align': /^(left|right|center|justify|start|end)$/i,
  'font-weight': /^(normal|bold|bolder|lighter|[1-9]00)$/i,
  'font-style': /^(normal|italic|oblique)$/i,
  'text-decoration':
    /^(none|underline|line-through|overline)(\s+(underline|line-through|overline))*$/i,
};

/** Quill's alignment and indent classes, which `inlineRichTextStyles` turns into inline styles. */
const FORMATTING_CLASS = /^ql-(align-(center|right|justify)|indent-[1-9])$/;
/** A class name the renderer writes (the phone layout's, say). */
const EMAIL_CLASS = /^[a-z][a-z0-9_-]{0,63}$/i;

/** What can run, load or hide inside a style the renderer wrote. */
const UNSAFE_CSS =
  /expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|@import|\\|\/\*|position\s*:\s*(fixed|sticky)/i;
/** The character references the renderer writes in a style; any other means a value is hiding. */
const STYLE_REFERENCES = /&#39;|&#x27;|&quot;|&apos;|&amp;/gi;
const CSS_URL = /url\(\s*['"]?\s*([^'")\s]*)/gi;

/** The attributes whose values have a fixed form, and that form. Others are free text. */
const ATTRIBUTE_VALUES: Readonly<Record<string, RegExp>> = {
  align: /^(left|center|right|justify)$/i,
  colspan: /^\d{1,3}$/,
  dir: /^(ltr|rtl|auto)$/i,
  height: /^\d{1,4}%?$/,
  rowspan: /^\d{1,3}$/,
  start: /^\d{1,6}$/,
  target: /^_blank$/i,
  type: /^(1|a|i|disc|circle|square)$/i,
  width: /^\d{1,4}%?$/,
};

/**
 * Escapes an attribute value without escaping the entities already in it. `>` and `'` are escaped
 * too, so no later pass that reads tags with a pattern can end a tag or a value inside one.
 */
const escapeAttribute = (value: string): string =>
  value
    .replace(/&(?!(?:[a-z][a-z0-9]*|#\d+|#x[0-9a-f]+);)/gi, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** True when rich text may link to the address: web pages and mail addresses only. */
export const isSafeLinkHref = (href: string): boolean => SAFE_LINK.test(href.trim());

/** The declarations of a `style` attribute that `styles` keeps, as written, or '' for none. */
function cleanStyle(value: string, styles: SanitizeStyles): string {
  // The renderer writes quotes and ampersands as references (`url(&#39;…&#39;)`); read them as
  // the browser will before splitting on `;`, and leave every other reference to fail the checks.
  const source =
    styles === 'email'
      ? value.replace(STYLE_REFERENCES, (reference) =>
          reference.toLowerCase() === '&amp;' ? '&' : "'",
        )
      : value;
  const kept: string[] = [];
  for (const raw of source.split(';')) {
    const declaration = raw.trim();
    const colon = declaration.indexOf(':');
    if (colon <= 0) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const propertyValue = declaration.slice(colon + 1).trim();
    if (styles === 'formatting') {
      if (FORMATTING_STYLES[property]?.test(propertyValue)) kept.push(declaration);
      continue;
    }
    if (
      /&#|&[a-z]+;/i.test(declaration) ||
      UNSAFE_CSS.test(declaration) ||
      !/^[a-z-]+$/.test(property)
    ) {
      continue;
    }
    const urls = [...declaration.matchAll(CSS_URL)].map((match) => match[1] ?? '');
    if (urls.every((url) => SAFE_RENDERED_IMAGE.test(url))) kept.push(declaration);
  }
  return kept.join(';');
}

/** The class names `styles` keeps, or '' for none. */
const cleanClass = (value: string, styles: SanitizeStyles): string =>
  value
    .split(/\s+/)
    .filter((name) => (styles === 'formatting' ? FORMATTING_CLASS : EMAIL_CLASS).test(name))
    .join(' ');

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

/**
 * The attributes of one tag that survive, rebuilt. The first of a repeated attribute is the one
 * judged, as a browser reads it, and one that fails is not retried with a later copy.
 */
function cleanAttributes(raw: string, styles: SanitizeStyles): string {
  const seen = new Set<string>();
  let out = '';
  for (const match of raw.matchAll(ATTRIBUTE)) {
    const name = (match[1] ?? '').toLowerCase();
    if (!ALLOWED_ATTRIBUTES.has(name) || seen.has(name)) continue;
    seen.add(name);
    let value = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    if (name === 'src') {
      // An address with a space in it is not one an image loads from.
      if (/\s/.test(value)) continue;
      if (!(styles === 'email' ? SAFE_RENDERED_IMAGE : SAFE_IMAGE).test(value)) continue;
    } else if (name === 'href') {
      if (!isSafeLinkHref(value)) continue;
      // A browser would send spaces as %20; written that way, no part of the address reads as
      // another attribute to anything that looks at the tag later.
      value = value.replace(/\s+/g, '%20');
    } else if (name === 'style') {
      value = cleanStyle(value, styles);
    } else if (name === 'class') {
      value = cleanClass(value, styles);
    } else if (ATTRIBUTE_VALUES[name] && !ATTRIBUTE_VALUES[name].test(value)) {
      continue;
    }
    if ((name === 'style' || name === 'class') && !value) continue;
    out += ` ${name}="${escapeAttribute(value)}"`;
  }
  return out;
}

/**
 * Drops a closing `</a>` with no link open, and closes every link still open at the end: a link
 * left open would carry on into whatever the HTML is placed before.
 */
function balanceAnchors(html: string): string {
  let open = 0;
  const balanced = html.replace(ANCHOR_TAGS, (tag) => {
    if (tag !== '</a>') {
      open += 1;
      return tag;
    }
    if (open === 0) return '';
    open -= 1;
    return tag;
  });
  return balanced + '</a>'.repeat(open);
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
 * other attribute outside a short allowlist; styles and classes beyond what `options.styles`
 * keeps; images without a usable address; unsafe links. A link left open is closed.
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const styles: SanitizeStyles = options.styles === 'email' ? 'email' : 'formatting';
  const withoutBlocked = untilStable(html, (value) =>
    removeBlockedElements(value.replace(COMMENTS, '')),
  );
  const rebuilt = withoutBlocked.replace(
    TAG,
    (_, slash: string, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return '';
      if (slash) return `</${name}>`;
      const attributes = cleanAttributes(rawAttrs, styles);
      // An image with no address it may load shows nothing but a broken frame.
      if (name === 'img' && !/\ssrc="/.test(attributes)) return '';
      return `<${name}${attributes}>`;
    },
  );
  return sanitizeAnchors(balanceAnchors(rebuilt));
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
