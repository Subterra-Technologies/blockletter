import type { CalloutBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, EmailButton, CanvasNote, EmailParagraphs, headingStyle } from './shared';

/** A short heading, a sentence or two, and a button once the button has a link. */
export function CalloutCanvas(canvas: BlockCanvasProps<CalloutBlock>) {
  const words = useEditorMessages().blocks.callout;
  const { block, palette } = canvas;
  const background = blockBackground(block, palette.card);
  const heading = block.heading.trim();
  const label = block.ctaLabel.trim();
  const hasLink = Boolean(block.ctaUrl.trim());
  const empty = !heading && !block.body.trim() && !(label && hasLink);
  return (
    <CanvasSection canvas={canvas} background={palette.card} padding="20px 32px">
      {empty ? (
        <CanvasNote canvas={canvas} background={background}>
          {words.emptyCanvas}
        </CanvasNote>
      ) : (
        <>
          {heading ? (
            <p style={headingStyle(canvas, palette.heading, 20)}>{block.heading}</p>
          ) : null}
          <EmailParagraphs canvas={canvas} body={block.body} />
          {label && hasLink ? (
            <EmailButton canvas={canvas} label={label} background={background} />
          ) : null}
          {label && !hasLink ? (
            <CanvasNote canvas={canvas} background={background}>
              {words.needsLink}
            </CanvasNote>
          ) : null}
        </>
      )}
    </CanvasSection>
  );
}
