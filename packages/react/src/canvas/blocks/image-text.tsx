import type { ImageTextBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { cn } from '../../lib/cn';
import {
  CanvasSection,
  EmailImage,
  EmailLink,
  EmailParagraphs,
  SPLIT,
  headingStyle,
} from './shared';

/** A 220px picture beside a heading, paragraphs and an optional link, on either side. */
export function ImageTextCanvas(canvas: BlockCanvasProps<ImageTextBlock>) {
  const { block, palette, image } = canvas;
  return (
    <CanvasSection canvas={canvas} background={palette.card}>
      <div className={cn(SPLIT, block.imageSide === 'right' && 'bl:flex-row-reverse')}>
        <div style={{ width: '220px', flex: '0 0 220px' }}>
          <EmailImage canvas={canvas} url={image(block.image)} alt={block.alt} height={160} />
        </div>
        <div className="bl:min-w-0 bl:flex-1">
          {block.heading.trim() ? (
            <p style={headingStyle(canvas, palette.heading, 20)}>{block.heading}</p>
          ) : null}
          <EmailParagraphs canvas={canvas} body={block.body} />
          <EmailLink canvas={canvas} label={block.linkLabel} url={block.linkUrl} />
        </div>
      </div>
    </CanvasSection>
  );
}
