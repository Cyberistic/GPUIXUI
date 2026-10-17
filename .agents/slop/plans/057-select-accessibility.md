# 057 — `Select` is invisible to assistive technology

- **Phase:** C/F (Tier 1 truth pass). **Owner:** primitives workstream.
- **Depends on:** `030`, `040`, `041`, `047`.
- **Status:** done — implemented and measured. Evidence in §8.
  `COMPONENTS.md` keeps the row at `wip` (the docs-site page and the
  published-binary confirmation are the remaining bar, as for every Tier 1 row).

## 0. The bug, with evidence

`COMPONENTS.md` says `Select` is a thin themed wrapper because "GPUix already
publishes headless, shadcn-shaped versions" (D15). That is true of behaviour and
paint — but **GPUix's published `Select` sets no ARIA role on the trigger, the
list or the items**, so our wrapper currently produces **no accessibility node
at all**. Measured on this host (`@gpuix/native@0.10.0`, ADR 0003) by rendering
the real component and dumping the tree:

```json
[{"accesskit_id":"0","aria":{"role":"Window","label":"GPUIX Test"}}]
```

A keyboard-only user can focus the trigger (it is a `tabIndex=0` div) but a
screen reader is told nothing: no role, no name, no expanded state, and each
option is unlabelled. That is worse than the documented `aria-checked` gaps,
because those controls at least expose a `role`.

The runtime supports the pieces needed. Rendering the same structure with the
roles attached (probe, 2026-10-17) produces:

```json
[
  {"aria":{"role":"ComboBox","label":"Fruit","expanded":false,"on_action":["Click","Focus"]}},
  {"aria":{"role":"ListBox","label":"Fruit","on_action":["Focus"]}},
  {"aria":{"role":"ListBoxOption","label":"Apple","selected":false,"on_action":["Click"]}}
]
```

`role_from_aria` (`references/gpuix/packages/native/src/accessibility.rs`, plan
020 §1.4) maps `combobox`, `listbox` and `option`, and `HostProps` exposes
`aria-label`, `aria-expanded`, `aria-selected` and `aria-valuetext`. So the fix
is ours to make.

## 1. What changes

| Piece | Today | After |
| ----- | ----- | ----- |
| Trigger | no role, no name | `role="combobox"`, `aria-label={label}`, `aria-expanded={open}`, `aria-valuetext={selectedLabel ?? placeholder}` |
| List | no role | `role="listbox"`, `aria-label={label}` |
| Item | no role, no selected state | `role="option"`, `aria-label={option.label}`, `aria-selected={selected}` |
| Selection state | owned by GPUix only | owned by the wrapper through `useControlState`, like every other control, so the trigger and items can report it |
| Open state | owned by GPUix only | tracked in the wrapper through `onOpenChange`, so `aria-expanded` is true while the list is open |

`aria-valuetext` is the channel AccessKit exposes as the node's **value**; the
visible `<SelectValue>` child text is not reported as a value in the dump. It is
the same honest workaround `Progress`, `Slider` and `Toggle` use. There is no
`aria-haspopup` in `HostProps`; the combobox role is the supported claim.

## 2. Files

```
A .agents/slop/plans/057-select-accessibility.md
M .agents/slop/plans/README.md
M packages/primitives/src/components/Select.tsx
M packages/primitives/src/components/Select.test.tsx
M packages/primitives/runtime/fields.runtime.test.tsx
M packages/primitives/docs/select.mdx
M packages/primitives/README.md                          (limitation table)
M COMPONENTS.md
M TODO.md
```

## 3. Implementation sketch

```tsx
// renderSelect gains the resolved state and the open flag, like every renderer.
export const renderSelect = (
  props: SelectProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  open: boolean,
): ReactElement => { ... }

// GhostSelect: the value is ours now (useControlState), and "" means none.
const state = useControlState(props.value, props.defaultValue ?? "", props.onChange);
const [open, setOpen] = useState(false);
const selectedLabel = Option.getOrElse(
  Option.map(
    Arr.findFirst(props.options, (option) => option.value === state.value.current),
    (option) => option.label,
  ),
  () => undefined,
);

<GpuixSelect
  value={state.value.current === "" ? undefined : state.value.current}
  onValueChange={state.set}
  onOpenChange={setOpen}
  ...
>
  <SelectTrigger
    role="combobox"
    aria-label={label}
    aria-expanded={open}
    aria-valuetext={selectedLabel ?? placeholder}
    ...
  />
  <SelectContent role="listbox" aria-label={label} ...>
    <SelectItem role="option" aria-label={option.label}
      aria-selected={option.value === state.value.current} ... />
  </SelectContent>
</GpuixSelect>
```

`value={undefined}` while nothing is selected keeps GPUix's placeholder
behaviour (`SelectValue` falls through to `placeholder`); once a value exists the
wrapper is controlled. `onChange` still fires only on a real change because
`useControlState` decides that.

