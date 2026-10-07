import type { SpacerBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { CanvasSection } from './shared';

/** The email's heights for each size. */
const HEIGHT: Record<SpacerBlock['size'], number> = { small: 12, medium: 28, large: 56 };

/** Empty room. The email leaves it blank; the canvas outlines it faintly so it can be found. */
export function SpacerCanvas(canvas: BlockCanvasProps<SpacerBlock>) {
  const { block, palette } = canvas;
  const height = HEIGHT[block.size] ?? HEIGHT.medium;
  return (
    <CanvasSection canvas={canvas} background={palette.card} padding="0 32px">
      <div
        aria-hidden="true"
        style={{
          height: `${height}px`,
          border: `1px dashed ${palette.border}`,
          borderRadius: '4px',
        }}
      />
    </CanvasSection>
  );
}
