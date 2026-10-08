# Releasing

How a change reaches npm, and the one-time setup that lets CI publish. The demo deploys on its own,
from every push to `main` (`.github/workflows/demo.yml`).

## How a release happens

1. A pull request that changes `packages/core` or `packages/react` adds a changeset
   (`npx changeset`): which packages, the bump, and the line users will read in the changelog.
2. When it merges, the **Release** workflow (`.github/workflows/release.yml`) opens or updates a
   **Version packages** pull request. It bumps the versions, writes each package's `CHANGELOG.md`
   from the changesets waiting on `main`, and moves the examples' version ranges to match.
3. Merging that pull request publishes the new versions to npm with a provenance attestation, pushes
   the version tags and creates a GitHub release for each package.

The two packages are released together, always at the same version. Until 1.0, a feature is a
`minor` bump and so is a breaking change (say so in the changeset); a fix is a `patch`.

Only the workflow's last job can publish. It runs in the repository's `npm` environment, which is
the only place an npm credential lives, and it publishes the exact tarballs an earlier job built
and tested.

## One-time setup

### 1. The npm organisation

The packages are scoped to `@subterra-technologies`, so that organisation must exist on npm: create
it at <https://www.npmjs.com/org/create> (free for public packages) and add the maintainers, each
with two-factor authentication on.

To publish under another name instead (plain `blockletter` was free when this was written), rename
before the first release: each package's `name`, the import paths throughout the repository (search
for `@subterra-technologies/blockletter`), and the `fixed` list in `.changeset/config.json`. After
a release, a rename means publishing new packages and deprecating the old ones.

### 2. Let Actions open the version pull request

**Settings → Actions → General → Workflow permissions**: allow GitHub Actions to create and approve
pull requests, first in the organisation's settings (it overrides the repository's) and then in
this repository's. Without it, the version job fails.

### 3. The first publish (done: `0.1.0`, 2026-10-08)

npm's trusted publishing, which needs no stored credential, can only be set up on a package that
already exists, and npm no longer lets a token that bypasses two-factor authentication publish. So
a maintainer published the first release by hand: an npm account with two-factor authentication
on, `npm login`, then `npm publish -w packages/core` and `npm publish -w packages/react` from an
up-to-date `main`, approving each with two-factor authentication, and finally a GitHub release for
each package's tag. A package published this way carries no provenance attestation; releases from
the workflow do.

### 4. Switch to trusted publishing

For each package on npmjs.com, **Settings → Trusted publisher → GitHub Actions**:

| Field             | Value                   |
| ----------------- | ----------------------- |
| Organization      | `Subterra-Technologies` |
| Repository        | `blockletter`           |
| Workflow filename | `release.yml`           |
| Environment       | `npm`                   |

Then, under **Publishing access**, require two-factor authentication and disallow tokens, and
revoke any access tokens left over. From here on, the workflow authenticates with a short-lived
credential GitHub issues for that one job, and every release it publishes carries a provenance
attestation. Until this is done, the workflow's publish job fails, and a release has to be
published by hand as above.

## If CI cannot publish

Prefer fixing the workflow: a release published from a laptop has no provenance attestation. If
it cannot wait, from an up-to-date `main` with the version pull request merged, logged in to npm
with two-factor authentication:

```sh
npm ci
npm run build -w packages/core && npm run build -w packages/react
npm publish -w packages/core     # npm asks you to approve with two-factor authentication
npm publish -w packages/react
```

Then create a GitHub release for each package's tag (`@subterra-technologies/blockletter@<version>`
and `@subterra-technologies/blockletter-react@<version>`), with that version's changelog section as
its notes.
