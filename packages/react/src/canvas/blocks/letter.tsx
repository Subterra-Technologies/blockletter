import type { LetterBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, CanvasNote, EmailParagraphs, bodyStyle, headingStyle } from './shared';

/** A personal note: heading, a round portrait beside the paragraphs, and an italic signature. */
export function LetterCanvas(canvas: BlockCanvasProps<LetterBlock>) {
  const { block, palette, image } = canvas;
  const heading = block.heading.trim();
  const signature = block.signature.trim();
  const photo = image(block.photo);
  return (
    <CanvasSection canvas={canvas} background={palette.card}>
      {heading ? <p style={headingStyle(canvas)}>{block.heading}</p> : null}
      {block.body.trim() ? (
        <div className="bl:flex bl:items-start">
          {photo ? (
            <img
              src={photo}
              alt={signature}
              style={{
                width: '88px',
                height: '88px',
                marginRight: '20px',
                borderRadius: '44px',
                objectFit: 'cover',
                flex: '0 0 auto',
              }}
            />
          ) : null}
          <div className="bl:min-w-0 bl:flex-1">
            <EmailParagraphs canvas={canvas} body={block.body} />
            {signature ? (
              <p style={{ ...bodyStyle(canvas), fontStyle: 'italic' }}>{block.signature}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <CanvasNote canvas={canvas} background={blockBackground(block, palette.card)}>
          No letter written yet. It stays out of the email until it has text.
        </CanvasNote>
      )}
    </CanvasSection>
  );
}
