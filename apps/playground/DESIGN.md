---
name: Blockletter demo
description: An app shell around the Blockletter newsletter editor, with live docs as its second view, in the editor's own zinc world with one navy accent.
colors:
  ground: '#fafafa'
  surface: '#ffffff'
  subtle: '#f4f4f5'
  rule: '#e4e4e7'
  rule-strong: '#d4d4d8'
  ink: '#18181b'
  ink-raised: '#27272a'
  body: '#3f3f46'
  muted: '#52525b'
  subterra-navy: '#04263f'
  navy-tint: '#e7eef3'
  code-string: '#0f6e5a'
  code-comment: '#63636b'
  error: '#b42318'
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 'clamp(1.75rem, 1.1rem + 2vw, 2.5rem)'
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: '-0.03em'
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 'clamp(1.5rem, 1.2rem + 1vw, 1.875rem)'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '-0.02em'
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: '1rem'
    fontWeight: 650
  lede:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: '1.0625rem'
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 400
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: '0.8125rem'
    fontWeight: 500
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: '0.8125rem'
    fontWeight: 400
    lineHeight: 1.65
rounded:
  xs: '5px'
  sm: '6px'
  md: '8px'
  code: '10px'
  lg: '12px'
  sheet: '16px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  inset: 'clamp(12px, 1.5vw, 20px)'
  gutter: 'clamp(16px, 4vw, 40px)'
  section: 'clamp(56px, 8vw, 96px)'
components:
  top-bar:
    backgroundColor: '{colors.surface}'
    height: '56px'
    padding: '0 clamp(12px, 1.5vw, 20px)'
  sample-bar:
    backgroundColor: '{colors.ground}'
    height: '52px'
    padding: '8px clamp(12px, 1.5vw, 20px)'
  view-link:
    textColor: '{colors.muted}'
    typography: '{typography.body-small}'
    padding: '0 12px'
    height: '55px'
  view-link-current:
    textColor: '{colors.ink}'
  source-button:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '0 12px'
    height: '36px'
  source-button-compact:
    width: '36px'
    padding: '0'
  button:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '0 14px'
    height: '36px'
  button-hover:
    backgroundColor: '{colors.subtle}'
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.surface}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '0 14px'
    height: '36px'
  button-primary-hover:
    backgroundColor: '{colors.ink-raised}'
  button-quiet:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '0 10px'
    height: '32px'
  button-tool:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: '0 10px'
    height: '32px'
  icon-button:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    size: '40px'
  sample-toggle:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '0 12px'
    height: '40px'
  select:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '0 34px 0 12px'
    height: '36px'
  sheet:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.sheet}'
    padding: '4px 16px 24px'
  nav-link:
    textColor: '{colors.muted}'
    typography: '{typography.body-small}'
    padding: '0 12px'
    height: '48px'
  nav-link-current:
    textColor: '{colors.ink}'
  tab:
    textColor: '{colors.muted}'
    typography: '{typography.body-small}'
    padding: '0 12px'
    height: '40px'
  tab-selected:
    textColor: '{colors.ink}'
  panel:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.lg}'
    padding: '18px 20px 16px'
  code-panel:
    backgroundColor: '{colors.subtle}'
    textColor: '{colors.ink-raised}'
    typography: '{typography.code}'
    rounded: '{rounded.code}'
    padding: '16px'
  tag:
    backgroundColor: '{colors.navy-tint}'
    textColor: '{colors.subterra-navy}'
    rounded: '{rounded.pill}'
    padding: '1px 8px'
  inline-code:
    backgroundColor: '{colors.subtle}'
    typography: '{typography.code}'
    rounded: '{rounded.xs}'
    padding: '1px 5px'
---

# Design System: Blockletter demo

## Overview

**Creative North Star: "The Editor's Own Desk"**

The demo is the Blockletter editor's world carried out to the screen around it. The editor ships a zinc-neutral, shadcn-lineage stylesheet (`--bl-*` tokens: white background, `#e4e4e7` border, `#f4f4f5` muted, `#18181b` primary). The demo (`--pg-*` tokens in `src/playground.css`) reuses those same values for its ground, rules, subtle fills and ink, so the editor reads as the subject rather than an embedded foreign widget. The demo never reaches inside `.bl-root`; it only frames it.

It is an app shell with two views of one issue. The Editor view is the tool itself: a white top bar, a slim sample bar on the ground, and the editor filling every remaining pixel, its panes scrolling on their own while the page stays still. The Docs view reads as good developer documentation: the same top bar held at the top, a sticky section nav under it, and sections that pair prose with a live panel driven by the issue open in the editor. Surfaces are white on a near-white ground, separated by 1px rules rather than fills or heavy shadows. Subterra navy is the one accent and stays scarce: the wordmark, links, the current view, the current section, the selected tab and code keywords.

