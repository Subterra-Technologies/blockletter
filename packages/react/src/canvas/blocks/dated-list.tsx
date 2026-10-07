import { sortDatedItems, type DatedListBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, CanvasNote, headingStyle } from './shared';

/** "Sept. 5 · Farmers market" lines in calendar order (`sortDatedItems`), on the soft background. */
export function DatedListCanvas(canvas: BlockCanvasProps<DatedListBlock>) {
  const { block, palette, fonts, px } = canvas;
  const background = blockBackground(block, palette.soft);
  const heading = block.heading.trim();
  const entries = sortDatedItems(block.items)
    .map((item) => ({ date: item.date.trim(), text: item.text.trim() }))
    .filter((entry) => entry.date || entry.text);
  return (
    <CanvasSection canvas={canvas} background={palette.soft}>
      {heading ? <p style={headingStyle(canvas)}>{block.heading}</p> : null}
      {block.subheading.trim() ? (
        <p
          style={{
            margin: '-6px 0 12px 0',
            fontFamily: fonts.heading,
            fontSize: px(16),
            fontStyle: 'italic',
            color: palette.muted,
          }}
        >
          {block.subheading}
        </p>
      ) : null}
      {entries.length === 0 ? (
        <CanvasNote canvas={canvas} background={background}>
          No dates listed yet. The block stays out of the email until it has one.
        </CanvasNote>
      ) : (
        entries.map((entry, index) => (
          <p
            key={index}
            style={{
              margin: 0,
              padding: '5px 0',
              fontFamily: fonts.body,
              fontSize: px(15),
              lineHeight: 1.5,
              color: palette.text,
            }}
          >
            {entry.date ? (
              <>
                <strong>{entry.date}</strong> ·{' '}
              </>
            ) : null}
            {entry.text}
          </p>
        ))
      )}
    </CanvasSection>
  );
}
