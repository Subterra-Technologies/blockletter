# Email client compatibility

What `renderEmail()` sends, which clients it is built for, what is known not to work yet, and how
to check a change in real inboxes. This page only claims what the output does; real-client results
go in the [verification table](#verification) as they come in.

## What every email is made of

- **Tables for layout.** Every layout table carries `role="presentation"`, so screen readers in
  mail apps read the content rather than the grid.
- **Inline styles.** Every element is styled inline. The only CSS outside them is one small
  `<style>` block for phones (below).
- **A 600px design, fluid below it.** The email is a card up to 600px wide that shrinks with the
  screen wherever a client honours `max-width`. Outlook for Windows, which renders with Word, gets
  a fixed 600px table through `<!--[if mso]>` conditional comments, so it sees the layout it
  always has.
- **A phone layout behind media queries.** Below 620px (and 360px for some rows), side-by-side
  cells become full-width rows and side padding drops from 32px to 20px. The block is kept plain
  (class selectors, no comments, every declaration terminated), because Gmail drops a whole
  `<style>` block over one error. A client that ignores it shows the desktop layout, scaled down.
- **Web-safe fonts only.** Georgia, Times New Roman, Helvetica, Arial, Verdana and Trebuchet MS,
  each with fallbacks. No web fonts, so nothing depends on a font download.
- **The head every client expects.** `lang`, `X-UA-Compatible`, `x-apple-disable-message-reformatting`,
  `color-scheme: light`, and a hidden preheader (`display:none`, `mso-hide:all`) for the inbox
  preview line.
- **Safe content.** Every user-written string is escaped, rich text passes an allowlist sanitiser
  and gets inline styles, and links are made absolute against `baseUrl`. See
  [SECURITY.md](../SECURITY.md).
- **A plain-text version** of every email, for clients and people who read text only.

`renderEmail()` also returns **warnings** for the problems clients punish: no unsubscribe link,
an image without alt text, an image only the browser can load (`blob:` and `data:` URLs), and HTML
over Gmail's clipping size (about 102 KB), which hides the end of the message.

## Clients it is built for

| Client                                 | Designed to get                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Apple Mail (macOS, iOS, iPadOS)        | The fluid card and the phone layout.                                                            |
| Gmail (web, Android, iOS)              | The fluid card and the phone layout; messages over about 102 KB are clipped (a render warning). |
| Outlook for Windows (classic, Word)    | The fixed 600px table. No phone layout, and no CSS background images (see below).               |
| Outlook (new Windows app, web, mobile) | The fluid card. Phone-layout support varies by app; the desktop layout is the fallback.         |
| Yahoo Mail, AOL                        | The fluid card. Phone-layout support varies by app; the desktop layout is the fallback.         |
| Samsung Email, Thunderbird             | The fluid card and, where media queries are honoured, the phone layout.                         |

Support for individual features in each client changes over time; [Can I email](https://www.caniemail.com/)
tracks `max-width`, `@media`, `display:none`, `color-scheme` and the rest of what is listed above.

## Known limits

- **Text over a banner image in Outlook for Windows.** A banner with **Place the headline over
  the image** uses a CSS background image, which Outlook for Windows ignores. The brand's dark band
  shows instead, so the text stays readable. Background images for Outlook need VML, which is on
  the roadmap.
- **Dark mode.** The email declares `color-scheme: light` and has no dark styles of its own. Mail
  apps that recolour messages in dark mode do so their own way; dark-mode styles are on the
  roadmap.
- **Brand fonts.** Only the web-safe fonts above. A web font would fall back in most clients
  anyway, and is not supported.
- **Images.** Images are linked, not attached or embedded; many clients hide them until the reader
  allows it, which is why alt text is required.

## Verification

Real-client results for this release are still to come ([#11](https://github.com/Subterra-Technologies/blockletter/issues/11)). If you check a client, open a pull request
that fills in its row with the date and the client's version, and attach screenshots of the
[sample email](https://subterra-technologies.github.io/blockletter/?render=email) to it.

| Client                         | Desktop layout | Phone layout | Checked |
| ------------------------------ | -------------- | ------------ | ------- |
| Apple Mail (macOS)             | not yet        | n/a          |         |
| Apple Mail (iOS)               | n/a            | not yet      |         |
| Gmail (web)                    | not yet        | n/a          |         |
| Gmail (Android, iOS)           | n/a            | not yet      |         |
| Outlook for Windows (classic)  | not yet        | n/a          |         |
| Outlook (new Windows app, web) | not yet        | n/a          |         |
| Outlook (iOS, Android)         | n/a            | not yet      |         |
| Yahoo Mail (web)               | not yet        | n/a          |         |

### How to check a change

1. Render the email your change affects: the demo's **Download .html**, or `renderEmail()` on
   your own document.
2. Send it to inboxes you own through any email provider, or load it into a rendering service
   such as Litmus or Email on Acid.
3. Look at it at desktop width and on a phone, in light and dark mode, with images on and off.
4. Note what you checked in the pull request; the template asks for at least one real client for
   any rendering change.
