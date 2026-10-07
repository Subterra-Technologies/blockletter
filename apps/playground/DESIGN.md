---
name: Blockletter demo
description: Live documentation around the Blockletter newsletter editor, in the editor's own zinc world with one navy accent.
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
    fontSize: 'clamp(1.625rem, 1.1rem + 1.6vw, 2.25rem)'
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
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  gutter: 'clamp(16px, 4vw, 40px)'
  section: 'clamp(56px, 8vw, 96px)'
components:
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
  select:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '0 34px 0 12px'
    height: '36px'
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

The demo page is the Blockletter editor's world carried out to the page around it. The editor ships a zinc-neutral, shadcn-lineage stylesheet (`--bl-*` tokens: white background, `#e4e4e7` border, `#f4f4f5` muted, `#18181b` primary). The page (`--pg-*` tokens in `src/playground.css`) reuses those same values for its ground, rules, subtle fills and ink, so the editor reads as the page's subject rather than an embedded foreign widget. The page never reaches inside `.bl-root`; it only frames it.

Density is that of good developer documentation: a light top bar, a sticky section nav, then sections that pair prose with a live panel, all driven by the one issue open in the editor. Surfaces are white on a near-white ground, separated by 1px rules rather than fills or heavy shadows. Subterra navy is the one accent and stays scarce: the wordmark, links, the current-section mark, the selected tab and code keywords.

**Key Characteristics:**

- Zinc neutrals; surface, wash, hairline and ink match the editor's default theme value for value.
- One accent, Subterra navy, used for location and links, never for fills of large areas.
- 1px hairline rules carry structure; shadows are near-invisible except the single lift under the editor.
- One system sans for all prose and UI; monospace only for code, API names and keys.
- One motion: the section-nav indicator slide, removed under reduced motion.

## Colors

A zinc greyscale with a single deep navy voice and a quiet three-colour code highlight.

### Primary

- **Subterra Navy** (`subterra-navy`): the wordmark, prose and footer links, the sliding current-section indicator, the selected tab underline, focus outlines, caret colour, and code keywords. Its tint **Navy Mist** (`navy-tint`) backs the small "fills from data" tag.

### Neutral

- **Paper Ground** (`ground`): the page background and the sticky nav's fill.
- **White Surface** (`surface`): top bar, footer, panels, buttons, selects, code-panel title bars.
- **Zinc Wash** (`subtle`): code-panel bodies, table header rows, inline code, button hover.
- **Hairline** (`rule`): every 1px divider, panel and code-panel border. Same value as the editor's `--bl-border`.
- **Hairline Strong** (`rule-strong`): control borders (buttons, selects, kbd).
- **Ink** (`ink`): headings, control text, the primary button fill. Same value as the editor's `--bl-primary`.
- **Ink Raised** (`ink-raised`): primary button hover and code body text.
- **Body Zinc** (`body`): section prose paragraphs.
- **Muted Zinc** (`muted`): ledes, labels, meta text, inactive nav links and tabs, block icons.

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

**Character:** the same plain system sans the editor uses, so the page and its subject share one voice; monospace marks anything a developer would type.

### Hierarchy

- **Display** (700, `clamp(1.625rem, 1.1rem + 1.6vw, 2.25rem)`, 1.08, -0.03em): the single page H1, balanced, max 34ch.
- **Headline** (700, `clamp(1.5rem, 1.2rem + 1vw, 1.875rem)`, 1.15, -0.02em): section H2s.
- **Title** (650, 1rem): panel headings; catalog group headings at 0.9375rem.
- **Body** (400, 16px, 1.6): prose, max 62ch in sections, 72ch for the lede.
- **Body Small** (0.875rem): controls, nav links, tabs, meta, tables, footer.
- **Label** (500, 0.8125rem): field labels, code-panel titles, quiet and tool buttons, the pre-release pill. Sentence case, no tracking.
- **Code** (0.8125rem, 1.65): code panels; rendered output at 0.78125rem/1.6.

### Named Rules

**The Mono Means Code Rule.** Monospace appears only in code panels, inline `code`, rendered output and `kbd`. Never for labels, numbers or decoration.

**The Sentence Case Rule.** Labels, buttons, tabs and nav are sentence case at normal tracking; nothing is uppercased or letter-spaced on the page.

## Layout

A single centred shell, `min(100% - 2 × gutter, 1200px)`, with the gutter at `clamp(16px, 4vw, 40px)`. The first viewport is a compact intro (H1 across the row; lede and sample controls sharing the row beneath, stacking under 900px) followed directly by the editor at full shell width. Docs sections follow, each separated by a 1px top rule and `clamp(56px, 8vw, 96px)` of vertical padding, laid out as a split: prose 5fr and live panel 7fr from 1024px, gap 56px; stacked with a 40px gap below. The block catalog flows into two columns from 720px.

