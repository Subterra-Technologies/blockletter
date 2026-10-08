---
version: 1
slug: 'src-app-tsx'
primary_target: 'src/app.tsx'
related_targets: ['src/playground.css']
---

# Demo site (app shell over live docs)

Scope: the public demo around the Blockletter editor (apps/playground). Two views of one issue: Editor, the working editor filling the screen, and Docs, the live docs. Visitor mode: Experience; the working editor leads from the first viewport.

Audience and job: developers evaluating Blockletter, deciding whether it fits their product. Success: they explore until they understand the document, the data sources, the renderer output and the extension model. No sales action; Subterra is credited lightly. No third-party names, testimonials, press or invented numbers.

Constraints: plain CSS shell; the editor's own stylesheet is never overridden; keep the labels the browser tests and deep links use; WCAG 2.2 AA; no sideways scroll at 320px; the Editor view never scrolls the page while the viewport is at least 30rem tall.

## Direction contract

THESIS: The tool first, its documentation one click away. The demo opens as the editor itself, filling the screen the way it would inside a developer's own app; the Docs view pairs each concept with a live panel driven by the same issue. It refuses the category's marketing hero over a static screenshot, the endless page that buries the tool under its own explanation, and the bare playground that explains nothing.

OWN-WORLD: The editor's world extended to the page: zinc-neutral ground (#fafafa page, white surfaces, 1px #e4e4e7 rules, 8 to 12px radii, 32px controls), one system sans for prose, a monospace only for code and API names, near-black ink. Subterra navy #04263f is the single accent: wordmark, links, the current view and section. Light code panels on #f4f4f5 with a restrained three-colour highlight.

STORY: The visitor lands in the editor already holding a real issue: they edit, preview, switch the sample organization or start a new issue, and the page never moves; only the pane they are in scrolls. When they want the API, Docs is one click away in the top bar: Embed it, Blocks, Data sources, Rendering, Brand kit and Accessibility, each live against the same issue. Back in the editor, everything is where they left it.

FIRST VIEWPORT: 1440 by 900. A 56px white top bar: the wordmark with "by Subterra Technologies", the Editor and Docs links (navy underline on the current one), and on the right the npm version pill and the GitHub source link. Under it, on the ground, a 52px sample bar: Sample organization, Issue and New issue, with "Your edits stay in this browser" and Reset on the right. The editor fills every remaining pixel, inset 12px, its palette, canvas and inspector each scrolling on their own. Below 1024px the sample bar becomes one button that opens the same controls in a sheet; below 64rem of editor width the editor shows one pane at a time.

FORM: App shell over live docs, my ranked list position 7, seed key c07469f8. Signature interaction: one issue drives both views, and switching views leaves the editor exactly as it was. Motion: the current-view and current-section underline only, and the sheet rising on small screens; none under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
