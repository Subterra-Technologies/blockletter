import type { IssuePeriod } from './types';

/**
 * Calendar dates and the period an issue covers.
 *
 * Every date here is a `YYYY-MM-DD` string in the organisation's own time zone, and stays one:
 * arithmetic goes through UTC timestamps built from the parts and formatted back from UTC,
 * never through `new Date(iso)`, because a bare ISO date parses as UTC midnight and shows a day
 * early anywhere west of Greenwich. The one place a clock meets a zone is `todayIn`.
 *
 * An issue has two windows that meet rather than overlap: it **covers** `start` → `end` (what
 * has happened: new members, news, sponsor thanks) and **looks ahead** from the day after `end`
 * to `lookaheadEnd` (what is coming up, which is what event lists draw from).
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const SHORT_MONTHS = MONTH_NAMES.map((name) => name.slice(0, 3));

/** AP-style month abbreviations: "Sept. 5", "March 12". */
export const AP_MONTHS = [
  'Jan.',
  'Feb.',
  'March',
  'April',
  'May',
  'June',
  'July',
  'Aug.',
  'Sept.',
  'Oct.',
  'Nov.',
  'Dec.',
] as const;

interface DateParts {
  year: number;
  /** 1–12. */
  month: number;
  day: number;
}

/** UTC milliseconds for a calendar date; out-of-range days and months roll over. */
const utc = (year: number, month: number, day: number): number => {
  const date = new Date(0);
  // `setUTCFullYear` rather than `Date.UTC`, which reads years 0–99 as 1900–1999.
  date.setUTCFullYear(year, month - 1, day);
  return date.getTime();
};

const daysInMonth = (year: number, month: number): number =>
  new Date(utc(year, month + 1, 0)).getUTCDate();

const pad = (value: number, width = 2): string => String(value).padStart(width, '0');

const formatUtc = (ms: number): string => {
  const date = new Date(ms);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const parse = (value: unknown): DateParts | undefined => {
  if (typeof value !== 'string') return undefined;
  const match = ISO_DATE.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return undefined;
  return { year, month, day };
};

const monthName = (month: number): string => MONTH_NAMES[month - 1] ?? '';
const shortMonth = (month: number): string => SHORT_MONTHS[month - 1] ?? '';

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** True for a real calendar date written `YYYY-MM-DD` (so not `2026-02-30`). */
export const isIsoDate = (value: unknown): value is string => parse(value) !== undefined;

/** The date `days` after `iso` (before it when negative). An invalid date comes back unchanged. */
export function addDays(iso: string, days: number): string {
  const parts = parse(iso);
  return parts ? formatUtc(utc(parts.year, parts.month, parts.day + days)) : iso;
}

/** -1, 0 or 1, for sorting `YYYY-MM-DD` strings. */
export const compareIsoDates = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Today's date in `timeZone` (an IANA name such as `Europe/Lisbon`), which is what "today"
 * means to the organisation wherever the code happens to run. `now` is a parameter so a test can
 * say which instant it means. Throws a `RangeError` for an unknown zone.
 */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
}

/** "Sept. 5" for `2026-09-05`. Anything that is not a `YYYY-MM-DD` date comes back unchanged. */
export function formatShortDate(iso: string, months: readonly string[] = AP_MONTHS): string {
  const parts = parse(iso);
  const name = parts ? months[parts.month - 1] : undefined;
  return parts && name ? `${name} ${parts.day}` : iso;
}

/**
 * The calendar date a hand-typed "Sept. 5" (or "September 5", "Sep 5") means in `year`, so a line
 * someone wrote can carry a `sortDate`. Undefined for anything else, such as "Every Saturday".
 */
export function parseShortDate(text: string, year: number): string | undefined {
  const match = /^\s*([A-Za-z]{3,})\.?\s+(\d{1,2})(?!\d)/.exec(text);
  if (!match) return undefined;
  const prefix = (match[1] ?? '').slice(0, 3).toLowerCase();
  const month = MONTH_NAMES.findIndex((name) => name.toLowerCase().startsWith(prefix)) + 1;
  if (month === 0) return undefined;
  const iso = `${pad(year, 4)}-${pad(month)}-${pad(Number(match[2]))}`;
  return isIsoDate(iso) ? iso : undefined;
}

