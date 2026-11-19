# @subterra-technologies/blockletter-react

## 0.2.0

### Minor Changes

- [#45](https://github.com/Subterra-Technologies/blockletter/pull/45) [`1001971`](https://github.com/Subterra-Technologies/blockletter/commit/10019710944d6fc82cd30c06021faea81c1b08eb) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - A list block added from the palette is connected to your data without a template: when exactly one of your registered sources fills its type, it takes that source and fills itself. The inspector has a "Fill from" choice for any list block with a source that can fill it, to take one on, switch, or write the block by hand.

- [#39](https://github.com/Subterra-Technologies/blockletter/pull/39) [`6bf1d84`](https://github.com/Subterra-Technologies/blockletter/commit/6bf1d84771c32f45784ddbec94d16b8275c3d8b6) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - `renderEmail(doc, { frame: 'plain' })` drops the bordered card, so the content runs edge to edge on the card colour, for a brand whose header and footer frame the email; the editor's canvas follows the same option. A new brand font, `System`, uses the device's own interface face (Segoe UI, San Francisco, Roboto) with Helvetica and Arial behind it.

- [#40](https://github.com/Subterra-Technologies/blockletter/pull/40) [`e8fa175`](https://github.com/Subterra-Technologies/blockletter/commit/e8fa175f91b415fc47e7bcc88e8f6f2a92f04916) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - The header's logo follows the header's alignment, centred or right in every client including Outlook, and comes in three sizes (`logoSize`: 160, 240 or 320px). The footer links the website (its own `website`, or the brand kit's) instead of the line under the card, and has a `light` look on the card under a fine line beside the default band. The brand kit gains `complianceText`, used by every footer that leaves its own blank; a new footer now starts blank so the brand kit's words apply. If you pass your own brand kit, set `complianceText` on it to keep a line saying why readers get your emails.

- [#42](https://github.com/Subterra-Technologies/blockletter/pull/42) [`4c204f3`](https://github.com/Subterra-Technologies/blockletter/commit/4c204f3984e19ebc6d13091893bb46560d0e4903) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - Free-text fields now read Markdown. The bodies of the letter, callout, article, image + text and
  column blocks, a text block's plain (not `html`) body, the pull quote, each sponsor's thank-you and
  the name list's introduction render `**bold**`, `*italic*`, `~~strike~~`, `[label](url)`, `#` to
  `###` headings, bullet and numbered lists, `>` quotes and `---` dividers, plus the bare `<br>`,
  `<p>`, `<b>`, `<strong>`, `<i>` and `<em>` a paste carries, in the email, its plain-text part and on
  the editor's canvas. Every run is still escaped, every link goes through the same checks as other
  links, and text with no Markdown in it renders exactly as before.

  For your own blocks, core adds `ctx.markdown(body, style?)` and `ctx.inlineMarkdown(text)` to
  `RenderContext`, and exports `parseMarkdown`, `parseInline`, `markdownToText`, `markdownToHtml` and
  `MARKDOWN_HEADING_SIZES`. The editor adds `MarkdownField`, a text area with a formatting toolbar
  (headings, bold, italic, strikethrough, links and lists, with Ctrl/⌘ + B, I and K) that the
  built-in blocks now use for those fields, and `EmailMarkdown` and `EmailInlineMarkdown` to draw the
  same Markdown on the canvas. Its words are under the new `markdown` messages. A text block with a
  plain Markdown body keeps its formatting when it is first edited in the rich-text field.

- [#43](https://github.com/Subterra-Technologies/blockletter/pull/43) [`a1fc7b1`](https://github.com/Subterra-Technologies/blockletter/commit/a1fc7b11f6edd5263964233e13b6841213786682) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - `overrideBlock(definition, overrides)` and `overrideEditorBlock(definition, overrides)` replace parts of a block, such as a built-in drawn in your own style, keeping its type, fields, validation and form. A new `render` is handed the original as `base`, for its plain-text lines. In the editor, a new `render` without a new `Canvas` drops the built-in drawing, so the canvas draws the block from its new email HTML.

- [#44](https://github.com/Subterra-Technologies/blockletter/pull/44) [`5216289`](https://github.com/Subterra-Technologies/blockletter/commit/521628981e1d1d49dd3463b46031a9ae21054f2f) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - `renderEmail(doc, { webVersionUrl })` adds a small "View in your browser" link above the email and as the first line of its plain text, for readers whose mail app shows it badly. The address is inserted verbatim, so your email service's merge tag works; the words are `labels.viewInBrowser`.

### Patch Changes

- [#25](https://github.com/Subterra-Technologies/blockletter/pull/25) [`6db427b`](https://github.com/Subterra-Technologies/blockletter/commit/6db427b099484dd76f5de2e13dba51f9820cfc21) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - The editor's error messages, the preview's new-tab copy and the footer's website label no longer use
  patterns that can take quadratic time on long runs of blank lines, unclosed tags or slashes. The
  preview's copy also no longer mistakes a `<header>` for the email's `<head>`.

- [#41](https://github.com/Subterra-Technologies/blockletter/pull/41) [`fb06599`](https://github.com/Subterra-Technologies/blockletter/commit/fb0659997178037cf2a5733965a9915bb20b91a7) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - Rich text is cleaned more strictly: it keeps only the inline styles and classes formatting uses (colour, highlight, alignment, weight, slant, decoration), shows images from `https:` addresses only, reads quoted attribute values whole, and closes a link left open. `sanitizeHtml(html, { styles: 'email' })` keeps the layout styles of HTML the renderer wrote, which the editor uses to draw a block without a canvas of its own.

- [#38](https://github.com/Subterra-Technologies/blockletter/pull/38) [`5962da6`](https://github.com/Subterra-Technologies/blockletter/commit/5962da6b4bac3acf414606952f59895bc099a84f) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - A link in rich text to a page on your own site (`/events`) is kept and resolved against `baseUrl`, in the email and its plain text, instead of being dropped; without a `baseUrl` it stays relative and the render warns, as for any other link. The rich-text field keeps such links when you edit. New: `isSafeLinkHref(href, { relative: true })` and `resolveRichTextLinks(html, resolve)`.
- Updated dependencies [[`1001971`](https://github.com/Subterra-Technologies/blockletter/commit/10019710944d6fc82cd30c06021faea81c1b08eb), [`6bf1d84`](https://github.com/Subterra-Technologies/blockletter/commit/6bf1d84771c32f45784ddbec94d16b8275c3d8b6), [`e8fa175`](https://github.com/Subterra-Technologies/blockletter/commit/e8fa175f91b415fc47e7bcc88e8f6f2a92f04916), [`4c204f3`](https://github.com/Subterra-Technologies/blockletter/commit/4c204f3984e19ebc6d13091893bb46560d0e4903), [`a1fc7b1`](https://github.com/Subterra-Technologies/blockletter/commit/a1fc7b11f6edd5263964233e13b6841213786682), [`fb06599`](https://github.com/Subterra-Technologies/blockletter/commit/fb0659997178037cf2a5733965a9915bb20b91a7), [`5962da6`](https://github.com/Subterra-Technologies/blockletter/commit/5962da6b4bac3acf414606952f59895bc099a84f), [`5216289`](https://github.com/Subterra-Technologies/blockletter/commit/521628981e1d1d49dd3463b46031a9ae21054f2f)]:
  - @subterra-technologies/blockletter@0.2.0

## 0.1.0

### Minor Changes

- [#13](https://github.com/Subterra-Technologies/blockletter/pull/13) [`9ec8a01`](https://github.com/Subterra-Technologies/blockletter/commit/9ec8a01280e0ca8e97bb244a5251654c54c0fd16) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - The first public release. `@subterra-technologies/blockletter` holds the newsletter document model,
  its 21 blocks, the email-safe renderer, data sources, brand kits and templates.
  `@subterra-technologies/blockletter-react` is the accessible editor, including the `fill` layout that
  fits it to its container.

- [#16](https://github.com/Subterra-Technologies/blockletter/pull/16) [`1c48eb5`](https://github.com/Subterra-Technologies/blockletter/commit/1c48eb58a271d89e442421731665e7697e4b192a) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - Text blocks take formatted writing: bold, italics, links, and bulleted and numbered lists, from a
  toolbar above the text or with Ctrl/Cmd+B, I and K. Links are checked before they go in, and
  pasted text keeps that formatting and loses the rest, so a body is always HTML the sanitiser
  leaves as it is. A plain body becomes HTML (`format: 'html'`) only the first time it is edited, so
  issues nobody edits render as before, and its typing and formatting undo with the rest of the
  issue. `RichTextField` brings the same text box to your own blocks.

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

- [#16](https://github.com/Subterra-Technologies/blockletter/pull/16) [`f7fc494`](https://github.com/Subterra-Technologies/blockletter/commit/f7fc494b230754adeaf7f54ee8919db0df9ba91e) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - Undo and redo every change to the document, from the editor's top bar (the More menu when it shows
  one pane at a time), Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z or Ctrl+Y, or the browser's own undo. Typing
  in one field undoes as one step. Removing a block no longer asks for confirmation; its toast offers
  Undo instead. `NewsletterEditorApi` gains `undo`, `redo`, `canUndo` and `canRedo`, and its `remove`
  now returns nothing rather than a promise.

### Patch Changes

- [#16](https://github.com/Subterra-Technologies/blockletter/pull/16) [`f7fc494`](https://github.com/Subterra-Technologies/blockletter/commit/f7fc494b230754adeaf7f54ee8919db0df9ba91e) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - Require React 19.2 or newer in `peerDependencies`; the editor uses `useEffectEvent`, which earlier
  versions do not have.
- Updated dependencies [[`9ec8a01`](https://github.com/Subterra-Technologies/blockletter/commit/9ec8a01280e0ca8e97bb244a5251654c54c0fd16), [`7fb6c5a`](https://github.com/Subterra-Technologies/blockletter/commit/7fb6c5af67187d37ed55239f350ad606dbbdd778), [`64926ef`](https://github.com/Subterra-Technologies/blockletter/commit/64926ef1b34efc68d70deb674e29fd018e4260fc), [`1d0bdd5`](https://github.com/Subterra-Technologies/blockletter/commit/1d0bdd52cdc761efa8bd737a3e22ced3fbb19588)]:
  - @subterra-technologies/blockletter@0.1.0
