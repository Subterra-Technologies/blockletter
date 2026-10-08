import {
  BRAND_FONTS,
  SOCIAL_NETWORKS,
  type BlockIssue,
  type BlockStyle,
  type ImageProblem,
  type PeriodErrorCodes,
  type PeriodErrors,
  type RenderWarning,
  type ValidationIssue,
} from '@subterra-technologies/blockletter';
import type { BrandKitTextField, LongTextField } from './messages';
import type { BoundMessages } from './resolve';

/**
 * The sentences core writes for a person, in the editor's messages: each comes from core with a
 * stable code and the values in it, and is worded here from those. Anything without a code the
 * editor knows (a host's own block's warning, a malformed document's) keeps core's words.
 */

type Values = BlockIssue['values'];

const numberIn = (values: Values, key: string): number | undefined => {
  const value = values?.[key];
  return typeof value === 'number' ? value : undefined;
};

const textIn = (values: Values, key: string): string | undefined => {
  const value = values?.[key];
  return typeof value === 'string' ? value : undefined;
};

const LONG_FIELDS: readonly string[] = [
  'text',
  'article',
  'letter',
  'quote',
  'column_text',
] satisfies LongTextField[];

/** A built-in block's warning, from its code (`blockIssueDetails`). */
export function blockIssueText(issue: BlockIssue, messages: BoundMessages): string {
  const { issues } = messages;
  const max = numberIn(issue.values, 'max');
  const min = numberIn(issue.values, 'min');
  switch (issue.code) {
    case 'missing_alt':
    case 'missing_title':
    case 'missing_signature':
    case 'missing_photo_alt':
    case 'missing_sponsor_name':
    case 'missing_button_label':
    case 'missing_button_link':
    case 'missing_callout_link':
      return issues[issue.code];
    case 'too_long': {
      const field = textIn(issue.values, 'field');
      return field && LONG_FIELDS.includes(field) && max !== undefined
        ? issues.too_long(field as LongTextField, max)
        : issue.message;
    }
    case 'too_many_events':
    case 'too_many_posts':
      return max === undefined ? issue.message : issues[issue.code](max);
    case 'column_count':
    case 'photo_count':
    case 'number_count':
      return min === undefined || max === undefined ? issue.message : issues[issue.code](min, max);
    default:
      return issue.message;
  }
}

/**
 * One of the renderer's warnings, from its code (`warningDetails`). `name` names a block type in
 * the editor's language; a type it does not know keeps the name the renderer gave it.
 */
export function warningText(
  warning: RenderWarning,
  messages: BoundMessages,
  name: (type: string) => string | undefined,
): string {
  const { warnings } = messages;
  const type = textIn(warning.values, 'type');
  switch (warning.code) {
    case 'no_unsubscribe_url':
    case 'local_image':
    case 'relative_link':
      return warnings[warning.code];
    case 'missing_alt': {
      const block = (type && name(type)) ?? textIn(warning.values, 'label');
      return block ? warnings.missing_alt(block) : warning.message;
    }
    case 'unknown_block':
      return type === undefined ? warning.message : warnings.unknown_block(type);
    case 'gmail_clip': {
      const kilobytes = numberIn(warning.values, 'kilobytes');
      return kilobytes === undefined ? warning.message : warnings.gmail_clip(kilobytes);
    }
    default:
      return warning.message;
  }
}

/**
 * A block's appearance overrides in a line, for under its name: what core's `styleSummary` says,
 * part for part, in the editor's words.
 */
export function styleSummaryText(style: BlockStyle | undefined, messages: BoundMessages): string {
  const { summary } = messages.appearance;
  const parts: string[] = [];
  if (style?.background) parts.push(summary.background(style.background));
  if (style?.textColor) parts.push(summary.textColor(style.textColor));
  if (style?.align && style.align !== 'left') parts.push(summary.align(style.align));
  if (style?.paddingY && style.paddingY !== 'normal') parts.push(summary.padding(style.paddingY));
  if (style?.fontSize && style.fontSize !== 'normal') parts.push(summary.fontSize(style.fontSize));
  if (style?.fullWidth) parts.push(summary.fullWidth);
  if (style?.divider) parts.push(summary.divider);
  return parts.length ? parts.join(' · ') : summary.none;
}

/** The problems with a period, by field, from their codes (`periodErrorCodes`). */
export function periodErrorText(codes: PeriodErrorCodes, messages: BoundMessages): PeriodErrors {
  const { errors } = messages.period;
  const text: PeriodErrors = {};
  if (codes.start) text.start = errors[codes.start];
  if (codes.end) text.end = errors[codes.end];
  if (codes.lookaheadEnd) text.lookaheadEnd = errors[codes.lookaheadEnd];
  return text;
}

/** The brand kit's limited text fields, by the path `validateBrandKit` gives their problems. */
const BRAND_TEXT_FIELDS: Readonly<Record<string, BrandKitTextField>> = {
  name: 'name',
  'contact/address': 'address',
  'contact/phone': 'phone',
  'contact/email': 'email',
  'contact/website': 'website',
};

const SOCIAL_URL = /^social\/\d+\/url$/;
const IMAGE_PROBLEMS: readonly string[] = [
  'unreadable',
  'asset_id',
  'not_text',
  'not_web',
  'no_address',
] satisfies ImageProblem[];

/**
 * A problem `validateBrandKit` found, from its code and where it is. The ones only a malformed
 * stored kit can have (a section that is not an object, a value of the wrong type) keep core's
 * words: nobody filling in the form can cause them.
 */
export function brandKitIssueText(issue: ValidationIssue, messages: BoundMessages): string {
  const { errors } = messages.brandKit;
  const path = issue.path ?? '';
  const field = SOCIAL_URL.test(path) ? 'link' : BRAND_TEXT_FIELDS[path];
  switch (issue.code) {
    case 'required':
      return path === 'name'
        ? errors.nameRequired
        : SOCIAL_URL.test(path)
          ? errors.linkRequired
          : issue.message;
    case 'too_long': {
      const max = numberIn(issue.values, 'max');
      return field && max !== undefined ? errors.tooLong(field, max) : issue.message;
    }
    case 'invalid_email':
      return errors.invalidEmail;
    case 'invalid_color': {
      const color = /^colors\/(ink|accent|highlight|page)$/.exec(path)?.[1];
      return color
        ? errors.invalidColor(color as 'ink' | 'accent' | 'highlight' | 'page')
        : issue.message;
    }
    case 'invalid_value': {
      const font = /^fonts\/(heading|body)$/.exec(path)?.[1];
      if (font) return errors.invalidFont(font as 'heading' | 'body', BRAND_FONTS);
      return /^social\/\d+\/network$/.test(path)
        ? errors.invalidNetwork(SOCIAL_NETWORKS)
        : issue.message;
    }
    case 'invalid_image': {
      const problem = textIn(issue.values, 'problem');
      return path.startsWith('logo') && problem && IMAGE_PROBLEMS.includes(problem)
        ? errors.logo[problem as ImageProblem]
        : issue.message;
    }
    default:
      return issue.message;
  }
}
