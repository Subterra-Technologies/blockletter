import { LIMITS, type ColumnsBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import {
  CanvasSection,
  EmailImage,
  CanvasNote,
  EmailLink,
  EmailParagraphs,
  bodyStyle,
} from './shared';

/** Two or three cards side by side (stacked on a narrow canvas), each with an optional picture. */
export function ColumnsCanvas(canvas: BlockCanvasProps<ColumnsBlock>) {
  const words = useEditorMessages().blocks.columns;
  const { block, palette, fonts, px, image } = canvas;
  const columns = block.columns.slice(0, LIMITS.columns[1]);
  return (
    <CanvasSection canvas={canvas} background={palette.card}>
      {columns.length === 0 ? (
        <CanvasNote canvas={canvas} background={blockBackground(block, palette.card)}>
          {words.emptyCanvas}
        </CanvasNote>
      ) : (
        <div className="bl:flex bl:gap-4 bl:@max-[28rem]/sheet:flex-col">
          {columns.map((column, index) => (
            <div key={index} className="bl:min-w-0 bl:flex-1">
              {column.image ? (
                <div style={{ margin: '0 0 10px 0' }}>
                  <EmailImage
                    canvas={canvas}
                    url={image(column.image)}
                    alt={column.alt ?? ''}
                    height={110}
                  />
                </div>
              ) : null}
              {column.heading?.trim() ? (
                <p
                  style={{
                    margin: '0 0 6px 0',
                    fontFamily: fonts.heading,
                    fontSize: px(18),
                    lineHeight: 1.3,
                    color: palette.heading,
                  }}
                >
                  {column.heading}
                </p>
              ) : null}
              <EmailParagraphs
                canvas={canvas}
                body={column.body}
                style={{ ...bodyStyle(canvas), margin: '0 0 8px 0' }}
              />
              <EmailLink canvas={canvas} label={column.linkLabel} url={column.linkUrl} />
            </div>
          ))}
        </div>
      )}
    </CanvasSection>
  );
}
