import type { ButtonBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, EmailButton, CanvasNote } from './shared';

/** One centred button, solid or outlined. */
export function ButtonCanvas(canvas: BlockCanvasProps<ButtonBlock>) {
  const words = useEditorMessages().blocks.button;
  const { block, palette } = canvas;
  const background = blockBackground(block, palette.card);
  return (
    <CanvasSection canvas={canvas} background={palette.card} padding="12px 32px 20px 32px">
      <div style={{ textAlign: 'center' }}>
        {block.label.trim() ? (
          <EmailButton
            canvas={canvas}
            label={block.label}
            background={background}
            variant={block.variant}
          />
        ) : (
          <CanvasNote canvas={canvas} background={background}>
            {words.emptyCanvas}
          </CanvasNote>
        )}
      </div>
    </CanvasSection>
  );
}
