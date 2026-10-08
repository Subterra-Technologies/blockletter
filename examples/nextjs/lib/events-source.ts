import { addDays, type DataSource, type IssuePeriod } from '@subterra-technologies/blockletter';

/** An event as the app stores it, and as `GET /api/events` returns it. */
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
 * The "Upcoming events" source, given a way to read the events. In the browser the editor reads
 * them from the route handler (`fetchEvents`); the server action that assembles a new issue reads
 * them directly. Either way the editor and the templates see one source, `events`.
 */
export function eventsSource(
  load: (range: EventWindow, signal?: AbortSignal) => Promise<EventRecord[]>,
): DataSource<'event_tiles'> {
  return {
    id: 'events',
    label: 'Fernhill events',
    blockType: 'event_tiles',
    async items({ period, signal }) {
      if (!period) return [];
      const events = await load(eventWindow(period), signal);
      return events.map((event) => ({
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
}

/** Reads the events through `GET /api/events`: what the editor's Refresh and picker call. */
export async function fetchEvents(
  { from, until }: EventWindow,
  signal?: AbortSignal,
): Promise<EventRecord[]> {
  const response = await fetch(`/api/events?${new URLSearchParams({ from, until })}`, { signal });
  if (!response.ok) throw new Error(`The events could not be loaded (${response.status}).`);
  return (await response.json()) as EventRecord[];
}
