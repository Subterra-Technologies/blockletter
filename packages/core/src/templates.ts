import { newBlockId } from './ids';
import { getDefinition } from './registry';
import { fillBlockTokens, fillTokens, periodTokens } from './tokens';
import type {
  BlockBase,
  BlockOfType,
  BrandKit,
  BuiltInBlock,
  BuiltInBlockType,
  IssuePeriod,
  NewsletterDocument,
  NewsletterTemplate,
} from './types';
import { cloneJson, deepFreeze } from './util';
import { isRecord } from './validate';

/**
 * Reusable starting layouts. A template is blocks and wording with the period lifted out into
 * tokens, so it reads right in any month; `applyTemplate` turns one into an issue.
 */

type Overrides<T extends BuiltInBlockType> = Partial<
  Omit<BlockOfType<BuiltInBlock, T>, 'id' | 'type'>
>;
type BlockSpec = { [T in BuiltInBlockType]: [type: T, overrides?: Overrides<T>] }[BuiltInBlockType];

interface TemplateSpec {
  id: string;
  name: string;
  description: string;
  subject: string;
  preheader: string;
  blocks: BlockSpec[];
}

/** A built-in template, with stable block ids (`monthly-newsletter-3`) so the module is pure. */
function builtIn(spec: TemplateSpec): NewsletterTemplate {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    builtIn: true,
    subject: spec.subject,
    preheader: spec.preheader,
    blocks: spec.blocks.map(
      ([type, overrides], index) =>
        ({
          ...getDefinition(type)?.create(),
          id: `${spec.id}-${index + 1}`,
          type,
          hidden: false,
          ...overrides,
        }) as BuiltInBlock,
    ),
  };
}

/**
 * The templates Blockletter ships. Sourced list blocks name the conventional data sources
 * (`events`, `sponsors`, `new_members`, `posts`, `calendar`) and start hidden: assembly shows the
 * ones a host's sources fill, and a host without that source keeps them as manual blocks.
 */
export const BUILT_IN_TEMPLATES: readonly NewsletterTemplate[] = deepFreeze([
  builtIn({
    id: 'monthly-newsletter',
    name: 'Monthly newsletter',
    description:
      'The full monthly issue: a letter, upcoming events, sponsors, new members, news, a feature article and a community calendar.',
    subject: '{{org}} · {{monthYear}} newsletter',
    preheader: 'News, events and updates from {{org}}.',
    blocks: [
      ['header'],
      ['letter'],
      ['event_tiles', { source: 'events', hidden: true }],
      ['sponsors', { source: 'sponsors', hidden: true }],
      ['name_list', { source: 'new_members', hidden: true }],
      ['callout'],
      ['post_list', { source: 'posts', hidden: true }],
      ['article'],
      // Shown from the start: lines written by hand are the point of a community calendar.
      ['dated_list', { source: 'calendar' }],
      ['button', { label: 'See the full calendar', url: '/events' }],
      ['footer'],
    ],
  }),
  builtIn({
    id: 'event-announcement',
    name: 'Event announcement',
    description:
      'One event, front and centre: a photo banner, the details beside an image, a register button and the footer.',
    subject: '{{org}} · Save the date',
    preheader: 'An upcoming event you will not want to miss.',
    blocks: [
      [
        'banner',
        {
          heading: 'Save the date',
          subheading: '{{monthYear}}',
          ctaLabel: 'See the details',
          ctaUrl: '/events',
          overlay: true,
        },
      ],
      [
        'image_text',
        {
          heading: 'What to expect',
          body: 'Where it is, when it starts, what it costs, and who should come. Two or three short sentences is plenty.',
          imageSide: 'left',
        },
      ],
      ['button', { label: 'Register now', url: '/events', variant: 'solid' }],
      ['footer'],
    ],
  }),
  builtIn({
    id: 'spotlight',
    name: 'Spotlight',
    description:
      'One person, business or project in the spotlight: a banner, a quote, their story beside a photo and a small photo grid.',
    subject: '{{org}} · Spotlight',
    preheader: 'Meet one of the people who make our community.',
    blocks: [
      ['banner', { heading: 'Spotlight', subheading: '{{monthYear}}', overlay: true }],
      [
        'quote',
        {
          quote: 'Getting involved put us in front of people we would never have met otherwise.',
          attribution: 'A local business owner',
        },
      ],
      [
        'image_text',
        {
          heading: 'Their story',
          body: 'How they started, what they are known for, and what they would like readers to know.',
          imageSide: 'right',
        },
      ],
      ['photo_grid'],
      ['footer'],
    ],
  }),
  builtIn({
    id: 'simple-update',
    name: 'Simple update',
    description: 'A short update: a header, a few paragraphs, one button and the footer.',
    subject: '{{org}} update',
    preheader: 'A quick update from {{org}}.',
    blocks: [
      ['header', { title: 'Update' }],
      [
        'text',
        {
          heading: 'What is new',
          body: 'Write your update here. A few short paragraphs that people can read in a minute work best.',
        },
      ],
      ['button'],
      ['footer'],
    ],
  }),
]);

