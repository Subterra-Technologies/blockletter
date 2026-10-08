import {
  BRAND_FONTS,
  DEFAULT_LABELS,
  isIsoDate,
  type BrandKit,
  type BuiltInBlock,
  type DataSource,
  type NewsletterTemplate,
  type RenderLabels,
} from '@subterra-technologies/blockletter';
import { enMessages, type EditorMessages } from '../../src';
import { TEST_BRAND, TEST_SOURCES, TEST_TEMPLATES, everyBlock } from './fixtures';

/**
 * A pseudo-locale: the editor's English with every message marked, so a test can tell the words
 * the messages wrote from any the editor wrote without them. Every string is wrapped in ⟦ ⟧, and
 * so is everything a phrase returns. The words the editor shows but does not write (the issue's
 * own text, the host's data, the email's words) are marked « » in the fixtures below, so what is
 * left over once both are taken out must have no letters in it.
 */

const OPEN = '⟦';
const CLOSE = '⟧';

export function pseudoLocale(messages: EditorMessages = enMessages): EditorMessages {
  return wrap(messages) as EditorMessages;
}

function wrap(value: unknown): unknown {
  if (typeof value === 'string') return `${OPEN}${value}${CLOSE}`;
  if (typeof value === 'function') {
    return (...args: unknown[]) =>
      `${OPEN}${String((value as (...args: unknown[]) => unknown)(...args))}${CLOSE}`;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, wrap(item)]));
  }
  return value;
}

/** Words the document or the host supplies, which no message translates. */
export const content = (text: string): string => `«${text}»`;

/** Fields that hold addresses, ids, dates and choices rather than words a person reads. */
const NOT_WORDS = new Set([
  'id',
  'type',
  'source',
  'ref',
  'url',
  'linkUrl',
  'ctaUrl',
  'sortDate',
  'format',
  'variant',
  'thickness',
  'size',
  'imageSide',
  'network',
  'assetId',
]);

/** `value` with every word in it marked as content, addresses and choices left alone. */
export function markContent<T>(value: T, key?: string): T {
  if (typeof value === 'string') {
    const keep = !value.trim() || (key !== undefined && NOT_WORDS.has(key)) || isIsoDate(value);
    return (keep ? value : content(value)) as T;
  }
  if (Array.isArray(value)) return value.map((item: unknown) => markContent(item)) as T;
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([field, item]) => [
        field,
        field === 'style' ? item : markContent(item, field),
      ]),
    ) as T;
  }
  return value;
}

/** The email's own words, as a host passes them in `renderOptions.labels`: content too. */
export const PSEUDO_LABELS: RenderLabels = markContent({ ...DEFAULT_LABELS });

export const PSEUDO_BRAND: BrandKit = {
  ...TEST_BRAND,
  name: content(TEST_BRAND.name),
  contact: markContent(TEST_BRAND.contact),
};

const LOGO = { url: 'https://images.example/sponsor.png' };

/**
 * One of every built-in block, its words marked. A sponsor has a logo, since a sponsor without
 * one is drawn as its initials, which are letters of its name and no message's.
 */
export function pseudoBlocks(): BuiltInBlock[] {
  return everyBlock().map((block) =>
    markContent(
      block.type === 'sponsors'
        ? { ...block, items: block.items.map((item) => ({ ...item, logo: LOGO })) }
        : block,
    ),
  );
}

/** The test's data sources, their names and what they offer marked as the host's words. */
export const PSEUDO_SOURCES = {
  events: {
    ...TEST_SOURCES.events,
    label: content(TEST_SOURCES.events.label),
    items: () => markContent(TEST_SOURCES.events.items()),
  } satisfies DataSource<'event_tiles'>,
  members: {
    ...TEST_SOURCES.members,
    label: content(TEST_SOURCES.members.label),
    items: () => markContent(TEST_SOURCES.members.items()),
  } satisfies DataSource<'name_list'>,
};

export const PSEUDO_TEMPLATES: NewsletterTemplate[] = TEST_TEMPLATES.map((template) => ({
  ...template,
  name: content(template.name),
  description: content(template.description),
}));

/** What a message wrote, or the document or the host supplied, taken out of `text`. */
function leftOver(text: string): string {
  let rest = '';
  let messages = 0;
  let words = 0;
  for (const character of text) {
    if (character === OPEN) messages += 1;
    else if (character === CLOSE) messages = Math.max(0, messages - 1);
    else if (messages > 0) continue;
    else if (character === '«') words += 1;
    else if (character === '»') words = Math.max(0, words - 1);
    else if (words === 0) rest += character;
  }
  return rest;
}

/** The names of the web-safe fonts, which the brand kit shows as they are in every language. */
const PROPER_NAMES = new Set<string>(BRAND_FONTS);

const ATTRIBUTES = [
  'aria-label',
  'aria-description',
  'aria-roledescription',
  'aria-valuetext',
  'aria-placeholder',
  'title',
  'placeholder',
  'alt',
] as const;

/**
 * Everything under `root` a person can see or hear that the editor wrote without its messages:
 * every text node, and the attributes screen readers and tooltips say, that still has letters in
 * it once the marked words are taken out. The host's own toolbar is the host's, and left out.
 * `marked` counts the strings that were the messages', so a check can tell it saw something.
 */
export function untranslated(root: ParentNode = document.body): {
  found: string[];
  marked: number;
} {
  const found: string[] = [];
  let marked = 0;
  const check = (text: string, where: string) => {
    if (text.includes(OPEN)) marked += 1;
    if (/\p{L}/u.test(leftOver(text)) && !PROPER_NAMES.has(text.trim())) {
      found.push(`${where}: ${JSON.stringify(text.trim())}`);
    }
  };
  const describe = (element: Element) => {
    const name = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    return role ? `<${name} role="${role}">` : `<${name}>`;
  };
  const elements =
    root instanceof Element ? [root, ...root.querySelectorAll('*')] : root.querySelectorAll('*');
  for (const element of elements) {
    if (element.closest('[data-bl-toolbar], script, style')) continue;
    for (const attribute of ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (value) check(value, `${attribute} of ${describe(element)}`);
    }
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        check(node.textContent, `text in ${describe(element)}`);
      }
    }
  }
  return { found, marked };
}
