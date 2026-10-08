import type { HeaderBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, CanvasNote, labelStyle } from './shared';

/** The masthead: the brand kit's logo, else the logo text or the organisation's name, over the strapline. */
export function HeaderCanvas(canvas: BlockCanvasProps<HeaderBlock>) {
  const words = useEditorMessages().blocks.header;
  const { block, brand, palette, fonts, px, image } = canvas;
  const strapline = [block.title, block.issueLabel].map((part) => part.trim()).filter(Boolean);
  const name = block.logoText.trim() || brand.name.trim();
  const logo = image(brand.logo);
  const background = blockBackground(block, palette.card);
  return (
    <CanvasSection canvas={canvas} background={palette.card} padding="32px 32px 20px 32px">
      {logo ? (
        <img
          src={logo}
          alt={name}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: '240px',
            height: 'auto',
            margin: '0 0 10px 0',
          }}
        />
      ) : name ? (
        <p
          style={{
            margin: '0 0 6px 0',
            fontFamily: fonts.heading,
            fontSize: px(26),
            lineHeight: 1.2,
            color: palette.heading,
          }}
        >
          {name}
        </p>
      ) : null}
      {strapline.length > 0 ? (
        <p style={labelStyle(canvas, background)}>{strapline.join(' · ')}</p>
      ) : null}
      {!logo && !name && strapline.length === 0 ? (
        <CanvasNote canvas={canvas} background={background}>
          {words.emptyCanvas}
        </CanvasNote>
      ) : null}
    </CanvasSection>
  );
}
