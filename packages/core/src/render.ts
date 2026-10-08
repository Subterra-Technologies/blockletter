import { builtInBlocks } from './blocks';
import { DEFAULT_BRAND, fontStack, resolvePalette, type Palette } from './brand';
import type { BlockDefinition, RenderContext, SectionOptions } from './definition';
import {
  absoluteUrl,
  displayUrl,
  escapeHtml,
  isRelativeUrl,
  missingAltText,
  normalizeBaseUrl,
  splitParagraphs,
  utf8Length,
} from './html';
import { BLOCK_ALIGNMENTS } from './limits';
import { ensureFooter } from './list';
import { AP_MONTHS } from './period';
import { getDefinition } from './registry';
import { RESPONSIVE_CLASSES, RESPONSIVE_STYLE } from './responsive';
import type {
  BlockBase,
  BlockFontSize,
  BlockPadding,
  BrandKit,
  BuiltInBlock,
  ImageRef,
  NewsletterDocument,
} from './types';
import { deepFreeze } from './util';
import { isHexColor } from './validate';

/**
 * The email renderer. Pure — no I/O, no clock, no randomness — so the same document renders the
 * same email in a Convex query, a Node worker, an edge function or a browser preview.
 *
 * The output is what every recipient receives: table layout, inline styles, web-safe fonts,
 * escaped text, absolute links, a hidden preheader and Outlook fallbacks, tested against real
 * inboxes. It carries nothing only an editor uses unless asked (`annotate`).
 */

/** Every word the renderer writes itself. Pass `RenderOptions.labels` to change any of them. */
export interface RenderLabels {
  /** The link under each post in a post list. */
  readMore: string;
  /** Footer link to `preferencesUrl`. */
  managePreferences: string;
  /** Footer link to `unsubscribeUrl`. */
  unsubscribe: string;
  /** An image placeholder without alt text, and "[Image: …]" in the plain text. */
  image: string;
  /** Before the `poweredBy` credit under the card. */
  poweredBy: string;
  /** Month names for event-tile dates, January first; AP style ("Sept. 5") by default. */
  months: readonly string[];
  /** Footer social links by network; a `website` link shows its host instead. */
  facebook: string;
  instagram: string;
  linkedin: string;
  x: string;
  youtube: string;
  tiktok: string;
  github: string;
}

export const DEFAULT_LABELS: Readonly<RenderLabels> = deepFreeze<RenderLabels>({
  readMore: 'Read more',
  managePreferences: 'Manage preferences',
  unsubscribe: 'Unsubscribe',
  image: 'Image',
  poweredBy: 'Powered by',
  months: [...AP_MONTHS],
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  github: 'GitHub',
});

export interface RenderOptions {
  /** Default `DEFAULT_BRAND`. */
  brand?: BrandKit;
  /**
   * Block definitions; default `builtInBlocks`. Add a host's own here — a later definition of
   * the same type replaces an earlier one. A block whose type has none is left out, with a warning.
   */
  definitions?: readonly BlockDefinition[];
  /**
   * An absolute http(s) URL that relative links ("/events") resolve against. Without one they
   * stay relative, which an inbox cannot follow, and a warning says so.
   */
  baseUrl?: string;
  /** An image's address, e.g. a fresh signed URL for `assetId`; undefined uses `image.url`. */
  resolveImageUrl?: (image: ImageRef) => string | undefined;
  /** Footer link to the recipient's email preferences. Inserted verbatim (merge tags welcome). */
  preferencesUrl?: string;
  /** Footer unsubscribe link. Inserted verbatim (merge tags welcome); warned about when absent. */
  unsubscribeUrl?: string;
  /** `data-block-id` on each block's row, for an editor's preview. Never for sent mail. */
  annotate?: boolean;
  /** A credit under the card: "Powered by <a>label</a>". Default none. */
  poweredBy?: { label: string; url: string };
  /** First on the line under the card, e.g. "September 2026 issue". */
  issueLabel?: string;
  /** `<html lang>`. Default `en`. */
  lang?: string;
  /** Words the renderer writes itself; anything left out is English. */
  labels?: Partial<RenderLabels>;
}

