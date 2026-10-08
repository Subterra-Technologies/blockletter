import type { ArticleBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import {
  CanvasSection,
  CanvasNote,
  EmailLink,
  EmailParagraphs,
  SPLIT,
  headingStyle,
  labelStyle,
} from './shared';

/**
 * A feature article: the kicker, then the image (or, without one, the kicker itself as a label
 * tile on the ink band) beside the title, the paragraphs and an optional link.
 */
export function ArticleCanvas(canvas: BlockCanvasProps<ArticleBlock>) {
  const words = useEditorMessages().blocks.article;
  const { block, palette, fonts, px, image } = canvas;
  const background = blockBackground(block, palette.card);
  const kicker = block.kicker.trim();
  const title = block.title.trim();
  const picture = image(block.image);
  if (!kicker && !title && !block.body.trim() && !picture) {
    return (
      <CanvasSection canvas={canvas} background={palette.card}>
        <CanvasNote canvas={canvas} background={background}>
          {words.emptyCanvas}
        </CanvasNote>
      </CanvasSection>
    );
  }
  return (
    <CanvasSection canvas={canvas} background={palette.card}>
      {kicker ? (
        <p style={{ ...labelStyle(canvas, background), margin: '0 0 8px 0' }}>{block.kicker}</p>
      ) : null}
      <div className={SPLIT}>
        {picture || kicker ? (
          <div style={{ width: '160px', flex: '0 0 160px' }}>
            {picture ? (
              <img
                src={picture}
                alt={title}
                style={{ display: 'block', width: '160px', borderRadius: '8px' }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '160px',
                  height: '120px',
                  padding: '0 8px',
                  textAlign: 'center',
                  backgroundColor: palette.band,
                  borderRadius: '8px',
                  fontFamily: fonts.heading,
                  fontSize: px(14),
                  letterSpacing: '1px',
                  color: palette.bandText,
                }}
              >
                {kicker.toUpperCase()}
              </div>
            )}
          </div>
        ) : null}
        <div className="bl:min-w-0 bl:flex-1">
          {title ? <p style={headingStyle(canvas, palette.heading, 20)}>{block.title}</p> : null}
          <EmailParagraphs canvas={canvas} body={block.body} />
          <EmailLink canvas={canvas} label={block.linkLabel} url={block.linkUrl} />
        </div>
      </div>
    </CanvasSection>
  );
}
