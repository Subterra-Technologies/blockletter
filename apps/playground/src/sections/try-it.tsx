import { useId, type CSSProperties } from 'react';
import type { RenderOptions } from '@subterra-technologies/blockletter';
import { NewsletterEditor, type InspectorTab } from '@subterra-technologies/blockletter-react';
import { CodeBlock } from '../components/code-block';
import type { DeepLink } from '../deep-link';
import { SAMPLE_ORGANIZATIONS } from '../sample';
import type { Playground } from '../use-playground';
import { EDITOR_SNIPPET } from './snippets';

/** Reads an image the visitor picked, so the demo can show it without any storage behind it. */
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('That file could not be read.'));
    reader.readAsDataURL(file);
  });

const uploadImage = async (file: File) => ({ url: await readAsDataUrl(file) });

/** The editor's sticky palette and inspector sit just under the page's sticky section nav. */
const EDITOR_FRAME_STYLE = { '--bl-sticky-top': 'var(--pg-nav-height)' } as CSSProperties;

export interface EditorView {
  /** Changing it remounts the editor, which is how a docs button opens one of its tabs. */
  key: number;
  tab?: InspectorTab;
}

export function TryIt({
  playground,
  link,
  view,
  renderOptions,
  onNewIssue,
  onDownload,
  onCopy,
  copied,
}: {
  playground: Playground;
  link: DeepLink;
  view: EditorView;
  renderOptions: RenderOptions;
  onNewIssue: () => void;
  onDownload: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const organizationId = useId();
  const issueId = useId();
  const { issue, organization, brand } = playground;
  const tab = view.tab ?? link.tab;
  // A `?block=banner` link selects the first block of that type in the issue it opens on.
  const linkedBlockId = link.block
    ? issue?.document.blocks.find((block) => block.type === link.block)?.id
    : undefined;

  return (
    <section id="try-it" className="pg-section pg-section--try" aria-labelledby="try-it-heading">
      <div className="pg-shell pg-intro">
        <h1 id="try-it-heading">
          Email newsletters that assemble themselves from your app&apos;s data.
        </h1>
        <p className="pg-lede">
          A typed newsletter document, an email-safe renderer and this editor, running here on
          sample data. Your edits stay in your browser.
        </p>

        <div className="pg-controls" role="group" aria-label="Sample data">
          <div className="pg-field">
            <label htmlFor={organizationId}>Sample organization</label>
            <select
              id={organizationId}
              value={organization.id}
              disabled={!playground.ready}
              onChange={(event) => void playground.selectOrganization(event.target.value)}
            >
              {SAMPLE_ORGANIZATIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="pg-field pg-field--grow">
            <label htmlFor={issueId}>Issue</label>
            <select
              id={issueId}
              value={issue?.id ?? ''}
              disabled={!playground.ready}
              onChange={(event) => playground.selectIssue(event.target.value)}
            >
              {playground.issues.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.document.subject || 'Untitled issue'}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="pg-button pg-button--primary"
            disabled={!playground.ready}
            onClick={onNewIssue}
          >
            New issue
          </button>
        </div>
      </div>

      <div className="pg-shell pg-editor" style={EDITOR_FRAME_STYLE}>
        {issue ? (
          <NewsletterEditor
            key={`${issue.id}:${view.key}`}
            value={issue.document}
            onChange={playground.updateDocument}
            brand={brand}
            onBrandChange={playground.updateBrand}
            sources={organization.sources}
            uploadImage={uploadImage}
            renderOptions={renderOptions}
            onSaveAsTemplate={playground.saveTemplate}
            {...(link.theme ? { theme: link.theme } : {})}
            {...(link.view ? { defaultMode: link.view } : {})}
            {...(tab ? { defaultTab: tab } : {})}
            {...(linkedBlockId ? { defaultSelectedId: linkedBlockId } : {})}
            toolbar={
              <>
                <button type="button" className="pg-button pg-button--tool" onClick={onDownload}>
                  Download .html
                </button>
                <button type="button" className="pg-button pg-button--tool" onClick={onCopy}>
                  {copied ? 'Copied' : 'Copy HTML'}
                </button>
              </>
            }
          />
        ) : (
          <p role="status" className="pg-loading">
            Assembling the first issue…
          </p>
        )}
      </div>

      <div className="pg-shell pg-split pg-embed">
        <div className="pg-prose">
          <h2 id="embed-heading">Embed it</h2>
          <p>
            <code>NewsletterEditor</code> is a controlled component: you hold the document, and it
            hands back every change. Where documents and images are stored, who approves an issue
            and how it is sent all stay in your app. The stylesheet is compiled and scoped, so your
            app needs no CSS framework or setup of its own.
          </p>
          <p>
            Every part is exported on its own too: the canvas, palette, inspector, preview, brand
            kit, template picker and dialogs.
          </p>
        </div>
        <CodeBlock title="Your editor page" code={EDITOR_SNIPPET} />
      </div>
    </section>
  );
}
