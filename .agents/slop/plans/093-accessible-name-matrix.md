# 093 — The accessible-name matrix

| Field | Value |
| ----- | ----- |
| Phase | F (hardening) |
| Owner | primitives workstream |
| Depends on | `041`, `047`, `057`, `058`, `071`, `073`, `084`, `089`, `090` |
| Status | **planned** |

Self-contained: §1 the gap, §2 the rule, §3 the files, §4 commands and expected
results, §5 the test plan and the two-direction proof, §6 STOP conditions, §7
outcome, §8 acceptance.

---

## 1. The gap

Three separate accessibility defects in this package were the same bug class:
**a control painted, took focus and worked, but reached assistive technology
without a name (or without a role).**

| Plan | Measured defect |
| ---- | --------------- |
| `057` | GPUix's headless `Select` set **no ARIA role**, so the wrapper produced no accessibility node at all |
| `058` | The runtime does not derive a button's name from painted text, so **every text `Button`/`Toggle` was unnamed** |
| `071`/`073` | A tooltip painted but produced **no accessibility node**, and its trigger carried no description; the hand-rolled info tip was hover-only and absent from the tree |

Each was fixed with a per-component assertion. There is **no cross-control
guard**: `runtime/focus-ring.runtime.test.tsx` (084) guards the ring and
`runtime/tab-order.runtime.test.tsx` (089) guards the tab stop, but nothing
proves the *name and role* of every control in one place. A new control, or a
refactor of a named one, can ship unnamed exactly as `058` did and every suite
still passes.

Measured during reconnaissance for this plan: `Slider` is mounted by
`runtime/value.runtime.test.tsx` many times but **no runtime test asserts its
AccessKit role or name**; the same is true for `TextArea`, `NumberField`,
`Switch`'s name and `ToggleGroup`'s item names. Their roles are read from the
runtime's own mapping (`@gpuix/native` `HostProps` → AccessKit), not assumed
below.

## 2. The rule

**Every Tier 1 control that accepts a `label` (or derives a name from its
content) exposes an accessibility node with its documented role and that exact
name — in the real renderer, not in the element tree.**

Concretely:

1. A table of cases, one per name-bearing control, asserts
   `a11yNode(runtime.a11y(), { role, label })` is present. The role strings are
   AccessKit's, as already observed by the suites: `Button`, `CheckBox`,
   `Switch`, `TextInput`, `ComboBox`, `ListBox`, `ListBoxOption`, `Slider`,
   `RadioGroup`, `RadioButton`, `Group`, `Region`, `Meter`,
   `ProgressIndicator`, `Status`, `Image`, `Tooltip`.
2. A second case mounts every control in one tall window and asserts that
   **no node with an interactive role is unnamed**. This is the closure: it
   catches a control the table forgot as well as one whose name was dropped.
3. Presentational primitives (`Box`, `Stack`, `Grid`, `Separator`, `Spacer`,
   `Skeleton`) expose **no** interactive node. A container must not invent a
   role.
4. The fix, if a case fails, is in the component (or in the table when the
   measured role differs from the guess), never a weaker assertion. Record the
   measurement in §7.

No component gains a prop. The matrix is a test and a record.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/runtime/name.runtime.test.tsx` | **new** — the table, the closure case, the presentational case |
| `packages/primitives/src/components/<component>.tsx` | change **only if** a case measures a missing name or role; the measured evidence goes in §7 |
| `packages/primitives/README.md` | add the matrix to the verification paragraph and the test count |
| `COMPONENTS.md` | add one shared note beside the focus-ring and tab-order notes |
| `TODO.md` | add and tick the task under the primitives ledger |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/093-accessible-name-matrix.md` | §7 after the run |

Do **not** edit `packages/tokens`, `packages/components`, `packages/icons` or
`apps/*`.

## 4. Commands and expected results

