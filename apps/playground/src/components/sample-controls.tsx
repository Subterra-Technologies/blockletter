import { useEffect, useId, useRef } from 'react';
import { SlidersHorizontalIcon } from 'lucide-react';
import { SAMPLE_ORGANIZATIONS } from '../sample';
import type { Playground } from '../use-playground';
import { CompactEmailTools, type EmailToolsProps } from './email-tools';

/** Narrower than this, the sample bar folds into one button and a sheet. */
export const COMPACT_QUERY = '(max-width: 1023px)';

/**
 * Which sample the demo shows: the organization (its brand kit and data sources) and which of
 * its issues is open. The editor's sample bar, its small-screen sheet and the docs each carry a
 * copy, and every copy drives the one issue.
 */
export function SampleControls({
  playground,
  onNewIssue,
  layout = 'stacked',
  labelled = true,
}: {
  playground: Playground;
  /** Offers New issue beside the pickers. */
  onNewIssue?: () => void;
  /** Labels beside their pickers in a bar, or above them in a column. */
  layout?: 'inline' | 'stacked';
  /** Names the group, unless what holds it is already named for it. */
  labelled?: boolean;
}) {
  const organizationId = useId();
  const issueId = useId();
  const { organization, issue } = playground;

  return (
    <div
      className={`pg-controls pg-controls--${layout}`}
      {...(labelled ? { role: 'group', 'aria-label': 'Sample data' } : {})}
    >
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
      {onNewIssue ? (
        <button
          type="button"
          className="pg-button pg-button--primary"
          disabled={!playground.ready}
          onClick={onNewIssue}
        >
          New issue
        </button>
      ) : null}
    </div>
  );
}

/** The demo keeps no server copy: say so, beside the way to start over. */
function ResetNote({ playground }: { playground: Playground }) {
  return (
    <p className="pg-reset">
      <span className="pg-reset__note">Your edits stay in this browser. </span>
      <button type="button" className="pg-link" onClick={() => void playground.reset()}>
        Reset the demo
      </button>
    </p>
  );
}

/**
 * The bar between the top bar and the editor. Wide, it holds the pickers themselves; on a small
 * screen, one button naming the sample in use raises the same pickers in a sheet, and the email
 * tools the editor's own bar has no room for there sit beside it.
 */
export function SampleBar({
  playground,
  compact,
  onNewIssue,
  tools,
}: {
  playground: Playground;
  compact: boolean;
  onNewIssue: () => void;
  tools: EmailToolsProps;
}) {
  return (
    <div className="pg-samplebar">
      <div className="pg-samplebar__inner">
        {compact ? (
          <>
            <SampleSheet playground={playground} onNewIssue={onNewIssue} />
            <CompactEmailTools {...tools} />
          </>
        ) : (
          <>
            <SampleControls playground={playground} onNewIssue={onNewIssue} layout="inline" />
            <ResetNote playground={playground} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * A bottom sheet on the platform's modal dialog: the page behind it is inert while it is open,
 * Escape and Done close it, as does a tap on the dimmed page around it, and focus goes back to
 * the button that opened it.
 */
function SampleSheet({
  playground,
  onNewIssue,
}: {
  playground: Playground;
  onNewIssue: () => void;
}) {
  const headingId = useId();
  const sheet = useRef<HTMLDialogElement>(null);
  const { organization, issue } = playground;

  // A tap on the backdrop reaches the dialog itself, at a point outside its box.
  useEffect(() => {
    const element = sheet.current;
    if (!element) return;
    const onClick = (event: MouseEvent) => {
      if (event.target !== element) return;
      const box = element.getBoundingClientRect();
      const outside =
        event.clientY < box.top ||
        event.clientY > box.bottom ||
        event.clientX < box.left ||
        event.clientX > box.right;
      if (outside) element.close();
    };
    element.addEventListener('click', onClick);
    return () => element.removeEventListener('click', onClick);
  }, []);

  const close = () => sheet.current?.close();

  return (
    <>
      <button
        type="button"
        className="pg-sample-toggle"
        aria-haspopup="dialog"
        disabled={!playground.ready}
        onClick={() => sheet.current?.showModal()}
      >
        <span className="pg-sample-toggle__label">Sample</span>
        <span className="pg-sample-toggle__value">
          {organization.label}
          {issue ? ` · ${issue.document.subject || 'Untitled issue'}` : ''}
        </span>
        <SlidersHorizontalIcon aria-hidden="true" className="pg-sample-toggle__icon" />
      </button>

      <dialog ref={sheet} aria-labelledby={headingId} className="pg-sheet">
        <div className="pg-sheet__head">
          <h2 id={headingId}>Sample data</h2>
          <button type="button" className="pg-button pg-button--quiet" onClick={close}>
            Done
          </button>
        </div>
        <SampleControls
          playground={playground}
          labelled={false}
          onNewIssue={() => {
            close();
            onNewIssue();
          }}
        />
        <ResetNote playground={playground} />
      </dialog>
    </>
  );
}