**Key Characteristics:**

- Zinc neutrals; surface, wash, hairline and ink match the editor's default theme value for value.
- One accent, Subterra navy, used for location and links, never for fills of large areas.
- 1px hairline rules carry structure; the editor is the one lifted surface on the page, and the small-screen sheet the one modal layer.
- One system sans for all prose and UI; monospace only for code, API names and keys.
- Two motions on one ease: the section-nav indicator slide and the sample sheet's rise, both removed under reduced motion.

## Colors

A zinc greyscale with a single deep navy voice and a quiet three-colour code highlight.

### Primary

- **Subterra Navy** (`subterra-navy`): the wordmark, prose and footer links, the current-view underline in the top bar, the sliding current-section indicator, the selected tab underline, focus outlines, caret colour, and code keywords. Its tint **Navy Mist** (`navy-tint`) backs the small "fills from data" tag.

### Neutral

- **Paper Ground** (`ground`): the page background, the sample bar it shares, and the sticky section nav's fill.
- **White Surface** (`surface`): top bar, footer, panels, the sheet, buttons, selects, code-panel title bars.
- **Zinc Wash** (`subtle`): code-panel bodies, table header rows, inline code, button hover.
- **Hairline** (`rule`): every 1px divider, panel and code-panel border, and the sheet's edge. Same value as the editor's `--bl-border`.
- **Hairline Strong** (`rule-strong`): control borders (buttons, the source link, the sample toggle, icon buttons, selects, kbd) and the credit link's resting underline.
- **Ink** (`ink`): headings, control text, the primary button fill; at 32% it is the sheet's backdrop. Same value as the editor's `--bl-primary`.
- **Ink Raised** (`ink-raised`): primary button hover and code body text.
- **Body Zinc** (`body`): section prose and the docs lede.
- **Muted Zinc** (`muted`): labels, meta text, the credit link, inactive view and section links and tabs, block icons.

### Code and status

- **Code Green** (`code-string`): string literals only.
- **Comment Zinc** (`code-comment`): comments only, italic.
- **Error Red** (`error`): inline failure messages from a data source.

### Named Rules

**The One Voice Rule.** Navy is the only accent on the page. It marks where you are and what you can follow; it never fills a band, card or hero. Code Green exists only inside code.

**The Shared Zinc Rule.** Page neutrals come from the zinc scale the editor's theme is drawn from, and the structural ones (surface, wash, hairline, ink) match the editor's `--bl-*` defaults exactly. Before adding a grey, check it against both.

**The Sample Brand Stays in the Sample Rule.** Subterra's logo blue and the rest of the sample issue's palette belong to the email inside the editor, not to the page chrome.

## Typography

**Body Font:** the system UI sans stack (`ui-sans-serif, system-ui, ...`)
**Mono Font:** the system monospace stack (`ui-monospace, SFMono-Regular, Menlo, ...`)

**Character:** the same plain system sans the editor uses, so the demo and its subject share one voice; monospace marks anything a developer would type.

### Hierarchy

- **Display** (700, `clamp(1.75rem, 1.1rem + 2vw, 2.5rem)`, 1.08, -0.03em): the Docs view's single H1, balanced, max 30ch. The Editor view's H1 is visually hidden; the editor is its heading.
- **Headline** (700, `clamp(1.5rem, 1.2rem + 1vw, 1.875rem)`, 1.15, -0.02em): docs section H2s.
- **Title** (650, 1rem): panel headings and the sheet's heading; catalog group headings and block names at 0.9375rem.
- **Lede** (400, 1.0625rem, 1.6): the one paragraph under the docs H1, in Body Zinc, max 68ch. The wordmark shares its size at 700 with -0.01em tracking.
- **Body** (400, 16px, 1.6): prose, max 62ch in sections.
- **Body Small** (0.875rem): controls, view and section links, tabs, meta, tables, footer, the credit link.
- **Label** (500, 0.8125rem): field labels, the reset sentence, code-panel titles, quiet and tool buttons, the npm version pill. Sentence case, no tracking.
- **Code** (0.8125rem, 1.65): code panels; rendered output at 0.78125rem/1.6.

### Named Rules

**The Mono Means Code Rule.** Monospace appears only in code panels, inline `code`, rendered output and `kbd`. Never for labels, numbers or decoration.

**The Sentence Case Rule.** Labels, buttons, tabs and nav are sentence case at normal tracking; nothing is uppercased or letter-spaced on the page.

## Layout

The page is a flex column at least the screen tall. Both views share the top bar: 56px (`--pg-bar-height`), white, hairline below, its contents inset by `clamp(12px, 1.5vw, 20px)` (`--pg-inset`) and capped at 1760px (`--pg-app-max`).

