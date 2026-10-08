import type { BannerBlock } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, EmailButton, EmailImage, CanvasNote } from './shared';

/** An address inside CSS `url("…")`, with the characters that would end it escaped. */
const cssUrl = (url: string): string => url.replace(/["\\]/g, '\\$&').replace(/[\r\n]/g, '');

/**
 * A hero image with its headline over it on the ink band (`overlay`) or under it, or the band on
 * its own until there is an image. The same three layouts the email has.
 */
export function BannerCanvas(canvas: BlockCanvasProps<BannerBlock>) {
  const words = useEditorMessages().blocks.banner;
  const { block, palette, fonts, px, image } = canvas;
  const src = image(block.image);
  const heading = block.heading?.trim() ?? '';
  const subheading = block.subheading?.trim() ?? '';
  const ctaLabel = block.ctaLabel?.trim() ?? '';
  const hasCta = Boolean(ctaLabel && block.ctaUrl?.trim());
  const hasCopy = Boolean(heading || subheading || hasCta);

  const copy = (color: string, muted: string, background: string) => (
    <>
      {heading ? (
        <p
          style={{
            margin: 0,
            fontFamily: fonts.heading,
            fontSize: px(30),
            lineHeight: 1.2,
            color,
          }}
        >
          {heading}
        </p>
      ) : null}
      {subheading ? (
        <p
          style={{
            margin: '8px 0 0 0',
            fontFamily: fonts.body,
            fontSize: px(15),
            lineHeight: 1.5,
            color: muted,
          }}
        >
          {subheading}
        </p>
      ) : null}
      {hasCta ? (
        <div style={{ marginTop: '12px' }}>
          <EmailButton canvas={canvas} label={ctaLabel} background={background} />
        </div>
      ) : null}
    </>
  );

  if (src && block.overlay) {
    return (
      <CanvasSection
        canvas={canvas}
        background={palette.band}
        padding="52px 32px"
        style={{
          backgroundImage: `url("${cssUrl(src)}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {copy(palette.bandText, palette.bandMuted, palette.band)}
        </div>
      </CanvasSection>
    );
  }
  if (src) {
    return (
      <CanvasSection canvas={canvas} background={palette.card} padding="16px 32px">
        <EmailImage canvas={canvas} url={src} alt={block.alt} />
        {hasCopy ? (
          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            {copy(palette.heading, palette.muted, blockBackground(block, palette.card))}
          </div>
        ) : null}
      </CanvasSection>
    );
  }
  const band = blockBackground(block, palette.band);
  return (
    <CanvasSection canvas={canvas} background={palette.band} padding="44px 32px">
      <div style={{ textAlign: 'center' }}>
        {hasCopy ? (
          copy(palette.bandText, palette.bandMuted, band)
        ) : (
          <CanvasNote canvas={canvas} background={band}>
            {words.emptyCanvas}
          </CanvasNote>
        )}
      </div>
    </CanvasSection>
  );
}
