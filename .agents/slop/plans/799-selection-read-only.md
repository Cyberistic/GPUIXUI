# 799 — The selection family's read-only state

**Phase:** C/F (Tier 1 completeness, API symmetry)
**Depends on:** `030`, `040`, `041`, `047`, `049`, `056`, `065`, `079`–`081`,
`324`, `332`, `355`, `359`, `583`, `590`, `601`–`603`, `740`, `743`, `746`,
`748`, `786`, `796`, `797`
**Status:** done — implemented in this workstream. Offline 74 files / 1031
tests; the new native file 8/8; seven neighbour runtime suites 221/221. Three
mutations were reverted one at a time and each failed its named case (the
`Checkbox` guard, the `RadioGroup` guard, the resolver's read-only branch).

## 1. Why

Plans `786`, `796` and `797` established one contract for a value a reader may
see but not change: **`readOnly` keeps the tab stop, the focus ring, the name
and the announced value, refuses every change path, and paints the normal
(non-disabled) surface with a `default` cursor.** Today that contract exists on
`Input`, `TextArea`, `NumberField`, `OTPField`, `Select` and `Rating` — and on
none of the three selection controls.

Measured consequence: a submitted/review form cannot show a chosen checkbox,
switch or radio without either

- `disabled` — faded to half opacity **and removed from the tab order**, so a
  keyboard or screen-reader user reviewing the form cannot reach the value; or
- a bare `Text`, which loses the `checkbox`/`switch`/`radio` role, the
  `aria-valuetext` state and the control's paint.

That is the same asymmetry plans `786`–`797` fixed for every other
value-bearing control, and it is a real API gap for the "review a saved
settings form" shape the examples already describe.

0.10.0 publishes no `aria-readonly` (`@gpuix/native/host`'s host props carry
only `aria-label`, `aria-description`, `aria-id`, `aria-expanded`,
`aria-selected`, `aria-valuetext`, `aria-level`), so the state is **behavioural
and visual**; the pages must say that, exactly as `Select`'s page does.

## 2. Decision

Add `readOnly?: boolean` to **`Checkbox`, `Switch`, `CheckboxGroup` and
`RadioGroup`** — the selection family. `Toggle`/`ToggleGroup` are excluded on
purpose: they are `aria-pressed` **actions** ("align left", "bold"), and a
pressed button that refuses to be pressed is a contradiction; both pages already
document them as actions. Record that boundary in the plan, not as a new prop.

Semantics, identical across the four:

| Path | Disabled | Read-only |
| ---- | -------- | --------- |
| Tab stop | removed | **kept** |
| Focus ring while focused | none | **painted** |
| Pointer/key activation | refused | refused |
| Value report | none | none |
| Paint | `opacity: 0.5`, `cursor: not-allowed` | full opacity, `cursor: default` |
| Hover/press wash | none | none |
| `StateStyle` payload | `disabled: true` | `readOnly: true` |
| Announced name/value | unchanged | unchanged |

`RadioGroup` additionally keeps its one tab stop and lets the arrow keys and
type-ahead **move focus without moving the selection** (the platform's
read-only radio-group behaviour). `CheckboxGroup` keeps one tab stop per row,
as it always has.

## 3. Exact files

Change:

1. `packages/primitives/src/core/selection.ts`
   - `SelectionSpec` gains `readonly readOnly?: boolean`.
   - `SelectionRowSpec` gains `readonly readOnly?: boolean`.
   - `selectionBoxStyle` and `switchTrackStyle`: cursor is
     `not-allowed` (disabled) / `default` (read-only) / `pointer`; the
     disabled-or-read-only branch keeps the resting fill and border and declares
     no press rule; opacity is half **only** when disabled; the ring paints when
     focused and not disabled.
   - `selectionRowStyle`: same cursor rule; no hover/active when disabled **or**
     read-only.
2. `packages/primitives/src/components/Checkbox.tsx`
   - `CheckboxProps.readOnly`, `CheckboxState.readOnly`.
   - `toggle()` refuses `disabled || readOnly`.
   - Paint specs (box and row) receive `readOnly`; the label tone mutes only
     when disabled.
   - JSDoc explains the tab-stop/announcement contract and the missing
     `aria-readonly`.
3. `packages/primitives/src/components/Switch.tsx` — the same change.
4. `packages/primitives/src/components/CheckboxGroup.tsx`
   - `CheckboxGroupProps.readOnly`, `CheckboxGroupState.readOnly`,
     `CheckboxRowState.readOnly`.
   - `RowSpec.readOnly`; the key and click paths refuse it; both paint specs and
     the row style receive it; the select-all parent is read-only too.
   - The group root's `style` callback reports `readOnly`.
5. `packages/primitives/src/components/RadioGroup.tsx`
   - `RadioGroupProps.readOnly`, `RadioGroupState.readOnly`,
     `RadioOptionState.readOnly`.
   - `select()` refuses read-only; `navigate()` moves focus only; the
     type-ahead callback focuses without setting the value; the row's click and
     Enter/Space are refused; the tab stop and ring stay.
6. `packages/primitives/examples/selection.example.tsx` — a `Separator` and a
   read-only "Saved summary" block (a read-only `CheckboxGroup` + `Switch`),
   with `testId`s the runtime suite can address.
7. `packages/primitives/docs/checkbox.mdx`, `switch.mdx`, `checkbox-group.mdx`,
   `radio-group.mdx` — a `readOnly` API row, a short **Read-only** subsection,
   the missing-`aria-readonly` limitation, and a Verification bullet.
8. `packages/primitives/README.md` — the shared-state deviation names the
   selection family too.
9. `COMPONENTS.md` — one “Read-only (799)” sentence on the Checkboxes,
   Radio groups and Switches rows.
10. `TODO.md` — a ticked row under the primitives workstream.
11. `.agents/slop/plans/README.md` — index this plan.

Tests (new / updated):

12. `packages/primitives/src/core/selection.test.ts` — resolver cases:
    read-only cursor/feedback/ring/opacity, and the row style.
13. `packages/primitives/src/components/state-style.test.tsx` — the four
    payloads gain `readOnly` (existing exact-object assertions updated).
14. `packages/primitives/src/components/selection-read-only.test.tsx` (new) —
    element tree: tab stop kept, `readOnly` in every payload, click/key
    handlers refuse, cursor `default`, no hover on a read-only row,
    `RadioGroup` arrows cannot call `onSelect`.
15. `packages/primitives/runtime/selection-read-only.runtime.test.tsx` (new) —
    native: Tab reaches each read-only control, the ring paints, click /
    Enter / Space report nothing, a writable twin reports on the same gesture,
    read-only is not faded, and a read-only radio group's arrow moves focus
    without changing the value.

## 4. Commands and expected results

Run from the repo root (`nub` is the pinned package manager):

```sh
nub run --filter @gpuixui/primitives check-types     # exit 0
nub run --filter @gpuixui/primitives test           # offline suite green
nub run --filter @gpuixui/primitives test:runtime -- src/components/...  # NOT this form
nub run --filter @gpuixui/primitives test:runtime runtime/selection-read-only.runtime.test.tsx
```

- The scoped runtime form is the **positional file**, never `-- --run <file>`
  (plan `700`; the double-dash form runs the whole live suite).
- Expected: the new runtime file passes; the read-only matrix, activation,
  focus-ring, focus-loss, tab-order and pointer-feedback suites still pass when
  run scoped (they are the neighbours this change can break).
- Full `nub run check` and `nub run test` are the end-of-task gate.

## 5. Test plan (must be able to fail)

- **Element tree** (`selection-read-only.test.tsx`): invoke the decoded
  `onClick`/`onKeyDown`/`onKeyUp` handlers and assert `onValueChange` is never
  called; assert `tabIndex` is still `0`; assert the part state is
  `{ readOnly: true, disabled: false, … }`. Reverting any guard fails a named
  case.
- **Core** (`selection.test.ts`): a read-only box paints `cursor: "default"`,
  no opacity, a resting `hover` (not the enabled wash), and a ring when
  focused; a disabled box still paints `not-allowed` and `0.5`. Dropping the
  read-only branch fails the cursor/feedback cases; moving opacity into the
  shared inert branch fails the opacity case.
- **Runtime** (`selection-read-only.runtime.test.tsx`): each control is focused
  with `focusNext` (the real Tab contract), then a real `click`, `keyDown`/
  `keyUp` Enter and Space are driven; `onValueChange` records nothing. A
  writable twin in a fresh window records on the same gesture, so a gesture
  that missed the control cannot pass. A read-only `Switch`/`Checkbox` paints
  its ring (the `focusRing` shape) and no `opacity`; a read-only `RadioGroup`
  arrow moves native focus to the next option while `onValueChange` stays
  empty and the checked option stays checked.
- Two-direction proof for every guard: remove the read-only refusal → the
  runtime case reports a change; remove the read-only cursor branch → the core
  cases fail; remove `readOnly` from a payload → the element case fails.

## 6. STOP conditions

Stop and report instead of improvising if:

- the runtime delivers **no** pointer/key events to a read-only control and the
  only way to keep it focusable is a different host shape (then record the
  measured limitation and keep the tab-stop contract);
- a read-only `RadioGroup`'s arrow keys cannot move focus without triggering
  GPUix's own selection (the group is ours, so this should not happen — but do
  not fake it);
- any existing contract test rejects the new prop because a page cannot name it
  (that is a real API-doc gap — fix the page, do not relax the guard);
- the change would require editing another workstream's paths. Record it in
  `TODO.md` instead.

## 7. Acceptance

- `readOnly` exists on the four parts, keeps the tab stop and ring, refuses
  every activation path, reports itself in every state payload, and paints the
  normal surface with a `default` cursor and no hover/press wash.
- Every page names the prop, states the missing `aria-readonly`, and lists the
  new tests.
- The selection example mounts the read-only block.
- `COMPONENTS.md`, `TODO.md`, the package README and the plan index are current.
- `nub run check` and `nub run test` are green; the scoped native file and its
  neighbours are green, with the exact scenario ids recorded in the commit.
