# Blockletter architecture

Blockletter is a block-based email newsletter builder: a typed document model, an email-safe
HTML + plain-text renderer, and an accessible React editor. It is persistence-agnostic: the host
application owns storage, auth, recipients, approval and delivery; Blockletter owns the document,
how it renders, and how a person edits it.

## Packages

| Package                                                 | Path              | What it is                                                                                                | Runtime deps                                                                         |
| ------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `@subterra-technologies/blockletter`                    | `packages/core`   | Document model, block registry, renderer, brand kit, templates, periods, data-source contract, validation | none                                                                                 |
| `@subterra-technologies/blockletter-react`              | `packages/react`  | The editor UI: canvas, palette, inspector, appearance, brand kit, templates, preview                      | react (peer), radix-ui, lucide-react, clsx, tailwind-merge, class-variance-authority |
| `@subterra-technologies/blockletter-convex` _(planned)_ | `packages/convex` | Convex validators, storage-backed images, optional component                                              | convex (peer)                                                                        |
| playground                                              | `apps/playground` | Vite demo app; localStorage persistence; fictional data sources                                           | —                                                                                    |

Inside the repo, packages import each other's **source** through the `blockletter-source` export
condition (`tsconfig.base.json` `customConditions`, Vite/Vitest `resolve.conditions`), so tests,
typechecks and the playground never need a prior build. Published consumers get `dist/`.

## Principles

1. **One document, rendered anywhere.** A `NewsletterDocument` is plain JSON. The renderer is a
   pure function (no I/O, no clock, no randomness), so the same document renders identically in
   a Convex query, a Node worker, an edge function, or the browser preview.
2. **Snapshots, not lookups.** Data-filled blocks store copies of what they show, tagged with the
   source's `ref`. Rendering never needs a database; refreshing is explicit.
3. **The host decides workflow.** Draft / approve / schedule / send, recipients and audit trails
   are the host's. The editor exposes slots (`toolbar`, `readOnly`) rather than opinions.
4. **Every built-in is a plugin.** Built-in blocks are `BlockDefinition`s registered exactly the
   way a host registers its own; nothing in the renderer or editor switches on built-in types.
5. **Accessible by default.** WCAG 2.2 AA, axe-clean, every drag gesture has a keyboard path,
   320px works.
6. **Email-safe output.** Table layout, inline styles, web-safe fonts, absolute URLs, escaped
   text, sanitised rich text, a hidden preheader, Outlook fallbacks.

## Core package API (`@subterra-technologies/blockletter`)

The document types live in `packages/core/src/types.ts` and are the source of truth. The
functions below are the public surface; names are binding for the React package.

### Block definitions (the plugin API)

```ts
type BlockGroup = 'content' | 'layout' | 'graphics' | (string & {});

interface BlockDefinition<B extends BlockBase = BlockBase> {
  type: B['type'];
  label: string;            // "Event tiles"
  description: string;      // one line for the palette
  group: BlockGroup;
  /** Header/footer: at most one, cannot be deleted from the editor. */
  structural?: boolean;
  /** The block's own fields for a fresh block (no id/type/hidden/style/source). */
  create(): BlockBody<B>;
  /** Shape + rule validation of untrusted input. Empty array = valid. */
  validate(block: unknown, path: string): ValidationIssue[];
  /** Soft warnings the editor shows while the block is selected ("Add alt text"). */
  issues?(block: B): string[];
  /** The block's own text for one-line lists; `blockSummary` prefixes the label. */
  summary?(block: B): string;
  /** Email HTML: one or more `<tr>` rows (use `ctx.section`). Return '' to omit. */
  render(block: B, ctx: RenderContext): string;
}

builtInBlocks: readonly BlockDefinition[];          // all 21, in palette order (frozen)
headerBlock, letterBlock, … statsBlock;              // each built-in definition by name
defineBlock<B extends BlockBase>(definition: BlockDefinition<B>): BlockDefinition<B>;
// Validation helpers for host blocks, the same ones the built-ins use
validateObject(input, path, options): ObjectValidator; blockValidator(type, build);
getDefinition(type: string, definitions?): BlockDefinition | undefined;
BLOCK_GROUPS: readonly { id: BlockGroup; label: string }[];
paletteGroups(definitions?): { id; label; items: BlockDefinition[] }[];
```

### Blocks and documents

