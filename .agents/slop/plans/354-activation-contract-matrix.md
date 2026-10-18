# 354 — The activation contract matrix: every button-shaped control agrees on Enter, Space, held keys and the pointer

**Phase:** F (keyboard consistency) · **Workstream:** primitives · **Depends on:** 030, 041, 049, 056, 065, 084, 085, 086, 089, 332, 341, 345, 353 · **Status:** planned → executed

## 1. The class this guards

Plan `353` found `RadioGroup` wiring only a key-**down** path: `Space` did
nothing, and `Enter` re-selected the value-derived tab stop instead of the
option that held focus. Both halves were invisible because every existing test
drove **one** key on **one** control, and the common uncontrolled case makes
focus and value agree.

Two components later, the class is easy to reintroduce:

- a control wired on only one key phase (the shared rule is `core/keyboard.ts`'s
  **Enter on key down, Space on key up**), or
- a group-level handler whose activation target comes from the value instead of
  the focused item.

No test file proves the contract **across** the button-shaped family, so a
change to one control can silently diverge. This plan adds that table. It fixes
no current behaviour; it is the missing guard, in the same spirit as the
focus-ring matrix (`084`), the tab-order matrix (`089`) and the validation matrix
(`351`), each of which exists because the per-component suites let a class slip.

**Measured before writing the guard (2026-10-18, this host, real
`TestRenderer`):** an eight-control × eight-sequence probe passed 64/64. The
contract is currently consistent; the table is what keeps it so.

## 2. The contract, once

From `packages/primitives/src/core/keyboard.ts`:

| Event | Activates |
| ----- | --------- |
| `Enter` key down | yes, once |
| `Enter` key up | no |
| `Space` key down | no |
| `Space` key up | yes, once |
| a repeat (`isHeld`) event of either key | no |
| a primary pointer click | yes, once |

Controls in the family and the element a key targets:

| Control | Target | Reports through |
| ------- | ------ | --------------- |
| `Button` | `testId` | `onActivate` |
| `IconButton` | `testId` | `onActivate` |
| `Toggle` | `testId` | `onPressedChange` |
| `Checkbox` | `testId` | `onValueChange` |
| `Switch` | `testId` | `onValueChange` |
| `CheckboxGroup` | the item (`${testId}-b`) | `onValueChange` |
| `RadioGroup` | the item (`${testId}-b`) | `onValueChange` |
| `ToggleGroup` | the item (`${testId}-b`) | `onValueChange` |

