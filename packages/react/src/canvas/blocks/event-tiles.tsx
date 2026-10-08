import {
  LIMITS,
  formatShortDate,
  isIsoDate,
  type EventTilesBlock,
} from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, CanvasNote, headingStyle } from './shared';

/**
 * Up to four events as big day-of-month tiles on the ink band. Each date is already the
 * organisation's own calendar date, so the day and "Sept. 5" are read straight from it.
 */
export function EventTilesCanvas(canvas: BlockCanvasProps<EventTilesBlock>) {
  const words = useEditorMessages().blocks.event_tiles;
  const { block, palette, fonts, px, labels } = canvas;
  const items = block.items.slice(0, LIMITS.eventTiles);
  const heading = block.heading.trim();
  return (
    <CanvasSection canvas={canvas} background={palette.band}>
      {heading ? <p style={headingStyle(canvas, palette.bandText)}>{block.heading}</p> : null}
      {items.length === 0 ? (
        <CanvasNote canvas={canvas} background={blockBackground(block, palette.band)}>
          {words.emptyCanvas}
        </CanvasNote>
      ) : (
        <div className={items.length > 2 ? 'bl:flex bl:@max-[28rem]/sheet:flex-col' : 'bl:flex'}>
          {items.map((item, index) => {
            const day = isIsoDate(item.date) ? String(Number(item.date.slice(8, 10))) : '';
            const moment = [formatShortDate(item.date, labels.months), item.time, item.location]
              .map((part) => part?.trim() ?? '')
              .filter(Boolean)
              .join(' · ');
            return (
              <div
                key={index}
                className="bl:min-w-0 bl:flex-1 bl:text-center"
                style={{ padding: '8px 6px', overflowWrap: 'anywhere' }}
              >
                {day ? (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: fonts.heading,
                      fontSize: px(56),
                      lineHeight: 1,
                      color: palette.tileDay,
                    }}
                  >
                    {day}
                  </p>
                ) : null}
                <p
                  style={{
                    margin: '10px 0 4px 0',
                    fontFamily: fonts.heading,
                    fontSize: px(18),
                    lineHeight: 1.3,
                    color: palette.bandText,
                  }}
                >
                  {item.title}
                </p>
                {moment ? (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: fonts.body,
                      fontSize: px(13),
                      color: palette.bandMuted,
                    }}
                  >
                    {moment}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </CanvasSection>
  );
}
