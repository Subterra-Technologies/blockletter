---
'@subterra-technologies/blockletter-react': patch
---

Require React 19.2 or newer in `peerDependencies`; the editor uses `useEffectEvent`, which earlier
versions do not have.
