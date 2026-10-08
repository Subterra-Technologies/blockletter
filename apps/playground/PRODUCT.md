# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers evaluating Blockletter (confirmed 2026-10-07): engineers deciding whether to embed a
newsletter builder in their own product. They arrive from the README or a shared link, want to see
the editor working on realistic content, and want to understand what it produces and how it would
plug into their app: the document it stores, the email it renders, the data sources that fill it.

## Product Purpose

The demo site is the public, runnable face of Blockletter: a block-based email newsletter builder
made of a typed document model, an email-safe HTML and plain-text renderer, and an accessible React
editor. Visitors use the real editor with sample data, preview the email, and inspect its output.
Success is a developer who has explored enough to know what Blockletter does and how it would fit
their stack. The visitor's next step is to keep exploring (confirmed); there is no sales funnel.

## Positioning

Issues assemble themselves from the host app's own data: list blocks name a data source, fill from
it for the issue's dates, keep a snapshot tagged with the source's ids, and stay fully editable.
The renderer is a pure, dependency-free function that runs in the browser, Node, edge runtimes and
Convex. The editor is a controlled component; the host owns storage, workflow and sending.

## Operating Context

- A static site on GitHub Pages (`/blockletter/`), no backend. Edits persist in the visitor's
  localStorage; "Reset the demo" restores the samples.
- Two sample organisations: Subterra Technologies' own newsletter, _Field Notes_, built from public
  subterratechnologies.com content; and a fictional makers' guild whose data sources exercise every
  list block.
- Deep links open specific views (`?org`, `?view`, `?tab`, `?block`, `?new`, `?theme`) and render
  pages show the email alone (`?render=email`, `?render=text`). The README links to them.
- Browser tests (Playwright + axe) run against the built site and depend on the shell's control
  labels: "Sample organization", "Issue", "New issue", "Download .html", "Copy HTML",
  "Reset the demo".

## Capabilities and Constraints

- The shell around the editor is plain CSS (`src/playground.css`); no Tailwind in the playground.
  The editor brings its own compiled, scoped stylesheet and is never restyled from the shell.
- Blockletter is at 0.x: its packages are on npm, and its API may still change before 1.0.
  The site must not imply they can be installed from a registry.
- Uploads in the demo stay in the browser (data URLs); the renderer warns that inboxes cannot load
  them.

## Brand Commitments

- Built by Subterra Technologies: a light attribution and link only, no hard sell (confirmed).
- Subterra's own brand (logo, navy #04263f, logo blue #00b5ee) belongs to its sample issue; the
  editor has its own neutral theme.

## Evidence on Hand

- Real: the working editor and renderer; Subterra's public website copy (hero, about text,
  services, products, blog posts and dates) in `src/sample/subterra.ts`; Subterra logo and product
  images in `public/demo/subterra/`.
- Absent, never to be fabricated: testimonials, client or partner names, press mentions, adoption
  or performance numbers, pricing, and public package availability. No third-party names appear on
  the demo (confirmed 2026-10-07).

## Product Principles

1. The working editor is the proof: show it doing the job before saying anything about it.
2. Developers see the machinery: the document, the rendered HTML and text, the warnings.
3. Nothing sells harder than the demo itself: Subterra is credited, never pitched.
4. Truthful by default: real content or clearly fictional content, never invented claims.
5. Accessible and responsive are part of what is being demonstrated.

## Accessibility & Inclusion

WCAG 2.2 AA. axe clean at 1440, 768, 390 and 320px, no horizontal scrolling at 320px, every
interaction keyboard-operable, reduced motion respected.
