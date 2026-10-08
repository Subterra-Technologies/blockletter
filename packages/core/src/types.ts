/**
 * The Blockletter document model.
 *
 * Everything here is plain data: JSON-serialisable, no class instances, no functions. A
 * document can live in any database, cross any wire, and be rendered on a server, at the edge,
 * inside Convex, or in the browser for a live preview — the same input always renders the same
 * email.
 *
 * Content is stored as a snapshot. A block that a data source fills (upcoming events, sponsors,
 * new members, recent posts) holds copies of the records it shows, each tagged with the source's
 * own id in `ref`, rather than ids the renderer would have to look up. Rendering therefore needs
 * no database, and "Refresh" is an explicit action that re-reads the source.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Six-digit hex colour such as `#1f2937`; the only colour form a document accepts.
 *
 * @pattern ^#[0-9a-fA-F]{6}$
 */
export type HexColor = string;

/**
 * An image the host application stores. `url` must be absolute (https) to survive in an inbox;
 * `assetId` is the host's own handle for the file (a Convex storage id, an S3 key…), kept so the
 * host can re-resolve `url` through `RenderOptions.resolveImageUrl` if its URLs expire.
 */
export interface ImageRef {
  url: string;
  assetId?: string;
}

export interface Link {
  label: string;
  url: string;
}

export type SocialNetwork =
  'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'tiktok' | 'github' | 'website';

