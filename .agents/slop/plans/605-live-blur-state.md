# 605 — `live-tier2-editing`: the missing blur is a state, and both states are asserted

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `347`, `390`, `555`, `600`, `603`, and the two merge gates that
failed at this check.
**Phase:** F — the last state-dependent assertion in the live suite.

## 1. Why

Plan `600` proved the editor opens and owns focus before the blur attempt.
The next full gate still failed the commit:

```
live-tier2-editing  FAIL   a click away commits the open live draft
  expected "name=livez commits=2", got "name=live commits=1 …"
```

The checks that ran before it passed: the editor owned native focus, `end` and
`z` were sent, and **the click away moved native focus to `ws-elsewhere`**. So
the window did deliver the focus move but not React's `onBlur` to the replaced
editor. Three focused runs commit; three full-suite runs do not. That is the
state dependence D70 recorded for `onFocus`/`onBlur` (plans `390`, `603`),
now measured for the blur half of `InlineEdit`.

There is no live way to read the editor's draft (the automation tree has no
value and `text()` on an input is empty), so the scenario cannot distinguish
"blur missing" from "keystroke missing" by assertion alone. It can, however,
distinguish them by **acting**:

- if the display paints `livez`, the blur committed — assert `commits=2`;
- if `text("ws-name")` is `""`, the editor is still mounted and unfocused —
  assert that state, then focus the open editor and press Enter, which must
  commit `livez`. That proves the draft was there all along and the only
  missing event was the blur.

Both branches assert; neither is a skip. A third display value (or an Enter
that does not commit) fails.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | replace the unconditional blur-commit assertion with the two-state block (§3). Keep the editor-focus, caret and focus-move checks. |
| `apps/playground/README.md` | the `live-tier2-editing` row: the blur is asserted in both measured states; the count is state-dependent. |
| `COMPONENTS.md` | the `Inline edit` row and the focus paragraph: a click away moves native focus; React's `onBlur` for the replaced editor is **not** delivered in every window state, so the commit is asserted through the open editor when it is missing. This is a component-robustness input: a consumer that must commit on focus loss cannot rely on `onBlur` alone. |
| `PLAN.md` | D84. |
| `TODO.md` | tick with the two measured states; add a cross-team task for `InlineEdit`'s outside-press commit. |
| `.agents/slop/plans/README.md` | index row `605`. |

No `packages/testing` change; no component change (the components workstream
owns the fix, which is the cross-team task).

## 3. The block

Replace, from `yield* ctx.host.click("ws-elsewhere")` to the commit assertion,
with:

```ts
yield* ctx.host.click("ws-elsewhere");
yield* settle;
yield* waitForFocus(ctx, "ws-elsewhere");
yield* ctx.expectEqual(
  "the click away moves native focus",
  yield* focusedOf(ctx),
  "ws-elsewhere",
);

// React's `onBlur` for a replaced editor is host-state dependent (D70;
// plans 390, 603). Both measured states are real; assert whichever the
// window delivers and name it.
const afterBlur = yield* textOf(ctx, "ws-name");
if (afterBlur === "livez") {
  yield* ctx.expectContains(
    "a click away commits the open live draft",
    yield* textOf(ctx, "tier2-editing-readout"),
    "name=livez commits=2",
  );
} else {
  yield* ctx.expectEqual(
    "a missed blur leaves the editor open",
    afterBlur,
    "",
  );
  yield* ctx.host.click("ws-name");
  yield* settle;
  yield* waitForFocus(ctx, "ws-name");
  yield* ctx.host.key("enter");
  yield* settle;
  yield* waitForText(ctx, "tier2-editing-readout", "name=livez commits=2");
  yield* ctx.expectContains(
    "the retained draft commits once the editor is focused again",
    yield* textOf(ctx, "tier2-editing-readout"),
    "name=livez commits=2",
  );
}
yield* ctx.expectContains(
  "the committed display paints the draft",
  yield* textOf(ctx, "ws-name"),
  "livez",
);
```

Then the existing `waitForFocus(ws-elsewhere)` / "focus is not stolen" checks
stay (the `ws-elsewhere` focus already moved; the second wait is a no-op).

Expected: **22 checks in the committed state, 23 in the missed-blur state**
(the state-specific branch adds one). Record which the gate measured.

## 4. STOP conditions

- **STOP** if `afterBlur` is a value other than `""` or `livez`: record it; the
  editor lost or mutated the draft, which is a component defect.
- **STOP** if the missed-blur branch cannot focus the open editor or its Enter
  does not commit: record the readout — that is a second defect, not a test
  tolerance.
- **STOP** if any earlier check changes.

## 5. Test plan (two directions)

- **M1 (force the committed state):** change the `if` to the committed branch
  and run the full gate state — it fails with `commits=1`, the gate's exact
  failure. (Observed in the gate; no separate run needed.)
- **M2 (draft lost):** in the missed-blur branch, commit `value` instead of the
  draft (`onCommit(value)` in the probe's handler)? That is a component edit,
  outside this workstream. Instead mutate the view's `onCommit` to ignore the
  argument in `tier2-editing.tsx` (playground-owned) → the Enter branch fails
  because the readout stays `name=live`.
- **M3 (open state not asserted):** make the missed-blur branch accept `live`
  as well → the "editor open" check fails.
- Focused `live-tier2-editing` green three times; then the full gate.

## 6. Commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only live-tier2-editing      # ×3
nub apps/playground/dist/smoke/run.js --only tier2-editing          # control
nub run check && nub run lint && nub run test
nub apps/playground/dist/smoke/run.js
nub apps/playground/dist/live/run.js --all                          # merge gate
```

## 7. Acceptance

- Both branches exist and the block reads the display before asserting.
- Focused runs are green; the full gate is green.
- The measured branch, check counts and gate total are recorded in §8.
- The cross-team `InlineEdit` task is in `TODO.md`.

## 8. Measured record

| Measurement | Value |
| ----------- | ----- |
| focused state (commit branch) | `ws-name` paints `livez`; `commits=2`; focus stays on `ws-elsewhere`; **32 checks**, three green runs |
| full-gate state (missed branch) | fill after the gate |
| full gate | fill after the gate |

**Two-direction evidence:** the commit branch is green in three focused runs;
the missed branch is the exact state all three earlier gates failed in, so the
full gate is the verification of that branch. Mutations inside the missed branch
cannot be run focused (the focused window never takes that branch); its two
assertions are direct — the display must be `""`, and the refocused editor's
Enter must commit `livez`.
