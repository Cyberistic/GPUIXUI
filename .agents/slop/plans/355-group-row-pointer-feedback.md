# 355 — A group row must paint the pointer feedback its hit area promises

**Phase:** F (interaction states) · **Workstream:** primitives · **Depends on:** 030, 041, 047, 049, 056, 065, 084, 089, 332 · **Status:** planned → executed

## 1. The defect (measured)

`CheckboxGroup` and `RadioGroup` make **one row** the control: the row carries
the `role`, the accessible name, the tab stop, the click handler and the key
handler (plans `065`, `049`). The styles do not follow that contract. The only
pointer feedback in either component is the inner selection box
(`selectionBoxStyle`'s `hover`/`active` border). The row that owns the gesture
declares nothing.

Measured on this host in the real `TestRenderer` (2026-10-18) by reading the
authored style the renderer reports for each element:

| Element | `backgroundColor` | `hover` | `active` |
| ------- | ----------------- | ------- | -------- |
| `Button` | `#000007` | `{ backgroundColor: "#000007E6" }` | `{ backgroundColor: "#000007CC" }` |
| `CheckboxGroup` row (`role="checkbox"`) | — | **absent** | **absent** |
| `RadioGroup` row (`role="radio"`) | — | **absent** | **absent** |

So hovering the label column of either row — most of the hit area, and the part
a user aims at — gives no feedback at all, while hovering the small circle
darkens its border. A row is the control; its feedback must not be painted by a
sub-region. `ToggleGroup`'s items already paint through `toggleVariants
.washed`, which is the contract this plan applies to the other two groups.

`docs/checkbox-group.mdx` currently says "Hover and press are declared in
`style.hover`/`style.active`" in a paragraph about the row, which describes the
box, not the row. The doc half of this fix corrects that sentence.

## 2. The rule, once

A row that is itself the interactive element paints pointer feedback **on
itself**:

| State | Paint |
| ----- | ----- |
| rest | no surface of its own (the row is layout, not a card) |
| hover | `backgroundColor: colors.hover` |
| press | `backgroundColor: colors.active` |
| disabled | no `hover`, no `active` (plan `332`'s rule: an inert control must not respond) |

The inner box keeps its own border feedback; a row wash plus a box border change
is one control giving two coherent signals, not two controls. The vertical
group stretches its rows, so the wash covers the whole hit area; a horizontal
group hugs each row, so it covers exactly that row.

The feedback goes through **one** resolver in `core/selection.ts`, because both
groups need it and a second copy is how the two drift.

## 3. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/selection.ts` | **add** `selectionRowStyle(spec, theme)`: the row's layout (`display: flex`, `flexDirection: "row"`, `alignItems` from the spec, `gap: spacing.sm`, `borderRadius: radius.sm`, `cursor`) plus the hover/active wash, omitted while disabled. One owner for both groups. |
| `packages/primitives/src/components/CheckboxGroup.tsx` | **delete** the local `rowLayoutStyle`; `renderRow` merges `selectionRowStyle({ disabled, align: "flex-start" }, theme)` before the caller's `rowStyle`. |
| `packages/primitives/src/components/RadioGroup.tsx` | replace the inline row layout object with `selectionRowStyle({ disabled, align: "center" }, theme)`; the caller's `optionStyle` still merges last. |
| `packages/primitives/src/core/selection.test.ts` | the resolver's three cases: enabled declares the theme's hover/active roles, disabled declares neither, `align` reaches `alignItems`. |
| `packages/primitives/src/components/selection.test.tsx` | per-group element-tree cases: every enabled row (select-all included) carries the wash; a disabled row does not; `rowStyle`/`optionStyle` still win last. |
| `packages/primitives/runtime/row-feedback.runtime.test.tsx` | **new.** The real-renderer table (see §5). |
| `packages/primitives/docs/checkbox-group.mdx` | the Theming paragraph: the row declares the wash, the box keeps its border feedback. |
| `packages/primitives/docs/radio-group.mdx` | one sentence in Theming, and the verification list gains the new suite. |
| `COMPONENTS.md` | the Checkboxes and Radio groups rows and the runtime-count paragraph. |
| `packages/primitives/README.md` | the measured runtime count. |
| `TODO.md` | one ticked primitives row. |
| `.agents/slop/plans/README.md` | index row for `355`. |

No new component, prop, state type or example: the components and their examples
already exist; this is the missing interaction state.

## 4. Implementation notes (exact)

1. `selectionRowStyle` lives beside `selectionBoxStyle`, takes
   `{ readonly disabled?: boolean; readonly align: "flex-start" | "center" }`
   and returns a `StyleDesc`. Disabled omits the two interaction keys entirely —
   `hover: {}` would still register a hover rule.
2. `CheckboxGroup`'s `rowTextStyle` and the box/label tree are unchanged.
   `RadioGroup`'s row keeps `align: "center"` (its description is a sibling, not
   a second line).
3. Do **not** add row padding. It would change every measured row gap and
   position; the row's painted box already is the hit area the wash should
   cover.
4. Keep the merge order: component style first, caller's `rowStyle`/
   `optionStyle` last (`docs/component-api.md` §3, plan `097`).
