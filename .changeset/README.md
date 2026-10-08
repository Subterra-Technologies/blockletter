# Changesets

Each file in this folder describes one change to a published package and how it moves the version.
When a pull request changes `packages/core` or `packages/react`, add one:

```sh
npx changeset
```

Pick the packages, the bump (`patch` for fixes, `minor` for features; Blockletter is pre-1.0, so
breaking changes are `minor` too, and say so), and write the summary a user will read in the
changelog. The two packages always release together, at the same version.

On `main`, the release workflow gathers these files into a **Version packages** pull request.
Merging that pull request publishes to npm. See [docs/RELEASING.md](../docs/RELEASING.md).
