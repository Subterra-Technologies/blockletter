# Blockletter

**Block-based email newsletters that assemble themselves from your app's data.**

Blockletter is a typed newsletter document model, an email-safe HTML + plain-text renderer,
and an accessible drag-and-drop React editor. Issues are built from blocks — mastheads, letters,
event tiles, sponsor rows, post lists, community calendars, images, columns, banners, buttons —
and the data-bound blocks fill themselves from your own records through small data-source
adapters.

> **Status:** private, pre-release. Extracted from a production chamber-of-commerce platform and
> being made generic. See [docs/PLAN.md](docs/PLAN.md) for the roadmap and
> [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

## Packages

| Package                                                      | Description                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [`@subterra-technologies/blockletter`](packages/core)        | Document model + renderer. Zero dependencies; runs in the browser, Node, edge runtimes and Convex. |
| [`@subterra-technologies/blockletter-react`](packages/react) | The editor: canvas, block palette, inspector, appearance, brand kit, templates, preview.           |
| `@subterra-technologies/blockletter-convex` _(planned)_      | Convex validators and storage-backed images.                                                       |

## Rendering an email

```ts
import { createDocument, createBlock, renderEmail } from '@subterra-technologies/blockletter';

const doc = createDocument({
  subject: 'September news',
  preheader: 'What is coming up this month',
  blocks: [createBlock('header'), createBlock('text'), createBlock('footer')],
});

const { html, text, warnings } = renderEmail(doc, {
  brand: myBrandKit,
  baseUrl: 'https://example.org',
  unsubscribeUrl: '{{{RESEND_UNSUBSCRIBE_URL}}}',
});
```

## Development

```sh
npm install
npm test          # all packages
npm run dev       # playground
npm run check     # lint, typecheck, test, build, denylist
```

Requires Node 20+.

## Licence

Not yet licensed for use outside Subterra Technologies. An open-source licence will be added at
public launch (see the plan).
