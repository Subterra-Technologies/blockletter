import {
  inlineRichTextStyles,
  sanitizeHtml,
  type TextBlock,
} from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, CanvasNote, EmailParagraphs, headingStyle } from './shared';

/**
 * A heading and paragraphs. A body declared `html` is drawn as its formatting, through the same
 * sanitiser and style inliner the email uses, so the canvas cannot show what an inbox would not
 * and nothing a document carries can run here. It is `inert`: its links are not stops on the way
 * through the canvas, and a click on one chooses the block rather than following it.
 */
export function TextCanvas(canvas: BlockCanvasProps<TextBlock>) {
  const { block, palette, fonts, px } = canvas;
  const heading = block.heading?.trim() ?? '';
  return (
    <CanvasSection canvas={canvas} background={palette.card} padding="20px 32px">
      {!block.body.trim() && !heading ? (
        <CanvasNote canvas={canvas} background={blockBackground(block, palette.card)}>
          Empty text block. It stays out of the email until it has text.
        </CanvasNote>
      ) : (
        <>
          {heading ? (
            <p style={headingStyle(canvas, palette.heading, 20)}>{block.heading}</p>
          ) : null}
          {block.format === 'html' ? (
            <div
              inert
              // The editor's reset takes list markers off; the email's lists keep theirs.
              className="bl:[&_ol]:list-decimal bl:[&_ul]:list-disc"
              style={{
                fontFamily: fonts.body,
                fontSize: px(15),
                lineHeight: 1.55,
                color: palette.text,
              }}
              dangerouslySetInnerHTML={{
                __html: inlineRichTextStyles(sanitizeHtml(block.body), palette),
              }}
            />
          ) : (
            <EmailParagraphs canvas={canvas} body={block.body} />
          )}
        </>
      )}
    </CanvasSection>
  );
}
