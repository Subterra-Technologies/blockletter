# Examples

Three small apps that use Blockletter the way yours would. Each is its own npm project with its
own README.

| Example            | What it shows                                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`node`](node)     | A plain Node script: this month's issue assembled from a built-in template and a JSON file of events, rendered to HTML and plain text, and sent through Resend's REST API when you ask.                         |
| [`nextjs`](nextjs) | A Next.js App Router app: a drafts list, the editor filling the screen, drafts saved by Server Actions, a data source served by a route handler, and a **Send a test** action that renders on the server.       |
| [`convex`](convex) | A Convex backend with a small Vite + React client: issues assembled inside a mutation, saved through a mutation that validates them, events read by a query, and an action that renders and sends a test email. |

All three use one fictional organisation's sample data, and none sends anything until you give it
a Resend API key.

## Installing an example

The examples sit outside the repository's npm workspaces, so the root install stays lean, and each
depends on the packages by their published version range:

```json
"@subterra-technologies/blockletter": "^0.1.0",
"@subterra-technologies/blockletter-react": "^0.1.0"
```

Each release moves those ranges to the version it makes (`npm run version-packages` runs
`node scripts/examples.mjs sync-versions`), so an example always asks npm for the release its code
was written against.

### Once the packages are on npm

Install as you would any project, in place or after copying the example anywhere:

```sh
cd examples/nextjs
npm install
```

### Before then, or to try a change to the packages

From the repository root, build the packages and pack them into tarballs, which hold exactly the
files `npm publish` would upload, then install the examples against them:

```sh
npm install
npm run examples:pack      # builds both packages into examples/.packs/*.tgz
npm run examples:install   # every example; or some: npm run examples:install -- nextjs
```

`examples:install` runs this in each example, for the Blockletter packages that example uses:

```sh
npm install --no-save ../.packs/blockletter.tgz ../.packs/blockletter-react.tgz
```

npm takes those packages from the tarballs and everything else from the registry. `--no-save`
writes neither `package.json` nor a lockfile, so the example keeps the version range it will
install from npm once the packages are published, and there is nothing to undo when they are.
Packing again and reinstalling picks up any change to the packages.

While the packages are unpublished, two things follow from that:

- `npm ls` calls the Blockletter packages `invalid`: the tarballs say `0.0.0`, outside `^0.1.0`.
  It is harmless.
- A plain `npm install` in an example asks the registry for them and fails. To add a dependency,
  write it into the example's `package.json` and run the tarball install again.

A tarball holds only what a package publishes: `dist/`, and a `package.json` with its `exports`,
types and dependencies. So an example installed from one finds the same packaging problems a user
would, and the [CI](../.github/workflows/ci.yml) `examples` job installs all three this way on
every pull request, with the repository's own `node_modules` removed first.