**Editor view.** The first viewport is the editor itself. The page is exactly the screen (`height: 100dvh`) and never scrolls; below a 30rem-tall viewport it may scroll rather than crush the editor. Under the top bar, a 52px sample bar on the ground holds the sample pickers, New issue, and the reset sentence on one row; from 1024 to 1279px the sentence "Your edits stay in this browser" is visually hidden so the row holds, leaving the Reset button. The workspace takes the rest of the column with the same inset on the sides and bottom and the same 1760px cap; the editor fills it in its `fill` layout, its palette, canvas and inspector each scrolling on their own. Below 1024px (`COMPACT_QUERY`, `max-width: 1023px`) the sample bar becomes a 56px row of one sample toggle and two icon buttons, and the pickers move into a bottom sheet. The editor package switches to one pane at a time below 64rem of its own width, independent of the viewport.

**Docs view.** The page scrolls. The top bar sticks at the top and the section nav sticks under it at 56px; in-page jumps use `scroll-padding-top` of bar + nav + 16px (120px). Content sits in the 1200px reading column, `min(100% - 2 × gutter, 1200px)` with the gutter at `clamp(16px, 4vw, 40px)`, beginning with a short intro (H1, lede, stacked sample controls). Each section carries a 1px top rule and `--pg-section-pad` (`clamp(56px, 8vw, 96px)`) of vertical padding, with a negative `scroll-margin-top` of `12px - pad` so a jump lands its heading just under the two bars. Sections split prose 5fr and live panel 7fr from 1024px, gap 56px; stacked with a 40px gap below. The block catalog flows into two columns from 720px. The footer appears in this view only.

