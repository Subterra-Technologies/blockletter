import { DEFAULT_BRAND } from './brand';
import { MONTH_NAMES, isIsoDate, periodLabel } from './period';
import type { BlockBase, BrandKit, IssuePeriod } from './types';
import { isRecord } from './validate';

/**
 * Template tokens: `{{month}}`, `{{monthYear}}`, `{{year}}`, `{{period}}` and `{{org}}`, written in
 * a template and filled when it becomes an issue. Only tokens with a value are replaced, so an
 * email service's own merge tags (`{{first_name}}`, `{{{RESEND_UNSUBSCRIBE_URL}}}`) pass through.
 */

const TOKEN = /(?<!\{)\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}(?!\})/g;

/**
 * The values a period and a brand kit give each token. The month tokens name the month the period
 * ends in — the month an issue is filed under — and `{{period}}` its full label ("Sep 1–15,
 * 2026"). Without a period only `{{org}}` has a value.
 */
export function periodTokens(
  period?: Pick<IssuePeriod, 'start' | 'end'>,
  brand: BrandKit = DEFAULT_BRAND,
): Record<string, string> {
  const tokens: Record<string, string> = {};
  const org = brand.name?.trim();
  if (org) tokens.org = org;
  if (period && isIsoDate(period.end)) {
    const year = period.end.slice(0, 4);
    const month = MONTH_NAMES[Number(period.end.slice(5, 7)) - 1] ?? '';
    tokens.month = month;
    tokens.monthYear = `${month} ${year}`;
    tokens.year = year;
    const label = periodLabel(period);
    if (label) tokens.period = label;
  }
  return tokens;
}

/** `value` with every token that has a value filled; other `{{…}}` text is left as written. */
export function fillTokens(value: string, tokens: Readonly<Record<string, string>>): string {
  if (!value.includes('{{')) return value;
  return value.replace(TOKEN, (match, name: string) =>
    Object.hasOwn(tokens, name) ? (tokens[name] ?? match) : match,
  );
}

const fillDeep = (value: unknown, tokens: Readonly<Record<string, string>>): unknown => {
  if (typeof value === 'string') return fillTokens(value, tokens);
  if (Array.isArray(value)) return value.map((item: unknown) => fillDeep(item, tokens));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, fillDeep(item, tokens)]),
    );
  }
  return value;
};

/**
 * A copy of `block` with tokens filled in every string it holds, nested items included — for a
 * block made from a template, or a fresh header whose issue label reads `{{monthYear}}`. Its id,
 * type and source are left alone.
 */
export function fillBlockTokens<B extends BlockBase>(
  block: B,
  tokens: Readonly<Record<string, string>>,
): B {
  const filled: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(block)) {
    filled[key] =
      key === 'id' || key === 'type' || key === 'source' ? value : fillDeep(value, tokens);
  }
  return filled as B;
}
