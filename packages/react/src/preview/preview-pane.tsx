import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLinkIcon, MonitorIcon, SmartphoneIcon, TriangleAlertIcon } from 'lucide-react';
import {
  builtInBlocks,
  getDefinition,
  renderEmail,
  type BlockBase,
  type NewsletterDocument,
  type RenderedEmail,
} from '@subterra-technologies/blockletter';
import { useEditorContext } from '../editor/context';
import { blockName } from '../i18n/blocks';
import { useEditorMessages } from '../i18n/context';
import { warningText } from '../i18n/core-words';
import { cn } from '../lib/cn';
import { errorMessage } from '../lib/errors';
import { Button } from '../ui/button';

export type PreviewWidth = 'desktop' | 'phone';

/** The shortest the frame gets; it grows to fill the pane, and the email scrolls inside it. */
const MIN_FRAME_HEIGHT = 560;
/** The shortest a filling frame gets, before the pane has been measured or on a tiny screen. */
const MIN_FILL_FRAME_HEIGHT = 240;
/** The stage's padding on each axis, which the frame has to fit inside. */
const STAGE_PADDING = 32;
const WIDTHS: Readonly<Record<PreviewWidth, number>> = { desktop: 600, phone: 375 };

/**
 * A copy of `html` that cannot run anything, for a tab of its own. A Blob URL's document shares
 * the editor's origin, unlike the sandboxed frame, so it gets the frame's rule another way.
 */
function inertCopy(html: string): string {
  const policy =
    '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'; object-src \'none\'">';
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (head) => `${head}${policy}`)
    : `${policy}${html}`;
}

export interface PreviewPaneProps {
  document: NewsletterDocument<BlockBase>;
  /** The frame's accessible name. Default: the messages' "Email preview". */
  title?: string;
  /** Phone when the pane is phone-sized, so the first look is readable. */
  defaultWidth?: PreviewWidth;
  /**
   * Fits the frame to the height the pane is given (the editor's fill layout), rather than a
   * frame at least 560px tall that the page scrolls past. Either way the email scrolls inside it.
   */
  fill?: boolean;
}

/**
 * The email exactly as recipients get it: rendered here in the browser with the core renderer
 * and the editor's brand, block definitions and render options, so it needs no round trip and
 * matches what the host sends. It shows in an iframe with `sandbox=""` (no scripts, an opaque
 * origin) and `referrerPolicy="no-referrer"`; those attributes are a security boundary and stay
 * exactly so. The renderer escapes every string a person typed; the sandbox isolates whatever a
 * host's own block might emit.
 *
 * Under the toolbar, the renderer's warnings: things a sender should fix (no unsubscribe link,
 * an image without alt text, a message long enough for Gmail to clip). They never stop the
 * preview.
 */