**Breakpoints in use:** 360px (the credit link drops from the bar), 400px (the sample toggle's "Sample" label is visually hidden), 600px (the sheet caps at 32rem and centres), 640px (the source link becomes icon-only, the credit stacks under the name, stacked controls go full width, tables tighten), 720px (section nav scrolls sideways with a fade mask; catalog columns), 1024px (sample bar inline, npm version pill shown, docs split), 1280px (the reset sentence returns).

Spacing steps run 4, 8, 12, 16, 20px inside components; panels pad 20px horizontally. No horizontal page scroll at 320px in either view.

## Elevation & Depth

Depth is tonal and ruled: white surfaces on the paper ground, divided by hairlines. Shadows are reserved.

### Shadow Vocabulary

- **Editor lift** (`box-shadow: 0 1px 2px rgb(24 24 27 / 0.05), 0 18px 40px -20px rgb(24 24 27 / 0.22)`): only under the editor in the workspace, the page's subject.
- **Sheet lift** (`box-shadow: 0 -16px 40px -16px rgb(24 24 27 / 0.3)`): the bottom sheet, cast upward over a 0.32 Ink backdrop. A modal layer, not a page surface.
- **Panel hairline** (`box-shadow: 0 1px 2px rgb(24 24 27 / 0.04)`): live panels, barely there.

### Named Rules

**The One Lift Rule.** Only the editor is lifted off the ground. Every other page container is flat and bordered; the only other shadow belongs to the modal sheet, which sits above the page rather than on it.

## Shapes

Gently rounded, never pill-heavy. Panels, the editor frame and the loading placeholder use 12px; code panels 10px; buttons, selects, the source link, the sample toggle and icon buttons 8px; tool buttons and swatches 6px; inline code and kbd 5px. The bottom sheet alone takes a 16px top radius, square at the screen's bottom edge. Full pills are limited to small status marks (the npm version pill, the data tag). Borders are always 1px, except `kbd`, whose 2px bottom edge reads as a keycap.

## Components

### Buttons

Quiet, bordered, editor-sized.

- **Shape:** gently rounded (8px), 36px tall; 1px Hairline Strong border.
- **Default:** White Surface, Ink text, 0.875rem/500, 16px icon with 6px gap.
- **Primary:** Ink fill, white text; hover Ink Raised. One per band at most (New issue, Refresh).
- **Quiet:** 32px, 0.8125rem, for in-panel actions (copy, add to the issue, the sheet's Done).
- **Tool:** 32px with 6px radius, matching the editor toolbar it sits in. Download .html and Copy HTML live here on wide screens; Copy HTML holds a 6rem minimum width so "Copied" and "Copy failed" do not shift the bar.
- **Icon button:** 40px square, 8px radius, Hairline Strong border, an 18px icon; the visible-name-free form of Download and Copy beside the sample toggle under 1024px. Each keeps its name for screen readers, and the copy icon changes with the copy's outcome.
- **Hover / Focus:** background eases to Zinc Wash over 120ms; focus is a 2px navy outline, 2px offset. Disabled at 50% opacity.
- **Text link button:** navy, 1px underline at 3px offset, thickening to 2px on hover (Reset the demo).

### Inputs / Fields

- **Style:** native select with a custom chevron, 36px, 1px Hairline Strong border, 8px radius, White Surface.
- **Stacked:** label above in Label type, 6px gap (docs intro, the sheet). In the sheet, every field and New issue run full width in one column.
- **Inline:** label beside its picker, 8px gap, fixed picker widths (15rem, the issue 18rem) so the sample bar stays one row.
- **Hover:** border darkens to zinc-400 (`#a1a1aa`). **Focus:** the shared navy outline.

### Sample toggle and sheet

- **Toggle:** a 40px field-like button, 8px radius, Hairline Strong border, White Surface. A muted "Sample" label, then the organization and issue in Ink, truncated with an ellipsis, then a 16px sliders icon. Under 400px the label is visually hidden and the icon dropped, giving the sample's name the room.
- **Sheet:** a native `<dialog>` opened with `showModal`, rising from the bottom edge: White Surface, 16px top radius, hairline top edge, `4px 16px 24px` padding, at most `min(85dvh, 36rem)` tall. From 600px it caps at 32rem wide and centres with a hairline on three sides. Its head is a Title heading and a quiet Done button over a hairline. Backdrop is Ink at 0.32. Escape, Done or a tap on the backdrop closes it, and focus returns to the toggle.
- **Motion:** the sheet slides up from `translateY(100%)` and the backdrop fades in, both 320ms on `--pg-ease` (`cubic-bezier(0.16, 1, 0.3, 1)`). No transition under reduced motion.

### Navigation

- **Top bar:** 56px, white, hairline below. The navy bold wordmark with a muted "by Subterra Technologies" credit link, underlined in Hairline Strong and turning navy under the pointer; under 640px the credit stacks beneath the name, and under 360px it leaves the bar. Then the view links, and on the right the npm version pill (from 1024px) and the GitHub source link.
- **View links:** Editor and Docs, 55px tall to sit on the bar's bottom rule, Body Small/500, Muted Zinc turning Ink on hover and when current. The current view carries a 2px navy underline laid over the bar's hairline. It is static; it does not slide.
- **Source link:** a 36px bordered button with the GitHub mark and "GitHub", hover Zinc Wash; under 640px a 36px square with the mark alone, its name kept for screen readers.
- **Section nav (Docs):** sticky under the top bar, Paper Ground fill, 48px links in Body Small/500, Muted Zinc turning Ink on hover and when current. A 2px navy indicator slides under the current link (320ms on `--pg-ease`), static under reduced motion. Above the first section nothing is current and the indicator has no width. Under 720px the list scrolls sideways behind a fade mask and keeps the current link in view.

### Tabs

Underline tabs, 40px, Muted Zinc to Ink; the selected tab carries a 2px navy bottom border. Arrow keys, Home and End move between tabs.

### Cards / Containers

- **Live panel:** 12px radius, White Surface, hairline border, panel hairline shadow; a head (18px 20px 16px) and optional foot (14px 20px), both ruled.
- **Code panel:** 10px radius, Zinc Wash body, white title bar with a quiet copy button; wrapped lines hang 2ch.
- **Tables:** full width, Body Small, 12px 20px cells (12px inline under 640px), Zinc Wash header row in Muted Zinc 600.

### Block catalog row

A three-column row (20px icon, text, action) ruled beneath, with a navy-tint pill tag marking blocks that fill from data and a quiet "Add" button that inserts into the open issue.

## Do's and Don'ts

### Do:

- **Do** take every neutral from the shared zinc set; the demo and the editor must read as one surface.
- **Do** keep navy for links, location (current view, section indicator, selected tab), focus and code keywords.
- **Do** separate bars, sections and panel regions with 1px Hairline rules, not fills or shadows.
- **Do** size controls to the editor: 36px page controls, 32px in or beside editor chrome, 40px for the compact sample bar's touch targets.
- **Do** let the Editor view be the screen: the page holds still and the editor's panes scroll.
- **Do** give every motion a reduced-motion fallback with no movement.
- **Do** scope page styles outside `.bl-root`; frame the editor, never restyle it.

### Don't:

- **Don't** add a second accent colour to the page chrome; Code Green lives only in code.
- **Don't** lift any page surface but the editor with a visible shadow; only a modal layer may cast another.
- **Don't** use monospace outside code, rendered output and keys.
- **Don't** bring the sample issue's other brand colours (Subterra logo blue and the issue's palette) into page chrome.
- **Don't** uppercase or letter-space labels, buttons or nav.
