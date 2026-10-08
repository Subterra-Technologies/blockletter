import { LIMITS, readable, type StatsBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, CanvasNote } from './shared';

/**
 * Two to four big numbers over small labels. A number with nothing typed shows a dash and an
 * unlabelled one "Label", so the slot can still be seen and filled.
 */
export function StatsCanvas(canvas: BlockCanvasProps<StatsBlock>) {
  const words = useEditorMessages().blocks.stats;
  const { block, palette, fonts, px } = canvas;
  const background = blockBackground(block, palette.soft);
  const items = block.items.slice(0, LIMITS.stats[1]);
  return (
    <CanvasSection canvas={canvas} background={palette.soft} padding="24px 32px">
      {items.length === 0 ? (
        <CanvasNote canvas={canvas} background={background}>
          {words.emptyCanvas}
        </CanvasNote>
      ) : (
        <div className={items.length > 2 ? 'bl:flex bl:@max-[28rem]/sheet:flex-col' : 'bl:flex'}>
          {items.map((item, index) => (
            <div
              key={index}
              className="bl:min-w-0 bl:flex-1 bl:text-center"
              style={{ padding: '6px 8px', overflowWrap: 'anywhere' }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: fonts.heading,
                  fontSize: px(38),
                  lineHeight: 1.1,
                  color: readable(palette.accent, background, true),
                }}
              >
                {item.value.trim() || '—'}
              </p>
              <p
                style={{
                  margin: '6px 0 0 0',
                  fontFamily: fonts.body,
                  fontSize: px(12),
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: palette.muted,
                }}
              >
                {item.label.trim() || words.labelPlaceholder}
              </p>
            </div>
          ))}
        </div>
      )}
    </CanvasSection>
  );
}
