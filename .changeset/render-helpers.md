---
'@subterra-technologies/blockletter': minor
'@subterra-technologies/blockletter-react': minor
---

Write a block's HTML with `ctx.html`, a template tag that escapes by default. Text goes in escaped. HTML the render context's own helpers made (`ctx.heading()`, `ctx.button()`, `ctx.markdown()`…) goes in as it is. A value inside a tag is an attribute's value: escaped, quoted, and, for an `href`, resolved through `ctx.url()`. `ctx.raw()` marks markup of your own. New layout helpers write the email tables: `ctx.columns(cells, options)` with `ctx.columnWidth()`, and `ctx.card(inner, options)`. `ctx.richText(html)` cleans, resolves and styles formatted text, with its plain text. The columns and text blocks now use these and render exactly as before.
