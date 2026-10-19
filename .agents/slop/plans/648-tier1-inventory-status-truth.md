# 648 — The Tier 1 inventory still claims a red suite and a docs site it does not have

**Phase:** F (integration and polish)
**Owner:** primitives
**Depends on:** 529, 583, 590, 597, 598, 603, 641, 644
**Status:** done — 2026-10-19

## 1. The defect

`COMPONENTS.md` is the inventory a reader uses to decide what is finished. Its
Tier 1 preamble (the paragraph above the 28 status rows) says:

> The status stays `wip` because the suite has now been run on the **release-tag**
> build (plan `583`) and one measured runtime fact still fails there: its box
> model is 2 px smaller than the main-derived one (plan `529` §6.5), so the
> absolute-geometry assertions are short.

Both halves are now false:

- plans `597` and `598` replaced the content-origin reading with `paintBounds`
  and subtracted a scroller's own offset; the full runtime suite passes on the
  release-tag build (`58 files`, all green — the same file says so 160 lines
  earlier, and the last full run measured `58 files / 820 tests`);
- the same paragraph says every row has "a docs page (in-package and on the docs
  site)", but six public parts have no Fumadocs page: **`IconButton`,
  `ToggleGroup`, `CheckboxGroup`, `Grid`, `InfoTip` and `ThemeProvider`**
  (`TODO.md`'s docs-site row and the docs-site workstream's own TODO).

A stale reason is a real defect here: plans `583`, `608` and `641` all fixed the
same class, and the inventory's own §"How the two evidence columns are decided"
already states the provenance caveat correctly. The rows are still `wip`; the
paragraph must say why truthfully.

## 2. The rule

The Tier 1 preamble states exactly two reasons, neither of which is a failing
suite:

1. **Provenance** — the native evidence is a source build of the published
   `0.10.0` tag on Intel macOS, not a published prebuilt binary (ADR `0003`);
   the published-binary CI run is the playground workstream's task.
2. **Docs site** — six parts have no Fumadocs page (list them); every part has
   an in-package page today.

It must also say that the published box model is *not* a remaining gap
(plans `597`/`598`), so the old excuse cannot return.

The 28 Tier 1 rows stay `wip`; flipping one is a deliberate ledger change, not a
side effect of a bug fix.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `COMPONENTS.md` | Replace the stale Tier 1 preamble with the two real reasons, the six docs-site gaps and the box-model correction. No row status changes. |
| `packages/primitives/src/inventory-status.test.ts` | New guard: the preamble must not claim the box model makes rows `wip`, must not claim every row has a docs-site page, must name the provenance caveat and all six docs-site gaps, and every Tier 1 row must still be `wip`. |
| `packages/primitives/README.md` | Offline file count `60` → `61`; add the new guard to the list of package-wide guards. |
| `.agents/slop/plans/README.md` | Index this plan. |
| `TODO.md` | One ticked row; the primitives section count `156/156` → `157/157`. |

Do **not** change a component, a row status, the runtime suite, or the docs-site
tree (another workstream owns it).

## 4. Commands and expected results

Run from `workspaces/primitives`:

```sh
nub run --filter @gpuixui/primitives test src/inventory-status.test.ts
# Expected: 1 file passed, 4 tests.

nub run --filter @gpuixui/primitives test src/docs-counts.test.ts
# Expected: 1 file passed, 5 tests (the README now says 61).

nub run --filter @gpuixui/primitives test
# Expected: 61 files passed, 864 tests.

nub run check
nub run lint
nub run test
# Expected: exit 0.
```

## 5. Both-direction proof (recorded)

Restoring `git show HEAD:COMPONENTS.md` and running the file produced:

```text
× does not claim a box-model geometry gap
  AssertionError: COMPONENTS.md: plans `597`/`598` corrected the published box
  model; the preamble must not say the geometry still fails: expected true to
  be false
× names the provenance caveat and every docs-site gap
  AssertionError: COMPONENTS.md: the preamble must name the source-build
  provenance (ADR `0003`): expected false to be true
× says the box model is corrected, not a remaining gap
  AssertionError: expected 'example, a docs page (in-package and …' to
  contain '`597`'
Tests  3 failed | 1 passed (4)
```

Flipping one row (`Text / typography`) to `done` produced:

```text
× keeps every Tier 1 row wip until the ledger changes deliberately
  AssertionError: COMPONENTS.md: a Tier 1 row that flips to done must update
  this plan and the preamble in the same change: expected [ 'done' ] to deeply
  equal []
Tests  1 failed | 3 passed (4)
```

Restoring both: `4 passed (4)`.

## 6. STOP conditions

- A component row, a runtime suite or a docs-site file has to change: stop —
  this plan is ledger truth only.
- The Fumadocs gap count is not six when the test is written: stop and record
  the measured list instead of hard-coding this plan's list.
- The README's declared offline file count is already stale for another reason:
  stop and report the count you measured.

## 7. Acceptance

The inventory preamble names the provenance caveat and the six docs-site gaps,
the box-model claim is gone, every Tier 1 row is still `wip`, the guard passes in
both directions, and `check` / `lint` / `test` are green.
