import type { CSSProperties } from 'react';
import {
  BLOCK_ALIGNMENTS,
  DEFAULT_LABELS,
  FONT_SCALE,
  PADDING_Y,
  fontStack,
  isHexColor,
  relativeLuminance,
  resolvePalette,
  type BlockBase,
  type BrandKit,
  type ImageRef,
  type Palette,
  type RenderLabels,
  type RenderOptions,
} from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../editor/types';

/**
 * The canvas's share of the email's look. The palette, fonts, labels and contrast maths are core's
 * own; what lives here restates, as React styles, what the renderer does to one block (its
 * `RenderContext` and its section row), so a block drawn on the canvas has the email's colours,
 * fonts, sizes and padding and the two cannot drift apart.
 */

/** Everything about the email's look that is the same for every block: one per brand kit. */
export interface CanvasTheme {
  brand: BrandKit;
  palette: Palette;
  fonts: { heading: string; body: string };
  labels: RenderLabels;
  options: Readonly<RenderOptions>;
  image: (ref: ImageRef | undefined) => string | undefined;
}

/** The renderer's labels: the host's own over the English defaults, blanks ignored. */
function resolveLabels(labels: Partial<RenderLabels> | undefined): RenderLabels {
  const given = Object.fromEntries(
    Object.entries(labels ?? {}).filter(([, value]) => value !== undefined),
  );
  return { ...DEFAULT_LABELS, ...given } as RenderLabels;
}

/** The renderer's own rules, restated until core exports them: see its `resolveImage`. */
const WEB_IMAGE = /^https?:\/\//i;
/** An upload a preview shows before it is stored: a blob, or a base64 raster image. Never SVG. */
const LOCAL_IMAGE = /^(?:blob:|data:image\/(?:png|jpeg|gif|webp);base64,)/i;

/**
 * The address an image has in the email: `resolveImageUrl`'s, else its own `url`, when it is
 * http(s), or a `blob:` / base64 `data:image` upload not stored yet (which the renderer also
 * shows, with a warning, so a preview matches the canvas). Anything else (`javascript:`, SVG,
 * a relative path) shows the email's placeholder, on the canvas as in the inbox.
 */
export function emailImage(
  ref: ImageRef | undefined,
  options: Readonly<RenderOptions> = {},
): string | undefined {
  if (!ref) return undefined;
  const address = (options.resolveImageUrl?.(ref) ?? ref.url ?? '').trim();
  return WEB_IMAGE.test(address) || LOCAL_IMAGE.test(address) ? address : undefined;
}

export function canvasTheme(brand: BrandKit, options: Readonly<RenderOptions> = {}): CanvasTheme {
  return {
    brand,
    palette: resolvePalette(brand),
    fonts: {
      heading: fontStack(brand.fonts?.heading, 'Georgia'),
      body: fontStack(brand.fonts?.body, 'Arial'),
    },
    labels: resolveLabels(options.labels),
    options,
    image: (ref) => emailImage(ref, options),
  };
}

/** The palette one block is painted with: its `style.textColor` over every text colour. */
export function blockPalette(palette: Palette, block: BlockBase): Palette {
  const color = block.style?.textColor;
  if (!isHexColor(color)) return palette;
  return {
    ...palette,
    text: color,
    heading: color,
    muted: color,
    bandText: color,
    bandMuted: color,
    footerText: color,
  };
}

/** What one block's drawing receives: the renderer's `RenderContext`, as values. */
export function canvasProps<B extends BlockBase>(
  block: B,
  theme: CanvasTheme,
): BlockCanvasProps<B> {
  const fontSize = block.style?.fontSize;
  const scale = (fontSize && FONT_SCALE[fontSize]) || 1;
  return {
    block,
    palette: blockPalette(theme.palette, block),
    fonts: theme.fonts,
    brand: theme.brand,
    px: (size) => Math.round(size * scale),
    image: theme.image,
    labels: theme.labels,
    options: theme.options,
  };
}

/** The background a block is painted on: its own `style.background`, else its type's. */
export function blockBackground(block: BlockBase, background: string): string {
  const own = block.style?.background;
  return isHexColor(own) ? own : background;
}

/** The renderer's test for a dark fill, which flips text and notes to light. */
export const isDark = (color: string): boolean => relativeLuminance(color) < 0.4;

/**
 * The renderer's section row for one block: its type's padding and background, then the block's
 * own `style` (vertical padding, an edge-to-edge band, alignment, a hairline under it).
 */
export function sectionStyle(
  palette: Palette,
  block: BlockBase,
  background: string,
  padding = '28px 32px',
): CSSProperties {
  const style = block.style ?? {};
  const [top = '0', right = top, bottom = top, left = right] = padding.trim().split(/\s+/);
  const paddingY = style.paddingY ? PADDING_Y[style.paddingY] : undefined;
  const align = style.align && BLOCK_ALIGNMENTS.includes(style.align) ? style.align : undefined;
  return {
    padding: `${paddingY ?? top} ${style.fullWidth ? '0' : right} ${paddingY ?? bottom} ${style.fullWidth ? '0' : left}`,
    // The longhand, so a banner's background image can sit beside it without React resetting one
    // with the other when either changes.
    backgroundColor: blockBackground(block, background),
    ...(align ? { textAlign: align } : {}),
    ...(style.divider ? { borderBottom: `1px solid ${palette.border}` } : {}),
  };
}
