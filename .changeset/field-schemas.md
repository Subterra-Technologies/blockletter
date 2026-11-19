---
'@subterra-technologies/blockletter': minor
'@subterra-technologies/blockletter-react': minor
---

Declare a block by its fields. `defineBlock({ type, label, description, group, fields, render })`
takes fields made with `field.text()`, `markdown`, `html`, `url`, `image`, `color`, `choice`,
`number`, `toggle`, `date`, `link`, `list` and `custom`, and makes the block's `create()`,
`validate()` and `summary()` from them; `BlockOf<typeof block>` is its type, and
`blockJsonSchema(block)` its JSON Schema. In the editor, `defineEditorBlock({ ...block, icon })`
builds the form from the fields, with `fieldEditors` for controls of your own and `FieldInputs`
for a form that draws some fields itself. `ObjectValidator` gains `number()`. The callout block is
the first built-in declared this way; it starts, validates and renders as before.
