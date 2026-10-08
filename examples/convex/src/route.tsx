import { useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';

/**
 * Two screens, chosen by the address: the drafts list at `/`, an issue at `/?issue=<id>`. Enough
 * routing for an example; a real app would bring its router.
 */

const issueInAddress = (): string | null =>
  new URLSearchParams(window.location.search).get('issue');

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
};

/** The issue the address names, or null on the drafts list. */
export function useOpenIssue(): string | null {
  return useSyncExternalStore(subscribe, issueInAddress);
}

const hrefFor = (id: string | null): string =>
  id ? `?${new URLSearchParams({ issue: id })}` : window.location.pathname;

/** Opens an issue, or the drafts list with `null`, as a new history entry. */
export function openIssue(id: string | null): void {
  window.history.pushState(null, '', hrefFor(id));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** A real link (it opens in a new tab, and says where it goes), followed without a reload. */
export function IssueLink({
  id,
  className,
  children,
}: {
  id: string | null;
  className?: string;
  children: ReactNode;
}) {
  function follow(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    openIssue(id);
  }
  return (
    <a href={hrefFor(id)} className={className} onClick={follow}>
      {children}
    </a>
  );
}
