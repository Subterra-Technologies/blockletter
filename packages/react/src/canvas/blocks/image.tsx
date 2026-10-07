import { readable, type ImageBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { CanvasSection, EmailImage, smallStyle } from './shared';

/** A full-width picture, or the email's dashed placeholder carrying the alt text, and a caption. */
export function ImageCanvas(canvas: BlockCanvasProps<ImageBlock>) {
  const { block, palette, fonts, px, image, labels } = canvas;
  const src = image(block.image);
  const caption = block.caption?.trim() ?? '';
  return (
    <CanvasSection canvas={canvas} background={palette.card} padding="12px 32px">
      {src ? (
        <EmailImage canvas={canvas} url={src} alt={block.alt} />
      ) : (
        <div
          style={{
            padding: '36px 16px',
            textAlign: 'center',
            backgroundColor: palette.soft,
            border: `1px dashed ${palette.border}`,
            borderRadius: '8px',
            fontFamily: fonts.body,
            fontSize: px(13),
            color: readable(palette.muted, palette.soft),
          }}
        >
          {block.alt.trim() || labels.image}
        </div>
      )}
      {caption ? (
        <p style={{ ...smallStyle(canvas), marginTop: '8px', textAlign: 'center' }}>
          {block.caption}
        </p>
      ) : null}
    </CanvasSection>
  );
}
