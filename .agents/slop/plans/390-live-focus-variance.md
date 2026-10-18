# Plan 390 — live focus delivery is window-state dependent: correct the two live checks

| Field | Value |
| ----- | ----- |
| Phase | F (live-suite truth) |
| Depends on | `190`, `344`, `345`, `347`, `389` |
| Owner | playground workstream (`apps/playground`) |
| Status | landed |

## 1. Why this correction exists

Plan `389`'s green run exposed two live checks that assert a **measurement**, not a
contract:

- `live-key-routing` asserts `innerFocus=0 outerFocus=0` after clicking a focusable
  div — "a live click focuses natively without running React's `onFocus`".
- `live-tier2-navigation` asserts that an arrow after a click restarts at the first
  tab, which is the consequence of that missing `onFocus` in `Tabs`.

On 2026-10-18 the same clean `HEAD` (`git show HEAD:apps/playground/src/live/scenarios.tsx`,
registry filtered to those two scenarios) produced:

```
live-key-routing  FAIL  a live click focuses natively without running React's onFocus
  expected "innerFocus=0 outerFocus=0", got "innerFocus=1 outerFocus=1"
live-tier2-navigation  FAIL  an arrow after a live click restarts at the first tab
  expected "tab=overview", got "tab=settings"
```

Four runs (two full suites, one three-scenario run, one clean-`HEAD` run) reproduced
it identically; the earlier `40/40` and `41/41` runs of the same code read `0`. So
**React's `onFocus` delivery for a live click depends on the window/host state** —
the old assertions are only true in one state, and a check that flips is not a check.

The transferable contract is unaffected and still holds in both states: focus moves,
keys reach the focused element, every ancestor and the window, `autoFocus` does not
dispatch `onFocus`, and a click selects a tab. This plan keeps those and records the
variance instead of asserting it.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/390-live-focus-variance.md` | this plan |
| `.agents/slop/plans/README.md` | index row; next playground number `391` |
| `apps/playground/src/live/key-routing.tsx` | header comment: the `onFocus` count is an observation, not a contract |
| `apps/playground/src/live/scenarios.tsx` | `live-key-routing`: replace the `innerFocus=0` check with "clicking the child focuses it"; `live-tier2-navigation`: drop the arrow-press assertion and the key press |
| `apps/playground/README.md` | the two live rows and the "key delivery" note: state dependence recorded |
| `COMPONENTS.md` | the `focus`/Tabs live evidence, the Tabs row, the key-routing paragraph |
| `TODO.md` | the Tabs defect row becomes "re-verify: environment-dependent"; this correction ticked |
| `.agents/slop/plans/345-live-key-routing.md`, `344-…` §8.1 | a dated amendment, not a rewrite |

No component code changes: the Tabs fix (set `active` on click) remains a good
robustness change and is still owned by `components`.

## 3. Changes

1. `live-key-routing`, after the third key:
   - **remove** the `innerFocus=0 outerFocus=0` check;
   - **add** `clicking the child focuses it` → `focusedOf === "key-inner"`;
   - keep `autoFocus does not run React's onFocus` (stable in every run so far);
   - the readout still prints both counters, so a report records which state ran.
2. `live-tier2-navigation`:
   - **remove** the `right` key press and the "restarts at the first tab" check;
   - keep the click-selects check that follows.
3. Update the comments to say the `onFocus` count is **state-dependent** and why the
   suite no longer asserts it.

## 4. Commands and expected results

```sh
nub run --filter playground check-types          # exit 0
nub run --filter playground smoke:live           # exit 0, 41/41
nub run --filter playground smoke                # exit 0, 90/90 (unchanged)
nub run check && nub run lint && nub run test    # exit 0
```

## 5. Two-direction proofs

| Mutation | Expected failure |
| -------- | ---------------- |
| remove `onKeyDown` from `key-middle` | `a named key reaches the focused element and every ancestor` |
| make `click("tab-activity")` a no-op | `the clicked tab holds focus live` |

Both were already proven by plan `345`; re-run the first and record the line.

## 6. Measured facts (2026-10-18)

- The clean `HEAD` of the same day fails both old checks in the current host state;
  the same code passed them at 15:03 and 15:10 and failed from 15:25 onward.
  Reproduced in the full suite, in a three-scenario run and in a run of the
  unmodified `HEAD` (`git show HEAD:...` with a filtered registry).
- `innerFocus=0` after `autoFocus` in every run — the `autoFocus` distinction is
  stable and is still asserted.
- `innerFocus=0 outerFocus=0` after a click in the early runs; `innerFocus=1
  outerFocus=1` in every later run.
- In the early state a click + `Right` on the Settings tab ended at `tab=overview`;
  in the later state it ends at `tab=settings`. The arrow press is no longer in the
  scenario.
- After the correction: live **41/41**, `839` checks, exit `0`; `live-key-routing`
  is 22 checks and `live-tier2-navigation` 15. `live-command-palette` (plan `389`)
  is green in every run, including the red ones.
- The two-direction direction for the remaining checks is already recorded in plan
  `345` §7 (removing `key-middle`'s `onKeyDown` fails the ancestor check; removing
  the tab click's focus fails `the clicked tab holds focus live`).

## 7. STOP conditions

- If the variance cannot be reproduced again (both states unavailable), record the
  measurements that exist and keep the checks removed; do not restore an assertion
  that only holds in one state.
- If a component-level defect is confirmed, record it cross-team instead of changing
  `packages/components`.

## 8. Acceptance criteria

- The live suite is `41/41`, exit `0`, on the current host state.
- No check asserts a value that flips with window state.
- The Tabs/InlineEdit cross-team rows say **re-verify**, with the two measurements.
- The headless suites and gates are unchanged and green.
