import { renderEmail, type NewsletterDocument } from '@subterra-technologies/blockletter';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { action } from './_generated/server';
import { RENDER_OPTIONS } from './brand';

const testResult = v.union(
  v.object({ status: v.literal('sent'), to: v.string() }),
  v.object({
    status: v.literal('rendered'),
    html: v.string(),
    warnings: v.array(v.string()),
    missing: v.array(v.string()),
  }),
);

type TestResult = typeof testResult.type;

/**
 * Renders the saved issue as it would be sent and sends it to TO through Resend's REST API. An
 * action, because a query or mutation cannot reach the network. Until RESEND_API_KEY, FROM and
 * TO are set on the deployment (`npx convex env set …`), it returns the HTML for the client to
 * show instead.
 */
export const sendTest = action({
  args: { id: v.id('issues') },
  returns: testResult,
  // Annotated: the return type would otherwise depend on `internal`, which depends on this file.
  handler: async (ctx, { id }): Promise<TestResult> => {
    const document: NewsletterDocument | null = await ctx.runQuery(internal.issues.documentFor, {
      id,
    });
    if (!document) throw new ConvexError({ message: 'This issue no longer exists.', problems: [] });

    // A test goes to you, so it needs no unsubscribe link. A real send passes `unsubscribeUrl`
    // (each reader's own link, or your provider's merge tag), and the renderer warns without one.
    const { html, text, warnings } = renderEmail(document, RENDER_OPTIONS);

    // Set on the deployment, never in the client: `npx convex env set RESEND_API_KEY re_…`.
    const { RESEND_API_KEY, FROM, TO } = process.env;
    if (!RESEND_API_KEY || !FROM || !TO) {
      const missing = Object.entries({ RESEND_API_KEY, FROM, TO })
        .filter(([, value]) => !value)
        .map(([name]) => name);
      return { status: 'rendered', html, warnings, missing };
    }

    const to = TO.split(',').map((address) => address.trim());
    // https://resend.com/docs/api-reference/emails/send-email, with `fetch` and no SDK.
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject: `[Test] ${document.subject}`, html, text }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new ConvexError({
        message: `Resend did not accept the email (${response.status}): ${body.message ?? response.statusText}`,
        problems: [],
      });
    }
    return { status: 'sent', to: to.join(', ') };
  },
});
