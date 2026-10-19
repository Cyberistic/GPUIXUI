# 640 — Color picker: a swatch activates Space on release

**Phase:** F (consistency and keyboard contract)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 318 (color picker), plan 332 (activation contract),
plan 334 (the remaining button-shaped parts), plan 522 (focus ring on swatches),
plan 383/608 (docs truth), plan 630 (the last sweep of the same kind).
**Status:** implemented — 2 new native cases (Color picker 13). The Space-down
case fails on the old source (`onValueChange("#2a303b")` on press); the Enter
case pins the existing path. The full behaviour suite is 805 passed / 35 failed
of 840 — the same 35 recorded plan-540 binding failures, none in this file except
the pre-existing swatch focus-ring case. Docs and `COMPONENTS.md` synced.

## 1. The bug

Plan 332 split activation into **Enter on key down** and **Space on key up** for
button-shaped controls, and plan 334 swept the remaining parts that still used
`internal/key.ts`'s `isActivation` (Space on key down). The sweep named seven
parts; it missed the **color picker's swatches**.

`src/color-picker.tsx` renders every swatch as `role="button"` and activates it
with:

```tsx
onKeyDown={(event: EventPayload) => {
  if (!disabled && isActivation(event)) choose(swatch);
}}
```

`isActivation` is `enter || space` on key down. Consequences:

- Space commits the colour **on press**, before the key is released, so moving
  focus away before releasing Space cannot cancel the choice — the behaviour the
  contract promises for every button-shaped control.
- There is no `onKeyUp` path at all, so the part cannot be moved by simply
  changing the predicate: it needs the shared helper.
- The native suite never exercises the swatch keyboard path. Its only keyboard
  cases type into the HEX field (`Enter`, `Tab`), and plan 522's case only checks
  the focus ring. That is why the suite stayed green.

The swatches are **not** composite rows: each has `role="button"`, no roving
tab stop (each is its own tab stop), and Space means activation, not selection.
The composite rule in plan 332 therefore does not apply; this is the button rule.

Evidence to capture before the fix (§4, case 1): `nativeSimulateKeyDown(swatch,
"space")` calls `onValueChange` immediately; the expected result is no call until
`nativeSimulateKeyUp`.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/color-picker.tsx` | Import `activationHandlers`; replace the swatch's `onKeyDown` with the helper's `onKeyDown`/`onKeyUp` pair; remove `isActivation` from the `internal/key.js` import (keep `isTab`). |
| `packages/components/src/behaviour/color-picker.test.tsx` | Add two native cases: Enter on key down chooses once; Space does nothing on key down and chooses once on key up. |
| `packages/components/docs/color-picker.mdx` | State the keyboard rule; refresh the verification count from 11 to 13. |
| `COMPONENTS.md` | Extend the Color picker row with the keyboard rule and the 13-test count. |
| `.agents/slop/plans/README.md` | Index this plan as done once the gates pass. |
| `PLAN.md` | Record `640` as the next free overflow number in D30. |
| `TODO.md` | Add and tick the task under "Tier 2 hardening after the inventory closed". |

No new module, export, dependency, example or inventory record is needed.

## 3. Exact implementation

### 3.1 `packages/components/src/color-picker.tsx`

1. Change the key import:

   ```ts
   import { isTab } from "./internal/key.js";
   ```

2. Add the shared helper import beside it (keep the import list alphabetical):

   ```ts
   import { activationHandlers } from "./internal/activate.js";
   ```

3. In the swatch, delete the inline `onKeyDown` and spread the helper:

   ```tsx
   {...activationHandlers(() => choose(swatch), { disabled })}
   ```

   Keep `onClick` as it is. `activationHandlers` is the one place that knows
   Enter fires on key down, Space on key up, and a key repeat never activates.
   When `disabled`, the helper forwards no handlers, which matches the existing
   inert contract (the tab stop is already `-1` and the click path is guarded).

The caller-facing `onKeyDown`/`onKeyUp` on the `ColorPicker` root are untouched:
the swatch is an internal control with no per-swatch caller handler.

### 3.2 What must not change

- The click path (`onClick` → `choose`) and the disabled guard.
- The swatch's `role`, name, `aria-selected`, tab stop, focus ring and style.
- The HEX field's `Enter`/`Tab`/outside-press commit rules.
- `MentionInputItem`, list rows, menu rows, grid/date cells and the month
  chooser: they are composite rows and keep Space as a key-down selection key
  (plans 332/334). Do not "fix" them here.

## 4. Test plan

Add two cases to `src/behaviour/color-picker.test.tsx`, beside the existing
focus-ring case. They are separate so each path fails alone (a shared case would
lose focus after the first state update and could not prove the Space path):

```tsx
it("activates a swatch with Enter", () => {
  const onValueChange = vi.fn();
  const picker = renderComponent(<Harness onValueChange={onValueChange} />);
  const swatch = picker.renderer.findByTestId("picker-swatch-0");
  expect(swatch).toBeDefined();
  if (swatch === undefined) return;

  picker.renderer.focusElement(swatch.id);
  picker.renderer.nativeSimulateKeyDown(swatch.id, "enter");

  expect(onValueChange).toHaveBeenCalledTimes(1);
  expect(onValueChange).toHaveBeenCalledWith(
    darkTheme.colors.primary.toLowerCase(),
  );

  picker.unmount();
});

