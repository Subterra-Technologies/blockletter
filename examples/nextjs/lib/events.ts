import 'server-only';
import { addDays, todayIn } from '@subterra-technologies/blockletter';
import { TIME_ZONE } from './brand';
import type { EventRecord, EventWindow } from './events-source';

/**
 * Fictional events, dated a few days to a few weeks after whenever the example runs, so a new
 * issue always has some to show. In a real app this is a query against your events table.
 */
const SAMPLE_EVENTS = [
  {
    id: 'evt-101',
    title: 'Bike tune-up clinic',
    daysAhead: 4,
    time: '10:00 AM',
    location: 'The workshop',
    slug: 'bike-tune-up-clinic',
  },
  {
    id: 'evt-102',
    title: 'Repair café',
    daysAhead: 9,
    time: '6:30 PM',
    location: 'Front room',
    slug: 'repair-cafe',
  },
  {
    id: 'evt-103',
    title: 'Knife and tool sharpening',
    daysAhead: 16,
    time: '11:00 AM',
    location: 'The workshop',
    slug: 'tool-sharpening',
  },
  {
    id: 'evt-104',
    title: 'Intro to the table saw',
    daysAhead: 23,
    time: '6:00 PM',
    location: 'The workshop',
    slug: 'intro-to-the-table-saw',
  },
  {
    id: 'evt-105',
    title: 'Seed and tool swap',
    daysAhead: 30,
    time: '9:00 AM',
    location: 'Back lot',
    slug: 'seed-and-tool-swap',
  },
  {
    id: 'evt-106',
    title: 'Volunteer orientation',
    daysAhead: 37,
    time: '10:00 AM',
    location: 'Front room',
    slug: 'volunteer-orientation',
  },
];

export async function listEvents({ from, until }: EventWindow): Promise<EventRecord[]> {
  const today = todayIn(TIME_ZONE);
  return SAMPLE_EVENTS.map(({ daysAhead, ...event }) => ({
    ...event,
    date: addDays(today, daysAhead),
  })).filter((event) => event.date >= from && event.date <= until);
}
