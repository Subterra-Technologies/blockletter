import { formatShortDate, isIsoDate } from '@subterra-technologies/blockletter';
import type { EditorFormat } from './messages';

/**
 * How the editor writes numbers and dates. Without a `locale` it writes exactly what it always
 * has: plain digits with a comma every three (as core's messages do), and AP-style dates
 * ("Sept. 5"). With one, `Intl` writes them as that locale does.
 */

/** "5,000": core's own way of writing a count in a message. */
const plainNumber = (value: number, fractionDigits?: number): string =>
  fractionDigits !== undefined
    ? value.toFixed(fractionDigits)
    : Number.isInteger(value)
      ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : String(value);

/**
 * `locale` in its canonical form, or undefined when it is not one `Intl` knows: a typo in a host's
 * settings must not stop the editor opening.
 */
export function canonicalLocale(locale: string | undefined): string | undefined {
  if (!locale?.trim()) return undefined;
  try {
    return Intl.getCanonicalLocales(locale.trim())[0];
  } catch {
    return undefined;
  }
}

/** The calendar date `iso` names, at midnight UTC, built from its parts so no zone moves it. */
function utcDate(iso: string): Date {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  const date = new Date(0);
  // `setUTCFullYear` rather than `Date.UTC`, which reads years 0–99 as 1900–1999.
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

export function createFormat(locale: string | undefined): EditorFormat {
  const known = canonicalLocale(locale);
  if (!known) {
    return { locale: undefined, number: plainNumber, date: (iso) => formatShortDate(iso) };
  }
  const numbers = new Map<number | undefined, Intl.NumberFormat>();
  const dates = new Intl.DateTimeFormat(known, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return {
    locale: known,
    number(value, fractionDigits) {
      let format = numbers.get(fractionDigits);
      if (!format) {
        format = new Intl.NumberFormat(
          known,
          fractionDigits === undefined
            ? {}
            : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits },
        );
        numbers.set(fractionDigits, format);
      }
      return format.format(value);
    },
    date: (iso) => (isIsoDate(iso) ? dates.format(utcDate(iso)) : iso),
  };
}
