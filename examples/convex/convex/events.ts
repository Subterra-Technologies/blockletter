import { addDays } from '@subterra-technologies/blockletter';
import { v } from 'convex/values';
import { internalMutation, query, type QueryCtx } from './_generated/server';
import type { EventWindow } from './eventsSource';

const eventRecord = v.object({
  id: v.id('events'),
  title: v.string(),
  date: v.string(),
  time: v.string(),
  location: v.string(),
  slug: v.string(),
});

/** Event tiles show four at most; a picker offers a few more to choose from. */
const MAX_EVENTS = 20;

/**
 * The events between two dates, in date order, through the `by_date` index: what the editor's
 * source asks for over `inWindow`, and what `issues:create` reads in the same transaction.
 */
export async function eventsBetween(ctx: QueryCtx, { from, until }: EventWindow) {
  const events = await ctx.db
    .query('events')
    .withIndex('by_date', (q) => q.gte('date', from).lte('date', until))
    .take(MAX_EVENTS);
  return events.map(({ _id, title, date, time, location, slug }) => ({
    id: _id,
    title,
    date,
    time,
    location,
    slug,
  }));
}

/** What the editor's events source calls: the events for an issue's dates. */
export const inWindow = query({
  args: { from: v.string(), until: v.string() },
  returns: v.array(eventRecord),
  handler: (ctx, range) => eventsBetween(ctx, range),
});

/**
 * Fictional events over the next few weeks, so a new issue has some to show. Run it once with
 * `npx convex run events:seed`; it does nothing when there are events already.
 */
export const seed = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    if (await ctx.db.query('events').first()) return 0;
    // Today in UTC is near enough for sample data.
    const today = new Date().toISOString().slice(0, 10);
    for (const { daysAhead, ...event } of SAMPLE_EVENTS) {
      await ctx.db.insert('events', { ...event, date: addDays(today, daysAhead) });
    }
    return SAMPLE_EVENTS.length;
  },
});

const SAMPLE_EVENTS = [
  {
    title: 'Bike tune-up clinic',
    daysAhead: 4,
    time: '10:00 AM',
    location: 'The workshop',
    slug: 'bike-tune-up-clinic',
  },
  {
    title: 'Repair café',
    daysAhead: 9,
    time: '6:30 PM',
    location: 'Front room',
    slug: 'repair-cafe',
  },
  {
    title: 'Knife and tool sharpening',
    daysAhead: 16,
    time: '11:00 AM',
    location: 'The workshop',
    slug: 'tool-sharpening',
  },
  {
    title: 'Intro to the table saw',
    daysAhead: 23,
    time: '6:00 PM',
    location: 'The workshop',
    slug: 'intro-to-the-table-saw',
  },
  {
    title: 'Seed and tool swap',
    daysAhead: 30,
    time: '9:00 AM',
    location: 'Back lot',
    slug: 'seed-and-tool-swap',
  },
  {
    title: 'Volunteer orientation',
    daysAhead: 37,
    time: '10:00 AM',
    location: 'Front room',
    slug: 'volunteer-orientation',
  },
];