Run from the worktree root.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/name.runtime.test.tsx` | the new file runs alone; every case passes after any fix |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 38 files / 433 tests) |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 20 files / 264 tests, ~341 s on this host) |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every case must be able to fail. Write the file first; before any component
change, run it and record which cases fail and with what dump fragment.

### 5.1 The per-control table

Each row mounts one control inside `Surface` in a fresh window
(`openWindow`) and asserts the named node exists.

| # | Control | Expected role | Expected name |
| - | ------- | ------------- | ------------- |
| 1 | `Button` text children | `Button` | `Save` |
| 2 | `Button` explicit `label` | `Button` | `Close` |
| 3 | `IconButton` | `Button` | `Close` |
| 4 | `Toggle` | `Button` | `Bold` |
| 5 | `ToggleGroup` root | `Group` | `Alignment` |
| 6 | `ToggleGroup` item | `Button` | `Left` |
| 7 | `Checkbox` | `CheckBox` | `Accept terms` |
| 8 | `CheckboxGroup` root | `Group` | `Topics` |
| 9 | `CheckboxGroup` row | `CheckBox` | `Alpha` |
| 10 | `RadioGroup` root | `RadioGroup` | `Size` |
| 11 | `RadioGroup` option | `RadioButton` | `Small` |
| 12 | `Switch` | `Switch` | `Wifi` |
| 13 | `Input` | `TextInput` | `Name` |
| 14 | `TextArea` | `TextInput` | `Notes` |
| 15 | `NumberField` | `TextInput` | `Count` |
| 16 | `OTPField` first cell | `TextInput` | `Code digit 1` |
| 17 | `Select` trigger | `ComboBox` | `Fruit` |
| 18 | `Select` list | `ListBox` | `Fruit` |
| 19 | `Select` option | `ListBoxOption` | `Apple` |
| 20 | `Slider` | `Slider` | `Volume` |
| 21 | `RangeSlider` first thumb | `Slider` | `Band minimum` |
| 22 | `Meter` | `Meter` | `Disk usage` |
| 23 | `Progress` | `ProgressIndicator` | `Uploading` |
| 24 | `Spinner` | `Status` | `Saving` |
| 25 | `InfoTip` | `Image` | `More information` |
| 26 | `ScrollArea` | `Region` | `Activity` |
| 27 | `Rating` root | `RadioGroup` | `Score` |
| 28 | open `Tooltip` | `Tooltip` | the tip's string |

For the `Select` list/option (18/19) the table opens the select first
(`runtime.click` on the trigger, then `runtime.flush`), then reads the dump.

### 5.2 The closure case

Mount a tall window (`createRuntime({ width: 1280, height: 2400 })`, so no
control is clipped) containing every control from §5.1 with a distinct name.
Filter the dump to the interactive roles (`Button`, `CheckBox`, `Switch`,
`TextInput`, `ComboBox`, `ListBox`, `ListBoxOption`, `Slider`, `RadioButton`)
and assert every one has a non-empty `aria.label`.

**It fails today if any mounted control is unnamed**; the failure message names
the role so the component is identifiable. This is the guard that outlives the
table.

### 5.3 Presentational primitives

Mount `Box`, `Stack`, `Grid`, `Separator`, `Spacer` and `Skeleton`; assert the
dump has no node with an interactive role. This guards the opposite mistake: a
container that invents a role or a name.

### 5.4 Two-direction proof (required before "done")

- Delete `aria-label={props.label}` from `Switch` → the `Switch` case and the
  closure case fail, by role and name.
- Delete `role="slider"` from `Slider` → the `Slider` case fails with the role
  that was actually exposed.
- Restore both; every case and the full suite pass.
- Record the exact failure text in §7.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. A control genuinely has **no way** to carry a name (its label prop is
   optional and no host prop exists). Record the measured dump and propose the
   honest alternative; do not invent a name from paint.
3. A role the runtime reports differs from AccessKit's documented name in a way
   that changes the contract (e.g. `TextInput` vs `TextField`). Record the
   measured role, use it in the table, and update the affected docs rather than
   forcing the expected string.
4. Any gate (`check`, `lint`, `test`) fails for a reason unrelated to this
   change. Report the output instead of masking it.

## 7. Outcome

(Fill after the run: measured roles, any component fix, failing directions, and
the final counts.)

## 8. Acceptance

- [ ] The name matrix covers every Tier 1 control that carries a name.
- [ ] The closure case proves no interactive node is unnamed.
- [ ] Presentational primitives expose no interactive node.
- [ ] Both mutation directions fail as described, and the restored tree passes.
- [ ] `README.md`, `COMPONENTS.md` and `TODO.md` record the matrix; this plan is
      indexed.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