## 4. Test plan

### Element tree (`src/components/Select.test.tsx`)

1. Trigger carries `role="combobox"`, the label, `aria-expanded` from the
   `open` argument, and `aria-valuetext` is the selected option's label, or the
   placeholder while nothing is selected.
2. Content carries `role="listbox"` and the label.
3. Every item carries `role="option"`, its own `aria-label` and
   `aria-selected` matching the resolved value (true for the selected one only).
4. The wrapper's `onValueChange` is wired to the same state: selecting through
   `renderSelect` is covered by the runtime suite, not faked here.

### Runtime (`runtime/fields.runtime.test.tsx`)

1. **Regression:** the closed Select exposes a `ComboBox` node named by `label`
   with `expanded === false` (fails today: the tree has only `Window`).
2. Opening the list exposes a `ListBox` named by `label` and a `ListBoxOption`
   per option with the option label; `expanded` flips to `true`.
3. Selecting an option makes that option's `selected` true (tree) and updates
   the trigger's value text to its label, then the list closes
   (`expanded === false`).
4. The existing open/select tests keep passing unchanged.

### Two-direction proof

- Before the fix, run the new runtime test: it must fail with
  `no accessibility node announced Fruit` (the dump is only the window).
- After the fix: pass.
- Remove `aria-selected` from items and re-run: the selected-option assertion
  must fail (`expected false to be true`); restore.

## 5. Commands, expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/primitives test` | all offline suites pass |
| 2 | `nub run --filter @gpuixui/primitives test:runtime` | all runtime suites pass (14 files; previous 128 + the new assertions) |
| 3 | `nub run check` | `check:tests`, lint, format, every `tsc` pass |
| 4 | `nub run lint` | exit `0` |
| 5 | `nub run test` | every workspace suite passes |

## 6. STOP conditions

Stop and report with evidence if:

- `onOpenChange` does not fire on a real trigger press (the expanded state would
  be static; record the measurement and fall back to no `aria-expanded`);
- `role`, `aria-label`, `aria-selected`, `aria-expanded` or `aria-valuetext` are
  dropped between the trigger/item element and the native node;
- making the wrapper controlled breaks the placeholder or the existing
  open/select runtime tests in a way that needs a GPUix-internal change;
- the regression test cannot be made to fail before the fix.

## 7. Acceptance

- The closed Select is a named `ComboBox` with `expanded`; the open list is a
  named `ListBox` of named `ListBoxOption`s with `selected` on the chosen one.
- Element-tree and runtime tests pin all four props; both-direction proof
  recorded in §4.
- `docs/select.mdx` documents the roles and the `aria-valuetext` channel, and
  removes any claim that the label association is native.
- `COMPONENTS.md` Select row records the measured a11y contract.
- `TODO.md` task ticked; gates green.

## 8. Measured evidence (2026-10-17, this host)

Commands run from the worktree root against the locally built
`@gpuix/native@0.10.0` binding (ADR 0003):

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **27 files / 300 tests pass** (+2 element-tree tests) |
| `nub run --filter @gpuixui/primitives test:runtime` | **14 files / 130 tests pass** (+2 runtime tests; 128 before) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run check` | `check:tests`, lint, format and every `tsc` pass |
| `nub run lint` | exit `0` |
| `nub run test` | every workspace suite passes |

**Measured node dumps** (the wrapper, after the fix):

- closed: `ComboBox` label `Fruit`, `value: "Pick one"`, `expanded: false`;
- open: `expanded: true`, `ListBox` label `Fruit`, two `ListBoxOption`s
  (`Apple`, `Pear`) with `selected: false`;
- after committing `Pear` and reopening: the `Pear` node has
  `selected: true`, `Apple` has `selected: false`, and the closed trigger's
  value is `Pear`.

**Two-direction proofs, observed:**

1. *Removed `role="combobox"` from the trigger*: both new runtime tests failed
   with `no accessibility node for ComboBox "Fruit"` (2 failed / 128 passed).
   Restored: 130/130.
2. *Removed `aria-selected` from the items*: the selection test failed with
   `expected undefined to be true` (1 failed / 129 passed). Restored: 130/130.

**Two runtime facts worth keeping:**

- `runtime.click("<select testId>")` does **not** open the list: the hit test
  lands on the trigger but the wrapper's open state needs the trigger element's
  own click dispatch. The tests take the existing `triggerOf` path
  (`clickElement(trigger)`), which is the measured way to drive it.
- `aria-valuetext` on the trigger is what AccessKit reports as the node's
  `value`; the visible `<SelectValue>` text is not surfaced as a value. This is
  the same channel `Progress`, `Slider`, `Toggle` and `ToggleGroup` use.