it("activates a swatch on Space release, not on press", () => {
  const onValueChange = vi.fn();
  const picker = renderComponent(<Harness onValueChange={onValueChange} />);
  const swatch = picker.renderer.findByTestId("picker-swatch-1");
  expect(swatch).toBeDefined();
  if (swatch === undefined) return;

  picker.renderer.focusElement(swatch.id);

  picker.renderer.nativeSimulateKeyDown(swatch.id, "space");
  expect(onValueChange).not.toHaveBeenCalled();

  picker.renderer.nativeSimulateKeyUp(swatch.id, "space");
  expect(onValueChange).toHaveBeenCalledTimes(1);
  expect(onValueChange).toHaveBeenCalledWith(
    darkTheme.colors.secondary.toLowerCase(),
  );

  picker.unmount();
});
```

Commands and expected results:

```sh
# Before the source fix: expect 2 failed, 11 passed — the Space case fails on
# the press, and the pre-existing swatch focus-ring case fails on the plan-540
# binding (36 failed / 803 passed for the whole suite with the new cases).
nub run test:behaviour src/behaviour/color-picker.test.tsx

# After the fix: expect 1 failed, 12 passed — only the recorded plan-540
# focus-ring failure remains.
nub run test:behaviour src/behaviour/color-picker.test.tsx

# Unit suite (the inventory checks the docs count and the API tables).
nub run test
nub run check-types
```

The Space-down assertion fails on the old source with
`onValueChange("#2a303b")` (the dark theme's `secondary`); the Enter case passes
before and after, so it pins the existing path rather than proving the fix.

Both-direction proof after the fix: reverting the swatch to
`isActivation` in `onKeyDown` must fail the Space-down assertion again; removing
the `onKeyUp` half must leave the release assertion red.

The behaviour suite needs a host with a GPUix native binding; on this Intel Mac
plan 140's locally built `darwin-x64` binding is installed. If the binding is
missing, **STOP** and report `unsupported-host` — never claim a pass.

## 5. Docs, inventory and ledger

- `packages/components/docs/color-picker.mdx`
  - In "The value", after "A swatch press commits immediately", add: "From the
    keyboard, a swatch activates on `Enter` press and on Space **release**, so
    moving focus away before releasing Space cancels the choice."
  - In "Accessibility", add the same rule to the swatch bullet.
  - Change the verification line to **13 tests** and name the keyboard cases.
- `COMPONENTS.md` Color picker row: add the keyboard rule and change
  "11 native behaviour tests" to "13 native behaviour tests".
- `.agents/slop/plans/README.md`: add the plan row after 638.
- `PLAN.md` D30: append that the components workstream took `640` (the first
  free number after 639 went to the playground's merge gate).
- `TODO.md`: one ticked entry under "Tier 2 hardening after the inventory
  closed", naming the measured defect, the helper adoption, the new test count
  and the both-direction proof.

## 6. STOP conditions

Stop and report (do not improvise) if any of these happen:

- the Space-down assertion passes **before** the source fix — the harness or the
  assertion is wrong, so the bug is not proven;
- `nativeSimulateKeyUp` does not reach the swatch (no `onValueChange` after a
  correct fix) — the binding or the test event target is the problem, not the
  component;
- another worktree has claimed `640` (re-check
  `ls /Users/cyberistic/GPUIXUI/workspaces/*/.agents/slop/plans/640-*`); take the
  next free number and record it in `PLAN.md` D30;
- the behaviour suite reports `unsupported-host`;
- `check-types` fails for a reason outside these files.

## 7. Acceptance

- [ ] The Space-down native case fails at `HEAD` and passes with the fix; the
      Enter case pins the existing path.
- [ ] Enter still activates a focused swatch on key down.
- [ ] Space no longer commits on key down and commits once on key up.
- [ ] The click, disabled, focus-ring and style contracts are unchanged.
- [ ] Docs, `COMPONENTS.md`, the plan index, `PLAN.md` and `TODO.md` state the
      shipped count and the keyboard rule.
- [ ] `nub run --filter @gpuixui/components test` (454 unit tests, plus any new
      assertions), `check-types`, and the targeted behaviour file pass.
- [ ] `nub run check` and `nub run lint` pass at the repository root.
- [ ] Commit and push `agent/components` with a `fix(components):` message and
      the plan number.
