---
'@subterra-technologies/blockletter-react': minor
'@subterra-technologies/blockletter': minor
---

The editor can speak any language. Every word it shows or says (buttons, tabs, form labels,
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
