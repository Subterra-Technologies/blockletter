---
version: 1
slug: 'src-app-tsx'
primary_target: 'src/app.tsx'
related_targets: ['src/playground.css']
---

# Demo site (live docs)

Scope: the public demo page around the Blockletter editor (apps/playground). Visitor mode: Experience; the working editor leads from the first viewport.

Audience and job: developers evaluating Blockletter, deciding whether it fits their product. Success: they explore until they understand the document, the data sources, the renderer output and the extension model. No sales action; Subterra is credited lightly. No third-party names, testimonials, press or invented numbers.

Constraints: plain CSS shell; the editor's own stylesheet is never overridden; keep the labels the browser tests and deep links use; WCAG 2.2 AA; no sideways scroll at 320px.

## Direction contract

THESIS: Documentation you can operate. Every section pairs what a developer needs to know with the live piece it describes, all driven by the one issue open in the editor. It refuses the category's marketing hero over a static screenshot, and the bare playground that explains nothing.

OWN-WORLD: The editor's world extended to the page: zinc-neutral ground (#fafafa page, white surfaces, 1px #e4e4e7 rules, 8 to 12px radii, 32px controls), one system sans for prose, a monospace only for code and API names, near-black ink. Subterra navy #04263f is the single accent: wordmark, links, the active section. Light code panels on #f4f4f5 with a restrained three-colour highlight.

STORY: The visitor reads one line, uses the editor at once, then scrolls through Blocks, Data sources, Rendering, Brand kit and Accessibility, each showing its mechanism live against the same issue (adding a block from the docs, refreshing sourced blocks, reading the rendered HTML, text and warnings). They leave knowing the API shape.

FIRST VIEWPORT: 1440 by 900. A 56px light top bar: wordmark and "by Subterra Technologies" left, a pre-release note right. A sticky section nav beneath it (Try it, Blocks, Data sources, Rendering, Brand kit, Accessibility). Then a compact title row: H1 "Email newsletters that assemble themselves from your app's data." with a one-sentence lede, and the demo controls (Sample organization, Issue, New issue) on the same band. The editor fills the rest of the viewport, full content width. The primary action is the editor itself.

FORM: Live docs, my ranked list position 7, seed key c07469f8. Signature interaction: one issue drives the whole page; "Add to the issue" on a block card inserts it in the editor, and the Rendering and Data sources panels update as the issue changes. Motion: scroll-spy indicator and smooth in-page jumps only, none under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
