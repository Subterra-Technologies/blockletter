import { useEffect, useRef } from 'react';
import type { NewsletterDocument, RenderedEmail } from '@subterra-technologies/blockletter';
import { CodeBlock } from '../components/code-block';
import { CopyButton } from '../components/copy-button';
import { Tabs } from '../components/tabs';
import { RENDER_SNIPPET } from './snippets';

const kilobytes = (text: string): string =>
  `${(new TextEncoder().encode(text).length / 1024).toFixed(1)} KB`;

/** A read-only view of one output, scrollable and copyable. */
function Output({ text, label }: { text: string; label: string }) {
  return (
    <div className="pg-output">
      <div className="pg-output__bar">
        <CopyButton text={text} label={`Copy ${label}`} />
      </div>
      <div className="pg-output__scroll" role="region" aria-label={label} tabIndex={0}>
        <pre className="pg-output__body">{text}</pre>
      </div>
    </div>
  );
}

export function Rendering({
  document: doc,
  email,
}: {
  document: NewsletterDocument | undefined;
  email: RenderedEmail | undefined;
}) {
  const opened = useRef<string[]>([]);
  useEffect(() => () => opened.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // A Blob URL runs in this page's origin, so the copy it opens is told to run no scripts.
  const open = () => {
    if (!email) return;
    const policy =
      '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'; object-src \'none\'">';
    const html = email.html.replace('<head>', `<head>\n${policy}`);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    opened.current.push(url);
    window.open(url, '_blank', 'noopener');
  };

  const warnings = email?.warnings ?? [];

  return (
    <section id="rendering" className="pg-section" aria-labelledby="rendering-heading">
      <div className="pg-shell pg-split">
        <div className="pg-prose">
          <h2 id="rendering-heading">Rendering</h2>
          <p>
            <code>renderEmail()</code> is a pure function with no dependencies. It turns the same
            document into the same email wherever it runs: this page, a Node worker, an edge
            function, a database function. Tables, inline styles, web-safe fonts, a hidden
            preheader, a layout that reflows on phones, and a plain-text version of everything.
          </p>
          <p>
            It also returns <code>warnings</code>: what to fix before sending, such as a missing
            unsubscribe link, an image without alt text, or an email long enough for mail apps to
            clip. Sending stays with you and your provider.
          </p>
          <CodeBlock title="Render and send" code={RENDER_SNIPPET} />
        </div>

        <div className="pg-panel" role="group" aria-labelledby="rendering-live-heading">
          <div className="pg-panel__head">
            <h3 id="rendering-live-heading">The issue in the editor, rendered</h3>
            {email ? (
              <dl className="pg-stats">
                <div>
                  <dt>HTML</dt>
                  <dd>{kilobytes(email.html)}</dd>
                </div>
                <div>
                  <dt>Plain text</dt>
                  <dd>{kilobytes(email.text)}</dd>
                </div>
                <div>
                  <dt>Warnings</dt>
                  <dd>{warnings.length}</dd>
                </div>
              </dl>
            ) : null}
          </div>
          {email && doc ? (
            <>
              <Tabs
                label="Rendered output"
                items={[
                  { id: 'html', label: 'HTML', panel: <Output text={email.html} label="HTML" /> },
                  {
                    id: 'text',
                    label: 'Plain text',
                    panel: <Output text={email.text} label="plain text" />,
                  },
                  {
                    id: 'warnings',
                    label: `Warnings (${warnings.length})`,
                    panel:
                      warnings.length > 0 ? (
                        <ul className="pg-warnings">
                          {warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="pg-muted">Nothing to fix before sending.</p>
                      ),
                  },
                  {
                    id: 'json',
                    label: 'Document',
                    panel: <Output text={JSON.stringify(doc, null, 2)} label="document JSON" />,
                  },
                ]}
              />
              <div className="pg-panel__foot">
                <button type="button" className="pg-button" onClick={open}>
                  Open this email in a new tab
                </button>
              </div>
            </>
          ) : (
            <p className="pg-muted">Assembling the first issue…</p>
          )}
        </div>
      </div>
    </section>
  );
}
