import type { RenderContext } from '../definition';
import type { BlockIssue } from '../issues';
import { LIMITS, formatCount } from '../limits';
import type { ImageRef } from '../types';

/** Helpers the built-in block definitions share. Not part of the public API. */

/** The full-width layout table every block nests its content in. */
export const TABLE =
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">';

/** A spacer cell between side-by-side cells, hidden once they stack on a phone. */
export const gapCell = (ctx: RenderContext, width: number): string =>
  `<td class="${ctx.classes.gap}" width="${width}" style="width:${width}px;font-size:0;line-height:0;">&nbsp;</td>`;

export const ALT_TEXT_ISSUE: BlockIssue = {
  code: 'missing_alt',
  message: 'Add alt text so screen readers can describe the image.',
};

export const MISSING_BUTTON_LABEL: BlockIssue = {
  code: 'missing_button_label',
  message: 'Give the button a label.',
};

/**
 * The fields a built-in block's issues say are too long, by the word for them in the message:
 * `values.field` of a `too_long` issue.
 */
export type LongTextField = 'text' | 'article' | 'letter' | 'quote' | 'column_text';

/** "Keep the text to 5,000 characters or fewer." when `value` is over the limit. */
export const tooLong = (field: LongTextField, value: string | undefined): BlockIssue[] =>
  (value ?? '').length > LIMITS.maxTextLength
    ? [
        {
          code: 'too_long',
          message: `Keep the ${field.replace('_', ' ')} to ${formatCount(LIMITS.maxTextLength)} characters or fewer.`,
          values: { field, max: LIMITS.maxTextLength },
        },
      ]
    : [];

/** True when an image is set but nothing describes it. */
export const missingAlt = (image: ImageRef | undefined, alt: string | undefined): boolean =>
  image !== undefined && !(alt ?? '').trim();

/** The first `count` words, with an ellipsis when there were more. */
export function firstWords(text: string, count = 8): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length > count ? `${words.slice(0, count).join(' ')}…` : words.join(' ');
}

/** "3 columns", "1 photo". */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

/** Non-blank names joined for a one-line summary. */
export const joinNames = (names: readonly (string | undefined)[]): string =>
  names
    .map((name) => name?.trim() ?? '')
    .filter(Boolean)
    .join(', ');

/** Non-blank values, trimmed. */
export const present = (...values: (string | undefined)[]): string[] =>
  values.map((value) => value?.trim() ?? '').filter(Boolean);
