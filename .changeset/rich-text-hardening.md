---
'@subterra-technologies/blockletter': patch
'@subterra-technologies/blockletter-react': patch
---

Rich text is cleaned more strictly: it keeps only the inline styles and classes formatting uses (colour, highlight, alignment, weight, slant, decoration), shows images from `https:` addresses only, reads quoted attribute values whole, and closes a link left open. `sanitizeHtml(html, { styles: 'email' })` keeps the layout styles of HTML the renderer wrote, which the editor uses to draw a block without a canvas of its own.
