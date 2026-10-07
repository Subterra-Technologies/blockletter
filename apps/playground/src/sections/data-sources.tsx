import { useEffect, useState } from 'react';
import {
  blockLabel,
  formatShortDate,
  isIsoDate,
  periodLabel,
  type DataSource,
  type IssuePeriod,
} from '@subterra-technologies/blockletter';
import { CodeBlock } from '../components/code-block';
import type { Playground } from '../use-playground';
import { SOURCE_SNIPPET } from './snippets';

type Load =
  | { state: 'loading' }
  | { state: 'ready'; items: { key: string; title: string; detail?: string }[] }
  | { state: 'error'; message: string };

const ITEMS_SHOWN = 5;

/** One line per item, whatever list block the source fills. */
function describe(item: Record<string, unknown>, index: number) {
  const text = (key: string) => (typeof item[key] === 'string' ? (item[key] as string) : '');
  const date = text('date');
  const when = isIsoDate(date) ? formatShortDate(date) : date;
  const title = text('title') || text('name') || text('text') || `Item ${index + 1}`;
  const detail = [when, text('time'), text('location'), text('kicker'), text('detail')]
    .filter(Boolean)
    .join(' · ');
  return { key: text('ref') || String(index), title, ...(detail ? { detail } : {}) };
}

function SourceItems({ source, period }: { source: DataSource; period?: IssuePeriod }) {
  const request = `${source.id}:${period?.start ?? ''}:${period?.end ?? ''}:${period?.lookaheadEnd ?? ''}`;
  const [answer, setAnswer] = useState<{ request: string; load: Load } | null>(null);

  useEffect(() => {
    let current = true;
    Promise.resolve(source.items(period ? { period } : {}))
      .then((items) => {
        if (!current) return;
        setAnswer({
          request,
          load: {
            state: 'ready',
            items: (items as unknown as Record<string, unknown>[]).map(describe),
          },
        });
      })
      .catch((error: unknown) => {
        if (!current) return;
        setAnswer({
          request,
          load: {
            state: 'error',
            message: error instanceof Error ? error.message : 'The source did not answer.',
          },
        });
      });
    return () => {
      current = false;
    };
  }, [source, period, request]);

  // An answer for an earlier issue or source is not this one's: show it as still loading.
  const load: Load = answer?.request === request ? answer.load : { state: 'loading' };

  if (load.state === 'loading') return <p className="pg-muted">Asking the source…</p>;
  if (load.state === 'error') return <p className="pg-error">{load.message}</p>;
  if (load.items.length === 0) {
    return <p className="pg-muted">Nothing for these dates, so a refresh hides the block.</p>;
  }
  return (
    <ol className="pg-items">
      {load.items.slice(0, ITEMS_SHOWN).map((item) => (
        <li key={item.key}>
          <span className="pg-items__title">{item.title}</span>
          {item.detail ? <span className="pg-items__detail">{item.detail}</span> : null}
        </li>
      ))}
      {load.items.length > ITEMS_SHOWN ? (
        <li className="pg-items__more">and {load.items.length - ITEMS_SHOWN} more</li>
      ) : null}
    </ol>
  );
}

export function DataSources({ playground }: { playground: Playground }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const { organization, issue } = playground;
  const period = issue?.document.period;

  const refresh = async () => {
    setBusy(true);
    try {
      const count = await playground.refreshSourcedBlocks();
      setStatus(
        count === 0
          ? 'This issue has no auto-filled blocks to refresh.'
          : `Refreshed ${count} auto-filled ${count === 1 ? 'block' : 'blocks'} from their sources.`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="data-sources" className="pg-section" aria-labelledby="data-sources-heading">
      <div className="pg-shell pg-split">
        <div className="pg-prose">
          <h2 id="data-sources-heading">Data sources</h2>
          <p>
            A list block can name a source: upcoming events, sponsors, new members, recent posts, a
            calendar. Your app implements <code>items()</code> against its own database, and
            Blockletter calls it for the dates the issue covers.
          </p>
          <p>
            What comes back is copied into the block with each record&rsquo;s <code>ref</code>, so
            rendering never looks anything up and a refresh is always explicit. Items written by
            hand stay put, and in the editor a picker chooses which records make the cut.
          </p>
          <CodeBlock title="A data source" code={SOURCE_SNIPPET} />
        </div>

        <div className="pg-panel" role="group" aria-labelledby="sources-live-heading">
          <div className="pg-panel__head">
            <h3 id="sources-live-heading">{organization.label}&rsquo;s sources</h3>
            {period ? <p className="pg-muted">For {periodLabel(period)}</p> : null}
          </div>
          {organization.sources.map((source) => (
            <div key={source.id} className="pg-source">
              <p className="pg-source__name">
                {source.label}
                <span className="pg-source__meta">
                  <code>{source.id}</code> fills {blockLabel(source.blockType).toLowerCase()}
                </span>
              </p>
              <SourceItems source={source} {...(period ? { period } : {})} />
            </div>
          ))}
          <div className="pg-panel__foot">
            <button
              type="button"
              className="pg-button pg-button--primary"
              disabled={!issue || busy}
              aria-disabled={busy || undefined}
              onClick={() => void refresh()}
            >
              {busy ? 'Refreshing…' : 'Refresh the auto-filled blocks'}
            </button>
            <p className="pg-status" role="status">
              {status}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