export interface RenderedEmail {
  html: string;
  /** The plain-text twin, for the text part of the message. */
  text: string;
  /** Problems for the host to act on. They never stop the email rendering. */
  warnings: string[];
}

/** One block's rows (`html` is `<tr>` elements for a 600px table), its text and its warnings. */
export type RenderedBlock = RenderedEmail;

const WIDTH = 600;
const CONTENT_WIDTH = WIDTH - 64;

/** Font-size multiplier for each `style.fontSize`. */
export const FONT_SCALE: Readonly<Record<BlockFontSize, number>> = deepFreeze({
  small: 0.875,
  normal: 1,
  large: 1.15,
});

/** Top and bottom padding for each `style.paddingY`. */
export const PADDING_Y: Readonly<Record<BlockPadding, string>> = deepFreeze({
  none: '0',
  tight: '12px',
  normal: '28px',
  loose: '48px',
});

/** Gmail clips a message whose HTML is larger than about 102 KB, hiding the unsubscribe link. */
const GMAIL_CLIP_BYTES = 102 * 1024;

const UNSUBSCRIBE_WARNING =
  "There is no unsubscribe link: pass unsubscribeUrl (an address or your email service's merge tag) so every recipient can opt out.";
const LOCAL_IMAGE_WARNING =
  'An image is only stored in this browser (blob:/data: URL); email clients cannot load it. Upload it somewhere public before sending.';
const RELATIVE_LINK_WARNING =
  'Some links are relative (such as "/events") and there is no baseUrl to resolve them against, so they will not work in an inbox.';

interface RenderState {
  readonly options: RenderOptions;
  readonly brand: BrandKit;
  readonly palette: Palette;
  readonly fonts: { readonly heading: string; readonly body: string };
  readonly labels: RenderLabels;
  readonly baseUrl: string;
  readonly definitions: readonly BlockDefinition[];
  readonly lines: string[];
  readonly warnings: string[];
}

function resolveLabels(labels: Partial<RenderLabels> | undefined): RenderLabels {
  const given = Object.fromEntries(
    Object.entries(labels ?? {}).filter(([, value]) => value !== undefined),
  );
  return { ...DEFAULT_LABELS, ...given } as RenderLabels;
}

function createState(options: RenderOptions): RenderState {
  const brand = options.brand ?? DEFAULT_BRAND;
  return {
    options,
    brand,
    palette: resolvePalette(brand),
    fonts: {
      heading: fontStack(brand.fonts?.heading, 'Georgia'),
      body: fontStack(brand.fonts?.body, 'Arial'),
    },
    labels: resolveLabels(options.labels),
    baseUrl: normalizeBaseUrl(options.baseUrl),
    definitions: options.definitions ?? builtInBlocks,
    lines: [],
    warnings: [],
  };
}

const warn = (state: RenderState, message: string): void => {
  if (!state.warnings.includes(message)) state.warnings.push(message);
};

/** An absolute link, noting (once) any relative link there is no base to resolve against. */
function resolveUrl(state: RenderState, href: string | undefined): string {
  if (!state.baseUrl && isRelativeUrl(href)) warn(state, RELATIVE_LINK_WARNING);
  return absoluteUrl(href, state.baseUrl);
}

const WEB_IMAGE = /^https?:\/\//i;
/** An upload an editor shows before it is stored: a blob, or a base64 raster image. Never SVG. */
const LOCAL_IMAGE = /^(?:blob:|data:image\/(?:png|jpeg|gif|webp);base64,)/i;

/**
 * An image's address: http(s), or — so an editor can preview an upload before it is stored — a
 * `blob:` or base64 `data:image/…` URL, with a warning, since no inbox can load those. Anything
 * else (`javascript:`, other `data:` types, relative paths) counts as no image.
 */
function resolveImage(state: RenderState, ref: ImageRef | undefined): string | undefined {
  if (!ref) return undefined;
  const address = (state.options.resolveImageUrl?.(ref) ?? ref.url ?? '').trim();
  if (WEB_IMAGE.test(address)) return address;
  if (LOCAL_IMAGE.test(address)) {
    warn(state, LOCAL_IMAGE_WARNING);
    return address;
  }
  return undefined;
}

