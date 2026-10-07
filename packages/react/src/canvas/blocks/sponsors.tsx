import { labelOn, type SponsorsBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, CanvasNote, bodyStyle, headingStyle } from './shared';

const firstCharacter = (value: string): string => Array.from(value.trim())[0] ?? '';

/** "Oak & Iron Works" → "OI": up to two initials, skipping the small words, as the email does. */
const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter((word) => word && !['and', '&', 'of', 'the'].includes(word.toLowerCase()))
    .slice(0, 2)
    .map((word) => firstCharacter(word).toUpperCase())
    .join('');

/** What a logo-less sponsor's tile shows: initials, else the first letter, else a dot. */
const tileText = (name: string): string =>
  initialsOf(name) || firstCharacter(name).toUpperCase() || '•';

/** A logo (or an initials tile, alternating accent and ink) beside each sponsor's thank-you. */
export function SponsorsCanvas(canvas: BlockCanvasProps<SponsorsBlock>) {
  const { block, palette, fonts, px, image } = canvas;
  const heading = block.heading.trim();
  return (
    <CanvasSection canvas={canvas} background={palette.card}>
      {heading ? <p style={headingStyle(canvas)}>{block.heading}</p> : null}
      {block.items.length === 0 ? (
        <CanvasNote canvas={canvas} background={blockBackground(block, palette.card)}>
          No sponsors yet. The block stays out of the email until it has one.
        </CanvasNote>
      ) : (
        block.items.map((item, index) => {
          const logo = image(item.logo);
          const tile = index % 2 === 0 ? palette.accent : palette.band;
          return (
            <div key={index} className="bl:flex bl:items-center" style={{ padding: '10px 0' }}>
              <div style={{ width: '96px', flex: '0 0 96px', marginRight: '20px' }}>
                {logo ? (
                  <img
                    src={logo}
                    alt={item.name}
                    style={{
                      display: 'block',
                      width: '96px',
                      maxHeight: '96px',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '96px',
                      height: '96px',
                      backgroundColor: tile,
                      borderRadius: '8px',
                      fontFamily: fonts.heading,
                      fontSize: '37px',
                      color: labelOn(tile),
                    }}
                  >
                    {tileText(item.name)}
                  </div>
                )}
              </div>
              <div className="bl:min-w-0 bl:flex-1">
                <p
                  style={{
                    margin: '0 0 4px 0',
                    fontFamily: fonts.heading,
                    fontSize: px(18),
                    color: palette.heading,
                  }}
                >
                  {item.name}
                </p>
                <p style={{ ...bodyStyle(canvas), margin: 0 }}>{item.message}</p>
              </div>
            </div>
          );
        })
      )}
    </CanvasSection>
  );
}
