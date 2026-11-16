---
'@subterra-technologies/blockletter': patch
'@subterra-technologies/blockletter-react': patch
---

A link in rich text to a page on your own site (`/events`) is kept and resolved against `baseUrl`, in the email and its plain text, instead of being dropped; without a `baseUrl` it stays relative and the render warns, as for any other link. The rich-text field keeps such links when you edit. New: `isSafeLinkHref(href, { relative: true })` and `resolveRichTextLinks(html, resolve)`.
