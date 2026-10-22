# LICENSES/ — licences and attribution

A release requirement, not paperwork. The library reimplements behaviour from
other projects and may reuse source; every one of those needs its licence
verified, its provenance recorded, and its notices preserved.

## What must be answered before release

| Question | Where the answer goes |
| -------- | --------------------- |
| What licence does each reference actually ship? | `inventory.md` |
| Which implementations are *inspiration* and which are *copied or adapted*? | `provenance.md` |
| Which notices must be redistributed with our package? | `packages/motion/NOTICE` |
| Which assets (icons, images) are we shipping, and under what terms? | `inventory.md` |
| Are any logos or trademarks being reused? | **must be "no"** — the identity is original |

## Files

| File | Purpose |
| ---- | ------- |
| `inventory.md` | one row per dependency and reference: name, version/commit, licence, use, obligations |
| `provenance.md` | one row per adapted implementation: source, commit, what changed, licence |
| `packages/motion/NOTICE` | the notices the motion port must redistribute: both open-gpui NOTICE copyright lines (Apache-2.0 §4(d)) and the gpui-ce-motion MIT text |

## Non-negotiables

- **Do not copy logos or trademarks** into the new identity.
- **Do not reuse source** unless the licence permits it *and* the notice is
  preserved and recorded in `provenance.md`.
- **Verify the licence by reading the file in the clone** at
  `references/<repo>/LICENSE*` and record the commit it was read at. A README
  badge is not evidence.
- A package that cannot be licensed compatibly is not a dependency — replace it
  or reimplement it.

Nothing is recorded yet: Phase A produces the first inventory, because a
licence inventory written after the code is a rewrite.
