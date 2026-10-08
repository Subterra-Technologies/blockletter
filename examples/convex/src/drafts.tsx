import {
  BUILT_IN_TEMPLATES,
  periodLabel,
  suggestPeriod,
  todayIn,
} from '@subterra-technologies/blockletter';
import { useMutation, useQuery } from 'convex/react';
import { useState, type FormEvent } from 'react';
import { api } from '../convex/_generated/api';
import { TIME_ZONE } from '../convex/brand';
import { errorMessage } from './errors';
import { IssueLink, openIssue } from './route';

const SAVED_AT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});

export function DraftsPage() {
  // Live: a draft saved in another tab shows up here without a reload.
  const issues = useQuery(api.issues.list);
  const create = useMutation(api.issues.create);
  const [templateId, setTemplateId] = useState('monthly-newsletter');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      // This month so far, looking six weeks ahead for events. "Today" is a date in the
      // organisation's zone, so the browser works the dates out and the mutation checks them.
      const id = await create({ templateId, period: suggestPeriod(todayIn(TIME_ZONE)) });
      openIssue(id);
    } catch (caught) {
      setError(errorMessage(caught));
      setCreating(false);
    }
  }

  return (
    <main id="main" className="page">
      <h1 tabIndex={-1}>Newsletter drafts</h1>

      <section className="panel" aria-labelledby="start-heading">
        <h2 id="start-heading">Start an issue</h2>
        <form className="start-form" onSubmit={start}>
          <div className="field">
            <label htmlFor="template">Template</label>
            <select
              id="template"
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
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
          {/* Focusable while it works (`aria-disabled`), so the keyboard is not sent elsewhere. */}
          <button type="submit" className="button button--primary" aria-disabled={creating}>
            {creating ? 'Creating the draft…' : 'Create draft'}
          </button>
        </form>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="drafts-heading">
        <h2 id="drafts-heading">Drafts</h2>
        {issues === undefined ? (
          <p>Loading the drafts…</p>
        ) : issues.length === 0 ? (
          <p>No drafts yet. Start one above.</p>
        ) : (
          <ul className="drafts">
            {issues.map(({ _id, subject, period, updatedAt }) => (
              <li key={_id}>
                <IssueLink id={_id}>{subject.trim() || 'Untitled issue'}</IssueLink>
                <p className="hint">
                  {period ? `${periodLabel(period)} · ` : null}
                  Saved{' '}
                  <time dateTime={new Date(updatedAt).toISOString()}>
                    {SAVED_AT.format(updatedAt)}
                  </time>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