```ts
createBlock(type, definitions?): Block;              // fresh id, hidden: false; throws if unknown
newBlockId(type): string;
blockLabel(type, definitions?): string;
blockSummary(block, definitions?): string;
blockIssues(block, definitions?): string[];
isStructural(block, definitions?): boolean;
createDocument(init?: Partial<NewsletterDocument>): NewsletterDocument;
migrateDocument(input: unknown): NewsletterDocument; // upgrades older versions; v1 is identity

// Pure list operations shared by the editor and hosts
moveBlock(blocks, from, to); insertBlock(blocks, block, index?); removeBlock(blocks, id);
duplicateBlock(blocks, id); updateBlock(blocks, block); toggleHidden(blocks, id);
ensureFooter(blocks, createFooter): blocks;          // exactly one footer, visible, last

LIMITS: { maxBlocks: 30; maxTextLength: 5000; eventTiles: 4; posts: 3;
          columns: [2, 3]; stats: [2, 4]; photos: [2, 6] };
BLOCK_ALIGNMENTS; BLOCK_PADDINGS; BLOCK_FONT_SIZES; SOCIAL_NETWORKS; styleSummary(style);
validateDocument(doc, definitions?): ValidationIssue[];
assertValidDocument(doc, definitions?): asserts doc is NewsletterDocument; // throws BlockletterValidationError
class BlockletterValidationError extends Error { issues: ValidationIssue[] }
```

### Rendering

```ts
interface RenderOptions {
  brand?: BrandKit;                       // default DEFAULT_BRAND
  definitions?: readonly BlockDefinition[]; // default builtInBlocks; add custom ones here
  baseUrl?: string;                       // resolves relative links ("/events")
  resolveImageUrl?: (image: ImageRef) => string | undefined;
  preferencesUrl?: string;                // footer link; inserted verbatim (merge tags allowed)
  unsubscribeUrl?: string;                // footer link; inserted verbatim (merge tags allowed)
  annotate?: boolean;                     // data-block-id on each block, for previews; default false
  poweredBy?: { label: string; url: string }; // credit under the card; default none
  issueLabel?: string;                    // "September 2026 issue" under the card
  lang?: string;                          // <html lang>; default 'en'
  labels?: Partial<RenderLabels>;         // 'Read more', 'Manage preferences', 'Unsubscribe', …
}
interface RenderedEmail { html: string; text: string; warnings: string[] }

renderEmail(doc, options?): RenderedEmail;
renderBlock(block, options?): RenderedBlock;   // one block's rows, e.g. to draw a host block on a canvas
DEFAULT_LABELS; escapeHtml(value); absoluteUrl(url, baseUrl); splitParagraphs(body);
```

`warnings` are for the host and never block rendering: no unsubscribe URL, an image without alt
text, a relative link with no `baseUrl`, an image that only exists in the browser (`blob:` or an
image `data:` URL, which previews accept but inboxes cannot load), an unknown block type, HTML over
Gmail's ~102 KB clipping threshold.

**Phone layout.** The email is a fluid hybrid: a `max-width: 600px` card inside an Outlook-only
600px ghost table, so Outlook on Windows lays out exactly as a fixed table while every other
client shrinks to the screen. One small `<style>` block (class selectors behind media queries,
nothing Gmail rejects) turns side-by-side cells into full-width rows below 620px and trims side
padding; desktop rendering is unchanged. `RESPONSIVE_CLASSES` names the classes and
`RenderContext.classes` hands them to host blocks; `imageOrPlaceholder(…, { fill })` lets an image
grow to a stacked cell.

`RenderContext` is what a block's `render` receives: the resolved `palette`, font stacks,
`brand`, `labels`, plus helpers — `section(block, inner, options)`, `heading`, `paragraphs`,
`button`, `image(ref)`, `imageOrPlaceholder`, `optionalLink`, `url(href)`, `escape`, `px(size)`,
`text(...lines)` (the plain-text twin), `warn(message)`, `bodyStyle`/`smallStyle`, `options`,
and `width` (`{ full: 600, content: 536, inner }`, where `inner` accounts for the block's own
padding).

### Brand kit and palette

```ts
DEFAULT_BRAND: BrandKit;                  // neutral; never any client's identity
BRAND_FONTS; FONT_STACKS; fontStack(font): string;
interface Palette { page; card; border; text; muted; heading; accent; accentInk; accentText;
                    band; bandText; bandMuted; tileDay; soft; footer; footerText; link }
resolvePalette(brand?): Palette;          // brand colours over the default palette, contrast-aware
DEFAULT_PALETTE;
relativeLuminance(hex); contrastRatio(a, b); readable(color, on, ratio); labelOn(background);
isHexColor(value); HEX_COLOR: RegExp;
validateBrandKit(input: unknown): ValidationIssue[];
```

