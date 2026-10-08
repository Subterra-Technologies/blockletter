import { CheckIcon, CopyIcon, CopyXIcon, DownloadIcon } from 'lucide-react';

/** Where the last copy got to: nowhere yet, onto the clipboard, or refused by the browser. */
export type CopyState = 'idle' | 'copied' | 'failed';

const COPY_LABELS: Readonly<Record<CopyState, string>> = {
  idle: 'Copy HTML',
  copied: 'Copied',
  failed: 'Copy failed',
};

/** What a screen reader hears when a copy finishes, from the page's one status region. */
export const COPY_MESSAGES: Readonly<Record<CopyState, string>> = {
  idle: '',
  copied: 'The email’s HTML is on the clipboard.',
  failed: 'This browser kept the clipboard closed. Download the HTML instead.',
};

export interface EmailToolsProps {
  onDownload: () => void;
  onCopy: () => void;
  copyState: CopyState;
}

/** The demo's own buttons in the editor's top bar: the open issue as an HTML file, or copied. */
export function EmailTools({ onDownload, onCopy, copyState }: EmailToolsProps) {
  return (
    <>
      <button type="button" className="pg-button pg-button--tool" onClick={onDownload}>
        Download .html
      </button>
      <button type="button" className="pg-button pg-button--tool pg-button--copy" onClick={onCopy}>
        {COPY_LABELS[copyState]}
      </button>
    </>
  );
}

/** The same two on a small screen, as icons beside the sample button; their names stay. */
export function CompactEmailTools({ onDownload, onCopy, copyState }: EmailToolsProps) {
  const CopyStateIcon =
    copyState === 'copied' ? CheckIcon : copyState === 'failed' ? CopyXIcon : CopyIcon;
  return (
    <>
      <button type="button" className="pg-icon-button" onClick={onDownload}>
        <DownloadIcon aria-hidden="true" />
        <span className="pg-visually-hidden">Download .html</span>
      </button>
      <button type="button" className="pg-icon-button" onClick={onCopy}>
        <CopyStateIcon aria-hidden="true" />
        <span className="pg-visually-hidden">{COPY_LABELS[copyState]}</span>
      </button>
    </>
  );
}
