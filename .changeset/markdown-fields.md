---
'@subterra-technologies/blockletter': minor
'@subterra-technologies/blockletter-react': minor
---

Free-text fields now read Markdown. The bodies of the letter, callout, article, image + text and
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
