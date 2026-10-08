---
'@subterra-technologies/blockletter': patch
---

The rich-text sanitiser, its plain-text conversion and the URL helpers now run in linear time on
any input. Text with thousands of unclosed comments, tags or links, or long runs of spaces or
slashes, could make them take seconds to minutes, so a crafted paste or document could stall a
browser tab or a server rendering emails. An unclosed comment or tag now runs to the end of the
input, as browsers read it.
