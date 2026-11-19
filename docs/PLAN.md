# Blockletter plan

Blockletter is the newsletter builder from Subterra's chamber-of-commerce platform, extracted
into a standalone, reusable project. One repository holds the source, the demo and the docs, public
under the MIT licence since 2026-10-07. This file is the road from 0.1 to 1.0. Smaller items live
as [GitHub issues](https://github.com/Subterra-Technologies/blockletter/issues).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the package design and public API.

## Where it stands (2026-11-16)

0.1.0 is on npm. Two of Subterra's products host the builder, and both have moved past it:

- **The platform it was extracted from** still runs its own copy and has kept improving it:
  Markdown in every free-text field with a formatting toolbar, a stricter rich-text sanitiser, and
  tools that let an AI assistant draft and edit an issue.
- **One** runs the published packages, patched for a frameless layout and a system font, and
  replaces the header and footer to get a centred logo and a light footer.
- **Both** built the same layer for AI assistants on top: a catalogue of blocks, completing
  half-written blocks, all-or-nothing edits, and checks for contrast, links and alt text.

Two things limit it for everyone else:

- **It assumes an organisation's monthly issue.** Several built-in blocks and every template are
  about events, sponsors, new members and an issue period. A company sending a product update or a
  one-off announcement works around them, down to rewording "you signed up for our updates".
- **A block of your own is expensive.** Its fields are written five times (the type, `create`,
  `validate`, the editor form, the JSON Schema), its HTML is hand-written email tables, and it
  cannot be filled from a data source: sources fill only the five built-in list blocks.

So the order is: catch up with the hosts, make blocks cheap to build, then broaden what ships,
writing the new blocks with the new API.

## Status

| Phase | Scope                                                      | Release | State   |
| ----- | ---------------------------------------------------------- | ------- | ------- |
| 0–4   | Repo, core, React editor, demo and quality gates, releases | 0.1     | Done    |
| A     | Catch up with the hosts                                    | 0.2     | Built   |
| B     | Blocks that are easy to build                              | 0.3     | Next    |
| C     | Beyond the monthly issue                                   | 0.4     | Planned |
| D     | Both hosts on Blockletter, then the 1.0 API review         | 0.5–1.0 | Planned |

Sizes: **S** is a day or less, **M** a few days, **L** a week or more.

## A — Catch up with the hosts (0.2)

Done when One deletes its patch and its header and footer overrides, and every newsletter fix the
source platform made since the extraction is in core.

1. **Rich-text sanitiser (S).** Bring it level with the source platform's hardening since the
   extraction: only the styles and classes formatting uses, `https:` images, quoted values read
   whole, links closed. Security work, so it goes first, with that platform's list of hostile
   inputs ported as tests ([#41](https://github.com/Subterra-Technologies/blockletter/pull/41)).
2. **Relative links in rich text (S).** A `/events` link in a text block is dropped today, even
   with `baseUrl` set, and nothing warns. Resolve it against `baseUrl` like every other link.
3. **Frame and fonts (S).** `RenderOptions.frame: 'card' | 'plain'` for the boxed card or a
   frameless page, with the editor canvas following it. A `System` brand font (the device's own UI
   face, then Helvetica and Arial) as a new choice, rather than redefining an existing one.
4. **Header and footer (M).** `align: 'center'` centres the header's logo in every client,
   Outlook included (it is a block image with no centring today), and the logo's width becomes a
   field. A light, centred footer variant beside the band; the brand's website in the footer;
   `BrandKit.complianceText`, used by a new footer and by the one the renderer adds, instead of
   "you signed up for our updates".
5. **Markdown in free-text fields (L).** Ported from the source platform. Inline (bold, italic,
   strikethrough, links with unsafe schemes neutralised) and block (headings, lists, quotes,
   dividers) Markdown in every free-text field: letter, callout, article, image + text, columns,
   quote, sponsor notes and list intros. A `ctx.markdown()` render helper gives host blocks the
   same. The plain-text part drops the marks. A snapshot test proves text without symbols renders
   byte for byte as before. In React, a `MarkdownField` with a formatting toolbar (heading menu,
   bold, italic, strikethrough, link, lists; Ctrl/Cmd+B, I and K; undo keeps working). The text
   block keeps its HTML format. AI assistants write Markdown by habit, so this also ends the
   asterisks that reach inboxes today.
6. **Replacing a built-in's look (S).** `overrideBlock(definition, { render })` keeps a built-in's
   form and changes its email HTML, with the canvas drawing the new HTML. Today a host copies the
   editor definition and clears its `Canvas` by hand.
7. **Asked for by One (M).** A view-in-browser link (`RenderOptions.webVersionUrl`), and attaching
   a data source to a list block from the palette rather than only through a template.

## B — Blocks that are easy to build (0.3)

Done when a new block is one definition of its fields and a render function, written without email
table markup, and everything else (type, defaults, validation, form, schema, AI catalogue, data
filling, tests) comes from it.

1. **Field schemas (L).** Fields declared once:

   ```ts
   export const jobBlock = defineBlock({
     type: 'job',
     label: 'Job opening',
     description: 'A role you are hiring for, with an apply button.',
     group: 'content',
     fields: {
       title: field.text({ default: 'Full stack developer', max: 120 }),
       location: field.text({ default: 'Remote' }),
       summary: field.markdown(),
       url: field.url({ label: 'Apply link' }),
     },
     render: (block, ctx) =>
       ctx.section(
         block,
         ctx.html`
         ${ctx.heading(block.title, { size: 20 })}
         ${ctx.markdown(block.summary)}
         ${ctx.button('Apply', block.url)}`,
       ),
   });
   ```

   From the fields come the TypeScript type, `create()`, `validate()`, the JSON Schema entry, the
   AI catalogue entry and a generated inspector form. Field kinds: text, markdown, html, url, image,
   colour, choice, number, toggle, date, link and list (of fields, with a minimum and maximum).
   Escape hatches: an own `validate`, an own `Editor`, an own field kind. No runtime dependencies.
   Today's `defineBlock` keeps working, and the built-ins move over one at a time, starting with
   the callout. The AI catalogue entry comes with B5, which reads the same fields.

2. **Email-safe render helpers (M).** An auto-escaping `ctx.html` template tag, so escaping is
   the default rather than a habit. Layout helpers that write the tables, Outlook ghost tables and
   phone stacking: `ctx.columns()`, `ctx.card()`, `ctx.image()`, `ctx.markdown()`.
3. **Data sources for any block (M).** A definition says which list field a source fills, how many
   items it keeps, their order, and whether a refresh replaces or merges them.
   `DataSource.blockType` takes any type. The built-in list blocks' special cases move into their
   own definitions, so nothing in `sources.ts` names a block.
4. **Block packs (S).** `{ definitions, editorBlocks, templates, sources }` registered once:
   `<NewsletterEditor packs={[jobsPack]} />` and `renderEmail(doc, { packs })`.
5. **AI kit, from the field schemas (M).** `@subterra-technologies/blockletter/agent`, replacing
   what both hosts wrote: `describeBlocks()` (each block's purpose, fields and a filled example);
   `completeBlocks()` (missing ids, `hidden`, a bare footer); `applyChanges()` (add, update,
   restyle, move, hide, remove; all or nothing, with refusals that say what to fix); per-block
   checks for contrast on the block's own background (4.5:1), links that work in an email, and alt
   text. Render warnings gain a `severity` (`blocking` or `advisory`) so hosts stop keeping their
   own list.
6. **Testing kit (M).** `@subterra-technologies/blockletter/testing`: render a block from
   fixtures, snapshot it, and run the checks every block must pass: each text field escaped against
   a hostile payload, alt text on images, a plain-text part, nothing wider than its column, and CSS
   that email clients drop flagged.
7. **Scaffold and guide (M).** `npm create blockletter-block` writes the definition, the editor
   block and a test. The guide to writing your own block
   ([#12](https://github.com/Subterra-Technologies/blockletter/issues/12)), and a "Build a block"
   section in the demo with a live example.

## C — Beyond the monthly issue (0.4)

Done when someone with no events, sponsors or members can open the editor and see blocks,
templates and words that fit what they send.

1. **Essentials and a community pack (M).** The built-ins split into essentials (header, text,
   image, image + text, article, letter, button, callout, columns, banner, quote, stats, photo
   grid, post list, event tiles, divider, spacer, footer) and an opt-in community pack (sponsors,
   name list, dated list, and the monthly-newsletter template with its sources). Stored documents
   do not change; a host that uses those blocks registers the pack. Neutral defaults throughout: a
   header without "Newsletter" and `{{monthYear}}`, a neutral compliance line.
2. **Emails, not only issues (M).** The issue period becomes something a document opts into. With
   no source that needs dates, the editor shows no period fields, issue wording or month presets,
   and its words say "email" where they say "issue".
3. **New general blocks (L), each written with B's API.** Social icons
   ([#5](https://github.com/Subterra-Technologies/blockletter/issues/5)); video (a thumbnail with
   a play button, linking out); product card and product grid (picture, name, price, button);
   table; link bar; logo strip (the general form of sponsors); testimonial (quote with a photo and
   role); sign-off; and a sanitised HTML block for advanced users. An RSS/Atom feed source for the
   post list, as a worked example of a source.
4. **Personalisation (L)** ([#6](https://github.com/Subterra-Technologies/blockletter/issues/6)).
   The host declares merge fields (key, label, sample value, fallback). Text fields get an Insert
   field menu and the preview a sample recipient. Output is either the email service's own tag
   syntax, through small adapters (Resend, Mailchimp, Postmark), or one render per recipient
   (`renderEmail(doc, { recipient })`). Later: a block shown only to a segment the host defines.
5. **Email quality (M each).** Dark-mode styles
   ([#4](https://github.com/Subterra-Technologies/blockletter/issues/4)), Outlook background
   images ([#3](https://github.com/Subterra-Technologies/blockletter/issues/3)), checks in real
   mail apps ([#11](https://github.com/Subterra-Technologies/blockletter/issues/11)), click to
   select in the preview ([#2](https://github.com/Subterra-Technologies/blockletter/issues/2)),
   two panes at tablet widths ([#9](https://github.com/Subterra-Technologies/blockletter/issues/9)),
   and the top bar at 320px ([#10](https://github.com/Subterra-Technologies/blockletter/issues/10)).
6. **Nested layouts (spike, S).** A row of two or three columns, each holding blocks, is what most
   builders offer and the one thing the flat block list cannot do. Design it in 0.4; build it after
   1.0 if the design holds up.

## D — Both hosts on Blockletter, then 1.0

1. **One (S).** Drops its patch and overrides, and uses the AI kit and the Convex adapter.
2. **Convex adapter (L)** ([#7](https://github.com/Subterra-Technologies/blockletter/issues/7)).
   Validators for the document, brand kit and template, composable with a host's own blocks; an
   upload hook around `generateUploadUrl` returning an `ImageRef`; a server helper that resolves
   `assetId`s before `renderEmail`; optionally a Convex component owning templates and the brand kit.
3. **The source platform moves off its copy (L).** Its data blocks come from the community pack and
   its sources are written against its own records. Rendering parity tests compare against the old
   output, starting from its byte-for-byte snapshot of plain text, before it switches over. Issues
   already sent stay as they were.
4. **1.0 API review (M)** ([#8](https://github.com/Subterra-Technologies/blockletter/issues/8)).
   Everything exported is meant to be supported, and the field-schema `defineBlock` is the block
   API.

## Done (0.1)

- **0 — Repo:** monorepo (npm workspaces, TypeScript strict, tsup, Vitest, ESLint, Prettier), CI,
  and a denylist guard that fails on the source client's details.
- **1 — Core:** document model, 21 blocks as `BlockDefinition`s, an email renderer that reflows on
  phones and keeps 600px in Outlook, brand kit, templates, periods, data sources, validation.
- **2 — React editor:** canvas with a full keyboard path, palette, inspector, appearance, brand kit,
  templates, preview, undo and redo, formatted text in text blocks, every word translatable.
- **3 — Demo and quality gates:** the demo is live developer docs; Playwright and axe at 320, 390,
  768 and 1440px in CI.
- **4 — Releases:** Changesets and npm trusted publishing ([RELEASING.md](./RELEASING.md)).
  `0.1.0` published 2026-10-08; repository public, demo live at
  https://subterra-technologies.github.io/blockletter/.

## Decisions

1. **Own block model and renderer.** MJML, react-email, Unlayer, GrapesJS and EmailBuilder.js
   were considered by the source project and rejected: no typed domain blocks to automate,
   heavy or proprietary editors, or immature packages. The hand-written table renderer has no
   dependencies and runs in any JavaScript runtime.
2. **Snapshot items, not id lookups.** Makes rendering pure and portable; refresh is explicit.
3. **Built-ins are plugins.** Guarantees the extension API is good enough for real blocks.
4. **Fresh history.** The project starts clean, without the history of the codebase it came from.
5. **npm workspaces + tsup + a source export condition.** Familiar tooling; no build step
   inside the repo; ESM output for consumers.
6. **Compiled, prefixed Tailwind.** Keeps the source's styling approach while asking nothing
   of consumers' CSS setup.
7. **One repository, private until launch.** Source, demo and docs live together; the demo
   publishes from this repository's Pages once it is public. A separate public demo repository
   was tried and retired.
8. **MIT licence.** Chosen for the widest use by the community.
9. **A developer-facing demo with no sales pitch.** The demo credits Subterra lightly and names
   no clients, partners or press.

## Open questions

Each has a recommended answer; the plan assumes it until decided otherwise.

1. **Markdown or rich HTML in free-text fields?** Recommended: Markdown (A5). Documents stay plain
   strings, AI assistants write it unprompted, and the source platform has it in use. The text
   block keeps HTML for pasted, formatted copy.
2. **Which blocks leave the essentials?** Recommended: sponsors, name list and dated list (C1).
   Event tiles and the post list stay, because companies send webinars and blog round-ups too.
3. **Do field schemas define the types, or do TypeScript interfaces stay first?** Recommended: the
   schema defines them (B1), with a small builder of our own and no dependencies.
4. **Nested layouts in 1.0?** Recommended: no. Spike in 0.4, build after 1.0 (C6).
5. **Package name.** Keep `@subterra-technologies/*` on public npm, or publish as `blockletter` /
   `@blockletter/*`?
