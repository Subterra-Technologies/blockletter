# Releasing

How a change reaches npm, and the one-time setup that lets CI publish. The demo deploys on its own,
from every push to `main` (`.github/workflows/demo.yml`).

## How a release happens

1. A pull request that changes `packages/core` or `packages/react` adds a changeset
   (`npx changeset`): which packages, the bump, and the line users will read in the changelog.
2. When it merges, the **Release** workflow (`.github/workflows/release.yml`) opens or updates a
   **Version packages** pull request. It bumps the versions and writes each package's
   `CHANGELOG.md` from the changesets waiting on `main`.
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

### 3. The first publish

npm's trusted publishing, which needs no stored credential, can only be set up on a package that
already exists. So the first release uses a short-lived token:

1. On npmjs.com, create a **granular access token** with read and write access to the
   `@subterra-technologies` scope, the shortest expiry that works for you, and permission to
   bypass two-factor authentication for publishing.
2. In this repository, **Settings → Environments → npm** (create it if the workflow has not), add
   the token as the secret `NPM_TOKEN`.
3. Merge the open **Version packages** pull request. The workflow publishes `0.1.0`.

### 4. Switch to trusted publishing

For each package on npmjs.com, **Settings → Trusted publisher → GitHub Actions**:

| Field             | Value                   |
| ----------------- | ----------------------- |
| Organization      | `Subterra-Technologies` |
| Repository        | `blockletter`           |
| Workflow filename | `release.yml`           |
| Environment       | `npm`                   |

Then, under **Publishing access**, require two-factor authentication and disallow tokens. Revoke the
granular token on npm and delete the `NPM_TOKEN` secret. From here on, the workflow authenticates
with a short-lived credential GitHub issues for that one job.

### 5. After the first release

- Remove the pre-release note from `README.md` and the demo's top bar
  (`apps/playground/src/components/top-bar.tsx`), and the "Once the packages are published" line
  in the README's install section.
- Add an npm version badge beside the CI badge in the README.

## If CI cannot publish

Prefer fixing the workflow: a release published from a laptop has no provenance attestation. If
it cannot wait, from an up-to-date `main` with the version pull request merged:

```sh
npm ci
npm login
npm run release   # builds, then publishes any version not yet on npm, and tags it
git push --follow-tags
```