Spacing steps run 4, 8, 12, 16, 20px inside components; panels pad 20px horizontally. The section nav is sticky at the top at 48px; in-page jumps use `scroll-padding-top` of the nav height, and the editor's own sticky chrome is offset by the same value through `--bl-sticky-top`. Under 720px the nav scrolls sideways with a fade mask; under 640px controls and their buttons go full width. No horizontal page scroll at 320px.

## Elevation & Depth

Depth is tonal and ruled: white surfaces on the paper ground, divided by hairlines. Shadows are reserved.

### Shadow Vocabulary

- **Editor lift** (`box-shadow: 0 1px 2px rgb(24 24 27 / 0.05), 0 18px 40px -20px rgb(24 24 27 / 0.22)`): only under the editor, the page's subject.
- **Panel hairline** (`box-shadow: 0 1px 2px rgb(24 24 27 / 0.04)`): live panels, barely there.

### Named Rules

**The One Lift Rule.** Only the editor is lifted off the ground. Every other container is flat and bordered.

## Shapes

Gently rounded, never pill-heavy. Panels and the editor frame use 12px; code panels 10px; buttons and selects 8px; tool buttons and swatches 6px; inline code and kbd 5px. Full pills are limited to small status marks (the pre-release note, the data tag). Borders are always 1px, except `kbd`, whose 2px bottom edge reads as a keycap.

## Components

### Buttons

Quiet, bordered, editor-sized.

- **Shape:** gently rounded (8px), 36px tall; 1px Hairline Strong border.
- **Default:** White Surface, Ink text, 0.875rem/500, 16px icon with 6px gap.
- **Primary:** Ink fill, white text; hover Ink Raised. One per band at most (New issue, Refresh).
- **Quiet:** 32px, 0.8125rem, for in-panel actions (copy, add to the issue).
- **Tool:** 32px with 6px radius, matching the editor toolbar it sits in.
- **Hover / Focus:** background eases to Zinc Wash over 120ms; focus is a 2px navy outline, 2px offset. Disabled at 50% opacity.
- **Text link button:** navy, 1px underline at 3px offset, thickening to 2px on hover.

### Inputs / Fields

- **Style:** native select with a custom chevron, 36px, 1px Hairline Strong border, 8px radius, White Surface; label above in Label type, 6px gap.
- **Hover:** border darkens to zinc-400 (`#a1a1aa`). **Focus:** the shared navy outline.

### Navigation

- **Top bar:** 56px minimum, white, hairline below; navy bold wordmark with a muted underlined "by" link, pre-release pill on the right.
- **Section nav:** sticky, Paper Ground fill, 48px links in Body Small/500, Muted Zinc turning Ink on hover and when current. A 2px navy indicator slides under the current link (320ms, `cubic-bezier(0.16, 1, 0.3, 1)`), static under reduced motion.

### Tabs

Underline tabs, 40px, Muted Zinc to Ink; the selected tab carries a 2px navy bottom border. Arrow keys, Home and End move between tabs.

### Cards / Containers

- **Live panel:** 12px radius, White Surface, hairline border, panel hairline shadow; a head (18px 20px 16px) and optional foot (14px 20px), both ruled.
- **Code panel:** 10px radius, Zinc Wash body, white title bar with a quiet copy button; wrapped lines hang 2ch.
- **Tables:** full width, Body Small, 12px 20px cells, Zinc Wash header row in Muted Zinc 600.

### Block catalog row

A three-column row (20px icon, text, action) ruled beneath, with a navy-tint pill tag marking blocks that fill from data and a quiet "Add" button that inserts into the open issue.

## Do's and Don'ts

### Do:

- **Do** take every neutral from the shared zinc set; the page and the editor must read as one surface.
- **Do** keep navy for links, location (nav indicator, selected tab), focus and code keywords.
- **Do** separate sections and panel regions with 1px Hairline rules, not fills or shadows.
- **Do** size controls to the editor: 36px page controls, 32px in or beside editor chrome.
- **Do** give every motion a reduced-motion fallback with no movement.
- **Do** scope page styles outside `.bl-root`; frame the editor, never restyle it.

### Don't:

- **Don't** add a second accent colour to the page chrome; Code Green lives only in code.
- **Don't** lift anything but the editor with a visible shadow.
- **Don't** use monospace outside code, rendered output and keys.
- **Don't** bring the sample issue's other brand colours (Subterra logo blue and the issue's palette) into page chrome.
- **Don't** uppercase or letter-space labels, buttons or nav.
