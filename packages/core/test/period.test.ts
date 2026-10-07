import { describe, expect, it } from 'vitest';
import {
  PERIOD_PRESETS,
  addDays,
  applyPeriodPreset,
  compareIsoDates,
  coversDate,
  formatShortDate,
  isInLookahead,
  isIsoDate,
  monthLabel,
  monthPeriod,
  parseShortDate,
  periodErrors,
  periodLabel,
  presetRange,
  suggestPeriod,
  todayIn,
  validatePeriod,
  type IssuePeriod,
} from '../src';

/**
 * Ported from the source's `issueRange.spec.ts`, `issue-period.test.ts` and
 * `issue-presets.test.ts`: the period an issue is about — what it covers, and how far it looks
 * ahead for events.
 */
const TODAY = '2026-09-28';
const period = (over: Partial<IssuePeriod> = {}): IssuePeriod => ({
  start: '2026-09-01',
  end: '2026-09-28',
  lookaheadEnd: '2026-11-09',
  ...over,
});

describe('validatePeriod', () => {
  it('accepts a period ending today', () => {
    expect(validatePeriod(period(), { today: TODAY })).toEqual([]);
  });

  it('accepts a period deliberately ended before today', () => {
    // "Up to the 15th" is a legitimate choice, not an error to be corrected to today.
    expect(validatePeriod(period({ end: '2026-09-15' }), { today: TODAY })).toEqual([]);
  });

  it('refuses a period reaching past today when the host says what today is', () => {
    expect(validatePeriod(period({ end: '2026-09-29' }), { today: TODAY })).toEqual([
      'An issue can only cover up to today — there is no news from the future yet.',
    ]);
    // Without a today rule, any end date is fine: not every newsletter reports on the past.
    expect(validatePeriod(period({ end: '2026-09-29' }))).toEqual([]);
  });

  it('refuses a start after its end', () => {
    expect(
      validatePeriod(period({ start: '2026-09-30', end: '2026-09-28' }), { today: TODAY }),
    ).toEqual(['The start date is after the end date.']);
  });

  it('refuses a look-ahead that stops before the covered period does', () => {
    expect(validatePeriod(period({ lookaheadEnd: '2026-09-01' }))).toEqual([
      'Look ahead to a date after the period this issue covers.',
    ]);
  });

  it('names a missing date rather than failing obscurely', () => {
    expect(validatePeriod(period({ start: '' }))).toEqual([
      'Choose the date this issue starts from.',
    ]);
    expect(validatePeriod(period({ end: 'last week' }))).toEqual([
      'Choose the date this issue covers up to.',
    ]);
  });

  it('allows a period with no look-ahead at all', () => {
    expect(validatePeriod({ start: '2026-09-01', end: '2026-09-30' })).toEqual([]);
  });
});

describe('periodErrors', () => {
  it('is happy with a period ending today and looking ahead past it', () => {
    expect(periodErrors(period(), { today: TODAY })).toEqual({});
  });

  it('says an issue cannot cover the future', () => {
    expect(periodErrors(period({ end: '2026-09-29' }), { today: TODAY }).end).toMatch(
      /up to today/i,
    );
  });

  it('says when the start is after the end', () => {
    expect(periodErrors(period({ start: '2026-09-30' }), { today: TODAY }).start).toMatch(
      /after the end date/i,
    );
  });

  it('says when the look-ahead stops before the covered period does', () => {
    expect(periodErrors(period({ lookaheadEnd: '2026-09-01' })).lookaheadEnd).toMatch(
      /after the period this issue covers/i,
    );
  });

  it('names each missing date, by field', () => {
    const errors = periodErrors({ start: '', end: '', lookaheadEnd: '' }, { today: TODAY });
    expect(errors.start).toMatch(/starts from/i);
    expect(errors.end).toMatch(/covers up to/i);
    expect(errors.lookaheadEnd).toMatch(/how far ahead/i);
  });

  it('refuses dates that do not exist', () => {
    expect(periodErrors(period({ start: '2026-02-30' })).start).toMatch(/starts from/i);
  });
});

describe('the two windows meet rather than overlap', () => {
  it('covers up to the end date, and looks ahead from the day after', () => {
    const covered = period();
    expect(coversDate(covered, '2026-09-28')).toBe(true);
    expect(coversDate(covered, '2026-09-29')).toBe(false);
    expect(isInLookahead(covered, '2026-09-28')).toBe(false);
    expect(isInLookahead(covered, '2026-09-29')).toBe(true);
    expect(isInLookahead(covered, '2026-11-09')).toBe(true);
    expect(isInLookahead(covered, '2026-11-10')).toBe(false);
    expect(isInLookahead({ start: '2026-09-01', end: '2026-09-30' }, '2026-10-01')).toBe(false);
  });
});

