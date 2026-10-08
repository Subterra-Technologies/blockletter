# Blockletter with Convex

[Convex](https://www.convex.dev) functions for a newsletter's drafts and the events that fill
them, and a small Vite + React client with the editor.

- **`issues` and `events` tables.** A draft is stored as the editor's `NewsletterDocument`, as it is.
- **Issues assemble inside a mutation.** `issues:create` applies a template and fills its event
  tiles from the `events` table, in the same transaction that stores the issue.
- **The editor's data source is a query.** Refreshing the event tiles, or choosing among events,
  calls `events:inWindow` for the issue's dates.
- **Saving validates.** `issues:save` stores a document only when Blockletter's `validateDocument`
  finds nothing wrong, and otherwise tells the client what to fix through a `ConvexError`.
- **An action renders and sends.** `email:sendTest` renders the stored issue with `renderEmail` and
  sends it through Resend's REST API, or returns the HTML until Resend is configured.

## Run it

Node 20.19 or 22.12 and later, which Vite 8 needs.

`npm install` here is all the setup. To run it against a change to the packages instead, install
against the repository's packed build (see [Installing an example](../README.md#installing-an-example)):

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

`npm run dev` runs `npx convex dev`. The first time, it asks you to log in to Convex or to run a
deployment locally without an account; then it pushes the functions in `convex/`, writes the
deployment's address to `.env.local`, and keeps pushing them as you change them. Each start also
runs `events:seed`, which adds a few weeks of fictional events to an empty `events` table, and
starts the client, Vite, alongside. Open the address Vite prints, choose a template and **Create
draft**.

## Sending tests

Until it can send, **Send a test** shows the email as the action rendered it. The keys live on the
deployment, where the action reads them, never in the client:

```sh
npx convex env set RESEND_API_KEY re_your_api_key
npx convex env set FROM "Newsletter <newsletter@your-verified-domain.example>"
npx convex env set TO you@your-domain.example
```

`FROM` must be on a domain you have verified with [Resend](https://resend.com). A test goes to you
and needs no unsubscribe link; a real send passes `renderEmail` an `unsubscribeUrl` for each
reader, and the renderer warns without one.

## What is where

| File                     | What it shows                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `convex/schema.ts`       | The `issues` and `events` tables, with the indexes the queries read through.                                                |
| `convex/issues.ts`       | `list`, `get`, `create` (assembling the template), `save` (validating the document) and an internal query for the action.   |
| `convex/events.ts`       | `inWindow`, the query the editor's data source calls, and `seed`.                                                           |
| `convex/email.ts`        | `sendTest`: `renderEmail`, then `fetch` to Resend.                                                                          |
| `convex/eventsSource.ts` | The events `DataSource`, shared: in the browser it calls `events:inWindow`; in `issues:create` it reads the table directly. |
| `convex/brand.ts`        | The brand kit and render options, shared by the functions and the client.                                                   |
| `src/drafts.tsx`         | The drafts list, live through `useQuery`, and the form that starts an issue.                                                |
| `src/issue-page.tsx`     | `<NewsletterEditor fill />`, controlled, saving through `useMutation` and sending through `useAction`.                      |
| `convex/_generated/`     | Code `npx convex dev` generates from `convex/`, committed so the example typechecks without a deployment.                   |

## Notes for your own app

- **Generated code.** `convex/_generated` is committed, as Convex recommends, so
  `npm run typecheck` works on a fresh clone and in CI. `npx convex dev` keeps it up to date; commit
  what it changes.
- **Validators.** The schema stores the document as `v.any()` and leaves its shape to
  `validateDocument`, which knows every block. Convex validators for the document itself are on
  Blockletter's [roadmap](../../docs/PLAN.md).
- **Dates.** "This month" is a date in the organisation's time zone, so the client works out the
  period (`suggestPeriod(todayIn(TIME_ZONE))`) and `issues:create` checks it.
- **Typing survives live updates.** `useQuery` keeps the stored issue live, but the document being
  edited lives in the editor component's state, initialised once: a save, or the same issue saved
  in another tab, never replaces what is being typed.
- **Access.** The functions check no identity, to keep the example small. A real app checks
  `ctx.auth.getUserIdentity()` at the top of every public function.
