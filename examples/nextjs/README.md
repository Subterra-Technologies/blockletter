# Blockletter in a Next.js app

A newsletter workspace on the Next.js App Router: a list of drafts, the editor filling the screen
for one issue, drafts saved through Server Actions, an events data source served by a route
handler, and a **Send a test** action that renders the email on the server.

Built against Next.js 16 with its recommended defaults (Turbopack, Cache Components), React 19 and
TypeScript.

## Run it

Node 20.9 or later.

Once the packages are published, `npm install` here is all the setup. Until then, install against
the repository's packed build (see [Installing an example](../README.md#installing-an-example)):

```sh
# in the repository root
npm install && npm run examples:pack
# here
npm install --no-save ../.packs/blockletter.tgz ../.packs/blockletter-react.tgz
```

Then:

```sh
npm run dev
```

Open http://localhost:3000, choose a template and **Create draft**. The new issue covers this
month so far, and its event tiles have already filled from the next six weeks of (fictional)
events. Edit it, then **Save draft** and **Send a test**.

## Sending tests

Until it can send, **Send a test** shows the email as the server rendered it. To send it instead:

1. In [Resend](https://resend.com), verify a domain to send from and create an API key.
2. Copy `.env.example` to `.env.local` (git-ignored) and set `RESEND_API_KEY`, `FROM` (an address
   on that domain) and `TO`.
3. Restart `npm run dev`.

The key is read by the Server Action, on the server, and never reaches the browser. A test goes
to you and needs no unsubscribe link; a real send passes `renderEmail` an `unsubscribeUrl` for
each reader, and the renderer warns without one.

## What is where

| File                               | What it shows                                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/layout.tsx`                   | The editor's stylesheet, imported once and before the app's own CSS, so the app's rules win any tie with the editor's scoped reset.                                                 |
| `app/page.tsx`                     | The drafts list, read inside `<Suspense>` when the page is requested, and a plain form that starts an issue through a Server Action.                                                |
| `app/actions.ts`                   | The Server Actions. `createIssue` assembles a template on the server; `saveIssue` checks the document with `validateDocument` first; `sendTestIssue` renders it with `renderEmail`. |
| `app/issues/[id]/page.tsx`         | Loads one issue and gives the editor the screen under the header.                                                                                                                   |
| `app/issues/[id]/issue-editor.tsx` | The client component: `<NewsletterEditor fill />`, controlled, with the app's Save and Send buttons in its `toolbar`.                                                               |
| `app/api/events/route.ts`          | `GET /api/events?from=…&until=…`: the events between two dates.                                                                                                                     |
| `lib/events-source.ts`             | The events `DataSource`. In the browser it reads the route handler; in `createIssue` it reads the events directly.                                                                  |
| `lib/issues.ts`                    | Drafts in a JSON file, `data/issues.json`.                                                                                                                                          |
| `lib/resend.ts`                    | One `POST https://api.resend.com/emails` with `fetch`, no SDK.                                                                                                                      |

## Notes for your own app

- **Storage.** `lib/issues.ts` keeps drafts in a local JSON file so the example runs with nothing
  to set up. A real app keeps them in its own database: a `NewsletterDocument` is plain JSON, so a
  JSON column or a document store holds it as it is. A file is no use on a serverless host, where
  each instance has its own short-lived disk.
- **Validation.** A Server Action is a public endpoint. `saveIssue` treats the document as untrusted
  input and stores it only when `validateDocument` finds nothing wrong, and a real app also checks
  who is asking at the top of every action.
- **Full height.** `fill` makes the editor take its container's height, so `.editor-page` in
  `app/globals.css` is the screen less the header: `calc(100dvh - var(--header-height))`. Its panes
  then scroll on their own, and below 64rem it shows one pane at a time.
- **Client and server.** The editor package's bundle is marked `"use client"`, so it needs no
  wrapper file of your own wherever it is imported. The editor is controlled, so it renders in a
  client component that holds the document being edited (`issue-editor.tsx`), while the server
  loads, saves, assembles and renders.
- **Typing survives saving.** The editor's document lives in the client component's state,
  initialised once from the server. A save re-renders the page on the server, and nothing in that
  replaces what is being typed.
- **`AGENTS.md`** is the block `next dev` writes for AI coding agents, pointing them at the docs
  bundled with the installed Next.js, which can be newer than what they were trained on.
