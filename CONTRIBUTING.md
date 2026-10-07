# Contributing to Blockletter

Thanks for helping. Blockletter is a small, focused project: a newsletter document model, an
email-safe renderer, and an accessible React editor. Contributions that keep it small, correct and
accessible are the ones most likely to land.

## Before you start

- **Bugs:** open an issue with steps to reproduce, what you expected, and what happened. For
  rendering bugs, include the document JSON (the demo's Rendering section has a **Document** tab)
  and the email client that showed the problem.
- **Features:** open an issue to discuss it before writing code. New blocks, render options and
  editor props are public API, and every one we add is one we keep supporting.
- **Security problems:** do not open an issue. See [SECURITY.md](SECURITY.md).

## Setting up

You need Node 20 or newer.

```sh
git clone https://github.com/Subterra-Technologies/blockletter.git
cd blockletter
npm install
npm run dev        # the demo at http://localhost:5173
```

The packages import each other's source inside the repository, so there is no build step while you
work: edit `packages/core` or `packages/react` and the demo reloads.

| Path              | What lives there                                                  |
| ----------------- | ----------------------------------------------------------------- |
| `packages/core`   | Document model, block definitions, renderer, brand kit, templates |
| `packages/react`  | The editor and its parts, with its scoped, compiled stylesheet    |
| `apps/playground` | The demo site and its browser tests                               |
| `docs`            | [Architecture](docs/ARCHITECTURE.md) and [roadmap](docs/PLAN.md)  |

## Checks

Run the full set before opening a pull request; CI runs the same commands.

```sh
npm run check      # denylist, lint, typecheck, unit tests, build
npm run test:e2e   # the demo in Chromium, with axe at four widths
```

`npm test -- --project core` (or `react`, or `playground`) runs one package's tests.

## What a good change looks like

- **Tests with the change.** Renderer changes assert on the HTML and the plain-text version;
  editor changes use Testing Library and the helpers in `packages/react/test/helpers`.
- **Email-safe output.** Tables and inline styles, absolute links, escaped text, nothing an email
  client strips. A layout change should be checked at 600px and at phone width.
- **Accessible editor.** Every pointer interaction has a keyboard path, every control has a
  visible label, and nothing scrolls sideways at 320px. The browser tests run axe; keep them clean.
- **No invented data.** Sample content is fictional or clearly labelled, and defaults never carry
  any real organisation's identity.
- **Plain, consistent code.** TypeScript strict mode, Prettier formatting (100 columns, single
  quotes), and comments that explain why rather than what.

## Pull requests

Keep each pull request to one change, describe what it does and why, and link the issue it
addresses. Screenshots help for anything visible. A maintainer will review it; expect questions
about API shape and accessibility, since those are the hardest things to change later.

By contributing, you agree that your contributions are licensed under the project's
[MIT licence](LICENSE), and that you will follow the [code of conduct](CODE_OF_CONDUCT.md).
