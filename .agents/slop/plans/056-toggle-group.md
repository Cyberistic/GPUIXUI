# 056 — `ToggleGroup`: a real segmented control, and the disabled radio tab stop

- **Phase:** C (Tier 1 completion). **Owner:** primitives workstream.
- **Depends on:** `030`, `040`, `041`, `047`, `049`, `054`.
- **Status:** done — implemented and measured. Evidence in §12.
  `COMPONENTS.md` keeps the row at `wip` (the docs-site page and the
  published-binary confirmation are the remaining bar, as for every Tier 1 row).

## 0. Why this plan exists

`COMPONENTS.md`'s **Button groups** row says:

> Variants merged here: Toggle Group (base-gpui `ToggleGroup`) and Segmented
> control (adabraka `segmented_nav`) — pressed-state variants, not separate
> rows.

That claim is **false today**. `ButtonGroup` is layout only (`role="group"`,
gap, clip) and its own docs page correctly say "a segmented control that should
be one tab stop with arrow navigation is a radio group, not a button group".
There is no component that owns a **pressed set** over a group of buttons: a
single-select mode switch (text alignment, view density) or a multi-select
formatting set (bold/italic/underline). `RadioGroup` cannot stand in — its paint
is a radio circle and a radio cannot be unselected; composing `Toggle` children
inside `ButtonGroup` gives neither a single-select rule nor a roving tab stop.

This plan builds that component, to the same bar as every other Tier 1 row:
code, a test that can fail, an example, a docs page, an inventory entry, and a
measured interaction in the real GPUix 0.10.0 renderer. It also fixes one
roving-index defect the new component would otherwise inherit: **a selected but
disabled radio option leaves the group with no tab stop at all** (see §7).

## 1. What is new, and what is reused

| Piece | Decision | Reason |
| ----- | -------- | ------ |
| Selection rules (single replaces, multiple toggles, no spurious notify) | new `core/toggle-group.ts` | pure, so it is provable without a runtime; this is the only non-glue logic |
| Item paint | **reuse** `controlStyle` + `toggleVariants` from `core/variants.ts` | a group item must look exactly like a standalone `Toggle`; a second painter would drift |
| Focus ring | **reuse** `controlFocusStyle` | same ring geometry as `Toggle` |
| Arrow / Home / End movement | **reuse** `decideMove` + `decideAbsolute` (`core/keyboard.ts`) | already measured and covered; no second movement contract |
| Roving index | **move** `initialActiveIndex` from `RadioGroup.tsx` to `core/selection.ts`, widened to `{ value, disabled? }` | one implementation for both groups; prevents the selected-disabled bug from living in two places |
| Activation | **reuse** `decideActivation` | Enter down / Space up / held ignored, like every button-like control |

**Deviation from shadcn's compound shape (extends D16).** Options are data
(`options: ReadonlyArray<ToggleGroupOption>`), not `<ToggleGroupItem>`
children, because the group owns the roving index, the single-select rule and
the focus move. A compound API would move that logic into a context every child
reads — strictly more code for the same behaviour — exactly as recorded for
`RadioGroup`. `Toggle` remains the escape hatch for a one-off pressed button.

**Deviation from Radix's defaults.** `type="single"` cannot be cleared by
pressing the active item (a segmented control always has a value); Radix
behaves the same way. `type="multiple"` follows the press: press adds, press
again removes.

## 2. Runtime facts this plan depends on (already measured — verify by running)

Read from plan `020` §1.4–1.5, plan `041` §9 and plan `049` §7, all on this host:

1. GPUix 0.10.0 has **no `aria-pressed` and no `aria-checked`**. State reaches
   assistive technology through `aria-valuetext` only. `Toggle` already uses
   `"pressed"` / `"not pressed"`; the group's items do the same.
2. A key event dispatched to a focused child **bubbles to the wrapper's
   `onKeyDown`** — this is what makes `RadioGroup`'s arrow contract work, and
   the same arrangement is used here.
3. Component code can move native focus with
   `useGpuix().renderer.focusElement(id)`; a ref callback registers the id.
   `focusElement` must be called on the renderer object (it is a method, not a
   free function) — plan `049` §7.
4. `focusNext()` on the `TestRenderer` moves native focus to the next tab stop;
   an element with no `tabIndex` is skipped. That is how the runtime suites
   prove the roving tab stop.
