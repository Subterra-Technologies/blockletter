import {
  assembleDocument,
  BUILT_IN_TEMPLATES,
  validateDocument,
  validatePeriod,
  type NewsletterDocument,
} from '@subterra-technologies/blockletter';
import { ConvexError, v } from 'convex/values';
import { internalQuery, mutation, query } from './_generated/server';
import { BRAND } from './brand';
import { eventsBetween } from './events';
import { eventsSource } from './eventsSource';

/*
 * This example has no sign-in, to stay small. A real app checks `ctx.auth.getUserIdentity()` at
 * the top of every public function: each one can be called by anyone with the deployment's URL.
 */

const periodValidator = v.object({
  start: v.string(),
  end: v.string(),
  lookaheadEnd: v.optional(v.string()),
});

/** The drafts, the most recently saved first: what the list shows of each. */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('issues'),
      subject: v.string(),
      period: v.optional(periodValidator),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const issues = await ctx.db.query('issues').withIndex('by_updatedAt').order('desc').take(50);
    return issues.map(({ _id, document, updatedAt }) => {
      const { subject, period } = document as NewsletterDocument;
      return { _id, subject, ...(period ? { period } : {}), updatedAt };
    });
  },
});

/** One issue to edit, or null when there is none with that id (it may come from the address bar). */
export const get = query({
  args: { id: v.string() },
  returns: v.union(v.null(), v.object({ _id: v.id('issues'), document: v.any() })),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId('issues', args.id);
    const issue = id ? await ctx.db.get('issues', id) : null;
    return issue ? { _id: issue._id, document: issue.document } : null;
  },
});

/**
 * A new draft from a built-in template. It is assembled here, inside the mutation: the template's
 * event tiles read the events table in the same transaction that stores the issue. The client
 * says which dates the issue covers, since "this month" is a date in the organisation's zone.
 */
export const create = mutation({
  args: { templateId: v.string(), period: periodValidator },
  returns: v.id('issues'),
  handler: async (ctx, args) => {
    const template = BUILT_IN_TEMPLATES.find((item) => item.id === args.templateId);
    if (!template) throw new ConvexError({ message: 'There is no such template.', problems: [] });
    const problems = validatePeriod(args.period);
    if (problems.length > 0) {
      throw new ConvexError({ message: 'Those dates do not work.', problems });
    }
    const document = await assembleDocument(template, {
      period: args.period,
      brand: BRAND,
      sources: [eventsSource((range) => eventsBetween(ctx, range))],
    });
    return await ctx.db.insert('issues', { document, updatedAt: Date.now() });
  },
});

/**
 * Saves the editor's document. `v.any()` lets any JSON through, so Blockletter's own validator
 * decides whether it is a newsletter, and the client is told what to fix when it is not.
 */
export const save = mutation({
  args: { id: v.id('issues'), document: v.any() },
  returns: v.null(),
  handler: async (ctx, { id, document }) => {
    const problems = validateDocument(document).map((issue) => issue.message);
    if (problems.length > 0) {
      throw new ConvexError({ message: 'The issue was not saved. Fix these first:', problems });
    }
    if (!(await ctx.db.get('issues', id))) {
      throw new ConvexError({ message: 'This issue no longer exists.', problems: [] });
    }
    await ctx.db.patch('issues', id, { document, updatedAt: Date.now() });
    return null;
  },
});

/** The stored document, for the action that renders and sends it. */
export const documentFor = internalQuery({
  args: { id: v.id('issues') },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, { id }) => (await ctx.db.get('issues', id))?.document ?? null,
});
