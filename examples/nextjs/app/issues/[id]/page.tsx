import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getIssue } from '@/lib/issues';
import { IssueEditor } from './issue-editor';

export const metadata: Metadata = { title: 'Edit issue' };

/** The editor filling the screen under the header: see `.editor-page` in globals.css. */
export default function IssuePage({ params }: PageProps<'/issues/[id]'>) {
  return (
    <main id="main" className="editor-page">
      <h1 className="visually-hidden">Edit issue</h1>
      <Suspense
        fallback={
          <p className="editor-loading" role="status">
            Opening the issue…
          </p>
        }
      >
        <Issue params={params} />
      </Suspense>
    </main>
  );
}

async function Issue({ params }: Pick<PageProps<'/issues/[id]'>, 'params'>) {
  const { id } = await params;
  const issue = await getIssue(id);
  if (!issue) notFound();
  // Only what the editor needs crosses to the browser.
  return <IssueEditor id={issue.id} initialDocument={issue.document} />;
}