// ---------------------------------------------------------------------------
// Months and periods
// ---------------------------------------------------------------------------

/** "September 2026" for `2026-09`; anything that is not a month key comes back unchanged. */
export function monthLabel(monthKey: string): string {
  const match = MONTH_KEY.exec(monthKey);
  const name = match ? monthName(Number(match[2])) : '';
  return match && name ? `${name} ${match[1]}` : monthKey;
}

/**
 * The whole of a `YYYY-MM` month as a period. It has no look-ahead: a source that lists upcoming
 * events decides its own window for it. Throws a `RangeError` for anything but a month key.
 */
export function monthPeriod(monthKey: string): IssuePeriod {
  const match = MONTH_KEY.exec(monthKey);
  const month = Number(match?.[2]);
  if (!match || month < 1 || month > 12) {
    throw new RangeError(`Expected a month written YYYY-MM, not "${monthKey}".`);
  }
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${pad(daysInMonth(Number(match[1]), month))}`,
  };
}

/**
 * What an issue is called: "September 2026" when the period is exactly that month, and the dates
 * themselves otherwise — "Sep 1–15, 2026", "Aug 20 – Sep 15, 2026", "Dec 20, 2026 – Jan 10, 2027".
 * Empty when either date is invalid.
 */
export function periodLabel(period: Pick<IssuePeriod, 'start' | 'end'>): string {
  const from = parse(period.start);
  const to = parse(period.end);
  if (!from || !to) return '';
  const wholeMonth =
    from.day === 1 &&
    from.year === to.year &&
    from.month === to.month &&
    to.day === daysInMonth(to.year, to.month);
  if (wholeMonth) return `${monthName(from.month)} ${from.year}`;
  if (period.start === period.end) return `${shortMonth(from.month)} ${from.day}, ${from.year}`;
  if (from.year !== to.year) {
    return (
      `${shortMonth(from.month)} ${from.day}, ${from.year} – ` +
      `${shortMonth(to.month)} ${to.day}, ${to.year}`
    );
  }
  if (from.month === to.month) {
    return `${shortMonth(from.month)} ${from.day}–${to.day}, ${from.year}`;
  }
  return `${shortMonth(from.month)} ${from.day} – ${shortMonth(to.month)} ${to.day}, ${to.year}`;
}

/** True when `date` falls inside the period the issue covers. */
export const coversDate = (period: IssuePeriod, date: string): boolean =>
  date >= period.start && date <= period.end;

/** True when `date` falls in the look-ahead window; always false without one. */
export const isInLookahead = (period: IssuePeriod, date: string): boolean =>
  period.lookaheadEnd !== undefined && date > period.end && date <= period.lookaheadEnd;

/** What is wrong with a period, by field, in words a form can show beside it. */
export interface PeriodErrors {
  start?: string;
  end?: string;
  lookaheadEnd?: string;
}

/**
 * What is wrong with one of a period's dates, as a code that stays the same whatever words a form
 * puts it in. `PERIOD_ERROR_MESSAGES` holds the English that `periodErrors` writes for each.
 */
export type PeriodErrorCode =
  | 'missing_start'
  | 'start_after_end'
  | 'missing_end'
  | 'end_after_today'
  | 'missing_lookahead'
  | 'lookahead_before_end';

/** The problems with a period, by field, as codes. */
export type PeriodErrorCodes = { [K in keyof PeriodErrors]?: PeriodErrorCode };

/** The English for each problem, as `periodErrors` writes it. */
export const PERIOD_ERROR_MESSAGES: Readonly<Record<PeriodErrorCode, string>> = Object.freeze({
  missing_start: 'Choose the date this issue starts from.',
  start_after_end: 'The start date is after the end date.',
  missing_end: 'Choose the date this issue covers up to.',
  end_after_today: 'An issue can only cover up to today — there is no news from the future yet.',
  missing_lookahead: 'Choose how far ahead to look for events.',
  lookahead_before_end: 'Look ahead to a date after the period this issue covers.',
});

export interface PeriodRules {
  /**
   * The last day an issue may cover. For hosts whose issues report on what has happened, there
   * is no news from the future; absent, the end date may be any day.
   */
  today?: string;
}

/**
 * The problems with a period, by field, as codes: what `periodErrors` reports, for a form that
 * words them in a language of its own. Empty when it is fine.
 */
export function periodErrorCodes(period: IssuePeriod, rules: PeriodRules = {}): PeriodErrorCodes {
  const codes: PeriodErrorCodes = {};
  const { today } = rules;
  if (!isIsoDate(period.start)) codes.start = 'missing_start';
  if (!isIsoDate(period.end)) {
    codes.end = 'missing_end';
  } else if (today && period.end > today) {
    codes.end = 'end_after_today';
  } else if (isIsoDate(period.start) && period.start > period.end) {
    codes.start = 'start_after_end';
  }
  if (period.lookaheadEnd !== undefined) {
    if (!isIsoDate(period.lookaheadEnd)) {
      codes.lookaheadEnd = 'missing_lookahead';
    } else if (isIsoDate(period.end) && period.lookaheadEnd < period.end) {
      codes.lookaheadEnd = 'lookahead_before_end';
    }
  }
  return codes;
}

/** The problems with a period, by field. Empty when it is fine. */
export function periodErrors(period: IssuePeriod, rules: PeriodRules = {}): PeriodErrors {
  const codes = periodErrorCodes(period, rules);
  const errors: PeriodErrors = {};
  if (codes.start) errors.start = PERIOD_ERROR_MESSAGES[codes.start];
  if (codes.end) errors.end = PERIOD_ERROR_MESSAGES[codes.end];
  if (codes.lookaheadEnd) errors.lookaheadEnd = PERIOD_ERROR_MESSAGES[codes.lookaheadEnd];
  return errors;
}

/** Every problem with a period, as sentences, start first. Empty when it is fine. */
export function validatePeriod(period: IssuePeriod, rules: PeriodRules = {}): string[] {
  const errors = periodErrors(period, rules);
  return [errors.start, errors.end, errors.lookaheadEnd].filter(
    (message): message is string => message !== undefined,
  );
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/**
 * The periods a new issue is usually about, offered by name. The look-ahead is not a preset: it
 * answers a different question — how far forward to gather what is coming up — and stays a field.
 */
export type PeriodPreset = 'this-month' | 'last-month' | 'custom';

export const PERIOD_PRESETS: readonly { id: PeriodPreset; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'custom', label: 'Custom' },
];

/** How far ahead a new issue looks by default: the next six weeks. */
export const DEFAULT_LOOKAHEAD_DAYS = 42;

/**
 * The dates a preset means on `today`: "this month" runs from the 1st up to today, never to a day
 * that has not happened; "last month" is the whole month before. Null for `custom` (and for an
 * invalid `today`), which has dates of its own.
 */
export function presetRange(
  preset: PeriodPreset,
  today: string,
): { start: string; end: string } | null {
  const parts = parse(today);
  if (!parts || preset === 'custom') return null;
  if (preset === 'this-month') {
    return { start: formatUtc(utc(parts.year, parts.month, 1)), end: today };
  }
  return {
    start: formatUtc(utc(parts.year, parts.month - 1, 1)),
    end: formatUtc(utc(parts.year, parts.month, 0)),
  };
}

/** A preset applied to a period, leaving the look-ahead alone. */
export function applyPeriodPreset(
  preset: PeriodPreset,
  period: IssuePeriod,
  today: string,
): IssuePeriod {
  const range = presetRange(preset, today);
  return range ? { ...period, ...range } : period;
}

/** Where a new issue opens: a preset (this month so far, by default), looking six weeks ahead. */
export function suggestPeriod(
  today: string,
  preset: PeriodPreset = 'this-month',
  options: { lookaheadDays?: number } = {},
): IssuePeriod {
  return {
    ...(presetRange(preset, today) ?? { start: today, end: today }),
    lookaheadEnd: addDays(today, options.lookaheadDays ?? DEFAULT_LOOKAHEAD_DAYS),
  };
}