export interface SocialLink {
  network: SocialNetwork;
  url: string;
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export type BlockAlign = 'left' | 'center' | 'right';
export type BlockPadding = 'none' | 'tight' | 'normal' | 'loose';
export type BlockFontSize = 'small' | 'normal' | 'large';

/**
 * Per-block appearance. Every field is optional; an absent field inherits from the brand kit's
 * palette and the block's own default.
 */
export interface BlockStyle {
  background?: HexColor;
  textColor?: HexColor;
  align?: BlockAlign;
  paddingY?: BlockPadding;
  fontSize?: BlockFontSize;
  /** Edge-to-edge band instead of the padded content column. */
  fullWidth?: boolean;
  /** Hairline rule under the block. */
  divider?: boolean;
}

/** Fields every block carries, built-in or custom. Array order is layout order. */
export interface BlockBase<T extends string = string> {
  /** Unique within its document. */
  id: string;
  type: T;
  /** Left out of the email (and folded on the canvas) without being deleted. */
  hidden: boolean;
  style?: BlockStyle;
  /**
   * Id of the `DataSource` that fills this block's `items`. Absent: written by hand. A template
   * can name a source the host has not registered; the block then simply stays manual.
   */
  source?: string;
}

/** An item a data source supplied carries the source's id for the record it copies. */
export interface SourcedItem {
  /** The data source's own id for the record this item copies. Absent: written by hand. */
  ref?: string;
}

export interface EventTileItem extends SourcedItem {
  title: string;
  /**
   * Calendar date `YYYY-MM-DD`, already in the organisation's own time zone.
   *
   * @pattern ^[0-9]{4}-[0-9]{2}-[0-9]{2}$
   */
  date: string;
  /** Display time, e.g. "6:30 PM". */
  time?: string;
  location?: string;
  url?: string;
}

export interface SponsorItem extends SourcedItem {
  name: string;
  message: string;
  logo?: ImageRef;
  url?: string;
}

export interface NameListItem extends SourcedItem {
  name: string;
  /** Second line, e.g. "Bakery · Joined Sept. 3". */
  detail?: string;
  url?: string;
}

export interface PostItem extends SourcedItem {
  title: string;
  excerpt: string;
  url: string;
  /** Small label above the title, e.g. "Announcement". */
  kicker?: string;
}

export interface DatedItem extends SourcedItem {
  /** Display date, e.g. "Sept. 5". Free text, so "Every Saturday" is fine too. */
  date: string;
  text: string;
  /**
   * `YYYY-MM-DD`, for ordering; items without one keep their place after dated ones.
   *
   * @pattern ^[0-9]{4}-[0-9]{2}-[0-9]{2}$
   */
  sortDate?: string;
}

export interface ColumnItem {
  heading?: string;
  body: string;
  image?: ImageRef;
  alt?: string;
  linkLabel?: string;
  linkUrl?: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface PhotoItem {
  image?: ImageRef;
  alt: string;
  caption?: string;
}

/** Masthead: the brand kit's logo (or `logoText`) over a "title · issue" strapline. */
export interface HeaderBlock extends BlockBase<'header'> {
  title: string;
  /** e.g. "September 2026"; templates write `{{monthYear}}`. */
  issueLabel: string;
  /** Shown when the brand kit has no logo, and used as the logo's alt text when it does. */
  logoText: string;
}

/** A personal note with an optional portrait and a signature. */
export interface LetterBlock extends BlockBase<'letter'> {
  heading: string;
  /** Plain text; a blank line starts a new paragraph. */
  body: string;
  signature: string;
  photo?: ImageRef;
}

/** Up to four big date tiles on a dark band ("at a glance"). */
export interface EventTilesBlock extends BlockBase<'event_tiles'> {
  heading: string;
  items: EventTileItem[];
}

/** Logo-and-message rows thanking sponsors or partners. */
export interface SponsorsBlock extends BlockBase<'sponsors'> {
  heading: string;
  items: SponsorItem[];
}

/** A numbered list of names, e.g. welcoming new members. */
export interface NameListBlock extends BlockBase<'name_list'> {
  heading: string;
  intro: string;
  items: NameListItem[];
}

/** A short heading, a paragraph and a button: "Have news to share?". */
export interface CalloutBlock extends BlockBase<'callout'> {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

/** Up to three recent posts or articles, each linking out. */
export interface PostListBlock extends BlockBase<'post_list'> {
  heading: string;
  items: PostItem[];
}

/** A feature article with a kicker, an image beside it and an optional link. */
export interface ArticleBlock extends BlockBase<'article'> {
  /** Small label above the title, e.g. "Member toolbox". */
  kicker: string;
  title: string;
  body: string;
  image?: ImageRef;
  linkLabel?: string;
  linkUrl?: string;
}

/** "Sept. 5 · Farmers market | Town square" lines: a community calendar. */
export interface DatedListBlock extends BlockBase<'dated_list'> {
  heading: string;
  subheading: string;
  items: DatedItem[];
}

export interface TextBlock extends BlockBase<'text'> {
  heading?: string;
  body: string;
  /**
   * `html`: the body is rich HTML (sanitised and inlined at render). Declared rather than
   * guessed — a plain body that happens to mention "<b>" is text, and escaping it is the point.
   */
  format?: 'plain' | 'html';
}

export interface ImageBlock extends BlockBase<'image'> {
  image?: ImageRef;
  alt: string;
  caption?: string;
  linkUrl?: string;
}

export interface ImageTextBlock extends BlockBase<'image_text'> {
  image?: ImageRef;
  alt: string;
  heading: string;
  body: string;
  imageSide: 'left' | 'right';
  linkLabel?: string;
  linkUrl?: string;
}

/** Two or three columns. */
export interface ColumnsBlock extends BlockBase<'columns'> {
  columns: ColumnItem[];
}

/** A hero image, optionally with text over it (falls back to the ink band in Outlook). */
export interface BannerBlock extends BlockBase<'banner'> {
  image?: ImageRef;
  alt: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  overlay: boolean;
}

export interface ButtonBlock extends BlockBase<'button'> {
  label: string;
  url: string;
  variant: 'solid' | 'outline';
}

export interface DividerBlock extends BlockBase<'divider'> {
  thickness: 'hairline' | 'thick';
}

export interface SpacerBlock extends BlockBase<'spacer'> {
  size: 'small' | 'medium' | 'large';
}

export interface QuoteBlock extends BlockBase<'quote'> {
  quote: string;
  attribution?: string;
}

/** Two to four big numbers with labels. */
export interface StatsBlock extends BlockBase<'stats'> {
  items: StatItem[];
}

/** Two to six photos in rows of two or three. */
export interface PhotoGridBlock extends BlockBase<'photo_grid'> {
  photos: PhotoItem[];
}

/**
 * Contact details, links and the compliance line. Blank contact fields fall back to the brand
 * kit, so one brand kit edit updates every issue that has not overridden them. The renderer
 * keeps exactly one footer, visible and last, and appends the preference and unsubscribe links
 * from `RenderOptions` after `complianceText`.
 */
export interface FooterBlock extends BlockBase<'footer'> {
  address: string;
  phone: string;
  email: string;
  /** Empty: the brand kit's social links. */
  social: SocialLink[];
  links: Link[];
  /** Why the reader is receiving this, e.g. "You're receiving this because you joined…". */
  complianceText: string;
}

/** Every block Blockletter ships. Hosts add their own through `BlockDefinition`. */
export type BuiltInBlock =
  | HeaderBlock
  | LetterBlock
  | EventTilesBlock
  | SponsorsBlock
  | NameListBlock
  | CalloutBlock
  | PostListBlock
  | ArticleBlock
  | DatedListBlock
  | TextBlock
  | ImageBlock
  | ImageTextBlock
  | ColumnsBlock
  | BannerBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | QuoteBlock
  | StatsBlock
  | PhotoGridBlock
  | FooterBlock;

export type BuiltInBlockType = BuiltInBlock['type'];

export type BlockOfType<B extends BlockBase, T extends B['type']> = Extract<B, { type: T }>;

/** A block's own fields: everything a definition's `create()` supplies. */
export type BlockBody<B extends BlockBase> = Omit<B, keyof BlockBase>;

/** The item type of each list block — the blocks a `DataSource` can fill. */
export interface ListBlockItems {
  event_tiles: EventTileItem;
  sponsors: SponsorItem;
  name_list: NameListItem;
  post_list: PostItem;
  dated_list: DatedItem;
}

export type ListBlockType = keyof ListBlockItems;

// ---------------------------------------------------------------------------
// Documents, periods, templates
// ---------------------------------------------------------------------------

/** The dates an issue covers. All `YYYY-MM-DD`, in the organisation's own time zone. */
export interface IssuePeriod {
  /**
   * First day the issue covers.
   *
   * @pattern ^[0-9]{4}-[0-9]{2}-[0-9]{2}$
   */
  start: string;
  /**
   * Last day the issue covers.
   *
   * @pattern ^[0-9]{4}-[0-9]{2}-[0-9]{2}$
   */
  end: string;
  /**
   * Last day of the "coming up" window after `end`, for sources that list upcoming events.
   *
   * @pattern ^[0-9]{4}-[0-9]{2}-[0-9]{2}$
   */
  lookaheadEnd?: string;
}

/** One newsletter issue or one email: the same thing with a different number of blocks. */
export interface NewsletterDocument<B extends BlockBase = BuiltInBlock> {
  /** Document format version; `migrateDocument` upgrades older ones. */
  version: 1;
  subject: string;
  /** The line an inbox shows after the subject. */
  preheader: string;
  period?: IssuePeriod;
  blocks: B[];
}

/**
 * A reusable starting layout. `subject`, `preheader` and every block string may carry tokens —
 * `{{month}}`, `{{monthYear}}`, `{{year}}`, `{{period}}`, `{{org}}` — filled by `applyTemplate`.
 */
export interface NewsletterTemplate<B extends BlockBase = BuiltInBlock> {
  id: string;
  name: string;
  description: string;
  /** Shipped with Blockletter (or the host); read-only in the template picker. */
  builtIn?: boolean;
  subject: string;
  preheader: string;
  blocks: B[];
}

// ---------------------------------------------------------------------------
// Brand kit
// ---------------------------------------------------------------------------

/** Web-safe fonts only: email clients cannot be relied on to load webfonts. */
export const BRAND_FONTS = [
  'Georgia',
  'Helvetica',
  'Arial',
  'Verdana',
  'Trebuchet MS',
  'Times New Roman',
] as const;

export type BrandFont = (typeof BRAND_FONTS)[number];

/** One organisation's look and identity, applied to every document it renders. */
export interface BrandKit {
  /** Organisation name: the footer's first line and the logo's fallback text. */
  name: string;
  logo?: ImageRef;
  colors: {
    /** Text, headings, and the dark bands (event tiles, footer). */
    ink: HexColor;
    /** Buttons, kickers and numbers. */
    accent: HexColor;
    /** Event-tile day numbers. */
    highlight: HexColor;
    /** Background behind the 600px card, and the soft section background. */
    page: HexColor;
  };
  fonts: {
    heading: BrandFont;
    body: BrandFont;
  };
  contact: {
    address: string;
    phone: string;
    email: string;
    /** The organisation's site, shown under the card. */
    website: string;
  };
  social: SocialLink[];
}

// ---------------------------------------------------------------------------
// Data sources
// ---------------------------------------------------------------------------

export interface DataSourceContext {
  period?: IssuePeriod;
  signal?: AbortSignal;
}

/**
 * Host data that fills a list block: upcoming events, sponsors, new members, recent posts. The
 * host implements `items` against its own database; Blockletter calls it to refresh a block and
 * to offer candidates in the editor's picker.
 *
 * Conventional ids, which the built-in templates use: `events` (event_tiles), `sponsors`,
 * `new_members` (name_list), `posts` (post_list), `calendar` (dated_list).
 */
export interface DataSource<T extends ListBlockType = ListBlockType> {
  /** Stored on blocks this source fills (`BlockBase.source`). */
  id: string;
  /** Shown as "Refresh from {label}". */
  label: string;
  blockType: T;
  /** Candidates for the period, in the order they should appear. Each should carry `ref`. */
  items(context: DataSourceContext): ListBlockItems[T][] | Promise<ListBlockItems[T][]>;
  /** How many items a refresh keeps. Defaults to the block type's own limit. */
  limit?: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** One problem with a document. `path` is a JSON-pointer-like trail, e.g. `blocks/3/items/0/title`. */
export interface ValidationIssue {
  code: string;
  message: string;
  blockId?: string;
  path?: string;
  /**
   * What `message` was made from beyond `code` and `path`, for a form that words the problem in a
   * language of its own: a limit (`max`, `min`), or which part of an image is wrong (`problem`).
   */
  values?: Readonly<Record<string, string | number>>;
}
