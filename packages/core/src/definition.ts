import type { Palette } from './brand';
import {
  BLOCK_STYLE_SCHEMA,
  RESERVED_FIELD_KEYS,
  checkKeys,
  createFields,
  fieldsJsonSchema,
  summarizeFields,
  validateFields,
  type FieldMap,
  type FieldValues,
  type JsonSchema,
} from './fields';
import type { RenderLabels, RenderOptions } from './render';
import type { HtmlValue, RawHtml } from './template';
import type { BlockBase, BlockBody, BrandKit, ImageRef, ValidationIssue } from './types';
import { blockValidator, type ObjectValidator } from './validate';

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

/** How `RenderContext.columns` lays out its cells. */
export interface ColumnsOptions {
  /** Space between the cells in px, dropped once they stack. Default 16. */
  gap?: number;
  /** Each cell's share of the row, in %. Default: equal shares. */
  widths?: readonly number[];
  /**
   * When the cells become rows, one under another: on phones (620px and narrower, the default),
   * only on narrow phones (360px), or never.
   */
  stack?: 'phone' | 'narrow' | 'never';
  /** Default `top`. */
  valign?: 'top' | 'middle' | 'bottom';
}

/** How `RenderContext.card` draws its box. */
export interface CardOptions {
  /** Default: the palette's soft tint. */
  background?: string;
  /** The border's colour, or `false` for none. Default: the palette's border colour. */
  border?: string | false;
  /** CSS padding shorthand. Default `16px 18px`. */
  padding?: string;
  /** Corner radius in px. Default 8. */
  radius?: number;
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
  /**
   * A free-text field's Markdown (see `parseMarkdown`) as email HTML, and its plain-text twin as
   * lines to pass to `text(...)`. Paragraphs are `<p>` in `style` (default `bodyStyle()`) with their
   * line breaks kept, so text with no Markdown in it comes out exactly as `paragraphs` draws it;
   * headings, links, lists, quotes and dividers take this block's colours and font scale. Every run
   * is escaped and every link goes through `url()`. The text drops the marks and writes a link
   * "label (address)".
   */
  markdown(body: string, style?: string): { html: string; text: string[] };
  /**
   * One run of text with its inline Markdown drawn (bold, italic, strikethrough and links) and no
   * element around it, for a short field the block wraps itself. Line breaks stay as typed. `text`
   * is its plain-text twin.
   */
  inlineMarkdown(text: string): { html: string; text: string };
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
  /**
   * Email HTML from a template, escaped by default:
   * `` ctx.html`<p style="${ctx.smallStyle()}">${block.location}</p>${ctx.button('Apply', block.url)}` ``.
   * Text goes in escaped; HTML these helpers made (and another `ctx.html`) goes in as it is, as
   * does the `html` of what `markdown`, `inlineMarkdown`, `optionalLink` and `richText` return.
   * Inside a tag a value is an attribute's value: escaped, quoted when the template left the
   * quotes out, and for an `href` resolved through `url()`. Lists are joined; `null`,
   * `undefined` and booleans are nothing. The source's line breaks and indentation are dropped
   * beside tags.
   */
  html(strings: TemplateStringsArray, ...values: readonly HtmlValue[]): string;
  /** HTML of your own, checked by you, that `html` inserts as it is wherever it goes. */
  raw(html: string): RawHtml;
  /**
   * Cells side by side in one row, which become rows on a phone (see `ColumnsOptions`), with no
   * table markup to write. Size an image in a cell with `columnWidth`.
   */
  columns(cells: readonly string[], options?: ColumnsOptions): string;
  /** The width in px of one of `count` columns `gap` px apart (default 16) in this block. */
  columnWidth(count: number, gap?: number): number;
  /** `inner` in a box: a soft background, a hairline border and rounded corners, by default. */
  card(inner: string, options?: CardOptions): string;
  /**
   * Formatted text stored as HTML (a `field.html()`, say) for the email: cleaned with
   * `sanitizeHtml`, its links resolved like `url()`'s, styled inline in the palette, in the body
   * font; and its plain-text twin as lines for `text(...)`.
   */
  richText(html: string): { html: string; text: string[] };
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
  /**
   * Soft warnings the editor shows while the block is selected ("Add alt text…"). The built-in
   * blocks' also carry stable codes, which `blockIssueDetails` reads.
   */
  issues?(block: B): string[];
  /** The text the block carries, for one-line lists; `blockSummary` prefixes the label. */
  summary?(block: B): string;
  /** Email HTML: one or more `<tr>` rows of the card (use `ctx.section`). Return '' to omit. */
  render(block: B, ctx: RenderContext): string;
  /**
   * The block's fields, when it was declared with them (see `defineBlock`): what the editor builds
   * its form from and `blockJsonSchema` its schema. Absent for a block written field by field.
   */
  readonly fields?: FieldMap;
}

/** A block declared with `fields`: the fields every block has, and the values of its own. */
export type FieldBlock<T extends string, M extends FieldMap> = {
  [K in keyof (BlockBase<T> & FieldValues<M>)]: (BlockBase<T> & FieldValues<M>)[K];
};

/** The block type a definition is for: `type JobBlock = BlockOf<typeof jobBlock>`. */
export type BlockOf<D> = D extends BlockDefinition<infer B> ? B : never;

