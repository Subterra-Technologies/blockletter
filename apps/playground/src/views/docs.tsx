import type { RenderedEmail } from '@subterra-technologies/blockletter';
import { SampleControls } from '../components/sample-controls';
import { SectionNav } from '../components/section-nav';
import { DOC_SECTIONS } from '../route';
import { Accessibility } from '../sections/accessibility';
import { Blocks } from '../sections/blocks';
import { Brand } from '../sections/brand';
import { DataSources } from '../sections/data-sources';
import { Embed } from '../sections/embed';
import { Rendering } from '../sections/rendering';
import type { Playground } from '../use-playground';

/**
 * The second view: live docs. Each section pairs what a developer needs to know with a panel
 * working on the issue open in the editor. Unlike the editor, the docs scroll the page.
 */
export function DocsScreen({
  hidden,
  playground,
  email,
  onEditBrand,
}: {
  hidden: boolean;
  playground: Playground;
  email: RenderedEmail | undefined;
  onEditBrand: () => void;
}) {
  return (
    <main id="docs" className="pg-view pg-view--docs" hidden={hidden}>
      {/* Mounted only while shown, so it measures its links and watches the sections afresh. */}
      {hidden ? null : <SectionNav sections={DOC_SECTIONS} />}

      <header className="pg-shell pg-docs-intro">
        <h1>Email newsletters that assemble themselves from your app&apos;s data.</h1>
        <p className="pg-lede">
          A typed newsletter document, an email-safe renderer and an accessible React editor. Every
          panel on this page is live: it reads and changes the issue open in the editor, which you
          can switch here.
        </p>
        <SampleControls playground={playground} />
      </header>

      <Embed />
      <Blocks playground={playground} />
      <DataSources playground={playground} />
      <Rendering document={playground.issue?.document} email={email} />
      <Brand brand={playground.brand} onEdit={onEditBrand} />
      <Accessibility />
    </main>
  );
}
