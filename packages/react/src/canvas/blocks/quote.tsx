import type { QuoteBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, CanvasNote, smallStyle } from './shared';

/** One pull quote in large italic type beside an accent rule, with its attribution. */
export function QuoteCanvas(canvas: BlockCanvasProps<QuoteBlock>) {
  const { block, palette, fonts, px } = canvas;
  const quote = block.quote.trim();
  const attribution = block.attribution?.trim() ?? '';
  return (
    <CanvasSection canvas={canvas} background={palette.soft}>
      {quote ? (
        <div className="bl:flex">
          <div
            aria-hidden="true"
            style={{ width: '4px', flex: '0 0 4px', backgroundColor: palette.accent }}
          />
          <div className="bl:min-w-0 bl:flex-1" style={{ paddingLeft: '18px' }}>
            <p
              style={{
                margin: 0,
                fontFamily: fonts.heading,
                fontSize: px(21),
                lineHeight: 1.45,
                fontStyle: 'italic',
                color: palette.heading,
              }}
            >
              &ldquo;{quote}&rdquo;
            </p>
            {attribution ? (
              <p style={{ ...smallStyle(canvas), marginTop: '10px' }}>&mdash; {attribution}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <CanvasNote canvas={canvas} background={blockBackground(block, palette.soft)}>
          Add the quote. The block stays out of the email until it has one.
        </CanvasNote>
      )}
    </CanvasSection>
  );
}
