---
'@subterra-technologies/blockletter-react': patch
---

The editor's error messages, the preview's new-tab copy and the footer's website label no longer use
patterns that can take quadratic time on long runs of blank lines, unclosed tags or slashes. The
preview's copy also no longer mistakes a `<header>` for the email's `<head>`.