5. `role="group"` is mapped to AccessKit `Group`; `role="button"` to `Button`.
   There is no `radiogroup`-with-buttons semantic, so the group is a named
   `group` and each item is a named `button` whose value text carries the state.
   This is the honest maximum in 0.10.0 and is documented on the page.

## 3. Files

```
A .agents/slop/plans/056-toggle-group.md
M .agents/slop/plans/README.md
A packages/primitives/src/core/toggle-group.ts
A packages/primitives/src/core/toggle-group.test.ts
M packages/primitives/src/core/selection.ts                  (initialActiveIndex)
M packages/primitives/src/core/index.ts
A packages/primitives/src/components/ToggleGroup.tsx
A packages/primitives/src/components/ToggleGroup.test.tsx
M packages/primitives/src/components/RadioGroup.tsx          (import the moved helper)
M packages/primitives/src/components/selection.test.tsx      (regression: disabled selected option)
M packages/primitives/src/components/index.ts
A packages/primitives/docs/toggle-group.mdx
M packages/primitives/docs/README.md
A packages/primitives/examples/toggle-group.example.tsx
M packages/primitives/examples/index.ts
A packages/primitives/runtime/toggle-group.runtime.test.tsx
M packages/primitives/runtime/examples.runtime.test.tsx      (mount + drive the example)
M packages/primitives/README.md
M COMPONENTS.md
M TODO.md
M PLAN.md                                                   (decision D25)
```

## 4. Public API

```ts
export interface ToggleGroupOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

interface ToggleGroupBase {
  readonly options: ReadonlyArray<ToggleGroupOption>;
  /** Arrow axis and flex direction. Defaults to `"horizontal"`. */
  readonly orientation?: "horizontal" | "vertical";
  /** Item paint, exactly `Toggle`'s. Defaults to `"default"`. */
  readonly variant?: ToggleVariant;
  /** Defaults to `"md"`. */
  readonly size?: ControlSize;
  /** Disables every item. */
  readonly disabled?: boolean;
  /** The group's accessible name (no `aria-labelledby` exists). */
  readonly label?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

export interface ToggleGroupSingleProps extends ToggleGroupBase {
  readonly type: "single";
  readonly value?: string;              // controlled; selected value
  readonly defaultValue?: string;       // uncontrolled start
  readonly onChange?: (value: string) => void;
}

export interface ToggleGroupMultipleProps extends ToggleGroupBase {
  readonly type: "multiple";
  readonly value?: readonly string[];   // controlled; pressed values
  readonly defaultValue?: readonly string[]; // uncontrolled start
  readonly onChange?: (value: readonly string[]) => void;
}

export type ToggleGroupProps =
  | ToggleGroupSingleProps
  | ToggleGroupMultipleProps;
```

`onChange` fires only when the selection actually changed (the shared
`useControlState` rule). In `single`, pressing the active item is a no-op.

## 5. The rules (`core/toggle-group.ts`)

All functions are total and pure; nothing throws, reads the clock or touches
the renderer.

```ts
/** The selection a press produces. `current` is returned unchanged when the
 *  press changes nothing, so `setValue` does not wake the parent. */
export const nextSelection = (
  type: ToggleGroupType,
  current: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> => {
  if (type === "single") return Arr.contains(current, value) ? current : [value];
  return Arr.contains(current, value)
    ? Arr.filter(current, (pressed) => pressed !== value)
    : Arr.append(current, value);
};

/** Whether `value` is pressed in `current`. */
export const isPressed = (current: ReadonlyArray<string>, value: string): boolean =>
  Arr.contains(current, value);
```

`initialActiveIndex` moves from `RadioGroup.tsx` into `core/selection.ts` and
takes a structural option type:

```ts
export const initialActiveIndex = (
  options: ReadonlyArray<{ readonly value: string; readonly disabled?: boolean }>,
  value: string,
): number
```

**The fixed rule:** the returned index is the selected option **only when that
option is enabled**; otherwise it is the first enabled option. Today the
selected-but-disabled option wins and every item ends up with no `tabIndex`,
so `Tab` skips the group. `RadioGroup.tsx` re-exports the helper so
`components/index.ts` and any consumer keep the same import.

## 6. The component (`components/ToggleGroup.tsx`)

- Internally the selection is always `readonly string[]`: `value`/`defaultValue`
  are adapted at the props boundary (`single` → `[value]` / `[]`), and the
  outgoing value is adapted back. One state machine, two public shapes.
