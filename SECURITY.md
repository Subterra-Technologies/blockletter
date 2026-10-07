# Security policy

Blockletter renders HTML from user-edited documents and draws parts of that HTML inside the
editor, so we take reports about script injection, sanitiser bypasses and unsafe links seriously.

## Reporting a vulnerability

Please do not open a public issue. Instead, report it privately through GitHub's
**Report a vulnerability** button on this repository's Security tab, or email
**info@subterra.one** with "Blockletter security" in the subject.

Include what you found, the steps or the document JSON that reproduce it, and the version or
commit you tested. We will acknowledge your report, keep you informed while we fix it, and credit
you in the release notes unless you would rather stay anonymous.

## Supported versions

Blockletter is pre-1.0. Security fixes land on the latest release only.

## What the renderer guarantees

- Every user-written string is HTML-escaped.
- Rich-text HTML goes through an allowlist sanitiser: only known tags and attributes survive,
  so scripts, event handlers, comments and unsafe URLs (`javascript:` and the like) are removed.
- Link URLs are normalised, and unsupported schemes fall back to a safe address.
- Image URLs must be `http(s)`. The editor's previews also accept `blob:` and image `data:` URLs,
  and the renderer warns that inboxes cannot load them.
- The editor's preview runs the email in a sandboxed iframe with no script execution.

A way around any of these is a vulnerability; please report it.
