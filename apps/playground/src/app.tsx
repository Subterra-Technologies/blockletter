import { useEffect, useMemo, useRef, useState } from 'react';
import {
  periodLabel,
  renderEmail,
  type NewsletterDocument,
  type RenderOptions,
} from '@subterra-technologies/blockletter';
import { BlockletterRoot, NewIssueDialog } from '@subterra-technologies/blockletter-react';
import { SectionNav, type NavSection } from './components/section-nav';
import type { DeepLink } from './deep-link';
import { SUBTERRA_SITE_URL } from './sample/subterra';
import { Accessibility } from './sections/accessibility';
import { Blocks } from './sections/blocks';
import { Brand } from './sections/brand';
import { DataSources } from './sections/data-sources';
import { Rendering } from './sections/rendering';
import { TryIt, type EditorView } from './sections/try-it';
import { usePlayground } from './use-playground';

const SECTIONS: readonly NavSection[] = [
  { id: 'try-it', label: 'Try it' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'data-sources', label: 'Data sources' },
  { id: 'rendering', label: 'Rendering' },
  { id: 'brand-kit', label: 'Brand kit' },
  { id: 'accessibility', label: 'Accessibility' },
];

/** A file name for the downloaded email: its subject, made safe for a file system. */
const fileNameFor = (document: NewsletterDocument): string =>
  `${(document.subject || 'newsletter')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.html`;

export function App({ link }: { link: DeepLink }) {
  const playground = usePlayground(link.org);
  const [newIssueOpen, setNewIssueOpen] = useState(link.newIssue);
  const [view, setView] = useState<EditorView>({ key: 0 });
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

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

  const copy = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email.html);
    setCopied(true);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2500);
  };

  // The docs' "edit the brand kit" opens that tab in the editor and brings the editor into view.
  const editBrand = () => {
    setView((current) => ({ key: current.key + 1, tab: 'brand' }));
    document.getElementById('try-it')?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="pg-page">
      <a className="pg-skip" href="#try-it">
        Skip to the editor
      </a>
      <header className="pg-top">
        <div className="pg-shell pg-top__inner">
          <p className="pg-brand">
            <span className="pg-brand__name">Blockletter</span>
            <a className="pg-brand__by" href={SUBTERRA_SITE_URL}>
              by Subterra Technologies
            </a>
          </p>
          <p className="pg-top__note">Pre-release · not on npm yet</p>
        </div>
      </header>
      <SectionNav sections={SECTIONS} />

      <main>
        <TryIt
          playground={playground}
          link={link}
          view={view}
          renderOptions={renderOptions}
          onNewIssue={() => setNewIssueOpen(true)}
          onDownload={download}
          onCopy={() => void copy()}
          copied={copied}
        />
        <Blocks playground={playground} />
        <DataSources playground={playground} />
        <Rendering document={issue?.document} email={email} />
        <Brand brand={brand} onEdit={editBrand} />
        <Accessibility />
      </main>

      <footer className="pg-footer">
        <div className="pg-shell pg-footer__inner">
          <p>
            Blockletter is built by <a href={SUBTERRA_SITE_URL}>Subterra Technologies</a>. The
            Subterra sample is taken from its public website; the makers&rsquo; guild is made up,
            down to every name and number.
          </p>
          <p>
            Your edits live in this browser only.{' '}
            <button type="button" className="pg-link" onClick={() => void playground.reset()}>
              Reset the demo
            </button>
          </p>
        </div>
      </footer>

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