/**
 * A new document from a template: fresh block ids, every token filled from the period and the
 * brand kit, and the period set. Tokens without a value (no period given) are left as written.
 */
export function applyTemplate<B extends BlockBase = BuiltInBlock>(
  template: NewsletterTemplate<B>,
  options: { period?: IssuePeriod; brand?: BrandKit } = {},
): NewsletterDocument<B> {
  const tokens = periodTokens(options.period, options.brand);
  return {
    version: 1,
    subject: fillTokens(template.subject, tokens),
    preheader: fillTokens(template.preheader, tokens),
    ...(options.period ? { period: { ...options.period } } : {}),
    blocks: template.blocks.map((block) =>
      fillBlockTokens({ ...block, id: newBlockId(block.type) }, tokens),
    ),
  };
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The period's own words turned back into tokens: its label into `{{period}}` (when it is not
 * simply the month), "September 2026" into `{{monthYear}}`, "September" into `{{month}}`. Whole
 * words only, so "Mayfield" is not a month.
 */
function restoreTokens(value: string, period: IssuePeriod | undefined): string {
  if (!period) return value;
  const tokens = periodTokens(period);
  const replacements: [label: string, token: string][] = [];
  if (tokens.period && tokens.period !== tokens.monthYear) {
    replacements.push([tokens.period, '{{period}}']);
  }
  if (tokens.monthYear) replacements.push([tokens.monthYear, '{{monthYear}}']);
  if (tokens.month) replacements.push([tokens.month, '{{month}}']);
  return replacements.reduce(
    (text, [label, token]) =>
      text.replace(new RegExp(`(?<!\\w)${escapeRegExp(label)}(?!\\w)`, 'g'), token),
    value,
  );
}

/**
 * Keeps a document's layout as a template, to start the next issue from: fresh block ids, and
 * the period's words turned back into tokens in the subject, the preheader and the header's
 * issue label. Items a data source filled are left out — they belong to this issue's period, and
 * the source refills them — while items written by hand stay.
 */
export function templateFromDocument<B extends BlockBase = BuiltInBlock>(
  doc: NewsletterDocument<B>,
  meta: { id: string; name: string; description: string },
): NewsletterTemplate<B> {
  const restore = (value: string): string => restoreTokens(value, doc.period);
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    subject: restore(doc.subject),
    preheader: restore(doc.preheader),
    blocks: doc.blocks.map((block) => {
      const copy = cloneJson(block);
      const fields = copy as Record<string, unknown>;
      fields.id = newBlockId(block.type);
      if (copy.type === 'header' && typeof fields.issueLabel === 'string') {
        fields.issueLabel = restore(fields.issueLabel);
      }
      if (copy.source && Array.isArray(fields.items)) {
        fields.items = fields.items.filter((item: unknown) => !(isRecord(item) && item.ref));
      }
      return copy;
    }),
  };
}
