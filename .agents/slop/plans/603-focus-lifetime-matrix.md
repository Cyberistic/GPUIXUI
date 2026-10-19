# 603 — The focus-lifetime matrix: every focusable Tier 1 control clears its ring

**Phase:** F (verification truth) — **implementation**
**Depends on:** `041`, `083`, `084`, `089`, `332`, `583`, `590`, `591`, `596`, `601`, `602`
**Owns:** `packages/primitives` (one runtime suite), `COMPONENTS.md`,
`.agents/slop/plans/README.md`, `TODO.md`.

## 1. The evidence

Three shipped defects are the same class: a control paints a focus ring from
state that only `onBlur` clears, and the pinned 0.10.0 build never dispatches
it (plan `583`).

| Plan | Control(s) | Symptom |
| --- | --- | --- |
| `591` | any `autoFocus` field, `OTPField`, `NumberField`'s blur commit | seeded focus never cleared |
| `601` | `ToggleGroup`, `RadioGroup`, `Rating` | item ring and keyboard cursor outlived focus |
| `602` | `RangeSlider` | thumb ring outlived focus (two rings painted) |

Plans `601`/`602` added the four-case `runtime/focus-loss.runtime.test.tsx`, but
it only covers the controls that *had* the bug. The other fifteen single-root
controls rely on `useFocus`'s clear (plan `591`) and have **no case proving they
clear**. A new control that hand-rolls its focus state, or a change that drops
the clear from `useFocus`, would ship a second ring with every existing suite
green — exactly how `602` was missed.

The evidence for the mechanism is already measured: focus moves, the tracker's
sample names the outside control, and no blur arrives. The matrix below needs no
new probe; it generalises the case `602` proved for one control.

## 2. The rule

**Every focus-painting control is in one table, and every row proves both
halves: a ring while it holds focus, none after focus leaves.**

The table is the `focus-ring` matrix's 18 focusable controls (plan `084`, plus
`IconButton` from plan `375`), reused by name. Each row mounts:

```tsx
<Stack direction="row">
  <Button testId="before">Before</Button>
  {node}
</Stack>
```

1. A real gesture focuses the control: Tab twice (the first stop is `before`,
   the second the control) where the control has no press-time focus path, and
   the control's own press where it does (`Rating`, `ToggleGroup`,
   `RadioGroup`, `RangeSlider` write an event cursor on a key or press — the
   gesture that reproduced plan `602`).
2. `settleFocus()`; assert a ring is painted **inside** `c` (the precondition:
   a control that never rings must fail here, not pass the "after" half by
   accident).
3. `click("before")`, `settleFocus()`; assert **no** ring inside `c`, and
   exactly one ring in the window (the button's).

One further case mounts an `autoFocus` `Input` and leaves it, for the seeded
state `useFocus` starts with (plan `591`). Without it, the table's rows cannot
see a missing `useFocus` clear: a control that never set an event state already
paints from the tracker, so the after-half would pass either way.

No component changes are expected: `useFocus` (plan `591`), `useRovingFocus`
(plan `601`) and `OTPField`'s/`CheckboxGroup`'s tracker-derived state already
own the clear. The matrix's job is to keep that true.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/runtime/focus-loss.runtime.test.tsx` | header names the matrix's scope; add the 18-row table and its `it.each` case |
| `COMPONENTS.md` | the Type 1 evidence paragraph and the inventory rows' `wip` reason point at the matrix |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | one ticked row under the primitives workstream |

No source file changes unless the matrix finds a red row; then STOP (`§6`).

## 4. Test plan

**Runtime — `runtime/focus-loss.runtime.test.tsx`.** The six existing cases stay.
Add one table with these 18 rows, each using the smallest honest shape from
`focus-ring.runtime.test.tsx`:

`Button`, `IconButton`, `Toggle`, `Checkbox`, `Switch`, `Input`, `TextArea`,
`NumberField`, `OTPField`, `Select`, `Rating`, `ToggleGroup`, `RadioGroup`,
`CheckboxGroup`, `Slider`, `RangeSlider`, `InfoTip`, `ScrollArea` (labelled).

Each case is a fresh window (one window per test, as the fixture requires).

**Both directions.**

- Delete `useFocus`'s clearing effect (plan `591`): the **seeded `autoFocus`
  case** fails (the field keeps its ring); the table rows pass either way,
  because a control that never set an event state paints from the tracker.
- Delete `useRovingFocus`'s clearing effect: the `ToggleGroup`, `RadioGroup`,
  `Rating` and `RangeSlider` rows fail, plus the five existing cases (the four
  composites and the deferred radio walk); the fourteen tracker-only rows pass.
  Restore it and all pass.
- A control that never paints a ring fails its precondition assertion.

## 5. Commands and expected results

```sh
cd packages/primitives

nub exec vitest run --config vitest.runtime.config.ts \
  runtime/focus-loss.runtime.test.tsx
# expect: 25/25 pass (6 existing + the seeded case + 18 matrix rows)

nub exec vitest run --config vitest.runtime.config.ts \
  runtime/focus-ring.runtime.test.tsx \
  runtime/disabled.runtime.test.tsx \
  runtime/tab-order.runtime.test.tsx
# expect: all pass

nub run --filter @gpuixui/primitives test     # offline suite
nub run check
```

## 6. STOP conditions

- Stop if a row rings after focus leaves while its control is built on
  `useFocus`/`useRovingFocus`: that is a real defect in the hook's clear (or in
  how the control names its host id), not a test to weaken. Report the row and
  the measured ids.
- Stop if a control paints **no** ring while focused on this build: the matrix
  must not pass a control that never shows focus. Report it; the focus-ring
  matrix should already have caught it.
- Do not add a per-component clear to make a row pass; one owner per state
  (plans `591`, `601`).
- Do not include `CheckboxGroup` rows as separate controls — the group is one
  focusable row at a time and is already a row in the table.

## 7. Acceptance

- Every focusable Tier 1 control has a measured `ring while focused / no ring
  after leaving` pair, in one table.
- The two failing directions in §4 are observed and recorded.
- Tests, `nub run check`, `nub run lint` and `nub run test` are green; the
  inventory and the plan index agree.

## 8. Result (2026-10-19)

- The table has 18 rows plus the seeded-`autoFocus` case; **25/25** in the file
  pass on the release-tag build. No product defect was found — the class was
  closed by plans `591`, `601` and `602`; this matrix keeps it closed.
- Failing direction 1: deleting `useFocus`'s clear fails exactly the
  `autoFocus` case (`clears a seeded autoFocus ring when focus leaves`).
- Failing direction 2: deleting `useRovingFocus`'s clear fails exactly 9 cases
  by name — the four table rows (`ToggleGroup`, `RadioGroup`, `Rating`,
  `RangeSlider`) and five existing ones (the three composite clears, the
  `RangeSlider` clear and the deferred radio walk).
- Offline 59 files / 820 tests; runtime 53 files / **762 tests** green.