/**
 * A block declared by its fields. Everything but how it looks comes from `fields`: its type,
 * `create()`, `validate()`, `summary()`, its JSON Schema and the editor's form.
 */
export interface FieldBlockSpec<T extends string, M extends FieldMap> {
  type: T;
  /** "Job opening". */
  label: string;
  /** One line for the palette. */
  description: string;
  group: BlockGroup;
  /** Header and footer: at most one, and the editor will not delete it. */
  structural?: boolean;
  /** The block's own fields, in the order the form shows them. */
  fields: M;
  /**
   * Checks beyond each field's own, for a rule that spans fields; run after them on the same
   * validator (`check.value` is the block, `check.add(code, message, key)` records a problem).
   */
  validate?(check: ObjectValidator): void;
  /** Soft warnings the editor shows while the block is selected ("Add alt text…"). */
  issues?(block: FieldBlock<T, M>): string[];
  /** Default: the first words of the first text, Markdown or HTML field with any. */
  summary?(block: FieldBlock<T, M>): string;
  /** Email HTML: one or more `<tr>` rows of the card (use `ctx.section`). Return '' to omit. */
  render(block: FieldBlock<T, M>, ctx: RenderContext): string;
}

/**
 * Declares a block. Either by its fields, from which its type, `create()`, `validate()`,
 * `summary()`, JSON Schema and editor form all come:
 *
 * ```ts
 * const jobBlock = defineBlock({
 *   type: 'job',
 *   label: 'Job opening',
 *   description: 'A role you are hiring for, with an apply button.',
 *   group: 'content',
 *   fields: {
 *     title: field.text({ default: 'Full stack developer', max: 120 }),
 *     summary: field.markdown(),
 *     url: field.url({ label: 'Apply link' }),
 *   },
 *   render: (block, ctx) => ctx.section(block, ctx.heading(block.title)),
 * });
 * ```
 *
 * Or written out part by part, as a `BlockDefinition`, which is returned as it is.
 */
export function defineBlock<B extends BlockBase>(
  definition: BlockDefinition<B>,
): BlockDefinition<B>;
export function defineBlock<const T extends string, M extends FieldMap>(
  spec: FieldBlockSpec<T, M>,
): BlockDefinition<FieldBlock<T, M>> & { readonly fields: M };
export function defineBlock(
  definition: BlockDefinition | FieldBlockSpec<string, FieldMap>,
): BlockDefinition {
  if (!('fields' in definition) || 'create' in definition) return definition as BlockDefinition;
  const spec = definition as FieldBlockSpec<string, FieldMap>;
  const { fields, validate: extra, summary, ...rest } = spec;
  checkKeys(fields, `The "${spec.type}" block`, RESERVED_FIELD_KEYS);
  return {
    ...rest,
    fields,
    create: () => createFields(fields),
    validate(block, path) {
      const check = blockValidator(block, path, spec.type);
      if (check.ok) {
        validateFields(check, fields);
        extra?.(check);
      }
      return check.issues;
    },
    summary:
      summary ?? ((block) => summarizeFields(fields, block as unknown as Record<string, unknown>)),
  } as BlockDefinition;
}

/**
 * The JSON Schema (draft-07) of a block declared with fields, shaped like the blocks in
 * `schema/newsletter-document.json`, for a host that hands documents with its own blocks to
 * another language or an AI model. Undefined for a block written without fields; the built-in
 * blocks' schemas are in that file.
 */
export function blockJsonSchema(definition: BlockDefinition): JsonSchema | undefined {
  if (!definition.fields) return undefined;
  const own = fieldsJsonSchema(definition.fields);
  return {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Unique within its document.' },
      type: { type: 'string', enum: [definition.type] },
      hidden: {
        type: 'boolean',
        description: 'Left out of the email (and folded on the canvas) without being deleted.',
      },
      style: BLOCK_STYLE_SCHEMA,
      source: {
        type: 'string',
        description: 'Id of the `DataSource` that fills this block. Absent: written by hand.',
      },
      ...(own.properties as Record<string, JsonSchema>),
    },
    required: ['id', 'type', 'hidden', ...(own.required as string[])],
    additionalProperties: false,
    description: definition.description,
  };
}

/** A replacement `render` that is handed the one it replaces, e.g. for its plain-text lines. */
export type OverrideRender<B extends BlockBase> = (
  block: B,
  ctx: RenderContext,
  base: (block: B, ctx: RenderContext) => string,
) => string;

/** What `overrideBlock` may replace: anything but the type, with `render` given the original. */
export type BlockOverrides<B extends BlockBase> = Partial<
  Omit<BlockDefinition<B>, 'type' | 'render'>
> & { render?: OverrideRender<B> };

/**
 * A block definition with some of its parts replaced: a built-in block drawn in a host's own
 * style, say, keeping its fields, validation and form. The type stays the same, so registered
 * after the original (`[...builtInBlocks, ours]`) it replaces it wherever definitions are read. A
 * replacement `render` is handed the original as `base`, which it can call for the plain-text
 * lines it writes and ignore the HTML it returns.
 */
export function overrideBlock<B extends BlockBase>(
  definition: BlockDefinition<B>,
  overrides: BlockOverrides<B>,
): BlockDefinition<B> {
  const { render, ...rest } = overrides;
  const base = definition.render;
  return {
    ...definition,
    ...rest,
    type: definition.type,
    render: render ? (block, ctx) => render(block, ctx, base) : base,
  };
}