### Rich text

```ts
sanitizeHtml(html): string;              // strips scripts, handlers, unsafe URLs
inlineRichTextStyles(html, palette?): string; // editor classes → inline styles
htmlToText(html): string; plainTextToHtml(text): string;
```

### Periods, tokens and templates

```ts
isIsoDate(value); addDays(iso, days); compareIsoDates(a, b);
todayIn(timeZone: string, now?: Date): string;       // 'YYYY-MM-DD' in that zone
monthPeriod(monthKey): IssuePeriod; periodLabel(period): string;
validatePeriod(period, rules?): string[]; periodErrors(period, rules?): PeriodErrors;
PERIOD_PRESETS; presetRange(preset, today); applyPeriodPreset(…);
suggestPeriod(today, preset?, { lookaheadDays? }): IssuePeriod;
formatShortDate(iso, months?): string;                // AP style: "Sept. 5"
parseShortDate(text, year); monthLabel(monthKey); coversDate; isInLookahead;
periodTokens(period?, brand?): Record<string, string>;
fillTokens(value, tokens): string; fillBlockTokens(block, tokens);

BUILT_IN_TEMPLATES: readonly NewsletterTemplate[];
applyTemplate(template, { period?, brand? }): NewsletterDocument; // fresh ids, tokens filled
templateFromDocument(doc, { id, name, description }): NewsletterTemplate; // tokens restored
```

### Data sources

```ts
refreshBlock(block, source, context): Promise<Block>; // re-reads the source into a list block
assembleDocument(template, { period?, brand?, sources?, signal? }): Promise<NewsletterDocument>;
sourceFor(block, sources): DataSource | undefined;
```

Every text colour the palette produces meets WCAG AA: `accentInk` is the accent darkened (same
hue) until it reads as text on the card, `tileDay` is adjusted to 3:1 on the band, and labels on
buttons and bands pick whichever of light or dark reads.

Refresh rules: `event_tiles` takes the source's first `limit` items; `sponsors`, `name_list`
and `post_list` replace previously sourced items (those with `ref`) and keep hand-written ones;
`dated_list` keeps hand-written lines, adds the source's, and orders by `sortDate`. A block that
gains items is un-hidden; assembly hides sourced blocks that come back empty.

## React package API (`@subterra-technologies/blockletter-react`)

```tsx
import '@subterra-technologies/blockletter-react/styles.css';

<NewsletterEditor
  value={doc}                       // controlled NewsletterDocument
  onChange={setDoc}
  brand={brand}
  onBrandChange={saveBrand}         // optional; shows the Brand kit tab
  definitions={[...]}               // optional; built-ins + host blocks with editors
  sources={[eventsSource]}          // optional DataSources
  uploadImage={(file) => …}         // optional; enables image upload fields → ImageRef
  renderOptions={{ baseUrl, … }}    // passed to the live preview
  readOnly={status !== 'draft'}
  toolbar={<HostActions />}         // the host's Save / Approve / Send
/>
```

Composable parts for custom layouts: `NewsletterCanvas`, `BlockPalette`, `BlockInspector`,
`AppearancePanel`, `BrandKitEditor`, `TemplatePicker`, `SaveTemplateDialog`, `PreviewPane`,
`IssuePeriodFields`, `ColorField`, and `useNewsletterEditor()` (selection, insert, move,
duplicate, hide, remove, refresh — built on the core list operations).

Editor block definitions extend core ones with UI: `{ ...coreDefinition, icon, Editor, Canvas? }`.
A custom block with no `Canvas` is drawn on the canvas from its email HTML.

### Styling

The editor ships one compiled stylesheet, `styles.css`. It is Tailwind v4 compiled at build time
with the `bl` prefix (`bl:flex`), Preflight disabled, a reset scoped to `.bl-root`, and theme
tokens as `--bl-*` custom properties on `.bl-root` (light by default; `data-theme="dark"` or a
`.dark` ancestor for dark). Consumers need no Tailwind and no SCSS. Overlays portal into the
editor root so they keep its tokens. The email content on the canvas is styled inline from the
core palette, independent of the editor theme.

## What the host owns

- Persistence of documents, templates and brand kits (and their ids).
- Image storage (`uploadImage` → `ImageRef`; optionally `resolveImageUrl` at render).
- Data sources against its own records.
- Recipients, preference and unsubscribe URLs (per recipient, or an ESP merge tag).
- Workflow: drafts, approval, scheduling, sending, delivery status.
- Authorisation: who may edit, approve, send.
