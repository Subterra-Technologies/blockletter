import type { CSSProperties, ReactNode } from 'react';
import { readable, splitParagraphs, type BlockBase } from '@subterra-technologies/blockletter';
import type { BlockCanvasProps } from '../../editor/types';
import { isDark, sectionStyle } from '../canvas-theme';

/**
 * What the built-in drawings are made of: each piece is the canvas twin of a renderer helper
 * (`section`, `heading`, `bodyStyle`, `smallStyle`, `button`, `imageOrPlaceholder`,
 * `optionalLink`), with the same colours, fonts, sizes and spacing as inline styles.
 *
 * A drawing holds no headings, links or controls of its own. It sits inside a canvas tab, which
 * is the one control: headings are paragraphs in the heading's style, and links and buttons are
 * spans that look like them, so choosing a block never follows a link out of the editor.
 */

export type Canvas = BlockCanvasProps<BlockBase>;

export const headingStyle = (
  canvas: Canvas,
  color: string = canvas.palette.heading,
  size = 24,
): CSSProperties => ({
  margin: '0 0 14px 0',
  fontFamily: canvas.fonts.heading,
  fontSize: canvas.px(size),
  lineHeight: 1.25,
  fontWeight: 'normal',
  color,
});

/** Body text. `pre-line` keeps the single line breaks the email turns into `<br>`. */
export const bodyStyle = (canvas: Canvas, color: string = canvas.palette.text): CSSProperties => ({
  margin: '0 0 12px 0',
  fontFamily: canvas.fonts.body,
  fontSize: canvas.px(15),
  lineHeight: 1.55,
  color,
  whiteSpace: 'pre-line',
});

export const smallStyle = (
  canvas: Canvas,
  color: string = canvas.palette.muted,
): CSSProperties => ({
  margin: 0,
  fontFamily: canvas.fonts.body,
  fontSize: canvas.px(13),
  lineHeight: 1.5,
  color,
});

/**
 * The small uppercase label over a block (a kicker, the header's strapline). The email paints it
 * in the brand's accent as it is; the canvas uses the nearest shade of that accent that reads on
 * `background`, because a pale accent fails contrast on white.
 */
export const labelStyle = (canvas: Canvas, background: string, size = 12): CSSProperties => ({
  margin: 0,
  fontFamily: canvas.fonts.body,
  fontSize: canvas.px(size),
  letterSpacing: size < 12 ? '1.5px' : '2px',
  textTransform: 'uppercase',
  fontWeight: 'bold',
  color: readable(canvas.palette.accent, background),
});

/** Side-by-side cells that stack when the canvas is narrower than an email client would be. */
export const SPLIT = 'bl:flex bl:items-start bl:gap-5 bl:@max-[28rem]/sheet:flex-col';

/**
 * One block's section of the 600px card: its type's background and padding with the block's own
 * `style` laid over them. `data-block-id` lets a host's tests and tools find a block's drawing.
 */
export function CanvasSection({
  canvas,
  background,
  padding,
  style,
  children,
}: {
  canvas: Canvas;
  background: string;
  padding?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      data-block-id={canvas.block.id}
      style={{ ...sectionStyle(canvas.palette, canvas.block, background, padding), ...style }}
    >
      {children}
    </div>
  );
}

/**
 * What the canvas shows where the email shows nothing (an empty letter, a list with no items), so
 * the block can still be seen and chosen. Italic, in a muted shade that reads on `background`.
 */
export function CanvasNote({
  canvas,
  background,
  children,
}: {
  canvas: Canvas;
  background: string;
  children: ReactNode;
}) {
  const muted = isDark(background) ? canvas.palette.bandMuted : canvas.palette.muted;
  return (
    <p
      style={{
        margin: 0,
        fontFamily: canvas.fonts.body,
        fontSize: '13px',
        lineHeight: 1.5,
        fontStyle: 'italic',
        color: readable(muted, background),
      }}
    >
      {children}
    </p>
  );
}

/** Blank-line-separated paragraphs, as the renderer's `paragraphs` splits them. */
export function EmailParagraphs({
  canvas,
  body,
  style,
}: {
  canvas: Canvas;
  body: string;
  style?: CSSProperties;
}) {
  return (
    <>
      {splitParagraphs(body).map((part, index) => (
        <p key={index} style={style ?? bodyStyle(canvas)}>
          {part}
        </p>
      ))}
    </>
  );
}

/** The renderer's bulletproof button, drawn as a span: on the canvas it is not a link. */
export function EmailButton({
  canvas,
  label,
  background,
  variant = 'solid',
}: {
  canvas: Canvas;
  label: string;
  /** What the button sits on, so an outline button's label reads. */
  background: string;
  variant?: 'solid' | 'outline';
}) {
  const solid = variant === 'solid';
  const { palette } = canvas;
  return (
    <span
      style={{
        display: 'inline-block',
        margin: '6px 0 0 0',
        padding: '12px 22px',
        borderRadius: '6px',
        backgroundColor: solid ? palette.accent : 'transparent',
        boxShadow: solid ? undefined : `inset 0 0 0 2px ${palette.accent}`,
        fontFamily: canvas.fonts.body,
        fontSize: canvas.px(15),
        fontWeight: 'bold',
        lineHeight: 1.2,
        color: solid ? palette.accentText : readable(palette.accent, background),
      }}
    >
      {label}
    </span>
  );
}

/** A picture, or the email's dashed placeholder carrying its alt text when there is none. */
export function EmailImage({
  canvas,
  url,
  alt,
  height = 120,
}: {
  canvas: Canvas;
  url: string | undefined;
  alt: string;
  height?: number;
}) {
  const { palette } = canvas;
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '8px' }}
      />
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${height}px`,
        padding: '0 12px',
        textAlign: 'center',
        backgroundColor: palette.soft,
        border: `1px dashed ${palette.border}`,
        borderRadius: '8px',
        fontFamily: canvas.fonts.body,
        fontSize: canvas.px(13),
        color: readable(palette.muted, palette.soft),
      }}
    >
      {alt.trim() || canvas.labels.image}
    </div>
  );
}

/** The renderer's bold link line, shown only when it has both a label and an address. */
export function EmailLink({
  canvas,
  label,
  url,
}: {
  canvas: Canvas;
  label: string | undefined;
  url: string | undefined;
}) {
  if (!label?.trim() || !url?.trim()) return null;
  return (
    <p style={smallStyle(canvas, canvas.palette.link)}>
      <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{label}</span>
    </p>
  );
}
