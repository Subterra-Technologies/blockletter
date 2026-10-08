'use server';

import {
  assembleDocument,
  BUILT_IN_TEMPLATES,
  renderEmail,
  suggestPeriod,
  todayIn,
  validateDocument,
  type NewsletterDocument,
} from '@subterra-technologies/blockletter';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { BRAND, RENDER_OPTIONS, TIME_ZONE } from '@/lib/brand';
import { listEvents } from '@/lib/events';
import { eventsSource } from '@/lib/events-source';
import { getIssue, insertIssue, updateIssue } from '@/lib/issues';
import { resendSetup, sendWithResend } from '@/lib/resend';

/*
 * Next.js serves every Server Action as a public POST endpoint. This example has no sign-in, to
 * stay small; a real app checks who is asking at the top of each one, and treats every argument
 * as untrusted input.
 */

/** A new draft from a built-in template, filled from the events for this month's issue. */
export async function createIssue(formData: FormData): Promise<void> {
  const template =
    BUILT_IN_TEMPLATES.find((item) => item.id === formData.get('template')) ??
    BUILT_IN_TEMPLATES[0];
  if (!template) throw new Error('Blockletter has no built-in templates.');

  // This month so far, looking six weeks ahead for events: where the editor starts one too. On
  // the server the source reads the events directly rather than through the route handler.
  const document = await assembleDocument(template, {
    period: suggestPeriod(todayIn(TIME_ZONE)),
    brand: BRAND,
    sources: [eventsSource(listEvents)],
  });
  const issue = await insertIssue(document);
  revalidatePath('/');
  redirect(`/issues/${issue.id}`);
}

export type SaveResult = { ok: true } | { ok: false; error: string; problems: string[] };

export async function saveIssue(id: unknown, document: unknown): Promise<SaveResult> {
  if (typeof id !== 'string') return { ok: false, error: 'There is no such issue.', problems: [] };
  // The document arrives from the browser: check it really is one before it reaches storage.
  const problems = validateDocument(document);
  if (problems.length > 0) {
    return {
      ok: false,
      error: 'The issue was not saved. Fix these first:',
      problems: problems.map((problem) => problem.message),
    };
  }
  const issue = await updateIssue(id, document as NewsletterDocument);
  if (!issue) return { ok: false, error: 'This issue no longer exists.', problems: [] };
  // The drafts list shows each subject and when it was saved.
  revalidatePath('/');
  return { ok: true };
}

export type TestResult =
  | { status: 'sent'; to: string }
  | { status: 'rendered'; html: string; warnings: string[]; missing: string[] }
  | { status: 'error'; error: string };

/**
 * Renders the saved issue on the server, as it would be sent, and sends it to TO through Resend.
 * Until RESEND_API_KEY, FROM and TO are set, it returns the rendered HTML for the page to show.
 */
export async function sendTestIssue(id: unknown): Promise<TestResult> {
  const issue = typeof id === 'string' ? await getIssue(id) : undefined;
  if (!issue) return { status: 'error', error: 'This issue no longer exists.' };

  // A test goes to you, so it needs no unsubscribe link. A real send passes `unsubscribeUrl`
  // (each reader's own link, or your provider's merge tag), and the renderer warns without one.
  const { html, text, warnings } = renderEmail(issue.document, RENDER_OPTIONS);

  const resend = resendSetup();
  if (!resend.ready) return { status: 'rendered', html, warnings, missing: resend.missing };
  try {
    await sendWithResend(resend, { subject: `[Test] ${issue.document.subject}`, html, text });
    return { status: 'sent', to: resend.to.join(', ') };
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : String(error) };
  }
}
