import { readFile } from 'node:fs/promises';
import { addDays, type DataSource } from '@subterra-technologies/blockletter';

/** One row of `data/events.json`: the shape your own events table might have. */
interface EventRecord {
  id: string;
  title: string;
  /** `YYYY-MM-DD`, in the organisation's own time zone. */
  date: string;
  time: string;
  location: string;
  slug: string;
}

/** How far ahead to look when an issue's period does not say. */
const LOOKAHEAD_DAYS = 42;

const EVENTS_FILE = new URL('../data/events.json', import.meta.url);

/**
 * Fills the "Upcoming events" tiles. The JSON file stands in for your database: `items` is where
 * you would query it, for the events between the day after the issue's period ends and its
 * look-ahead date.
 *
 * `id: 'events'` is the source the built-in templates' event tiles name, so `assembleDocument`
 * fills them with no further wiring.
 */
export const eventsSource: DataSource<'event_tiles'> = {
  id: 'events',
  label: 'Fernhill events',
  blockType: 'event_tiles',
  async items({ period }) {
    if (!period) return [];
    const from = addDays(period.end, 1);
    const until = period.lookaheadEnd ?? addDays(period.end, LOOKAHEAD_DAYS);
    // Your database hands back typed rows; this file is trusted the same way.
    const events = JSON.parse(await readFile(EVENTS_FILE, 'utf8')) as EventRecord[];
    return events
      .filter((event) => event.date >= from && event.date <= until)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((event) => ({
        // Your own id, so a later refresh knows which items came from this source.
        ref: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        url: `/events/${event.slug}`,
      }));
  },
};
