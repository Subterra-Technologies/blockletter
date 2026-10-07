import type { RenderContext } from '../definition';
import { LIMITS, formatCount } from '../limits';
import type { ImageRef } from '../types';

/** Helpers the built-in block definitions share. Not part of the public API. */

/** The full-width layout table every block nests its content in. */
export const TABLE =
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">';

/** A spacer cell between side-by-side cells, hidden once they stack on a phone. */
export const gapCell = (ctx: RenderContext, width: number): string =>
  `<td class="${ctx.classes.gap}" width="${width}" style="width:${width}px;font-size:0;line-height:0;">&nbsp;</td>`;

export const ALT_TEXT_ISSUE = 'Add alt text so screen readers can describe the image.';

/** "Keep the text to 5,000 characters or fewer." when `value` is over the limit. */
export const tooLong = (label: string, value: string | undefined): string[] =>
  (value ?? '').length > LIMITS.maxTextLength
    ? [`Keep the ${label} to ${formatCount(LIMITS.maxTextLength)} characters or fewer.`]
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
