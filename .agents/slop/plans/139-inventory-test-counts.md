# 139 — Inventory test counts, and the three rows that drifted

- **Phase:** C/F (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 117 (inventory check), 128 (ref sweep), 134–138
- **Status:** planned.

`COMPONENTS.md` states a native test count for every Tier 2 row, but nothing
checks it. Three rows are already wrong — each by the ref-composition test plan
128 added without updating the ledger:

| Row | Says | Suite has |
| --- | ---- | --------- |
| Accordions | 12 | 13 |
| Dialogs | 12 | 13 |
| Popovers | 8 | 10 |

The matching docs pages repeat the stale numbers. Add the missing tests to the
prose, correct the rows, and make the inventory suite compute the count from the
behaviour file so the next drift fails a gate instead of shipping.

## 1. Files

```
packages/components/src/inventory.test.ts     # +notes parse, +count check, +header
COMPONENTS.md                                 # 3 counts (+ 2 from plans 137/138 are current)
packages/components/docs/accordion.mdx        # 12 -> 13 (+ the ref test)
packages/components/docs/dialog.mdx           # 12 -> 13 (+ the content ref test)
packages/components/docs/popover.mdx          # 8 -> 10 (+ inline-consumer + ref tests)
TODO.md                                       # the docs-truth task
.agents/slop/plans/README.md                  # index this plan
```

## 2. The check

`tier2Rows()` already parses the table. Add the notes column:

```ts
notes: cells[3] ?? "",
```

and a test that, for every `done` record, reads its behaviour file and counts
lines starting with exactly two spaces and `it(` (the suite convention, verified
against all 24 files). Parse `/(\d+) native behaviour tests/` out of the notes:

- no number in the row → fail with `row does not state a native test count`;
- a different number → fail with `row says N, suite has M`.

The test must not depend on formatting beyond that phrase; every Tier 2 row uses
it. It is a repository check like the existing inventory suite, so `node:fs` is
already authorised (plan 117 §3).

## 3. Both directions

1. Green first (all rows corrected).
2. Change Accordions from 13 to 12 in `COMPONENTS.md` → the new test fails with
   `Accordions: row says 12, suite has 13`.
3. Restore. Run the whole `test` suite.

## 4. Commands and expected results

```
nub run --filter @gpuixui/components test             # 223 -> 224 (+1 inventory test)
nub run --filter @gpuixui/components test:behaviour   # 280 unchanged
nub run check                                         # exit 0
nub run test                                          # exit 0
```

## 5. STOP conditions

1. A behaviour suite uses an `it` indentation other than two spaces → STOP and
   agree a shared counter helper rather than a per-file exception.
2. A row legitimately has no native test count → STOP; the column is part of the
   ledger contract, not optional.
3. The check reports a mismatch that is not the deliberate red line → fix the
   ledger only after confirming the suite count by hand.

## 6. Deviations, recorded during implementation
