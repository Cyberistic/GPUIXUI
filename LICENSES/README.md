# LICENSES/ — licences and attribution

A release requirement, not paperwork. The library reimplements behaviour from
other projects and may reuse source; every one of those needs its licence
verified, its provenance recorded, and its notices preserved.

## What must be answered before release

| Question | Where the answer goes |
| -------- | --------------------- |
| What licence does each reference actually ship? | `inventory.md` |
| Which implementations are *inspiration* and which are *copied or adapted*? | `provenance.md` |
| Which notices must be redistributed with our package? | `NOTICE` |
| Which assets (icons, images) are we shipping, and under what terms? | `inventory.md` |
| Are any logos or trademarks being reused? | **must be "no"** — the identity is original |

## Files

| File | Purpose |
| ---- | ------- |
| `inventory.md` | one row per dependency and reference: name, version/commit, licence, use, obligations |
| `provenance.md` | one row per adapted implementation: source, commit, what changed, licence |
| `NOTICE` | the notices our package must redistribute |
| `adabraka-ui.md` | the first reference record: the limits-checklist structure used by `docs/gpuix-capabilities.md` (MIT, no source copied) |

## Non-negotiables

- **Do not copy logos or trademarks** into the new identity.
- **Do not reuse source** unless the licence permits it *and* the notice is
  preserved and recorded in `provenance.md`.
- **Verify the licence by reading the file in the clone** at
  `references/<repo>/LICENSE*` and record the commit it was read at. A README
  badge is not evidence.
- A package that cannot be licensed compatibly is not a dependency — replace it
  or reimplement it.

The inventory is not written yet — Phase A produces the first full pass, because
a licence inventory written after the code is a rewrite. The first per-reference
record (`adabraka-ui.md`) landed with the capability map; every later reference
adds its own file and a row here.
