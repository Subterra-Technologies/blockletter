# @subterra-technologies/blockletter-react

## 0.1.1

### Patch Changes

- [#25](https://github.com/Subterra-Technologies/blockletter/pull/25) [`6db427b`](https://github.com/Subterra-Technologies/blockletter/commit/6db427b099484dd76f5de2e13dba51f9820cfc21) Thanks [@NoahDeshotel](https://github.com/NoahDeshotel)! - The editor's error messages, the preview's new-tab copy and the footer's website label no longer use
  patterns that can take quadratic time on long runs of blank lines, unclosed tags or slashes. The
  preview's copy also no longer mistakes a `<header>` for the email's `<head>`.
- Updated dependencies []:
  - @subterra-technologies/blockletter@0.1.1

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
