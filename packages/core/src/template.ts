import { escapeHtml } from './html';

/**
 * `ctx.html`, the template tag a block's `render` writes its HTML with, escaping by default:
 *
 * ```ts
 * ctx.html`<p style="${ctx.smallStyle()}">${block.location}</p>${ctx.button('Apply', block.url)}`
 * ```
 *
 * Text in element content is escaped, unless it is HTML one of the context's own helpers made
 * (`ctx.heading()`, `ctx.button()`, `ctx.markdown()`…, or another `ctx.html`): those strings are
 * remembered as they are made and go in as they are. A string equal to one of them is the same
 * HTML, so it is as safe as the helper's own output.
 *
 * Inside a tag, a value is an attribute's value: escaped, put in quotes when the template left them
 * out, and, for an `href`, resolved through `ctx.url()` first, so a link is absolute and never a
 * `javascript:` one. A value where an attribute's name would go is refused unless it is `ctx.raw()`
 * HTML or nothing, since escaping cannot stop text there from adding an attribute.
 */

/** HTML `ctx.html` inserts as it is, wherever it goes. Made by `ctx.raw()`. */
export class RawHtml {
  readonly html: string;

  constructor(html: string) {
    this.html = html;
  }

  toString(): string {
    return this.html;
  }
}

/**
 * What `ctx.html` takes between its `${…}`: text and numbers (escaped), HTML the context made (as
 * it is), the `{ html }` that `ctx.markdown()` and similar helpers return, `ctx.raw()` HTML, lists
 * of these (joined), and `null`, `undefined`, `false` or `true` for nothing.
 */
export type HtmlValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | RawHtml
  | { readonly html: string }
  | readonly HtmlValue[];

export interface TemplateContext {
  /** HTML the context's own helpers made. */
  readonly trusted: ReadonlySet<string>;
  /** `ctx.url()`. */
  readonly url: (href: string) => string;
  /** Addresses `url` returned, so a value already resolved is not resolved twice. */
  readonly resolved: ReadonlySet<string>;
}

/**
 * Where the end of `html` is, when it is inside a tag: in a quoted attribute value (whose name and
 * text so far are given), straight after an attribute's `=`, or where a name would go.
 */
type TagPosition =
  | { kind: 'content' }
  | { kind: 'quoted'; name: string; empty: boolean }
  | { kind: 'unquoted'; name: string }
  | { kind: 'name' };

/** Reads the tag `html` ends inside, if any, one character at a time: linear in its length. */
function positionAtEnd(html: string): TagPosition {
  const open = html.lastIndexOf('<');
  if (open < html.lastIndexOf('>') || open === -1) return { kind: 'content' };
  const tag = html.slice(open);
  let quote = '';
  /** The attribute whose value comes next, or is being read. */
  let name = '';
  /** The word being read, and the last one read, either of which an `=` makes a name. */
  let current = '';
  let previous = '';
  let afterEquals = false;
  let valueStart = 0;
  // Skip the tag's own name.
  let index = 1;
  while (index < tag.length && !/\s/.test(tag[index] ?? '')) index++;
  for (; index < tag.length; index++) {
    const char = tag[index] ?? '';
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (/\s/.test(char)) {
      if (current) previous = current;
      current = '';
      continue;
    }
    if (afterEquals) {
      afterEquals = false;
      if (char === '"' || char === "'") {
        quote = char;
        valueStart = index + 1;
        continue;
      }
      // An unquoted value: it runs to the next space, and names nothing after it.
      name = '';
      previous = '';
      current = char;
      continue;
    }
    if (char === '=') {
      name = current || previous;
      current = '';
      previous = '';
      afterEquals = true;
      continue;
    }
    if (!current) previous = '';
    current += char;
  }
  if (quote) return { kind: 'quoted', name: name.toLowerCase(), empty: valueStart === tag.length };
  if (afterEquals) return { kind: 'unquoted', name: name.toLowerCase() };
  return { kind: 'name' };
}

/**
 * A static part of the template with the line breaks and indentation of the source left out
 * where they sit beside a tag or at either end, and read as one space inside running text.
 */
function tidy(part: string, first: boolean, last: boolean): string {
  if (!part.includes('\n')) return part;
  let out = '';
  let index = 0;
  while (index < part.length) {
    const char = part[index] ?? '';
    if (!/\s/.test(char)) {
      out += char;
      index++;
      continue;
    }
    let end = index;
    let newline = false;
    while (end < part.length && /\s/.test(part[end] ?? '')) {
      if (part[end] === '\n') newline = true;
      end++;
    }
    const run = part.slice(index, end);
    if (!newline) {
      out += run;
    } else {
      const before = index === 0 ? undefined : part[index - 1];
      const after = end === part.length ? undefined : part[end];
      const edge = (before === undefined && first) || (after === undefined && last);
      const value = before === undefined && after === undefined;
      out += edge || value || before === '>' || after === '<' ? '' : ' ';
    }
    index = end;
  }
  return out;
}

const isEmpty = (value: HtmlValue): boolean =>
  value === null || value === undefined || typeof value === 'boolean' || value === '';

/** One value as element content. */
function content(value: HtmlValue, context: TemplateContext): string {
  if (isEmpty(value)) return '';
  if (value instanceof RawHtml) return value.html;
  if (Array.isArray(value)) {
    return (value as readonly HtmlValue[]).map((item) => content(item, context)).join('');
  }
  if (typeof value === 'number') return escapeHtml(String(value));
  const html = typeof value === 'string' ? value : (value as { html: string }).html;
  return context.trusted.has(html) ? html : escapeHtml(html);
}

/** One value as an attribute's value, or part of one. */
function attributeValue(
  value: HtmlValue,
  name: string,
  whole: boolean,
  context: TemplateContext,
): string {
  if (isEmpty(value)) return '';
  if (value instanceof RawHtml) return value.html;
  if (Array.isArray(value)) {
    return (value as readonly HtmlValue[])
      .map((item) => attributeValue(item, name, false, context))
      .join(' ');
  }
  const text =
    typeof value === 'number'
      ? String(value)
      : typeof value === 'string'
        ? value
        : (value as { html: string }).html;
  // A link's whole address is resolved, so it is absolute and of a kind an email may link to.
  const resolved =
    name === 'href' && whole && !context.resolved.has(text) ? context.url(text) : text;
  return escapeHtml(resolved);
}

/** The HTML a `ctx.html` template makes. */
export function renderTemplate(
  strings: TemplateStringsArray,
  values: readonly HtmlValue[],
  context: TemplateContext,
): string {
  const last = strings.length - 1;
  let out = tidy(strings[0] ?? '', true, last === 0);
  values.forEach((value, index) => {
    const position = positionAtEnd(out);
    switch (position.kind) {
      case 'content':
        out += content(value, context);
        break;
      case 'quoted':
        out += attributeValue(value, position.name, position.empty, context);
        break;
      case 'unquoted':
        out += `"${attributeValue(value, position.name, true, context)}"`;
        break;
      case 'name':
        if (value instanceof RawHtml) out += value.html;
        else if (!isEmpty(value)) {
          throw new Error(
            'ctx.html: a value inside a tag must be an attribute’s value (name="${…}"). ' +
              'Pass attributes of your own through ctx.raw().',
          );
        }
        break;
    }
    out += tidy(strings[index + 1] ?? '', false, index + 1 === last);
  });
  return out;
}
