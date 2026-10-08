'use client';

import type { NewsletterDocument } from '@subterra-technologies/blockletter';
import { NewsletterEditor } from '@subterra-technologies/blockletter-react';
import { useState, useTransition } from 'react';
import { saveIssue, sendTestIssue, type TestResult } from '@/app/actions';
import { BRAND, RENDER_OPTIONS } from '@/lib/brand';
import { eventsSource, fetchEvents } from '@/lib/events-source';
import { TestEmailDialog } from './test-email-dialog';

/** One list for the life of the page: the editor asks for stable sources. */
const SOURCES = [eventsSource(fetchEvents)];

type Rendered = Extract<TestResult, { status: 'rendered' }>;

interface Notice {
  tone: 'info' | 'error';
  text: string;
}

/**
 * The editor, controlled: the document being edited lives in this component's state, and Save
 * sends it to a Server Action. A draft the server re-renders this page with (after a save, say)
 * never replaces what is being typed: `initialDocument` is read once.
 */
export function IssueEditor({
  id,
  initialDocument,
}: {
  id: string;
  initialDocument: NewsletterDocument;
}) {
  const [doc, setDoc] = useState(initialDocument);
  const [savedDoc, setSavedDoc] = useState(initialDocument);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [rendered, setRendered] = useState<Rendered | null>(null);
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
    const result = await saveIssue(id, snapshot);
    if (!result.ok) {
      setNotice({ tone: 'error', text: [result.error, ...result.problems].join(' ') });
      return false;
    }
    setSavedDoc(snapshot);
    return true;
  }

  function onSave() {
    if (busy || !dirty) return;
    startSaving(async () => {
      await save();
    });
  }

  /** Saves any changes first: the test is rendered on the server, from what is stored. */
  function onSendTest() {
    if (busy) return;
    startSending(async () => {
      if (dirty && !(await save())) return;
      const result = await sendTestIssue(id);
      if (result.status === 'rendered') {
        setRendered(result);
      } else if (result.status === 'sent') {
        setNotice({ tone: 'info', text: `Test sent to ${result.to}.` });
      } else {
        setNotice({ tone: 'error', text: result.error });
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
        sources={SOURCES}
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
