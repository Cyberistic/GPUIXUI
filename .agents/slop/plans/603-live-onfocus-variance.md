# 603 — `live-key-routing`: `autoFocus`'s `onFocus` delivery is state-dependent

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `345` (`live-key-routing`), `390` (window-state-dependent
`onFocus`), `599`/`600` (the merge gate that exposed this).
**Phase:** F — a live-gate regression in an assertion, not in the runtime.

## 1. Why

The second full-live gate (after plan `600`) failed exactly one check:

```
FAIL   focus        live-key-routing
  autoFocus does not run React's onFocus: expected a string containing
  "innerFocus=0", got "inner=1 middle=1 outer=1 innerFocus=1 outerFocus=0 ..."
83/84 scenarios passed · capabilities: ... focus=failed
```

Plan `345` wrote "`autoFocus` focuses natively without running React's
`onFocus`" and plan `390` only corrected the **click** half of that sentence.
This run is the missing measurement for the other half: `autoFocus` **can**
dispatch `onFocus` on this host — the same code that read `innerFocus=0` in
earlier runs read `innerFocus=1` here. That makes the assertion a coin flip
between window states, which is precisely what plan `390` removed elsewhere.

**Guarded bug:** a live scenario must not assert a delivery that the harness
has measured in both states; it asserts native focus and key delivery (stable)
and leaves the counter as an observation in the readout.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | delete the `"autoFocus does not run React's onFocus"` / `innerFocus=0` check (one check, 21 → 20). Keep every key-delivery and native-focus check. Add a comment naming the two measured states. |
| `apps/playground/src/live/key-routing.tsx` | header comment: `autoFocus`'s `onFocus` delivery is **also** window-state dependent (`innerFocus` read `0` and `1` for the same code); the counters are observations. |
| `apps/playground/README.md` | the `live-key-routing` row: 20 checks; `autoFocus` moves native focus, while its React `onFocus` and a click's `onFocus` are both printed, not asserted. |
| `COMPONENTS.md` | the `focus` paragraph and the `Keyboard navigation` row: `autoFocus` moves native focus; React's `onFocus` (autoFocus **or** click) is host-state dependent and observed. The headless `TestRenderer` claim (no `onFocus`) is separate and stays. |
| `PLAN.md` | D83 with the two-state measurement. |
| `TODO.md` | tick with the focused runs and the final gate. |
| `.agents/slop/plans/README.md` | index row `603`; correct the `345` row's sentence with a pointer to `603`. |

No `packages/testing` change: `focused` and `waitForFocus` already exist.

## 3. Steps

1. Delete the `expectContains(..., "innerFocus=0")` call and the label above it.
2. Add a comment where it was:

   ```ts
   // Plan `390` retracted the click half of the `onFocus` claim; plan `603`
   // retracts the `autoFocus` half too. The same code read `innerFocus=0` and
   // `innerFocus=1` on this host, so the counter is printed in the readout and
   // never asserted. Native focus and key delivery are the stable claims.
   ```

3. `key-routing.tsx` header: replace "`autoFocus` still does not dispatch
   `onFocus` in either state" with the measured two-state sentence.
4. Ledger wording as in §2.

Expected: **20 checks** (one removed), no other change.

## 4. STOP conditions

- **STOP** if native focus is not `key-inner` after the mount (the `autoFocus`
  check): that is a runtime regression, not an assertion to remove.
- **STOP** if any key-delivery check changes: the removal must touch only the
  `onFocus` assertion.
- **STOP** if the headless `focus-traversal` check count changes.

## 5. Test plan (two directions)

- **M1 (assert the unstable observation):** re-add
  `expectContains("autoFocus runs React's onFocus", …, "innerFocus=1")` → in a
  run whose window state delivers `0` it fails. This is the reverse of the
  removed check and shows both states are real; the removal is the fix, so the
  mutation is recorded as the evidence rather than a passing guard.
- **M2 (a stable claim still fails):** change the expected `inner=1 middle=1
  outer=1` to `inner=1 middle=0 outer=1` → the delivery check fails, proving the
  scenario still tests something.
- Focused `live-key-routing` must be green **three times** after the revert.

## 6. Verification commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only live-key-routing    # ×3
nub apps/playground/dist/smoke/run.js --only focus-traversal    # control
nub run check && nub run lint && nub run test
nub apps/playground/dist/smoke/run.js
nub apps/playground/dist/live/run.js --all                      # merge gate
```

Expected: live `1/1`, exit `0`, **20 checks**, three times; headless stays
**103/103** (`3653` checks); the gate is **85/85** (`2090` checks), exit `0`.

## 7. Acceptance

- The `innerFocus` assertion is gone and every other check is unchanged.
- The measured `0`/`1` states are recorded in the comment, `PLAN.md` and the
  ledgers.
- Three focused runs and a green full gate are recorded in §8.

## 8. Measured record

| Measurement | Value |
| ----------- | ----- |
| the failing gate reading | `inner=1 middle=1 outer=1 innerFocus=1 outerFocus=0 window=1 chords=0` |
| a focused run of the same code, asserting `innerFocus=1` (M1) | **fails**: `innerFocus=0` — the two states are real on the same branch |
| live checks after the fix | `live-key-routing` **20** (the row's `22` was stale; the real prior count was 21) |
| focused runs | three green (`live-key-routing`, 20 checks; a fourth `--json` run confirmed the count) |
| full gate | **85/85**, `2090` checks, exit `0`, every capability verified (the gate's first attempt failed only `live-query-builder` on a missing select item; the bounded content waits landed in plan `605`'s commit) |
| control | headless `focus-traversal` green; full headless **103/103** |

**Mutation proofs, each observed and reverted:**

| # | Mutation | Observed |
| - | -------- | -------- |
| M1 | assert `innerFocus=1` (the gate's state) | focused run failed: `expected "innerFocus=1", got "… innerFocus=0 …"` — the observation is a coin flip, so the assertion had to go |
| M2 | expect `inner=1 middle=0 outer=1` | failed: `got "inner=1 middle=1 outer=1 …"` — key delivery is still tested |
