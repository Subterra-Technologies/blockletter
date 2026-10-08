import { readable, type NameListBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, CanvasNote, bodyStyle, headingStyle, smallStyle } from './shared';

/** A numbered list of names, each with an optional second line, on the soft background. */
export function NameListCanvas(canvas: BlockCanvasProps<NameListBlock>) {
  const words = useEditorMessages().blocks.name_list;
  const { block, palette, fonts, px } = canvas;
  const background = blockBackground(block, palette.soft);
  const heading = block.heading.trim();
  return (
    <CanvasSection canvas={canvas} background={palette.soft}>
      {heading ? <p style={headingStyle(canvas)}>{block.heading}</p> : null}
      {block.intro.trim() ? <p style={bodyStyle(canvas)}>{block.intro}</p> : null}
      {block.items.length === 0 ? (
        <CanvasNote canvas={canvas} background={background}>
          {words.emptyCanvas}
        </CanvasNote>
      ) : (
        block.items.map((item, index) => (
          <div key={index} className="bl:flex bl:items-start">
            <p
              style={{
                width: '36px',
                flex: '0 0 36px',
                margin: 0,
                padding: '8px 0',
                fontFamily: fonts.heading,
                fontSize: px(22),
                color: readable(palette.accent, background),
              }}
            >
              {index + 1}.
            </p>
            <div
              className="bl:min-w-0 bl:flex-1"
              style={{ padding: '8px 0', borderBottom: `1px solid ${palette.border}` }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: fonts.body,
                  fontSize: px(16),
                  fontWeight: 'bold',
                  color: palette.text,
                }}
              >
                {item.name}
              </p>
              {item.detail?.trim() ? <p style={smallStyle(canvas)}>{item.detail}</p> : null}
            </div>
          </div>
        ))
      )}
    </CanvasSection>
  );
}
