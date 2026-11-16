---
'@subterra-technologies/blockletter': minor
'@subterra-technologies/blockletter-react': minor
---

`overrideBlock(definition, overrides)` and `overrideEditorBlock(definition, overrides)` replace parts of a block, such as a built-in drawn in your own style, keeping its type, fields, validation and form. A new `render` is handed the original as `base`, for its plain-text lines. In the editor, a new `render` without a new `Canvas` drops the built-in drawing, so the canvas draws the block from its new email HTML.
