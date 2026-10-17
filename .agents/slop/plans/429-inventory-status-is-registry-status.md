# 429 — The inventory owns component status; the registry mirrors it

- **Workstream:** docs-site
- **Phase:** F (truth) — the docs site and `COMPONENTS.md` disagree on 22 rows
- **Owns:** `apps/docs/src/component-meta/**`, `apps/docs/src/components/landing*`,
  `apps/docs/README.md`
- **Depends on:** `411` (registry), `425` (Tier 2 pages), `117` (components gate)
- **Status:** implemented — see §8

## 1. The defect (measured 2026-10-17)

`apps/docs/src/component-meta/entries.ts` sets `status: "wip"` for **every**
delivered record. `COMPONENTS.md` marks the 22 Tier 2 rows `done` and only the 20
Tier 1 rows `wip`. Two reader-visible consequences:

1. Every Tier 2 page's `<ComponentState>` badge says `wip` while the inventory (the
   repository's source of truth for status) says `done`.
2. The landing page prints **"Implemented 0"**, because it counts `done` records:
   64 tracked, 42 delivered, 0 done. A newcomer reads that as "nothing exists".

The cause is a status rule written before Tier 2 landed: `delivered()` documents
"`wip`, not `done`: `done` waits on the published GPUix binary (the primitives
workstream's rule)". That is **the primitives workstream's** rule for Tier 1, not
the components workstream's; plan 117's gate and `COMPONENTS.md` moved Tier 2 to
`done` after its native behaviour suites ran. The registry never followed.

`registry.test.ts` cannot catch this: it compares component **titles** with the
inventory, not statuses. The docs therefore contradict the inventory in a way no
test notices — the same failure class as plans 424/426.

## 2. Decision

**`COMPONENTS.md` owns status.** The registry mirrors it; a test parses the
inventory table and fails on any difference. The docs app does not invent a
second status policy.

A `done` row is legitimate with `gpuix: "partial"` when the limitation is
documented — the inventory's own definition says "a verified interaction in the
real runtime (or a documented, evidenced limitation)". `done` with `no` or
`unverified` support stays a violation.

## 3. Files and exact changes

| File | Change |
| ---- | ------ |
| `apps/docs/src/component-meta/entries.ts` | `DeliveredOptions` gains `status?: "wip" \| "done"`; `delivered()` uses it (default `"wip"`); the 22 composition records pass `status: "done"` |
| `apps/docs/src/component-meta/registry.test.ts` | replace `done requires gpuix "yes"` with `done requires yes or partial`, plus `done + partial` must carry a documented limitation; add the inventory-status agreement test |
| `apps/docs/src/components/landing.tsx` | second stat becomes **Documented** = records that are not `planned` (42), not `done` (22); drop the now-unused `statusCounts` import |
| `apps/docs/src/components/landing.test.tsx` | assert the documented count and its label, so the `done` interpretation cannot come back |
| `apps/docs/README.md` | the adding-a-page steps say the status mirrors the inventory row and the test enforces it |
| `TODO.md`, plan index | record the change |

No component page changes: `<ComponentState>` is generated from the record, so
the 22 Tier 2 pages correct themselves.

## 4. The status parser

In `registry.test.ts`, over the `Tier 1 — foundational` and `Tier 2 —
composition and feedback` sections:

- split each table row on `|`; cell 1 is the name, cell 2 the status;
- normalise `todo` → `planned`; keep `done`/`wip`; a status beginning `blocked`
  or `unsupported` maps to that word (none today, but the inventory allows them);
- ignore the header row, the separator row and prose;
- key by the same `normalize()` the title comparison already uses;
- compare every registry record to its row, and fail with
  `<slug>: inventory <a>, registry <b>` or `<slug>: no COMPONENTS.md row`.

## 5. Tests

1. **Inventory agreement** (new): the 64 registry records match the inventory
   statuses. Before the fix it must report 22 mismatches, one per Tier 2 row.
2. **Coherence** (rewritten): `done` requires `gpuix` `yes` or `partial`; a
   `done` + `partial` record must have at least one limitation; `wip`/`done`
   still require a `sourcePath`; `unsupported` still requires `gpuix: "no"` and a
   limitation. A fixture proves the new branch can fail.
3. **Landing** (rewritten): the page shows the number of records with a page and
   the label **Documented**; it no longer prints an `Implemented` count derived
   from `done`.

**Two-direction proof:** set `badge` back to `wip` → test 1 fails with
`badges: inventory done, registry wip`; give `tabs` `status: "done"` and empty
limitations → test 2 fails; rename the landing label back to `Implemented` →
test 3 fails. Restore each and re-run.

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 25+ files pass; the new agreement test included |
| `nub run --filter docs check-types` | 0 |
| `nub run --filter docs build` | 0 |
| `nub run check` / `nub run lint` / `nub run test` | repo gate green |
| dev server `/docs/components/card` and `/` | 200; the card badge says `done`; the landing stat says 42 Documented |

## 7. STOP conditions

- The inventory and the registry disagree on **titles** after parsing → stop;
  that is the existing title test's failure, fix it first.
- A status in the inventory is not one of `todo`/`done`/`wip`/`blocked…`/
  `unsupported…` → stop and report the row; do not guess a mapping.
- Fixing a mismatch would require changing `COMPONENTS.md` → stop: the inventory
  is not this workstream's file. Record the disagreement instead.

## 8. Progress (2026-10-17)

- `DeliveredOptions` gained `status` (default `"wip"`); the 22 Tier 2 records
  now mirror their `COMPONENTS.md` `done` rows. The 20 Tier 1 rows stay `wip`.
- `registry.test.ts` parses both inventory tables and fails on any status that
  differs; `statusViolations` moved into `contract.ts` with three fixture tests
  (done + unverified rejected, done + partial without a limitation rejected).
- Landing's second stat is **Documented** (42), not `done` (22); its test names
  the label so the old "Implemented 0" reading cannot return.
- Two directions measured: `badge` set back to `wip` failed with
  `badge: inventory done, registry wip`; renaming the landing label back to
  `Implemented` failed the landing test. Restored, suite green.
- `apps/docs`: 25 files / 147 tests; type-check, build and the repo gate green.
