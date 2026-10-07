import type { RenderOptions } from '@subterra-technologies/blockletter';
import { NewsletterEditor, type InspectorTab } from '@subterra-technologies/blockletter-react';
import { EmailTools, type EmailToolsProps } from '../components/email-tools';
import { COMPACT_QUERY, SampleBar } from '../components/sample-controls';
import type { DeepLink } from '../deep-link';
import { useMediaQuery } from '../use-media-query';
import type { Playground } from '../use-playground';

/** Reads an image the visitor picked, so the demo can show it without any storage behind it. */
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('That file could not be read.'));
    reader.readAsDataURL(file);
  });

const uploadImage = async (file: File) => ({ url: await readAsDataUrl(file) });

export interface EditorView {
  /** Changing it remounts the editor, which is how a docs button opens one of its tabs. */
  key: number;
  tab?: InspectorTab;
}

/**
 * The demo's first view: the sample bar, then the editor filling the rest of the screen, each of
 * its panes scrolling on its own. The page itself never scrolls here.
 */
export function EditorScreen({
  hidden,
  playground,
  link,
  view,
  renderOptions,
  onNewIssue,
  tools,
}: {
  hidden: boolean;
  playground: Playground;
  link: DeepLink;
  view: EditorView;
  renderOptions: RenderOptions;
  onNewIssue: () => void;
  /** Download and copy the open issue's email: in the editor's bar, or beside the sample button. */
  tools: EmailToolsProps;
}) {
  const compact = useMediaQuery(COMPACT_QUERY);
  const { issue, organization, brand } = playground;
  const tab = view.tab ?? link.tab;
  // A `?block=banner` link selects the first block of that type in the issue it opens on.
  const linkedBlockId = link.block
    ? issue?.document.blocks.find((block) => block.type === link.block)?.id
    : undefined;

  // On a small screen the email tools sit beside the sample button instead (see `SampleBar`), so
  // the editor's bar keeps to one row above the email.
  return (
    <main id="editor" className="pg-view pg-view--editor" hidden={hidden}>
      <h1 className="pg-visually-hidden">Blockletter live demo</h1>
      <SampleBar playground={playground} compact={compact} onNewIssue={onNewIssue} tools={tools} />

      <div id="workspace" className="pg-workspace">
        {issue ? (
          <NewsletterEditor
            key={`${issue.id}:${view.key}`}
            fill
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
            {...(compact ? {} : { toolbar: <EmailTools {...tools} /> })}
          />
        ) : (
          <p role="status" className="pg-loading">
            Assembling the first issue…
          </p>
        )}
      </div>
    </main>
  );
}