- Roving index:
  - `single`: derived from the selection (`initialActiveIndex`), so a
    controlled change moves the tab stop — the `RadioGroup` contract.
  - `multiple`: a local `activeIndex` state seeded at the first enabled option
    and updated by `onFocus`; arrows move focus without pressing.
- Arrows/Home/End:
  - `single`: move **and** select, then call `focusElement`.
  - `multiple`: move focus only, then call `focusElement`.
  - Disabled options are skipped (`decideMove`/`decideAbsolute` take the
    predicate) and never receive focus.
- Activation (`onKeyDown` on the item, bubbled to the wrapper):
  Enter down / Space up call `nextSelection`; `single` re-pressing is a no-op.
- Paint: each item calls `controlStyle` with
  `toggleVariants[variant][pressed ? "pressed" : "rest"]` and merges
  `controlFocusStyle` while it holds focus — byte-for-byte the `Toggle` paint.
- Container: `display: flex`, direction from `orientation`, `gap: spacing["2xs"]`,
  `role="group"`, `aria-label={label}`.
- Items: `role="button"`, `aria-label={option.label}`,
  `aria-valuetext={pressedValueText(pressed)}`, `tabIndex` per the roving
  index (undefined when disabled), `testId` = `${testId}-${option.value}` when
  `testId` is given (the convention `OTPField` uses for its cells).

**Explicitly not in scope:** `attached`/`separated` container clipping (that is
`ButtonGroup`), loading state (a mode switch is instant, like `Toggle`), icons
in options (use `Toggle` when you need arbitrary children).

## 7. The regression fix, stated as a bug guarded by a test

> A `RadioGroup` whose controlled `value` names a **disabled** option has no
> tab stop: the disabled option is chosen as the roving index, its `tabIndex`
> is `undefined`, and every other option gets `-1`. Tab therefore skips the
> group entirely.

Proof in `src/components/selection.test.tsx`: render
`options=[{value:"a",disabled:true},{value:"b"}]` with `value="a"`; assert the
item at index **1** carries `tabIndex 0` and the disabled item carries
`Option.none()`. This test fails on the current code and passes after §5.

## 8. Commands, expected results