/** A pixel length's number (`32px` → 32); anything else is 0. */
const pixels = (value: string): number => {
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value);
  return match ? Number(match[1]) : 0;
};

/**
 * The wrapper `<td>` for one block: its type's padding and background, then its `style`; and
 * whether its sides are wide enough to narrow on a phone.
 */
function sectionLayout(
  palette: Palette,
  block: BlockBase,
  background: string,
  padding: string,
): { style: string; narrowSides: boolean } {
  const style = block.style ?? {};
  const [top = '0', right = top, bottom = top, left = right] = padding.trim().split(/\s+/);
  const paddingY = style.paddingY ? PADDING_Y[style.paddingY] : undefined;
  const align = style.align && BLOCK_ALIGNMENTS.includes(style.align) ? style.align : undefined;
  return {
    style:
      `padding:${paddingY ?? top} ${style.fullWidth ? '0' : right} ${paddingY ?? bottom} ${style.fullWidth ? '0' : left};` +
      `background:${isHexColor(style.background) ? style.background : background};` +
      (align ? `text-align:${align};` : '') +
      (style.divider ? `border-bottom:1px solid ${palette.border};` : ''),
    narrowSides: !style.fullWidth && Math.max(pixels(right), pixels(left)) > 20,
  };
}

function contextFor(state: RenderState, block: BlockBase): RenderContext {
  const style = block.style;
  const scale = (style?.fontSize && FONT_SCALE[style.fontSize]) || 1;
  const textColor = style?.textColor;
  const palette: Palette = isHexColor(textColor)
    ? {
        ...state.palette,
        text: textColor,
        heading: textColor,
        muted: textColor,
        bandText: textColor,
        bandMuted: textColor,
        footerText: textColor,
      }
    : state.palette;
  const { fonts, labels } = state;
  const px = (size: number): number => Math.round(size * scale);
  const url = (href: string | undefined): string => resolveUrl(state, href);
  const image = (ref: ImageRef | undefined): string | undefined => resolveImage(state, ref);
  const bodyStyle = (color: string = palette.text): string =>
    `margin:0 0 12px 0;font-family:${fonts.body};font-size:${px(15)}px;line-height:1.55;color:${color};`;
  const smallStyle = (color: string = palette.muted): string =>
    `margin:0;font-family:${fonts.body};font-size:${px(13)}px;line-height:1.5;color:${color};`;

  return {
    palette,
    fonts,
    brand: state.brand,
    labels,
    options: state.options,
    width: { full: WIDTH, content: CONTENT_WIDTH, inner: style?.fullWidth ? WIDTH : CONTENT_WIDTH },
    classes: RESPONSIVE_CLASSES,
    section(target: BlockBase, inner: string, options: SectionOptions = {}): string {
      const { background = palette.card, padding = '28px 32px', attributes = '' } = options;
      const layout = sectionLayout(palette, target, background, padding);
      const annotation =
        state.options.annotate === true ? ` data-block-id="${escapeHtml(target.id)}"` : '';
      return `<tr><td${layout.narrowSides ? ` class="${RESPONSIVE_CLASSES.pad}"` : ''}${annotation}${attributes ? ` ${attributes}` : ''} style="${layout.style}${options.style ?? ''}">${inner}</td></tr>`;
    },
    heading(text: string, options: { color?: string; size?: number } = {}): string {
      const { color = palette.heading, size = 24 } = options;
      return `<h2 style="margin:0 0 14px 0;font-family:${fonts.heading};font-size:${px(size)}px;line-height:1.25;font-weight:normal;color:${color};">${escapeHtml(text)}</h2>`;
    },
    paragraphs(body: string, paragraphStyle: string = bodyStyle()): string {
      return splitParagraphs(body)
        .map(
          (part) =>
            `<p style="${paragraphStyle}">${escapeHtml(part).replace(/\r?\n/g, '<br>')}</p>`,
        )
        .join('');
    },
    bodyStyle,
    smallStyle,
    button(label: string, href: string, variant: 'solid' | 'outline' = 'solid'): string {
      const cell =
        variant === 'outline'
          ? `background:transparent;border:2px solid ${palette.accentInk};border-radius:6px;`
          : `background:${palette.accent};border-radius:6px;`;
      // An outline button is accent-coloured text on the card, so it uses the readable shade.
      const color = variant === 'outline' ? palette.accentInk : palette.accentText;
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 0 0;"><tr>` +
        `<td style="${cell}">` +
        `<a href="${escapeHtml(url(href))}" style="display:inline-block;padding:12px 22px;font-family:${fonts.body};font-size:${px(15)}px;font-weight:bold;color:${color};text-decoration:none;">${escapeHtml(label)}</a>` +
        `</td></tr></table>`
      );
    },
    image,
    imageOrPlaceholder(
      ref: ImageRef | undefined,
      alt: string,
      width: number,
      height = 120,
      options: { fill?: boolean } = {},
    ): string {
      const src = image(ref);
      return src
        ? `<img${options.fill ? ` class="${RESPONSIVE_CLASSES.fill}"` : ''} src="${escapeHtml(src)}" width="${width}" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:${width}px;height:auto;border-radius:8px;">`
        : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;"><tr><td align="center" valign="middle" height="${height}" style="height:${height}px;background:${palette.soft};border:1px dashed ${palette.border};border-radius:8px;font-family:${fonts.body};font-size:${px(13)}px;color:${palette.muted};">${escapeHtml(alt.trim() || labels.image)}</td></tr></table>`;
    },
    optionalLink(label: string | undefined, href: string | undefined) {
      if (!label?.trim() || !href?.trim()) return { html: '', text: '' };
      const link = url(href);
      return {
        html: `<p style="${smallStyle(palette.link)}"><a href="${escapeHtml(link)}" style="color:${palette.link};font-weight:bold;">${escapeHtml(label)}</a></p>`,
        text: `${label}: ${link}`,
      };
    },
    url,
    escape: escapeHtml,
    px,
    text(...lines: string[]): void {
      state.lines.push(...lines);
    },
    warn(message: string): void {
      warn(state, message);
    },
  };
}

