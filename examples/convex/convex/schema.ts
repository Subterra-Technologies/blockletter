import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  issues: defineTable({
    /**
     * The `NewsletterDocument` as the editor produced it. Convex stores it as it is; the mutations
     * that write it check it with Blockletter's own validator (`validateDocument`), which knows
     * every block's fields where a Convex validator here would only see JSON.
     */
    document: v.any(),
    updatedAt: v.number(),
  }).index('by_updatedAt', ['updatedAt']),

  /** The app's own records: what an issue's "Upcoming events" tiles fill from. */
  events: defineTable({
    title: v.string(),
    /** `YYYY-MM-DD`, in the organisation's own time zone. */
    date: v.string(),
    time: v.string(),
    location: v.string(),
    slug: v.string(),
  }).index('by_date', ['date']),
});
