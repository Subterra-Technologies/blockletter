import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  periodLabel,
  renderEmail,
  type NewsletterDocument,
  type RenderOptions,
} from '@subterra-technologies/blockletter';
import { BlockletterRoot, NewIssueDialog } from '@subterra-technologies/blockletter-react';
import { COPY_MESSAGES, type CopyState } from './components/email-tools';
import { TopBar } from './components/top-bar';
import type { DeepLink } from './deep-link';
import { useRoute, type Route, type View } from './route';
import { SUBTERRA_SITE_URL } from './sample/subterra';
import { usePlayground } from './use-playground';
import { DocsScreen } from './views/docs';
import { EditorScreen, type EditorView } from './views/editor';

/** A file name for the downloaded email: its subject, made safe for a file system. */
const fileNameFor = (document: NewsletterDocument): string =>
  `${(document.subject || 'newsletter')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.html`;

/**
 * The editor never scrolls the page and the docs do. Leaving the docs remembers how far down the
 * reader was; coming back returns there, or to the section the address names.
 */
function useDocsScroll(route: Route) {
  const saved = useRef(0);
  const previous = useRef<View | null>(null);

  // A layout effect, so the listener is gone before hiding the docs clamps the page to the top.
  useLayoutEffect(() => {
    if (route.view !== 'docs') return;
    const save = () => {
      saved.current = window.scrollY;
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [route.view]);

  useLayoutEffect(() => {
    const was = previous.current;
    previous.current = route.view;
    if (route.view !== 'docs' || was === 'docs') return;
    const section = route.section ? document.getElementById(route.section) : null;
    if (section) section.scrollIntoView({ block: 'start', behavior: 'instant' });
    else window.scrollTo({ top: saved.current, behavior: 'instant' });
  }, [route]);
}

export function App({ link }: { link: DeepLink }) {
  const route = useRoute();
  const playground = usePlayground(link.org);
  const [newIssueOpen, setNewIssueOpen] = useState(link.newIssue);
  const [view, setView] = useState<EditorView>({ key: 0 });
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const copyTimer = useRef<number | undefined>(undefined);

  useDocsScroll(route);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const { issue, organization, brand } = playground;
  const period = issue?.document.period;
  const renderOptions = useMemo<RenderOptions>(
    () => ({
      ...organization.renderOptions,
      ...(period ? { issueLabel: `${periodLabel(period)} issue` } : {}),
    }),
    [organization, period],
  );

  // One render of the open issue feeds the downloads and the Rendering section alike.
  const email = useMemo(
    () => (issue ? renderEmail(issue.document, { ...renderOptions, brand }) : undefined),
    [issue, renderOptions, brand],
  );

  const download = () => {
    if (!email || !issue) return;
    const url = URL.createObjectURL(new Blob([email.html], { type: 'text/html' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileNameFor(issue.document);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // The clipboard can be refused (an insecure origin, a blocked permission): say so, not nothing.
  const copy = async () => {
    if (!email) return;
    let outcome: CopyState = 'copied';
    try {
      await navigator.clipboard.writeText(email.html);
    } catch {
      outcome = 'failed';
    }
    setCopyState(outcome);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyState('idle'), 2500);
  };

  // The docs' "edit the brand kit" opens the editor on that tab.
  const editBrand = () => {
    setView((current) => ({ key: current.key + 1, tab: 'brand' }));
    window.location.hash = 'editor';
  };

  const inEditor = route.view === 'editor';

  return (
    <div className="pg-page" data-view={route.view}>
      <a className="pg-skip" href={inEditor ? '#workspace' : '#docs'}>
        {inEditor ? 'Skip to the editor' : 'Skip to the docs'}
      </a>
      <TopBar view={route.view} />

      <EditorScreen
        hidden={!inEditor}
        playground={playground}
        link={link}
        view={view}
        renderOptions={renderOptions}
        onNewIssue={() => setNewIssueOpen(true)}
        tools={{ onDownload: download, onCopy: () => void copy(), copyState }}
      />
      <DocsScreen hidden={inEditor} playground={playground} email={email} onEditBrand={editBrand} />

      {inEditor ? null : (
        <footer className="pg-footer">
          <div className="pg-shell pg-footer__inner">
            <p>
              Blockletter is built by <a href={SUBTERRA_SITE_URL}>Subterra Technologies</a>. The
              Subterra sample is taken from its public website; the makers&rsquo; guild is made up,
              down to every name and number.
            </p>
            <p>
              Your edits stay in this browser.{' '}
              <button type="button" className="pg-link" onClick={() => void playground.reset()}>
                Reset the demo
              </button>
            </p>
          </div>
        </footer>
      )}

      <p role="status" className="pg-visually-hidden">
        {COPY_MESSAGES[copyState]}
      </p>

      {/* The dialog lives outside the editor, so it brings its own root for its portal and toasts. */}
      <BlockletterRoot {...(link.theme ? { theme: link.theme } : {})}>
        <NewIssueDialog
          open={newIssueOpen}
          onOpenChange={setNewIssueOpen}
          templates={playground.templates}
          timeZone={playground.timeZone}
          onRenameTemplate={playground.renameTemplate}
          onDeleteTemplate={playground.deleteTemplate}
          onCreate={async (input) => {
            await playground.createIssue(input);
            setNewIssueOpen(false);
          }}
        />
      </BlockletterRoot>
    </div>
  );
}