/** An image tag; one left open at the end runs to the end, so no attempt fails after a long scan. */
const IMAGE_TAG = /<img\b[^>]*(?:>|$)/gi;
const ALT_ATTRIBUTE = /\salt\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

/** The email itself is checked, so a host's own block is held to the same rule. */
function checkAltText(state: RenderState, html: string, label: string): void {
  for (const tag of html.match(IMAGE_TAG) ?? []) {
    const alt = ALT_ATTRIBUTE.exec(tag);
    if (!(alt?.[1] ?? alt?.[2] ?? '').trim()) {
      warn(state, missingAltText(label));
      return;
    }
  }
}

function renderOne(state: RenderState, block: BlockBase): string {
  const definition = getDefinition(block.type, state.definitions);
  if (!definition) {
    warn(state, `There is no definition for the "${block.type}" block, so it was left out.`);
    return '';
  }
  const html = definition.render(block, contextFor(state, block));
  checkAltText(state, html, definition.label);
  return html;
}

const plainText = (state: RenderState): string =>
  state.lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** The small line under the card: issue, the organisation's site, and a credit, as there are. */
function belowCard(state: RenderState): { html: string; text: string } {
  const { options, palette, labels } = state;
  const parts: { html: string; text: string }[] = [];
  const linkStyle = `color:${palette.muted};`;
  const issueLabel = options.issueLabel?.trim();
  if (issueLabel) parts.push({ html: escapeHtml(issueLabel), text: issueLabel });
  const website = state.brand.contact?.website?.trim();
  if (website) {
    const href = resolveUrl(state, website);
    parts.push({
      html: `<a href="${escapeHtml(href)}" style="${linkStyle}">${escapeHtml(displayUrl(href))}</a>`,
      text: href,
    });
  }
  const credit = options.poweredBy?.label?.trim();
  if (credit) {
    const href = options.poweredBy?.url?.trim() ? resolveUrl(state, options.poweredBy.url) : '';
    parts.push({
      html: `${escapeHtml(labels.poweredBy)} ${href ? `<a href="${escapeHtml(href)}" style="${linkStyle}">${escapeHtml(credit)}</a>` : escapeHtml(credit)}`,
      text: `${labels.poweredBy} ${credit}${href ? `: ${href}` : ''}`,
    });
  }
  if (parts.length === 0) return { html: '', text: '' };
  return {
    html: `<p style="margin:16px 0 0 0;font-family:${state.fonts.body};font-size:11px;color:${palette.muted};">${parts.map((part) => part.html).join(' &middot; ')}</p>\n`,
    text: parts.map((part) => part.text).join(' · '),
  };
}