`Slider`, `RangeSlider`, `Rating`, `NumberField`, `OTPField`, `Select` and the
text fields are **not** button-shaped: they have their own value/key contracts
(`decideValueKey`, `decideNumberKey`, GPUix's select) and are covered by their
own suites. `CheckboxGroup`'s select-all parent and a `Toggle`/`ToggleGroup`
in `multiple` mode are the same activation path as the rows/items listed.

**Why only the focused-item target for groups:** plan `353` §1 measured a
controlled parent that keeps `value="a"` while focus moves to `b`; activation
must still target `b`. That is the regression this table reproduces (the group's
`value` is deliberately uncontrolled, so the target has to be the item the
sequence names, not the first option).

## 3. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/runtime/activation.runtime.test.tsx` | **new.** One table: 8 controls × 9 sequences (`enter down`, `enter up`, `space down`, `space up`, `enter held`, `space held`, `enter pair`, `space pair`, `pointer click`) = **72 cases**. Each case mounts one control in a fresh window, focuses the target, delivers the sequence, and asserts the reported callback count. |
| `.agents/slop/plans/README.md` | index row for `354`. |
| `TODO.md` | one ticked primitives row; refresh the runtime count. |
| `COMPONENTS.md` | one line in the runtime-count paragraph (the matrix is cross-cutting, not a component row). |
| `packages/primitives/README.md` | refresh the measured runtime count. |

No component, state type, prop or documentation page changes: the contract is
already correct and already documented per control.

## 4. Implementation notes (exact)

1. Import the eight components from `../src/components/…js` and `Surface`,
   `openWindow` from `./fixture.js`. Data-driven groups take
   `options = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]`.
2. A case is `{ name, focusId, node(report) }`; a sequence is
   `{ name, run(runtime, focusId), expected }`.
3. Focus the target through the renderer before the sequence:
   `runtime.renderer.focusElement(element.id)` where `element` is found in
   `runtime.all()` by `testId` (use `Option`, `expect.fail` when absent). This
   is what makes "the key is delivered to the focused element" true rather than
   assumed; `focusElement` takes the numeric element id, not the `testId`
   (a string throws `Failed to convert napi value String into rust type f64`).
4. `pointer click` uses `runtime.click(focusId)`; it must still report exactly
   once.
5. `held` uses `runtime.keyDown(focusId, key, true)`.
6. One window per case (`openWindow()`), because the harness dispatches to the
   window rendered into last — the same rule as `focus-ring.runtime.test.tsx`.
7. Table titles: `"<control> / <sequence>"` so a mutation fails by name.
8. No `for` loops and no mutation outside the per-case counter (AGENTS §5).

### Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/activation.runtime.test.tsx` | `72 passed` in 1 file |
| `nub run --filter @gpuixui/primitives test` | `574 passed` in 43 files (unchanged) |
| `nub run --filter @gpuixui/primitives test:runtime` | `529 passed` in 26 files |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run check` (repo root) | exit `0` |

## 5. Test plan and two-direction proof

The guard is the test. Each case can fail in the direction that matters:

1. **One-phase wiring.** Change `Checkbox`'s second key handler from
   `onKey("up", …)` to `onKey("down", …)`; `Checkbox / space up` and
   `Checkbox / space pair` must fail (reported `0`, expected `1`), nothing else.
2. **Missing key-up path.** Delete `onKeyUp={onKey("up")}` from the
   `ToggleGroup` item; `ToggleGroup / space up` and `ToggleGroup / space pair`
   must fail, while every Enter case still passes.
3. **Held key activates.** Change `decideActivation` in the probe to ignore
   `held`; the two `held` cases per control must fail (16 cases). This one is
   measured in a scratch copy and reverted, because it mutates `core/`.

Record the exact failing case names in §6 after running. Restore each mutation
and re-run to green before committing.

**STOP conditions**

- A control fails a sequence: do **not** weaken the table. Stop, record the
  component and sequence, and write the defect up as its own plan — that is a
  shipped bug, not a test task.
- Pointer click double-reports (2) on any control: same — stop and record.
- The harness cannot focus an item (`focusElement` finds no element): stop and
  record the element tree rather than falling back to an unfocused dispatch.
- A passing run needs `--update`/snapshot changes or skipped cases: stop.

## 6. Result (executed 2026-10-18)

- Additions: `runtime/activation.runtime.test.tsx` — 72 cases (8 controls × 9
  sequences). Every case focuses its target through the renderer first, in its
  own fresh window.
- **Counts:** offline `574 passed` in 43 files (unchanged); runtime **`529
  passed` in 26 files**; `check-types` exit `0`.
- **Two-direction proof (each mutation restored and the file re-run green):**
  1. `Checkbox`'s key-up handler switched to `onKey("down", …)` — exactly
     `Checkbox / enter up`, `space up`, `enter pair`, `space pair` failed by name
     (4 failed, 68 passed).
  2. `ToggleGroup`'s item `onKeyUp` deleted — exactly
     `ToggleGroup / space up` and `ToggleGroup / space pair` failed by name
     (2 failed, 70 passed).
  3. `core/keyboard.ts`'s `if (held) return false` deleted — exactly the eight
     `… / enter held` cases failed, one per control (8 failed, 64 passed).
- No component behaviour changed; the contract was already correct. The table is
  the guard plan `353` was missing.
