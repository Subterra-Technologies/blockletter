import type { Palette } from './brand';
import type { RenderLabels, RenderOptions } from './render';
import type { BlockBase, BlockBody, BrandKit, ImageRef, ValidationIssue } from './types';

/**
 * The plugin API. Every block Blockletter ships is a `BlockDefinition`, registered exactly the
 * way a host registers its own, so nothing in the renderer or editor switches on built-in types.
 */

export type BlockGroup = 'content' | 'layout' | 'graphics' | (string & {});

/** The palette's groups, in order. A definition may name a group of its own; it is listed last. */
export const BLOCK_GROUPS: readonly { id: BlockGroup; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'layout', label: 'Layout' },
  { id: 'graphics', label: 'Graphics' },
];

/** How `RenderContext.section` paints a block's row. */
export interface SectionOptions {
  /** Row background; the block's `style.background` still wins. Defaults to the card. */
  background?: string;
  /** CSS padding shorthand, adjusted by `style.paddingY` and `style.fullWidth`. `28px 32px`. */
  padding?: string;
  /** Extra attributes for the `<td>`, already escaped (e.g. Outlook's `background="…"`). */
  attributes?: string;
  /** Extra inline CSS appended after the computed style. */
  style?: string;
}

/**
 * What a block's `render` receives: the resolved look of the email plus the helpers the built-in
 * blocks use, so a host's block renders the same way. Created once per block, so `palette`,
 * `px` and `width.inner` already account for that block's own `style`.
 */
export interface RenderContext {
  /** Colours for this block: the brand's palette with the block's `style.textColor` applied. */
  readonly palette: Palette;
  /** CSS font stacks for headings and body text. */
  readonly fonts: { readonly heading: string; readonly body: string };
  /** The brand kit in effect (`DEFAULT_BRAND` when none was given). */
  readonly brand: BrandKit;
  /** Every word the renderer writes itself, in the language the host asked for. */
  readonly labels: RenderLabels;
  /** Pixel widths: the card, its padded content column, and this block's own inner width. */
  readonly width: { readonly full: number; readonly content: number; readonly inner: number };
  /**
   * Class names for the phone layout: `stack` cells become full-width rows from 620px down
   * (`gap` spacer cells hide, `space` adds room under a cell, `fill` grows an image to its
   * stacked cell); `stackNarrow` and `spaceNarrow` do the same from 360px down. `section` adds
   * `pad` itself.
   */
  readonly classes: Readonly<{
    pad: string;
    stack: string;
    gap: string;
    space: string;
    fill: string;
    stackNarrow: string;
    spaceNarrow: string;
  }>;
  /** The options `renderEmail` was called with, for blocks that need more (footer links, say). */
  readonly options: Readonly<RenderOptions>;
  /** One row of the 600px card: the block's padding, background, alignment and divider. */
  section(block: BlockBase, inner: string, options?: SectionOptions): string;
  /** An escaped `<h2>` in the heading font; `size` in px before the block's font scale. */
  heading(text: string, options?: { color?: string; size?: number }): string;
  /** Escaped `<p>` per blank-line-separated paragraph, line breaks kept; `style` is inline CSS. */
  paragraphs(body: string, style?: string): string;
  /** Inline CSS for body text (15px), in `color` or the palette's text colour. */
  bodyStyle(color?: string): string;
  /** Inline CSS for small print (13px), in `color` or the palette's muted colour. */
  smallStyle(color?: string): string;
  /** A bulletproof table button linking to `url` (resolved with `url()`). */
  button(label: string, url: string, variant?: 'solid' | 'outline'): string;
  /** An image's address: http(s), or a blob:/data: preview (with a warning); else undefined. */
  image(ref: ImageRef | undefined): string | undefined;
  /**
   * The image at up to `width` px (scaling down with its cell), or a dashed placeholder carrying
   * the alt text when there is none. `fill` lets it grow to its cell once the cell stacks.
   */
  imageOrPlaceholder(
    ref: ImageRef | undefined,
    alt: string,
    width: number,
    height?: number,
    options?: { fill?: boolean },
  ): string;
  /** A bold link line and its plain-text twin; both empty unless label and url are set. */
  optionalLink(label: string | undefined, url: string | undefined): { html: string; text: string };
  /** A safe absolute address for a link (see `absoluteUrl`); warns of relative ones. */
  url(href: string | undefined): string;
  /** HTML-escapes text for an element or an attribute value. */
  escape(value: string): string;
  /** A font size in px scaled by the block's `style.fontSize`. */
  px(size: number): number;
  /** Adds lines to the plain-text twin; push `''` to end a section. */
  text(...lines: string[]): void;
  /** Adds a warning to `RenderedEmail.warnings` (duplicates are dropped). */
  warn(message: string): void;
}

/**
 * One kind of block: how a fresh one starts, how untrusted input is checked, how the editor
 * describes it, and how it renders.
 */
export interface BlockDefinition<B extends BlockBase = BlockBase> {
  type: B['type'];
  /** "Event tiles". */
  label: string;
  /** One line for the palette. */
  description: string;
  group: BlockGroup;
  /** Header and footer: at most one, and the editor will not delete it. */
  structural?: boolean;
  /** The block's own fields for a fresh block (no id, type, hidden, style or source). */
  create(): BlockBody<B>;
  /** Shape and rule checks of untrusted input at `path`. An empty array means valid. */
  validate(block: unknown, path: string): ValidationIssue[];
  /** Soft warnings the editor shows while the block is selected ("Add alt text…"). */
  issues?(block: B): string[];
  /** The text the block carries, for one-line lists; `blockSummary` prefixes the label. */
  summary?(block: B): string;
  /** Email HTML: one or more `<tr>` rows of the card (use `ctx.section`). Return '' to omit. */
  render(block: B, ctx: RenderContext): string;
}

/** Declares a block. An identity function that exists for its types. */
export function defineBlock<B extends BlockBase>(
  definition: BlockDefinition<B>,
): BlockDefinition<B> {
  return definition;
}