5. Delete the scratch probe (`runtime/hover-probe.runtime.test.tsx`) used to
   measure §1; it must not be committed.

### Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- selection` | the core and element suites green, with the new cases named |
| `nub run --filter @gpuixui/primitives test:runtime -- row-feedback` | one file, every row case green |
| `nub run --filter @gpuixui/primitives test` | `580`-ish passed in 43 files (574 + the new cases); no failures |
| `nub run --filter @gpuixui/primitives test:runtime` | `529 + n` passed in 27 files |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run check` / `nub run lint` / `nub run test` (repo root) | exit `0` |

Record the exact counts after the run in §6; do not copy the estimates.

## 5. Test plan and two-direction proof

**Runtime table** (`runtime/row-feedback.runtime.test.tsx`), one fresh window per
case:

1. `CheckboxGroup`: each enabled row (option rows and the select-all parent)
   declares `hover.backgroundColor` = `theme.colors.hover` and
   `active.backgroundColor` = `theme.colors.active`.
2. `RadioGroup`: the same over every enabled option row.
3. A disabled option row and a disabled group declare **neither** key —
   `hover` and `active` are absent from the authored style, not merely equal to
   the rest.
4. The wash covers the hit area: in a vertical group each row's painted width
   equals the group's; in a horizontal group a row's width is its content's.
5. A caller's `rowStyle`/`optionStyle` returning
   `{ hover: { backgroundColor: … } }` wins (merged last), so the escape hatch
   is real and not shadowed.

**Offline** (`src/core/selection.test.ts`, `src/components/selection.test.tsx`):
the same six expectations against the decoded element tree, so a regression is
visible without the native binding.

**Both directions** (mutate, observe the named failures, restore, re-run green):

1. Delete `selectionRowStyle` from `CheckboxGroup.renderRow` — the checkbox
   runtime and element cases fail by name; the radio cases still pass.
2. Delete it from `RadioGroup` — the mirror.
3. Drop the `disabled` branch from the resolver — the disabled cases fail while
   every enabled case stays green.
4. Give `RadioGroup` `align: "flex-start"` — the radio row's label baseline
   moves; if no case catches that, add the alignment case rather than accepting
   it.

**STOP conditions**

- Any existing runtime or element case fails for a reason other than the new
  expectations: stop and record which, rather than editing the old assertion.
- The row's painted width does **not** equal the group's in a vertical group:
  stop — that is a layout defect in the group, and the wash cannot be claimed to
  cover the hit area.
- The renderer reports no nested `hover` block for a row: stop and record the
  dump; the whole assertion style depends on it (it does report it for `Button`).
- A mutation makes nothing fail: the case is vacuous — fix the case, do not
  tick the plan.

## 6. Result (executed 2026-10-18)

- `core/selection.ts` now exports `SelectionRowSpec` + `selectionRowStyle`:
  layout (`row`, `gap`, `radius.sm`, `cursor`, `alignItems` from the spec) plus
  `hover`/`active` washes from `colors.hover`/`colors.active`, omitted while
  disabled.
- `CheckboxGroup`'s local `rowLayoutStyle` is deleted (it used to be a second
  copy of the row layout); its row and `RadioGroup`'s option row both resolve
  through the one helper, with `align: "flex-start"` (stacked label) and
  `align: "center"` (inline description) respectively.
- Additions: **3 core + 6 element-tree + 5 runtime** cases.
- **Counts:** offline **`583 passed` in 43 files** (574 + 9); runtime **`534
  passed` in 27 files** (529 + 5); `nub run check` (check-tests, lint, fmt,
  check-types) exit `0`; repo `nub run test` green.
- **Two-direction proof (each mutation restored and re-run green):**
  1. `CheckboxGroup`'s row reverted to the old inline layout — runtime
     `paints the hover and press wash on every enabled CheckboxGroup row` and
     `declares no wash on a disabled row or a disabled group` failed, plus
     element `gives every enabled CheckboxGroup row the theme's wash`
     (2 runtime + 1 offline).
  2. The same for `RadioGroup` — runtime
     `paints the wash on every enabled RadioGroup row` and the shared disabled
     case, plus element `gives every enabled RadioGroup row the theme's wash`
     and `declares no feedback on a disabled radio option`
     (2 runtime + 2 offline).
  3. The resolver's `disabled` branch deleted — offline
     `declares no feedback on a disabled CheckboxGroup row or group`,
     `declares no feedback on a disabled radio option`, `declares no feedback on
     a disabled row`, and runtime `declares no wash on a disabled row or a
     disabled group` failed (3 offline + 1 runtime).
  4. `RadioGroup` passed `align: "flex-start"` — element
     `gives every enabled RadioGroup row the theme's wash` failed on
     `alignItems` (1 offline), so the alignment has a guard too.
- **Honest limit:** `TestElement.style` reports the authored `StyleDesc`, so the
  proof is that the declaration reaches the renderer at the element that owns
  the gesture, plus the geometry that its box is the hit area. The applied
  hover colour is GPUI's own state application — the same basis every control's
  `style.hover` has always had; no test renderer API exposes the post-hover
  paint.

