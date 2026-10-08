# @subterra-technologies/blockletter

## 0.1.0

### Minor Changes

- [#13](https://github.com/Subterra-Technologies/blockletter/pull/13) [`9ec8a01`](https://github.com/Subterra-Technologies/blockletter/commit/9ec8a01280e0ca8e97bb244a5251654c54c0fd16) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - The first public release. `@subterra-technologies/blockletter` holds the newsletter document model,
  its 21 blocks, the email-safe renderer, data sources, brand kits and templates.
  `@subterra-technologies/blockletter-react` is the accessible editor, including the `fill` layout that
  fits it to its container.

- [#14](https://github.com/Subterra-Technologies/blockletter/pull/14) [`7fb6c5a`](https://github.com/Subterra-Technologies/blockletter/commit/7fb6c5af67187d37ed55239f350ad606dbbdd778) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - JSON Schemas for the newsletter document, templates and brand kits, at
  `@subterra-technologies/blockletter/schema/*.json`, so other languages and AI tools can produce
  documents that `validateDocument()` then checks.

- [#17](https://github.com/Subterra-Technologies/blockletter/pull/17) [`1d0bdd5`](https://github.com/Subterra-Technologies/blockletter/commit/1d0bdd52cdc761efa8bd737a3e22ced3fbb19588) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - The editor can speak any language. Every word it shows or says (buttons, tabs, form labels,
  tooltips, placeholders, toasts, screen reader announcements, dialogs, empty states and errors)
  comes from `EditorMessages`, exported in English as `enMessages`. Pass the parts you translate as
  `messages` on `NewsletterEditor` or `BlockletterRoot`, and the rest stays English. Text with
  values in it is a function, so word order and plurals are the translator's. `locale` sets the
  editor's `lang` and how it writes numbers and dates. The built-in blocks' names are translated
  too, and a part in a custom layout reads its words from the root around it. With no `messages`,
  the editor says exactly what it said before.

  Core's sentences for a person now come with stable codes beside the English, so a UI in another
  language can word them itself: `blockIssueDetails()` for a block's warnings, `warningDetails` on
  what `renderEmail()` returns, `periodErrorCodes()` with `PERIOD_ERROR_MESSAGES`, and `values` on a
  `ValidationIssue` (a limit, or which part of an image is wrong). The English is unchanged.

### Patch Changes

- [#16](https://github.com/Subterra-Technologies/blockletter/pull/16) [`64926ef`](https://github.com/Subterra-Technologies/blockletter/commit/64926ef1b34efc68d70deb674e29fd018e4260fc) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - The rich-text sanitiser, its plain-text conversion and the URL helpers now run in linear time on
  any input. Text with thousands of unclosed comments, tags or links, or long runs of spaces or
  slashes, could make them take seconds to minutes, so a crafted paste or document could stall a
  browser tab or a server rendering emails. An unclosed comment or tag now runs to the end of the
  input, as browsers read it.
