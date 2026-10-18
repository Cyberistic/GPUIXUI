# 532 — One diagnostic per non-finite metric

Status: ready. Depends on 358, 360, 364, 368, 393 (`featherLadder`) and 531.

## The bug

The numeric check reports a non-finite value as `finite`, then compares it in
the neighbouring rules and blames a value that is fine:

- `density.rowHeight: Infinity` reports `finite` on `rowHeight` and then
  `at-least` failures on `dimensions.overlayMaxHeight` and
  `dimensions.chatViewportMinHeight` (`finite-metrics.test.ts` asserts all three
  today). The row is the defect; the two derived viewport floors are not.
- `spacing.sm: Infinity` reports `finite` on `sm` and then a
  `non-decreasing` failure on `md` (8 < Infinity). `md` is correct; `sm` is the
  bad value.
- `dimensions.drawerWidthSm: Infinity` reports `finite` on `drawerWidthSm` and
  an `increasing` failure on `drawerWidthMd`.

A consumer reading the diagnostic list has to work out which entry is the
cause. `featherLadder` already solved this for the elevation feather: it skips
the comparison when either neighbour is non-finite, so one bad level keeps one
diagnostic. The other ladder and the two bounds do not.

This is diagnostics quality, not a false pass: every broken value is still
reported once by `finite`.

## The decision

Make the comparison rules silent when either side is not a number the renderer
can paint:

- `ladder`: keep the per-step sign rule (`non-negative` / `positive`), but skip
  the step comparison when the current step or the previous one is non-finite.
- `atLeast` / `atMost`: return `[]` when either `actual` or `bound` is
  non-finite. The `finite` walk reports the non-finite side.

The sign rules stay as they are: `-Infinity` is both non-finite and negative,
and the existing case that asserts both diagnostics is a deliberate statement
about direction. One value can still be wrong in two independent ways.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | `ladder`, `atLeast`, `atMost` skip a non-finite comparison; one JSDoc sentence states the rule |
| `packages/tokens/src/finite-metrics.test.ts` | The `rowHeight: Infinity` case keeps one diagnostic; new cases for a non-finite spacing step and drawer width |
| `docs/tokens.md` | The `MetricFailure` paragraph states that a non-finite value is not compared by a ladder or floor |
| `TODO.md` | Tick the row this plan adds |
| `.agents/slop/plans/README.md` | Index this plan |

## Steps

1. In `metrics.ts`:
   - `ladder`: after computing `sign`, return `[...sign]` when
     `!Number.isFinite(value) || !Number.isFinite(previous[1])` instead of
     comparing.
   - `atLeast` / `atMost`: add a guard at the top returning `[]` when either
     number is non-finite.
2. Update the JSDoc above `ladder` and the bounds: "a value the finite rule
   rejects is not compared by a range rule, so one bad value keeps one
   diagnostic".
3. Update `finite-metrics.test.ts`:
   - `rowHeight: Infinity` → only the `finite` failure on `rowHeight`.
   - Add `spacing: { sm: Infinity }` → only `spacing.sm:finite`.
   - Add `dimensions: { drawerWidthSm: Infinity }` →
     only `dimensions.drawerWidthSm:finite`.
   - Keep the `-Infinity` case that asserts both `finite` and `non-negative`
     (a sign is an independent defect).
4. Add the sentence to `docs/tokens.md` beside the `MetricFailure` paragraph.
5. Run the gates.

## Commands and expected results

```sh
nub run --filter @gpuixui/tokens test
```

Expected: 122 files pass; the changed cases assert fewer failures and the new
cases assert exactly one.

```sh
nub run check && nub run lint && nub run test
```

Expected: all green.

## Test plan

Two directions: on the pre-fix code, `spacing.sm: Infinity` returns the `finite`
failure **and** `md:non-decreasing`; the new case asserts the list has length 1
and fails. After the fix it passes. The `rowHeight` case is an existing
assertion tightened from three failures to one, and it fails on the pre-fix
code for the same reason.

## STOP conditions

- A shipped theme, platform variant or recipe gains a failure. It cannot: the
  rules only become quieter, and every shipped value is finite. If one appears,
  stop and inspect the change.
- A test that is not about a non-finite value changes. Stop: the guard is too
  broad and is hiding a real comparison.

## Acceptance

- A non-finite metric produces one `finite` diagnostic, plus a sign diagnostic
  where the value is also negative.
- No comparison rule reports a finite value against a non-finite bound.
- All gates green; the ledger and documents state the rule.