Run from the worktree root. Every command below was run for this plan unless
marked otherwise; a command that was not run did not pass.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/primitives test` | all offline suites pass, including the new core and element-tree suites |
| 2 | `nub run --filter @gpuixui/primitives test:runtime` | all runtime suites pass, including `toggle-group.runtime.test.tsx` |
| 3 | `nub run check` | `check:tests`, lint, format and every package's `tsc` pass |
| 4 | `nub run lint` | exit `0`, no new warnings |
| 5 | `nub run test` | every workspace test passes |

Two-direction proof (required by `AGENTS.md` §3):

1. Run `scripts/verify-two-directions.sh` with the new tests and the fix reverted
   (`git stash` the `initialActiveIndex` change; revert the single-select branch
   of `nextSelection` to always-appends) — **both new tests must fail**.
2. Restore the fix; the same tests pass.

The runtime suite's own two-direction proof is in §9.

## 9. Test plan

### `core/toggle-group.test.ts` (pure, must fail without the rules)

| Case | Assertion | Fails if |
| ---- | --------- | -------- |
| single selects a new value | `["centre"]` | the rule appends or keeps the old value |
| single re-press keeps the same array | `toBe(current)` (identity) | a new array is returned → a spurious `onChange` |
| multiple press appends | `["bold","italic"]` after pressing italic | removal or reordering |
| multiple press again removes | `["bold"]` | toggle is one-way |
| unknown preselected value is preserved | `nextSelection("multiple", ["external"], "bold")` keeps `"external"` | the rule filters against the options |

### `components/ToggleGroup.test.tsx` (element tree)

1. `role="group"` with the `label`; one `role="button"` per option with the
   option's `aria-label`.
2. `aria-valuetext` is `"pressed"` for the selected value(s), `"not pressed"`
   otherwise; **no `aria-pressed`** in the tree.
3. Single: exactly one item has `tabIndex 0` (the selected one, else the first
   enabled); the others are `-1`.
4. Multiple: exactly one item has `tabIndex 0` (the roving index) — the
   group is one tab stop, like `RadioGroup`.
5. Disabled group: every item is out of the tab order and
   `aria-valuetext` still reports the controlled value.
6. `orientation="vertical"` sets `flexDirection: "column"`; horizontal is the
   default.
7. Variant paint: `outline` items carry the border role, `default` items do
   not; pressed items paint `colors.accent`.
8. `testId` on the group yields `${testId}-${value}` on its items.

### `runtime/toggle-group.runtime.test.tsx` (real 0.10.0 renderer)

| Test | Measured claim |
| ---- | -------------- |
| click selects in `single` and clears the previous item | a11y value text `pressed` → `not pressed` on the previous item; paint moves with it |
| click toggles in `multiple` | pressing bold then italic announces both pressed; pressing bold again unpresses only bold |
| `Enter` down / `Space` up activate once; key up/down before has no effect | the same activation contract as `Toggle` |
| arrow right moves focus **and** selection in `single` | `runtime.focused()` is the next item and its value text is `pressed` |
| arrow right moves focus **only** in `multiple` | focused item changes, no value text changes |
| arrows skip a disabled option | focus lands past it |
| Tab enters on the roving item, not the first | `focusNext()` from a button before lands on the selected/first-enabled item |
| disabled group refuses click and keys | value text never changes |

Two-direction proof for the runtime suite: temporarily remove the
`onFocusMove` call in `single` and re-run; the arrow test must fail
(`focused()` stays on the first item). Restore; it passes.

## 10. STOP conditions

Stop and report with evidence, do not improvise, if:

- `initialActiveIndex`'s move cannot keep the public import stable without an
  `any`/cast or an edit outside `packages/primitives`;
- a key event dispatched to a focused item does **not** reach the wrapper's
  `onKeyDown` (the multiple/single arrow contract would need a different
  arrangement — record the measured fact and re-plan);
- `focusElement` refuses to move focus to a group item for any reason
  (`focused()` unchanged after the call);
- the runtime suite cannot load the native binding (plan `140` §5);
- a new test cannot be made to fail in at least one direction.

## 11. Acceptance

- `ToggleGroup` exported from the package root with the typed union above.
- Offline + runtime suites green (commands §8), the two-direction proofs
  recorded in this plan's §9 with the observed failure messages.
- `docs/toggle-group.mdx` follows the page contract in `docs/README.md`, with
  the `aria-pressed` limitation stated.
- `examples/toggle-group.example.tsx` mounts a realistic segmented control and
  a multi-select formatting group; it is registered in `examples/index.ts` and
  mounted by `runtime/examples.runtime.test.tsx` (number of examples asserted).
- `COMPONENTS.md`: **Button groups** row corrected (it no longer claims to
  cover Toggle Group), new **Toggle Group** row with the measured notes.
- `TODO.md` task ticked; `PLAN.md` D25 records the data-driven group decision.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 12. Measured evidence (2026-10-17, this host)

Commands run from the worktree root, against the locally built
`@gpuixui/primitives` (`@gpuix/native@0.10.0`, `gpui_macos/runtime_shaders`, ADR
0003):

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **27 files / 298 tests pass** (was 25 / 282; +2 files, +16 tests) |
| `nub run --filter @gpuixui/primitives test:runtime` | **14 files / 128 tests pass** (was 13 / 119; +8 component tests, +1 example test) |
| `nub run --filter @gpuixui/primitives check-types` | `tsc --noEmit` clean |
| `nub run check` | `check:tests`, lint, format and every package's `check-types` pass |
| `nub run lint` | exit `0` |
| `nub run test` | every workspace suite passes |

**Two-direction proofs, observed:**

1. *Removed the single-mode select from arrow movement*
   (`if (props.type === "single") handlers.onPress(...)` deleted):
   `runtime/toggle-group.runtime.test.tsx` → 2 failed / 126 passed —
   `expected 'not pressed' to be 'pressed'` (the arrow moved focus without
   selecting) and `expected 'tg-right' to be 'tg-centre'` (the disabled-skip
   test's wrap also depended on the selection rule). Restored: 128/128.
2. *Made every item a tab stop* (`index === activeIndex ? 0 : -1` → `0`):
   the tab-stop test failed with `expected 'tg-left' to be 'tg-centre'` —
   `focusNext` reached the previous item because three stops existed.
   Restored: 128/128.
3. *Reverted the disabled-selection fix* in `initialActiveIndex`
   (`option.value === value && option.disabled !== true` → `option.value === value`):
   the offline regression test failed with `expected -1 to be 0` — the disabled
   selected item took the tab stop and left the enabled option at `-1`; restored:
   298/298.

The example is mounted by `runtime/examples.runtime.test.tsx` (screen list plus
an interaction test): clicking the single group's centre item repaints the
summary to `Align centre · Formatting bold, italic`, and the dark-palette loop
now covers its root.

