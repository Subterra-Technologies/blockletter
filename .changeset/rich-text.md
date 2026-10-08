---
'@subterra-technologies/blockletter-react': minor
---

Text blocks take formatted writing: bold, italics, links, and bulleted and numbered lists, from a
toolbar above the text or with Ctrl/Cmd+B, I and K. Links are checked before they go in, and
pasted text keeps that formatting and loses the rest, so a body is always HTML the sanitiser
leaves as it is. A plain body becomes HTML (`format: 'html'`) only the first time it is edited, so
issues nobody edits render as before, and its typing and formatting undo with the rest of the
issue. `RichTextField` brings the same text box to your own blocks.
