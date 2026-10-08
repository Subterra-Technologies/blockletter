import { BUILT_IN_TEMPLATES, periodLabel } from '@subterra-technologies/blockletter';
import Link from 'next/link';
import { Suspense } from 'react';
import { TIME_ZONE } from '@/lib/brand';
import { listIssues } from '@/lib/issues';
import { createIssue } from './actions';
import { SubmitButton } from './submit-button';

const SAVED_AT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});

export default function DraftsPage() {
  return (
    <main id="main" className="page">
      <h1>Newsletter drafts</h1>

      <section className="panel" aria-labelledby="start-heading">
        <h2 id="start-heading">Start an issue</h2>
        {/* A plain form posting to a Server Action: it works before the page's JavaScript loads. */}
        <form action={createIssue} className="start-form">
          <div className="field">
            <label htmlFor="template">Template</label>
            <select
              id="template"
              name="template"
              defaultValue="monthly-newsletter"
              aria-describedby="template-hint"
            >
              {BUILT_IN_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p id="template-hint" className="hint">
              The issue covers this month so far, and its event tiles fill from the next six weeks
              of events.
            </p>
          </div>
          <SubmitButton pending="Creating the draft…">Create draft</SubmitButton>
        </form>
      </section>

      <section aria-labelledby="drafts-heading">
        <h2 id="drafts-heading">Drafts</h2>
        {/* Read when the page is requested, so the list streams in after the rest of the page. */}
        <Suspense fallback={<p>Loading the drafts…</p>}>
          <DraftList />
        </Suspense>
      </section>
    </main>
  );
}

async function DraftList() {
  const issues = await listIssues();
  if (issues.length === 0) return <p>No drafts yet. Start one above.</p>;
  return (
    <ul className="drafts">
      {issues.map(({ id, document, updatedAt }) => (
        <li key={id}>
          <Link href={`/issues/${id}`}>{document.subject.trim() || 'Untitled issue'}</Link>
          <p className="hint">
            {document.period ? `${periodLabel(document.period)} · ` : null}
            Saved <time dateTime={updatedAt}>{SAVED_AT.format(new Date(updatedAt))}</time>
          </p>
        </li>
      ))}
    </ul>
  );
}
