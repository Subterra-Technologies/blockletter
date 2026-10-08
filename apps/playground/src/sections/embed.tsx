import { CodeBlock } from '../components/code-block';
import { EDITOR_SNIPPET } from './snippets';

export function Embed() {
  return (
    <section id="embed" className="pg-section" aria-labelledby="embed-heading">
      <div className="pg-shell pg-split">
        <div className="pg-prose">
          <h2 id="embed-heading">Embed it</h2>
          <p>
            <code>NewsletterEditor</code> is a controlled component: you hold the document, and it
            hands back every change. Where documents and images are stored, who approves an issue
            and how it is sent all stay in your app. The stylesheet is compiled and scoped, so your
            app needs no CSS framework or setup of its own.
          </p>
          <p>
            With <code>fill</code> it takes its container&rsquo;s height and each pane scrolls on
            its own, as in this demo; on a narrow screen it shows one pane at a time. Without it,
            the editor grows with the issue and scrolls with your page.
          </p>
          <p>
            Every part is exported on its own too: the canvas, palette, inspector, preview, brand
            kit, template picker and dialogs. Blockletter is pre-release, and its packages are not
            on npm yet.
          </p>
        </div>
        <CodeBlock title="Your editor page" code={EDITOR_SNIPPET} />
      </div>
    </section>
  );
}
