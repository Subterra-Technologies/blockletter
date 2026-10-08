# @subterra-technologies/blockletter-react

The editor for [Blockletter](https://github.com/Subterra-Technologies/blockletter): a drag-and-drop
newsletter editor for React 19, with a block palette, a canvas, an inspector, per-block
appearance, a brand kit, templates and a live email preview. Built to WCAG 2.2 AA, with a
keyboard path for every drag.

```tsx
import { NewsletterEditor } from '@subterra-technologies/blockletter-react';
import '@subterra-technologies/blockletter-react/styles.css';

<NewsletterEditor
  value={doc}
  onChange={setDoc}
  brand={brand}
  sources={[eventsSource]}
  uploadImage={uploadToYourStorage}
/>;
```

The editor is a controlled component: you store the document, images and brand kit, and decide
how issues are approved and sent. Its stylesheet is compiled and scoped to the editor, so your app
needs no CSS framework or setup of its own. Every part (canvas, palette, inspector, preview, brand
kit, template picker, dialogs) is exported separately for custom layouts. Every word it shows or
says can be translated through `messages` and `locale`, over the English in `enMessages`.

See the [main README](https://github.com/Subterra-Technologies/blockletter#readme) for the full
guide and a live demo.

MIT licensed.
