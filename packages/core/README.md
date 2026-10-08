# @subterra-technologies/blockletter

The core of [Blockletter](https://github.com/Subterra-Technologies/blockletter): a typed
newsletter document model and an email-safe HTML and plain-text renderer. No dependencies; it runs
in the browser, Node, edge runtimes and serverless functions alike.

```ts
import {
  assembleDocument,
  BUILT_IN_TEMPLATES,
  renderEmail,
} from '@subterra-technologies/blockletter';

const issue = await assembleDocument(BUILT_IN_TEMPLATES[0], {
  period: { start: '2026-11-01', end: '2026-11-30' },
  brand: myBrandKit,
  sources: [eventsSource, postsSource],
});

const { html, text, warnings } = renderEmail(issue, {
  brand: myBrandKit,
  baseUrl: 'https://example.org',
});
```

- 21 built-in blocks, each a `BlockDefinition`; register your own with `defineBlock`.
- `DataSource`s fill list blocks from your own records.
- Brand kits with a contrast-checked palette, templates with `{{monthYear}}`-style tokens, issue
  periods, and runtime validation for untrusted documents.
- Every sentence it writes for a person (a warning, a validation error) comes with a stable code
  and its values, so a UI in another language can word it itself.
- JSON Schemas for documents, templates and brand kits
  (`@subterra-technologies/blockletter/schema/newsletter-document.json` and siblings), so programs
  in other languages and LLM structured output can produce them. A document that matches must
  still pass `validateDocument()`.

See the [main README](https://github.com/Subterra-Technologies/blockletter#readme) for the
editor, a live demo, and the full guide, and the
[architecture notes](https://github.com/Subterra-Technologies/blockletter/blob/main/docs/ARCHITECTURE.md)
for the complete API.

MIT licensed.
