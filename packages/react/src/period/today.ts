import { todayIn } from '@subterra-technologies/blockletter';

/** The browser's own zone: where "today" is, for a host that does not say. */
export const browserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/**
 * Today as `YYYY-MM-DD` in `timeZone` (the browser's when absent), or in UTC when the zone is not
 * one the browser knows: a typo in a host's settings must not stop an issue being started.
 */
export function todayInZone(timeZone: string | undefined): string {
  try {
    return todayIn(timeZone ?? browserTimeZone());
  } catch {
    return todayIn('UTC');
  }
}
