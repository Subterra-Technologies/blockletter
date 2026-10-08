import { useEffect, useRef } from 'react';
import { DraftsPage } from './drafts';
import { IssuePage } from './issue-page';
import { IssueLink, useOpenIssue } from './route';

export function App() {
  const issueId = useOpenIssue();
  const shown = useRef(issueId);

  useEffect(() => {
    // Each screen has its own title, so a tab or a screen reader says where it is.
    document.title = `${issueId ? 'Edit issue' : 'Newsletter drafts'} · Fernhill Tool Library`;
    // After a move from one screen to the other, the keyboard and the screen reader start at the
    // new screen's heading rather than wherever the link or button that moved them used to be.
    if (shown.current !== issueId) document.querySelector<HTMLElement>('main h1')?.focus();
    shown.current = issueId;
  }, [issueId]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <IssueLink id={null} className="app-title">
          Fernhill Tool Library <span className="app-title__part">newsletter</span>
        </IssueLink>
      </header>
      {issueId ? <IssuePage key={issueId} id={issueId} /> : <DraftsPage />}
    </>
  );
}