describe('dates', () => {
  it('adds days across a month and a year end, without parsing a date as local time', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09'); // a daylight-saving weekend in America
    expect(addDays('not a date', 3)).toBe('not a date');
  });

  it('knows a real calendar date', () => {
    expect(isIsoDate('2026-09-05')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-9-5')).toBe(false);
    expect(isIsoDate('2026-09-05T10:00:00Z')).toBe(false);
    expect(isIsoDate(20260905)).toBe(false);
  });

  it('sorts dates', () => {
    expect(['2026-10-02', '2025-12-31', '2026-01-15'].sort(compareIsoDates)).toEqual([
      '2025-12-31',
      '2026-01-15',
      '2026-10-02',
    ]);
    expect(compareIsoDates('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('writes AP-style short dates', () => {
    expect(formatShortDate('2026-09-05')).toBe('Sept. 5');
    expect(formatShortDate('2026-03-12')).toBe('March 12');
    expect(formatShortDate('2026-06-30')).toBe('June 30');
    expect(formatShortDate('2026-01-01')).toBe('Jan. 1');
    expect(formatShortDate('Every Saturday')).toBe('Every Saturday');
    expect(
      formatShortDate('2026-10-03', [
        'janv.',
        'févr.',
        'mars',
        'avr.',
        'mai',
        'juin',
        'juil.',
        'août',
        'sept.',
        'oct.',
        'nov.',
        'déc.',
      ]),
    ).toBe('oct. 3');
  });

  it('reads a hand-typed short date back into a calendar date', () => {
    expect(parseShortDate('Sept. 5', 2026)).toBe('2026-09-05');
    expect(parseShortDate('September 5', 2026)).toBe('2026-09-05');
    expect(parseShortDate('Sep 5 · Fair', 2026)).toBe('2026-09-05');
    expect(parseShortDate('March 12', 2027)).toBe('2027-03-12');
    expect(parseShortDate('Feb. 30', 2026)).toBeUndefined();
    expect(parseShortDate('Every Saturday', 2026)).toBeUndefined();
    expect(parseShortDate('', 2026)).toBeUndefined();
  });
});

describe('todayIn', () => {
  // 03:30 UTC on 1 March is still the last day of February on the American west coast.
  const now = new Date(Date.UTC(2026, 2, 1, 3, 30));

  it("says what today is in the organisation's own time zone", () => {
    expect(todayIn('America/Los_Angeles', now)).toBe('2026-02-28');
    expect(todayIn('Asia/Tokyo', now)).toBe('2026-03-01');
    expect(todayIn('UTC', now)).toBe('2026-03-01');
  });

  it('crosses a year end the same way', () => {
    const newYear = new Date(Date.UTC(2027, 0, 1, 5, 0));
    expect(todayIn('America/New_York', newYear)).toBe('2027-01-01');
    expect(todayIn('Pacific/Honolulu', newYear)).toBe('2026-12-31');
  });

  it('refuses a zone that does not exist', () => {
    expect(() => todayIn('Mars/Olympus_Mons', now)).toThrow(RangeError);
  });
});

describe('months and labels', () => {
  it('labels a month key, and returns anything else unchanged', () => {
    expect(monthLabel('2026-03')).toBe('March 2026');
    expect(monthLabel('2026-12')).toBe('December 2026');
    expect(monthLabel('nonsense')).toBe('nonsense');
    expect(monthLabel('2026-13')).toBe('2026-13');
  });

  it('turns a month into a period', () => {
    expect(monthPeriod('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(monthPeriod('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    expect(() => monthPeriod('2026-9')).toThrow(RangeError);
  });

  it('says one month by its name when the period is exactly that month', () => {
    expect(periodLabel({ start: '2026-09-01', end: '2026-09-30' })).toBe('September 2026');
  });

  it('drops the repeated month and year when the period sits inside one month', () => {
    expect(periodLabel({ start: '2026-09-01', end: '2026-09-15' })).toBe('Sep 1–15, 2026');
  });

  it('names both months when the period crosses one', () => {
    expect(periodLabel({ start: '2026-08-20', end: '2026-09-15' })).toBe('Aug 20 – Sep 15, 2026');
  });

  it('carries both years when the period crosses one', () => {
    expect(periodLabel({ start: '2026-12-20', end: '2027-01-10' })).toBe(
      'Dec 20, 2026 – Jan 10, 2027',
    );
  });

  it('says a single day once, and nothing for dates it cannot read', () => {
    expect(periodLabel({ start: '2026-09-15', end: '2026-09-15' })).toBe('Sep 15, 2026');
    expect(periodLabel({ start: '', end: '2026-09-15' })).toBe('');
  });
});

describe('presets', () => {
  const today = '2026-09-30';

  it('offers this month, last month and custom', () => {
    expect(PERIOD_PRESETS.map((preset) => preset.id)).toEqual([
      'this-month',
      'last-month',
      'custom',
    ]);
  });

  it('gives this month up to today, never to a day that has not happened', () => {
    expect(presetRange('this-month', today)).toEqual({ start: '2026-09-01', end: today });
  });

  it('gives last month whole', () => {
    expect(presetRange('last-month', today)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  it('crosses a year boundary in January', () => {
    expect(presetRange('last-month', '2027-01-09')).toEqual({
      start: '2026-12-01',
      end: '2026-12-31',
    });
  });

  it('has no dates of its own for a custom period', () => {
    expect(presetRange('custom', today)).toBeNull();
  });

  it('changes the dates a preset covers and leaves the look-ahead alone', () => {
    const current = { start: '2026-01-01', end: '2026-01-31', lookaheadEnd: '2026-03-14' };
    expect(applyPeriodPreset('last-month', current, today)).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
      lookaheadEnd: '2026-03-14',
    });
    expect(applyPeriodPreset('custom', current, today)).toBe(current);
  });

  it('suggests this month so far, looking six weeks ahead', () => {
    expect(suggestPeriod('2026-09-17')).toEqual({
      start: '2026-09-01',
      end: '2026-09-17',
      lookaheadEnd: '2026-10-29',
    });
    expect(suggestPeriod('2026-09-17', 'custom', { lookaheadDays: 7 })).toEqual({
      start: '2026-09-17',
      end: '2026-09-17',
      lookaheadEnd: '2026-09-24',
    });
  });
});