export function PreviewPane({
  document: doc,
  title,
  defaultWidth = 'desktop',
  fill = false,
}: PreviewPaneProps) {
  const { brand, definitions, renderOptions } = useEditorContext();
  const m = useEditorMessages();
  const words = m.preview;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [width, setWidth] = useState<PreviewWidth>(defaultWidth);

  const rendered = useMemo((): RenderedEmail | { error: string } => {
    try {
      return renderEmail(doc, {
        ...renderOptions,
        brand,
        // Outside an editor there are no definitions in context: the built-ins render.
        ...(definitions.length ? { definitions } : {}),
      });
    } catch (cause: unknown) {
      return { error: errorMessage(cause, '') };
    }
  }, [doc, renderOptions, brand, definitions]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      setStage({ width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const html = 'html' in rendered ? rendered.html : '';
  // The renderer's warnings in the editor's words, a block named as the editor names it: by the
  // same definitions the email was rendered with.
  const rendering = definitions.length ? definitions : builtInBlocks;
  const warnings =
    'warningDetails' in rendered
      ? rendered.warningDetails.map((warning) =>
          warningText(warning, m, (type) =>
            getDefinition(type, rendering) ? blockName(type, rendering, m) : undefined,
          ),
        )
      : [];
  const frameWidth = WIDTHS[width];
  // Scales the email down when the pane is narrower than the chosen width.
  const available = stage.width - STAGE_PADDING;
  const scale = available > 0 && available < frameWidth ? Math.max(0.4, available / frameWidth) : 1;
  // The observed size is the stage's content box, inside its padding: filling, the frame takes
  // all of it.
  const frameHeight = fill
    ? Math.max(MIN_FILL_FRAME_HEIGHT, Math.floor(stage.height / scale))
    : Math.max(MIN_FRAME_HEIGHT, Math.round((stage.height - STAGE_PADDING) / scale));

  function openInTab(): void {
    if (!html || typeof URL.createObjectURL !== 'function') return;
    const url = URL.createObjectURL(new Blob([inertCopy(html)], { type: 'text/html' }));
    // With `noopener` the browser returns no handle, so there is no telling when the tab has
    // read the address: it is revoked once the tab has long since loaded it.
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // In a narrow editor the pixel width is spoken but not shown, so the switch fits a 320px screen.
  const widthOption = (
    value: PreviewWidth,
    label: string,
    pixels: string,
    Icon: typeof MonitorIcon,
  ) => (
    <button
      type="button"
      // The full name for every width, though narrow editors show only its first word.
      aria-label={words.widthLabel(label, pixels)}
      aria-pressed={width === value}
      onClick={() => setWidth(value)}
      className={cn(
        'bl:inline-flex bl:h-full bl:items-center bl:gap-1.5 bl:rounded-md bl:px-2.5 bl:text-[0.8125rem] bl:font-medium bl:whitespace-nowrap bl:text-foreground/65 bl:outline-none bl:transition-colors',
        'bl:hover:text-foreground bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50',
        'bl:aria-pressed:bg-background bl:aria-pressed:text-foreground bl:aria-pressed:shadow-sm',
      )}
    >
      <Icon aria-hidden="true" className="bl:size-4" />
      {label}
      <span aria-hidden="true" className="bl:@max-sm/editor:hidden">{` · ${pixels}`}</span>
    </button>
  );

  return (
    <div className="bl:flex bl:min-h-0 bl:min-w-0 bl:flex-1 bl:flex-col">
      <div className="bl:flex bl:flex-wrap bl:items-center bl:justify-between bl:gap-x-4 bl:gap-y-2 bl:border-b bl:bg-background bl:px-4 bl:py-2.5">
        <div className="bl:flex bl:min-w-0 bl:flex-col">
          <p className="bl:truncate bl:text-[0.8125rem]">
            <span className="bl:text-muted-foreground">{`${words.subject} `}</span>
            <span className="bl:font-medium">{doc.subject || words.noSubject}</span>
          </p>
          {doc.preheader ? (
            <p className="bl:truncate bl:text-xs bl:text-muted-foreground">{doc.preheader}</p>
          ) : null}
        </div>
        <div
          role="toolbar"
          aria-label={words.options}
          className="bl:flex bl:flex-wrap bl:items-center bl:gap-2"
        >
          <div
            role="group"
            aria-label={words.width}
            className="bl:inline-flex bl:h-8 bl:items-center bl:rounded-lg bl:bg-muted bl:p-[3px]"
          >
            {widthOption('desktop', words.desktop, m.common.pixels(WIDTHS.desktop), MonitorIcon)}
            {widthOption('phone', words.phone, m.common.pixels(WIDTHS.phone), SmartphoneIcon)}
          </div>
          <Button type="button" variant="ghost" size="sm" disabled={!html} onClick={openInTab}>
            <ExternalLinkIcon aria-hidden="true" />
            {words.openInTab}
          </Button>
        </div>
      </div>
      {warnings.length ? (
        <details className="bl:group bl:border-b bl:bg-warning-soft bl:px-4 bl:py-2 bl:text-[0.8125rem] bl:text-warning">
          <summary className="bl:flex bl:cursor-pointer bl:items-center bl:gap-2 bl:font-medium bl:marker:content-none bl:[&::-webkit-details-marker]:hidden">
            <TriangleAlertIcon aria-hidden="true" className="bl:size-4 bl:shrink-0" />
            {words.toCheck(warnings.length)}
            {/* Said by the disclosure itself ("collapsed"); drawn for those who see it. */}
            <span aria-hidden="true" className="bl:font-normal bl:underline bl:underline-offset-2">
              <span className="bl:group-open:hidden">{words.show}</span>
              <span className="bl:hidden bl:group-open:inline">{words.hide}</span>
            </span>
          </summary>
          <ul className="bl:mt-2 bl:flex bl:list-disc bl:flex-col bl:gap-1 bl:pb-1 bl:pl-10">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <div
        ref={stageRef}
        className={cn(
          'bl:flex bl:flex-1 bl:items-start bl:justify-center bl:overflow-hidden bl:bg-muted bl:p-4',
          fill ? 'bl:min-h-64' : 'bl:min-h-[24rem]',
        )}
      >
        {'error' in rendered ? (
          <p role="alert" className="bl:self-center bl:text-sm bl:text-danger">
            {rendered.error || words.failed}
          </p>
        ) : (
          <div
            className="bl:shrink-0 bl:overflow-hidden bl:rounded-md bl:border bl:bg-background"
            style={{ width: frameWidth * scale, height: frameHeight * scale }}
          >
            <iframe
              title={title ?? words.frameTitle}
              sandbox=""
              referrerPolicy="no-referrer"
              srcDoc={html}
              className="bl:block bl:origin-top-left bl:border-0"
              style={{
                width: frameWidth,
                height: frameHeight,
                transform: `scale(${scale})`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