/** Full email — HTML, plain text and warnings — for a document. */
export function renderEmail<B extends BlockBase = BuiltInBlock>(
  doc: NewsletterDocument<B>,
  options: RenderOptions = {},
): RenderedEmail {
  const state = createState(options);
  const { palette } = state;
  if (!options.unsubscribeUrl?.trim()) warn(state, UNSUBSCRIBE_WARNING);
  state.lines.push(doc.subject, '');
  if (doc.preheader.trim()) state.lines.push(doc.preheader, '');

  // Exactly one footer, visible and last: it carries the unsubscribe link.
  const footer = getDefinition('footer', state.definitions);
  const blocks = footer
    ? ensureFooter<BlockBase>(doc.blocks, (id) => ({
        ...footer.create(),
        id,
        type: 'footer',
        hidden: false,
      }))
    : doc.blocks;
  const sections = blocks
    .filter((block) => !block.hidden)
    .map((block) => renderOne(state, block))
    .filter(Boolean)
    .join('\n');

  const preheader = doc.preheader.trim()
    ? `<span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${escapeHtml(doc.preheader)}${'&nbsp;&zwnj;'.repeat(40)}</span>`
    : '';
  const below = belowCard(state);

  const html =
    `<!DOCTYPE html>\n` +
    `<html lang="${escapeHtml(options.lang?.trim() || 'en')}" xmlns="http://www.w3.org/1999/xhtml">\n<head>\n` +
    `<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    `<meta http-equiv="X-UA-Compatible" content="IE=edge">\n<meta name="x-apple-disable-message-reformatting">\n` +
    `<meta name="color-scheme" content="light">\n` +
    `<title>${escapeHtml(doc.subject)}</title>\n${RESPONSIVE_STYLE}\n</head>\n` +
    `<body style="margin:0;padding:0;background:${palette.page};-webkit-text-size-adjust:100%;">\n` +
    preheader +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${palette.page};">\n<tr><td align="center" style="padding:24px 12px;">\n` +
    // Fluid up to 600px for every client that reads max-width; a fixed 600px ghost table for
    // Outlook on Windows, which does not, so it lays the card out exactly as before.
    `<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${WIDTH}" align="center"><tr><td><![endif]-->\n` +
    `<div style="max-width:${WIDTH}px;margin:0 auto;">\n` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:${palette.card};border:1px solid ${palette.border};border-radius:10px;overflow:hidden;">\n` +
    sections +
    `\n</table>\n` +
    below.html +
    `</div>\n` +
    `<!--[if mso]></td></tr></table><![endif]-->\n` +
    `</td></tr>\n</table>\n</body>\n</html>`;

  if (below.text) state.lines.push('', below.text);
  const bytes = utf8Length(html);
  if (bytes > GMAIL_CLIP_BYTES) {
    warn(
      state,
      `Gmail clips messages larger than about 102 KB, and this one is ${Math.ceil(bytes / 1024)} KB: shorten or remove blocks so the end, with the unsubscribe link, is not cut off.`,
    );
  }
  return { html, text: plainText(state), warnings: [...state.warnings] };
}

/**
 * One block on its own — its `<tr>` rows, plain text and warnings — e.g. to draw a host's block on
 * an editor canvas from its email HTML. Renders even a hidden block; nothing else is added.
 */
export function renderBlock(block: BlockBase, options: RenderOptions = {}): RenderedBlock {
  const state = createState(options);
  const html = renderOne(state, block);
  return { html, text: plainText(state), warnings: [...state.warnings] };
}
