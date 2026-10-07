# Blockletter plan

Blockletter is the newsletter builder from Subterra's chamber-of-commerce platform, extracted
into a standalone, reusable project. One repository holds the source, the demo and the docs. It
stays private while the launch checklist below is worked through, then goes public under the MIT
licence for the open-source community.

The builder earned extraction because of what it already does well — a visual drag-and-drop
canvas with a full keyboard path, an email renderer that survives Outlook and Gmail, saved
templates, a brand kit, per-block styling, and issues that **assemble themselves from the
host's own data** ("if I entered it once, I shouldn't enter it again"). That last part is the
differentiator: most open-source email builders are blank canvases.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the package design and public API.

## Status

| Phase | Scope                                                                                          | State   |
| ----- | ---------------------------------------------------------------------------------------------- | ------- |
| 0     | Private repo, monorepo scaffold, CI, denylist guard, architecture                              | Done    |
| 1     | Core: document model, 21 blocks, renderer, brand, templates, periods, data sources, validation | Done    |
| 2     | React editor: canvas, palette, inspector, appearance, brand kit, templates, preview            | Done    |
| 3     | Demo site (live docs) + quality gates (Playwright + axe at four widths)                        | Done    |
| 4     | Releases: Changesets, npm publishing at launch                                                 | Planned |
| 5     | Convex adapter                                                                                 | Planned |
| 6     | chamber-platform adopts Blockletter                                                            | Planned |
| 7     | Product gaps to close before going public                                                      | Planned |
| 8     | Open-source launch                                                                             | Planned |

## Phases

### 0 — Repo and plan

- Private repo `Subterra-Technologies/blockletter`, fresh history (none of the source project's
  history, data, or identity comes along).
- npm workspaces (what Subterra's other projects use), TypeScript 5.9 strict, tsup builds,
  Vitest, ESLint (typescript-eslint, react-hooks, jsx-a11y), Prettier, GitHub Actions CI.
- `scripts/check-denylist.mjs` fails CI if the source client's name, people, address or local
  place names appear anywhere. Defaults and sample data are generic and fictional.

### 1 — Core package

Port the pure parts of the source renderer and block model into `packages/core`, generalised:

- The 17 generic block types carry over with storage ids replaced by `ImageRef`.
- The 5 data-bound blocks become generic list blocks that store snapshot items:
  `event_tiles`, `sponsors`, `name_list`, `post_list`, `dated_list`. Hosts fill them through
  `DataSource`s; the renderer no longer needs a resolved-records bag.
- `cta` folds into `button`; the footer reads the organisation from the brand kit, and its
  preference/unsubscribe links come from render options (merge tags welcome) instead of
  matching words in the compliance text.
- Built-in blocks are `BlockDefinition`s — the same plugin API hosts use for their own.
- Runtime validation of untrusted documents (the source relied on Convex validators).
- Fixed on the way: `data-block-id` only when `annotate: true` (it was reaching inboxes); the
  preheader always renders; render `warnings` for missing unsubscribe link, alt text, and Gmail
  clipping size.
- Port the source's pure renderer, block-model, period, sanitiser and palette tests.

### 2 — React package

Port the editor into `packages/react`, decoupled from Convex, Next.js and the host admin shell:

- Controlled `NewsletterEditor` (value/onChange) plus the composable parts.
- Host seams as props: `uploadImage`, `sources`, `onBrandChange`, template callbacks, `toolbar`.
- The 17 admin UI primitives it used come along as internal components (shadcn/Radix based).
- Tailwind compiled into `styles.css` under a `bl` prefix with `--bl-*` tokens; no Tailwind
  needed by consumers.
- Live preview rendered **client-side** by the core renderer (no server round trip), in a
  sandboxed iframe with desktop/phone widths.
- Port the ~285 component tests with a shared test helper instead of per-file Convex mocks.

### 3 — Demo site and quality gates

- `apps/playground` is the demo: a documentation page you can operate. The editor comes first;
  Blocks, Data sources, Rendering, Brand kit and Accessibility each pair prose and code with a
  live widget driven by the open issue. Samples: Subterra's own _Field Notes_ (public website
  content, no third-party names) and a fictional makers' guild. localStorage persistence, deep
  links, and `?render=email|text` pages.
