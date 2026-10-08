import { addDays, type DataSource, type IssuePeriod } from '@subterra-technologies/blockletter';

/** An event as the `events:inWindow` query returns it. */
export interface EventRecord {
  id: string;
  title: string;
  /** `YYYY-MM-DD`, in the organisation's own time zone. */
  date: string;
  time: string;
  location: string;
  slug: string;
}

/** The dates to list events for: from the day after an issue's period ends to its look-ahead. */
export interface EventWindow {
  from: string;
  until: string;
}

/** How far ahead to look when an issue's period does not say. */
const LOOKAHEAD_DAYS = 42;

export const eventWindow = (period: IssuePeriod): EventWindow => ({
  from: addDays(period.end, 1),
  until: period.lookaheadEnd ?? addDays(period.end, LOOKAHEAD_DAYS),
});

/**
 * The "Upcoming events" source, given a way to read the events. The editor in the browser calls
 * the `events:inWindow` query; the `issues:create` mutation reads the table directly. Either way
 * the editor and the templates see one source, `events`.
 */
export function eventsSource(
  load: (range: EventWindow) => Promise<EventRecord[]>,
): DataSource<'event_tiles'> {
  return {
    id: 'events',
    label: 'Fernhill events',
    blockType: 'event_tiles',
    async items({ period }) {
      if (!period) return [];
      const events = await load(eventWindow(period));
      return events.map((event) => ({
        // The Convex document id, so a later refresh knows which items came from this source.
        ref: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        url: `/events/${event.slug}`,
      }));
    },
  };
}
