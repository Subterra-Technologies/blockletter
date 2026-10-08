'use client';

import { useId, useLayoutEffect, useRef } from 'react';

const LIST = new Intl.ListFormat('en', { type: 'conjunction' });

interface TestEmailDialogProps {
  result: { html: string; warnings: string[]; missing: string[] };
  onClose: () => void;
}

/**
 * The test email the server rendered, shown because there is nowhere to send it yet. A native
 * modal `<dialog>`: it takes focus, keeps it inside, closes with Escape, and gives focus back to
 * the button that opened it.
 */
export function TestEmailDialog({ result, onClose }: TestEmailDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Open as a modal while mounted. Closing goes through `onClose`, which unmounts it.
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="test-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="test-dialog__header">
        <h2 id={titleId}>Test email</h2>
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="test-dialog__notes">
        <p>
          Nothing was sent: set {LIST.format(result.missing)} in <code>.env.local</code> to send
          tests through Resend. This is the email as the server rendered it.
        </p>
        {result.warnings.length > 0 ? (
          <>
            <p>Before sending it for real:</p>
            <ul>
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      {/* Sandboxed: the email is shown, never run. */}
      <iframe title="The rendered test email" sandbox="" srcDoc={result.html} />
    </dialog>
  );
}