- Playwright + axe at 320, 390, 768 and 1440px in CI: no horizontal overflow, axe clean.
- The rendered email is a fluid hybrid: it reflows on phones and keeps 600px in Outlook.
- `.github/workflows/demo.yml` publishes the demo to GitHub Pages from this repository; it skips
  itself while the repository is private.
- Later: a caniemail-based feature lint, and screenshot rendering across real email clients
  before 1.0.

### 4 — Releases

- Changesets for versioning and changelogs.
- At launch, publish `@subterra-technologies/blockletter` and `-react` to npm (or rename first;
  see open questions). Until then, Subterra's own projects can install from a git checkout or a
  GitHub Packages build if they need it early.

### 5 — Convex adapter (`packages/convex`)

Most of Subterra's own projects run on Convex, so this is the first backend adapter.

- Convex validators for the document, brand kit and template (built-in blocks), composable with
  host block validators.
- Storage-backed images: an upload hook around `generateUploadUrl` returning an `ImageRef`, and
  a server helper that resolves `assetId`s before `renderEmail` inside a query.
- Optional Convex component owning templates and the brand kit tables.

### 6 — chamber-platform adopts Blockletter

Dogfooding proves the API and stops two copies drifting.

- Implement the chamber's five data sources (events, sponsors, new members, posts, calendar).
- Map stored blocks to Blockletter shapes (ids → snapshot items, `cta` → `button`, file ids →
  `ImageRef`) with a one-off Convex migration of drafts and templates; keep sent issues frozen.
- Rendering parity tests: old renderer vs Blockletter on the same fixtures before switching.
- Needs explicit approval: it migrates production data.

### 7 — Gaps to close before going public

- Rich text in text blocks (bold, italic, links, lists) — the source only rendered rich HTML.
- Undo / redo.
- Click-to-select from the preview.
- Outlook VML for background images, optional dark-mode email styles. (Mobile-responsive
  email is done.)
- Social icons (hosted PNGs), merge tags / personalisation helpers.
- i18n: editor labels and render labels.
- Recipes: Next.js with a hosted database, a serverless send route, plain Node rendering.

### 8 — Open-source launch checklist

- [x] Licence: MIT (decided 2026-10-07), in `LICENSE` and every package's `license` field.
- [x] README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue and pull request templates.
- [x] Demo built into this repository, with a Pages workflow ready to publish it.
- [ ] Public name and npm scope decided (`blockletter` is unclaimed on npm as of 2026-10-07).
- [x] Denylist and secret scan pass across the full history (2026-10-07).
- [ ] 1.0 API review: everything exported is intended to be supported.
- [ ] Delete the retired `Subterra-Technologies/blockletter-demo` repository (now private and
      empty apart from a README).
- [x] Repository public and the demo live at https://subterra-technologies.github.io/blockletter/
      (2026-10-07).
- [ ] Publish the packages and remove the README's pre-release note.

## Decisions

1. **Own block model and renderer.** MJML, react-email, Unlayer, GrapesJS and EmailBuilder.js
   were considered by the source project and rejected: no typed domain blocks to automate,
   heavy or proprietary editors, or immature packages. The hand-written table renderer has no
   dependencies and runs in any JavaScript runtime.
2. **Snapshot items, not id lookups.** Makes rendering pure and portable; refresh is explicit.
3. **Built-ins are plugins.** Guarantees the extension API is good enough for real blocks.
4. **Fresh history.** The source repository's history contains client data.
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

- Keep `@subterra-technologies/*` on public npm, or publish as `blockletter` /
  `@blockletter/*`?
- When to schedule Phase 6 relative to the chamber's own roadmap.
