import { LIMITS, type PhotoGridBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, EmailImage, CanvasNote, smallStyle } from './shared';

/** Two to six captioned photos, three to a row when they divide by three, else two. */
export function PhotoGridCanvas(canvas: BlockCanvasProps<PhotoGridBlock>) {
  const words = useEditorMessages().blocks.photo_grid;
  const { block, palette, image } = canvas;
  const photos = block.photos.slice(0, LIMITS.photos[1]);
  const perRow = photos.length % 3 === 0 ? 3 : 2;
  return (
    <CanvasSection canvas={canvas} background={palette.card} padding="16px 32px">
      {photos.length === 0 ? (
        <CanvasNote canvas={canvas} background={blockBackground(block, palette.card)}>
          {words.emptyCanvas}
        </CanvasNote>
      ) : (
        <div
          className="bl:grid bl:gap-x-3"
          style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
        >
          {photos.map((photo, index) => (
            <div key={index} style={{ paddingBottom: '12px' }}>
              <EmailImage canvas={canvas} url={image(photo.image)} alt={photo.alt} height={110} />
              {photo.caption?.trim() ? (
                <p style={{ ...smallStyle(canvas), marginTop: '6px' }}>{photo.caption.trim()}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </CanvasSection>
  );
}
