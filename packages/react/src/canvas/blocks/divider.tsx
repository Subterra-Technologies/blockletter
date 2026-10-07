import type { DividerBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { CanvasSection } from './shared';

/** A hairline in the border colour, or a thick rule in the accent. */
export function DividerCanvas(canvas: BlockCanvasProps<DividerBlock>) {
  const { block, palette } = canvas;
  const thick = block.thickness === 'thick';
  return (
    <CanvasSection canvas={canvas} background={palette.card} padding="12px 32px">
      <div
        aria-hidden="true"
        style={{
          height: thick ? '4px' : '1px',
          backgroundColor: thick ? palette.accent : palette.border,
        }}
      />
    </CanvasSection>
  );
}
