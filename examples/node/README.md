# Blockletter in a Node script

`src/newsletter.ts` assembles this month's issue of a fictional tool library's newsletter from
Blockletter's built-in _Monthly newsletter_ template, fills its event tiles from
`data/events.json`, renders it, and writes the email to `out/`. Asked to, it sends it through
Resend's REST API too.

It is plain TypeScript run by Node's built-in type stripping: no build step and no bundler, and
the only dependency is `@subterra-technologies/blockletter`, which has none of its own.

## Run it

Node 22.18 or later.

`npm install` here is all the setup. To run it against a change to the packages instead, install
against the repository's packed build (see [Installing an example](../README.md#installing-an-example)):

```sh
# in the repository root
npm install && npm run examples:pack
# here
npm install --no-save ../.packs/blockletter.tgz
```

Then:

```sh
npm start
```

```text
Assembled "Fernhill Tool Library · October 2026 newsletter" for Oct 1–8, 2026.
Upcoming events: 4, from data/events.json.
Wrote out/issue.html (10.4 KB), out/issue.txt and out/issue.json.

Before sending, the renderer says:
  - There is no unsubscribe link: pass unsubscribeUrl (an address or your email service's merge tag) so every recipient can opt out.
…
Dry run: nothing was sent. `npm run send` sends it through Resend.
```

Open `out/issue.html` in a browser for the email, `out/issue.txt` for its plain-text part, and
`out/issue.json` for the `NewsletterDocument` it was rendered from: plain JSON, ready to store or
to open in the editor.

The sample events run from October 2026 to September 2027. Run the script after that and the
event tiles are left out of the issue, and it says so: change the dates in `data/events.json`.

## Send it

1. In [Resend](https://resend.com), verify a domain to send from and create an API key.
2. Copy `.env.example` to `.env` (git-ignored) and set `RESEND_API_KEY`, `FROM` (an address on
   that domain) and `TO`.
3. `npm run send`.

Without all three set, `npm run send` stays a dry run and says which are missing. `TO` may list a
few addresses, separated by commas; every one of them gets the same message.

## Before you send a newsletter for real

**A real newsletter needs an unsubscribe link.** `renderEmail` puts one in the footer when you
pass `unsubscribeUrl`, and warns when you do not. It is inserted as written, so it can be a link
your app makes for each reader or your email service's merge tag. To try it here, set
`UNSUBSCRIBE_URL` in `.env` to a link: the script passes it as `unsubscribeUrl`, and as the
`List-Unsubscribe` header that mail apps offer beside the sender. (Resend's email API sends what
it is given, so a merge tag would arrive as written.)

A real send also goes out once per reader, each with their own unsubscribe link, rather than to
a list in `TO`: Resend's batch endpoint takes up to 100 messages a request, and its Broadcasts
manage the audience and the unsubscribe link (`{{{RESEND_UNSUBSCRIBE_URL}}}`) for you.

## How it works

| File                   | What it does                                                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/newsletter.ts`    | Picks the period (`suggestPeriod(todayIn(TIME_ZONE))`: this month so far, looking six weeks ahead), calls `assembleDocument`, fills two blocks in code, renders, writes, and sends. |
| `src/events-source.ts` | A `DataSource` for the `event_tiles` block. `id: 'events'` is the source the built-in templates name, so assembling fills the tiles with no more wiring.                            |
| `src/resend.ts`        | One `POST https://api.resend.com/emails` with `fetch`. Any provider with an HTTP API takes the same subject, HTML and text.                                                         |
| `src/brand.ts`         | The brand kit, the site the email's relative links resolve against, and the organisation's time zone.                                                                               |
| `data/events.json`     | Fictional events: the table your own data source would query.                                                                                                                       |

To make it yours, point `eventsSource.items` at your database, add sources for the template's
other list blocks (`sponsors`, `new_members`, `posts`, `calendar`), and swap the brand kit for
your own.
