---
'@subterra-technologies/blockletter': minor
'@subterra-technologies/blockletter-react': minor
---

`renderEmail(doc, { webVersionUrl })` adds a small "View in your browser" link above the email and as the first line of its plain text, for readers whose mail app shows it badly. The address is inserted verbatim, so your email service's merge tag works; the words are `labels.viewInBrowser`.
