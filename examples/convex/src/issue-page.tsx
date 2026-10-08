import type { NewsletterDocument } from '@subterra-technologies/blockletter';
import { NewsletterEditor } from '@subterra-technologies/blockletter-react';
import { useAction, useConvex, useMutation, useQuery } from 'convex/react';
import { useMemo, useState, useTransition } from 'react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { BRAND, RENDER_OPTIONS } from '../convex/brand';
import { eventsSource } from '../convex/eventsSource';
import { errorMessage } from './errors';
import { IssueLink } from './route';
import { TestEmailDialog, type RenderedTest } from './test-email-dialog';

/** The editor filling the screen under the header: see `.editor-page` in styles.css. */
export function IssuePage({ id }: { id: string }) {
  const issue = useQuery(api.issues.get, { id });

  if (issue === null) {
    return (
      <main id="main" className="page">
        <h1 tabIndex={-1}>No such issue</h1>
        <p>
          It may have been deleted, or the link is incomplete.{' '}
          <IssueLink id={null}>Back to the drafts</IssueLink>
        </p>
      </main>
    );
  }
  return (
    <main id="main" className="editor-page">
      <h1 className="visually-hidden" tabIndex={-1}>
        Edit issue
      </h1>
      {issue === undefined ? (
        <p className="editor-loading" role="status">
          Opening the issue…
        </p>
      ) : (
        // `document` is `v.any()` in the schema; `issues:save` lets only valid documents in.
        <IssueEditor id={issue._id} initialDocument={issue.document as NewsletterDocument} />
      )}
    </main>
  );
}

interface Notice {
  tone: 'info' | 'error';
  text: string;
}

/**
 * The editor, controlled: the document being edited lives in this component's state, and Save
 * sends it to the `issues:save` mutation. `useQuery` keeps the stored issue live, but the draft
 * being typed is never replaced by it: `initialDocument` is read once.
 */
function IssueEditor({
  id,
  initialDocument,
}: {
  id: Id<'issues'>;
  initialDocument: NewsletterDocument;
}) {
  const convex = useConvex();
  // One source for the life of the editor: it asks the `events:inWindow` query for the dates.
  const sources = useMemo(
    () => [eventsSource((range) => convex.query(api.events.inWindow, range))],
    [convex],
  );
  const saveIssue = useMutation(api.issues.save);
  const sendTest = useAction(api.email.sendTest);

  const [doc, setDoc] = useState(initialDocument);
  const [savedDoc, setSavedDoc] = useState(initialDocument);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [rendered, setRendered] = useState<RenderedTest | null>(null);
  const [saving, startSaving] = useTransition();
  const [sending, startSending] = useTransition();
  const busy = saving || sending;
  const dirty = doc !== savedDoc;

  const status = saving
    ? 'Saving…'
    : sending
      ? 'Preparing the test…'
      : (notice?.text ?? (dirty ? 'Unsaved changes' : 'All changes saved'));

  function edit(next: NewsletterDocument) {
    setDoc(next);
    setNotice(null);
  }

  /** Saves the document as it is now; true once it is stored. */
  async function save(): Promise<boolean> {
    const snapshot = doc;
    try {
      await saveIssue({ id, document: snapshot });
      setSavedDoc(snapshot);
      return true;
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
      return false;
    }
  }

  function onSave() {
    if (busy || !dirty) return;
    startSaving(async () => {
      await save();
    });
  }

  /** Saves any changes first: the action renders what is stored. */
  function onSendTest() {
    if (busy) return;
    startSending(async () => {
      if (dirty && !(await save())) return;
      try {
        const result = await sendTest({ id });
        if (result.status === 'rendered') setRendered(result);
        else setNotice({ tone: 'info', text: `Test sent to ${result.to}.` });
      } catch (error) {
        setNotice({ tone: 'error', text: errorMessage(error) });
      }
    });
  }

  return (
    <>
      <NewsletterEditor
        fill
        value={doc}
        onChange={edit}
        brand={BRAND}
        sources={sources}
        renderOptions={RENDER_OPTIONS}
        toolbar={
          <>
            <p className="issue-status" role="status" data-tone={notice?.tone}>
              {status}
            </p>
            <button
              type="button"
              className="button"
              aria-disabled={busy || !dirty}
              onClick={onSave}
            >
              Save draft
            </button>
            <button
              type="button"
              className="button button--primary"
              aria-disabled={busy}
              onClick={onSendTest}
            >
              Send a test
            </button>
          </>
        }
      />
      {rendered ? <TestEmailDialog result={rendered} onClose={() => setRendered(null)} /> : null}
    </>
  );
}
