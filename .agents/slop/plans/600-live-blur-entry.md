# 600 — `live-tier2-editing`: the blur-commit check must prove the editor opened

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `347` (`tier2-editing`), `390` (window-state-dependent focus
delivery), `555` (the live blur commit), `599` (the QR twin, whose merge gate
exposed this).
**Phase:** F — a live-gate regression in the harness, not in the component.

## 1. Why

The plan-599 merge gate ran all **84** live scenarios and stopped at one:

```
FAIL   tier2        live-tier2-editing
  a click away commits the open live draft: expected a string containing
  "name=livez commits=2", got "name=live commits=1 tags=design hotkey=none ..."
83/84 scenarios passed · capabilities: ... tier2=failed
```

Three focused runs and a nine-scenario prefix (the exact run-up) are green, so
this is not a component regression and not a deterministic ordering effect. The
entry path explains it:

- the second inline edit was opened by `click("ws-name")` followed by a
  **coordinate click at `box.x + 200`**, chosen when the display was assumed to
  span the 460 px column;
- `ws-name`'s display is `alignSelf: "flex-start"`, so its box is
  **content-sized**; a coordinate click 200 px past its left edge can land
  outside it, in which case no editor opens;
- the Escape block's two checks (`name=live commits=1`, display `live`) pass
  **whether or not** the edit opened, so that block was vacuous in the same
  state, and the blur block could never commit.

The component is correct: `InlineEdit`'s layout effect moves native focus to
the swapped `<input>`, so the scenario can prove the edit opened instead of
relying on a coordinate click.

**Guarded bug:** a live check that depends on an unverified entry step can pass
vacuously and fail opaquely later; and a coordinate click into a content-sized
control is not a reliable entry path.

## 2. Exact file

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | in `live-tier2-editing`: after each of the three `click("ws-name")` entries, `waitForFocus` then assert `focusedOf === "ws-name"` (the swapped editor owns native focus). Drop the two `clickWindow(box.x + 200, …)` calls. Before typing `z`, press `end` so the append is explicit rather than caret-dependent. After the click away, assert focus reached `ws-elsewhere` **before** the commit check, so a failed focus move is named as such. Update the block's header comment. |
| `.agents/slop/plans/README.md` | index row `600`. |
| `apps/playground/README.md` | the `live-tier2-editing` row: the entry is proven by focus, not a coordinate click; the blur commit stays asserted (window-state dependent, plan `390`). |
| `TODO.md` | tick with the measured runs. |
| `PLAN.md` | D82 (the gate lesson). |

No `packages/components` change: the component's focus and blur handlers are
already correct and measured. No `packages/testing` change: `waitForFocus`,
`focused` and `key` exist.

## 3. Steps

1. First entry (Enter commit): keep the bounds/text checks; add
   `waitForFocus(ctx, "ws-name")` then
   `expectEqual("the swapped editor owns native focus", focusedOf, "ws-name")`.
   Delete `const editor` / `clickWindow`.
2. Second entry (Escape): after `click("ws-name")` + `settle`, add the same
   focus wait/assert. Delete `const again` / `clickWindow`. `x` then `escape`
   (the draft text is discarded either way; the new focus check is what proves
   the edit opened).
3. Third entry (blur): after the entry, add the same focus wait/assert. Then
   `key("end")` (native caret to the end — measured live in `live-pointer-entry`
   and the terminal twin), `settle`, `key("z")`.
4. Click `ws-elsewhere`; settle; `waitForFocus(ctx, "ws-elsewhere")`; assert
   `focusedOf === "ws-elsewhere"`; then the existing
   `waitForText(… "name=livez commits=2")` and the two commit assertions, and
   keep the final focus check (redundant by design: it names the contract even
   when the earlier wait succeeded).
5. Screenshot unchanged.

Expected: the scenario gains **1 check** (30 → 31): three focus asserts replace two `boxOf` existence checks, no tolerance changes.

## 4. STOP conditions

- **STOP** if a live locator `click("ws-name")` does not open the editor (the
  new focus assert fails): record `focusedOf` and the readout. Do not restore
  the coordinate click as a workaround.
- **STOP** if `key("end")` does not reach the editor (the draft becomes
  `zlive`): record the readout and the draft; do not broaden the assertion to
  `contains "live"`.
- **STOP** if focus reaches `ws-elsewhere` but no commit follows: that is a
  component blur defect, not a harness one — record it as a cross-team task
  with evidence and leave the check failing rather than deleting it.
- **STOP** if the headless control's check count changes.

## 5. Test plan (two directions)

The scenario is the test. Each mutation is applied alone to
`apps/playground/src/live/scenarios.tsx`, run focused in the real window,
observed failing, and reverted:

- **M1 (unopened edit):** replace the second entry's `click("ws-name")` with a
  no-op → "the second live edit owns native focus" fails with `focused=none`
  (or the previous owner). This is the bug the fix guards.
- **M2 (caret):** remove `key("end")` → either the commit is `zlive` and the
  readout check fails, or the runtime's fresh focus already sits at the end and
  the mutation is recorded as a **null result**.
- **M3 (commit path):** remove the `click("ws-elsewhere")` → the commit check
  fails with `commits=1` (the same last-resort evidence the gate saw).

After reverting, focused `live-tier2-editing` must be green **three times in a
row**, then the full gate must be re-run.

## 6. Verification commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only live-tier2-editing        # ×3
nub apps/playground/dist/smoke/run.js --only tier2-editing           # control
nub run check && nub run lint && nub run test
nub apps/playground/dist/smoke/run.js                                # full headless
nub apps/playground/dist/live/run.js --all                           # merge gate
```

Expected: the focused live run is `1/1`, exit `0`, **31 checks**, three times;
the headless control keeps its 48 checks; headless stays **103/103** (`3653`
checks); the gate is **84/84**, exit `0`.

## 7. Acceptance

- The three focus asserts exist and the coordinate clicks are gone.
- M1 and M3 were observed failing and reverted; M2's result (fail or null) is
  recorded.
- Three green focused runs and a green full gate are recorded in §8.
- `COMPONENTS.md`'s live-suite paragraph, the README, `PLAN.md` and `TODO.md`
  carry the gate total.
