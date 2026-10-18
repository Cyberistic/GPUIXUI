# 372 — The field family joins the shadcn slice

| Field | Value |
| ----- | ----- |
| Phase | F (design-system conformance) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `053`, `054`, `062`, `079`, `084`, `090`, `097`, `324`–`326`, `337`, `341`, `345`, `351`, `368`, `370`, `524` |
| Status | done |

Self-contained: §0 the measured starting point, §1 the decision and its scope,
§2 the rule, §3 the files, §4 the commands, §5 the test plan and the
two-direction proof, §6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 0. What is true before this plan (measured 2026-10-18)

Plan `370` introduced `packages/primitives/src/core/recipes.ts` and moved
`Input`, `TextArea` and `Button` onto the verbatim new-york-v4 recipes from
`@gpuixui/tw` (plan `524`). A field is now **36 high, 12 horizontal padding,
4 vertical padding, radius 6, 14/20 type**, because `INPUT_BASE` compiles to
`h-9 px-3 py-1 rounded-md text-base md:text-sm`.

The rest of the field family still resolves through `controlStyle` and its
`comfortable` density metrics: **32 high, 10 horizontal, 13/18 label type**.

| Control | Where its chrome is resolved today |
| ------- | --------------------------------- |
| `Input`, `TextArea` | `fieldRecipeStyle` (already the recipe — plan `370`) |
| `Select`'s trigger | `selectTriggerStyle` → `controlStyle` + `controlFocusStyle` |
| `NumberField` | `renderNumberField` → `controlStyle` + `fieldTextStyle` + `controlFocusStyle` |
| `OTPField`'s cells | `otpCellStyle` → `controlStyle({ square: true })` |

So a form that puts an `Input` beside a `Select`, a `NumberField` or an
`OTPField` paints **two different field heights 4 px apart**, two horizontal
paddings 2 px apart, and two type scales — the exact class of drift
`solid`-token consumption was meant to prevent. The painted difference is
visible at rest, before any interaction.

The recipes that would be needed for the *other* halves of the family —
`toggle.tsx`'s `toggleVariants`, `checkbox.tsx`, `radio-group.tsx`,
`switch.tsx`, `select.tsx`'s item/trigger strings — are **not** in
`@gpuixui/tw` yet (`src/recipes.ts` holds `INPUT_*`, `BUTTON_*`, `DIALOG_*`,
`POPOVER_*`). `packages/tw` is outside this workstream's paths (`TODO.md`
records the cross-team row for its colour-only invalid ring). This plan
therefore does the half that reuses a recipe that exists, and records the
other half rather than copying class strings into primitives (the rule plan
`370` §1 established).

## 1. The decision

**Every text-entry surface is one field: the `INPUT_BASE` recipe, one height,
one type scale, one focus/invalid/disabled contract.**

- `Select`'s trigger, `NumberField` and `OTPField`'s cells consume
  `fieldRecipeStyle`, the same resolver `Input`/`TextArea` use. No new class
  string enters primitives.
- **One field size.** `size` stays in the public props of all four controls for
  API stability but no longer moves a field, exactly as plan `370` documented
  for `Input`. A field is 36 high at every `size`.
- **The select keeps hugging by default.** `INPUT_BASE` is `w-full`; the
  trigger clears `width` and leaves the `fullWidth` prop (which sets the root's
  width) as the only way to stretch it. The list, its rows, its headings and
  its placement estimate keep their own metrics: the option row is
  `density.controlHeight.sm` (28) and is not an input, so it is out of this
  slice until `select.tsx`'s item string exists in `@gpuixui/tw`.
- **OTP cells are square fields.** The cell takes the recipe's height, type,
  radius and state buckets, then sets `width`/`minWidth` to that height and
  drops the horizontal padding, so six 36 px cells centre their digit. This is
  shadcn's `size-9` slot expressed through the one field recipe.
- **`NumberField` keeps its own layout.** The recipe is a flat box; the field
  is a row of an `<input>` and a stepper column. It adds the row layout and
  `paddingRight: 0` after the recipe (as it does today), so the steppers own the
  right edge. The inner input keeps `numberInputStyle`.
- `fieldTextStyle` is deleted: its body type and text cursor are exactly what
  the field recipe now supplies (`fieldPaint` owns cursor/userSelect, the recipe
  owns the type). It has no other consumer once `NumberField` stops using it.
- The **toggle and selection families wait** for their recipes. Recorded as a
  `packages/tw` cross-team row plus a primitives follow-up row, not implemented
  by copying upstream class strings into this package (plan `370` §1).

Alternatives rejected:

- **Copy `select.tsx`/`checkbox.tsx` strings into `primitives`** violates the
  one-owner rule for recipes and loses `upstream.test.ts` provenance.
- **Scale the recipe by `size`** means the numbers are no longer shadcn's, and
  plan `370` already fixed one field size.
- **Leave `NumberField`/`Select` on density** leaves two field heights in one
  form, which is the bug this plan exists to remove.
- **Move the select's option rows to 32 in the same change** has no recipe to
  read, so it would be an invented number; it stays recorded.

## 2. The rule

```ts
// core/recipes.ts — the only place a primitive reads a recipe
/** A field-shaped row's layout: the recipe is a flat box. */
export const fieldRowStyle: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  minWidth: 0,
};

/** A square field (an OTP digit): the recipe's height is also its width. */
export const squareFieldRecipeStyle = (
  state: FieldRecipeState,
  theme: PrimitiveTheme,
): StyleDesc => {
  const base = fieldRecipeStyle(state, theme);
  return typeof base.height === "number"
    ? {
        ...base,
        width: base.height,
        minWidth: base.height,
        paddingLeft: 0,
        paddingRight: 0,
        justifyContent: "center",
        textAlign: "center",
      }
    : base;
};

/** One OTP cell: the square field, with the digit centred. */
export const otpCellStyle = (spec: OtpCellSpec, theme: PrimitiveTheme): StyleDesc =>
  squareFieldRecipeStyle(
    { focused: spec.focused === true, invalid: spec.invalid === true, disabled: spec.disabled === true },
    theme,
  );
```

```ts
// Select.tsx — the trigger is the field, hugging unless fullWidth stretches the root
export const selectTriggerStyle =
  (spec: SelectTriggerSpec, theme: PrimitiveTheme) =>
  (state: SelectTriggerState): StyleDesc => ({
    ...fieldRecipeStyle(
      {
        focused: state.focused || state.open,
        invalid: spec.invalid === true,
        disabled: state.disabled,
      },
      theme,
    ),
    ...fieldRowStyle,
    // The recipe's `w-full` is a browser form default; the select hugs its value
    // unless the consumer asks for `fullWidth` (which sizes the root).
    width: undefined,
    justifyContent: "space-between",
  });
```

```ts
// NumberField.tsx — the recipe, plus the stepper row
const chrome = resolvePartStyle(
  mergeStyle(
    mergeStyle(
      fieldRecipeStyle({ focused: focus.focused, invalid: props.invalid === true, disabled }, theme),
      fieldRowStyle,
    ),
    { paddingRight: 0 },
  ),
  props.style,
  { disabled, focused: focus.focused, invalid: props.invalid === true },
);
```

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/recipes.ts` | add `fieldRowStyle`, `squareFieldRecipeStyle`, `otpCellStyle`; move `OtpCellSpec` here |
| `packages/primitives/src/core/style.ts` | delete `otpCellStyle`, `OtpCellSpec` and `fieldTextStyle` |
| `packages/primitives/src/core/index.ts` | export the new values; drop the deleted ones |
| `packages/primitives/src/components/Select.tsx` | `selectTriggerStyle` resolves the field recipe; `SelectTriggerSpec` replaces `ControlSpec` in that seam |
| `packages/primitives/src/components/NumberField.tsx` | chrome from `fieldRecipeStyle` + `fieldRowStyle` + `paddingRight: 0`; drop `controlStyle`/`fieldTextStyle`/`controlFocusStyle` |
| `packages/primitives/src/components/OTPField.tsx` | import `otpCellStyle` from `core/recipes.js` |
| `packages/primitives/src/core/recipes.test.ts` | the exact square-field numbers, the row layout, both existing field cases still pass |
| `packages/primitives/src/components/field-family.test.tsx` | **new**: one geometry table over Input, TextArea, NumberField, the Select trigger and an OTP cell; square cells; caller style last |
| `packages/primitives/src/components/Select.test.tsx` | trigger ring is the recipe ring; trigger geometry |
| `packages/primitives/src/components/NumberField.test.tsx` | field geometry 36/12/16; no density height |
| `packages/primitives/src/components/OTPField.test.tsx` | cell is 36 × 36, padding 0, centred |
| `packages/primitives/runtime/focus-ring.runtime.test.tsx` | `Select`, `NumberField`, `OTPField` expect `RECIPE_RING` |
| `packages/primitives/runtime/fields.runtime.test.tsx` | the four Select ring assertions use the recipe ring; a field-family height case |
| `packages/primitives/runtime/theme-axes.runtime.test.tsx` | the density proof moves to `Toggle`; the field family is pinned at 36 at every density |
| `packages/primitives/docs/{select,number-field,otp-field}.mdx` | the recipe values, `size` no longer moves a field, the square cell, the recorded list-row and family follow-ups |
| `COMPONENTS.md` | `Selects`, `Number Field`, `OTP Field` rows; the density exception list; the runtime count |
| `TODO.md` | tick the field half; add the `packages/tw` recipes row and the primitives follow-up |
| `PLAN.md` | D42: one field size, one field recipe, and why the rest of the family waits |
| `.agents/slop/plans/README.md` | index this plan |

Not edited (other workstreams' paths): `packages/tw/**`, `packages/tokens/**`,
`docs/tokens.md`, `docs/design-system.md`. The existing `TODO.md` row about
their density paragraphs is extended instead.

## 4. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/primitives`).

| Command | Expected |
| ------ | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/recipes.test.ts` | the square-field and row cases pass; the field numbers are 36/12/4/6/14/20 |
| `nub run --filter @gpuixui/primitives test -- src/components/field-family.test.tsx` | every field surface reports the same geometry |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline 44 files / 638 tests before this slice) |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline 32 files / 607 tests) |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

The runtime suite takes ~90 s on this host. It is not optional: the ring,
height and density claims in this plan are measured, not inferred.

## 5. Test plan

### 5.1 Offline — `src/core/recipes.test.ts`

1. **The square field is the field.** `squareFieldRecipeStyle` at rest reports
   the compiler's `height` 36, `width` 36, `minWidth` 36, `paddingLeft`/`Right`
   0, `borderRadius` 6, `fontSize` 14, `lineHeight` 20, `borderWidth` 1.
   Before: `otpCellStyle` reported 32 × 32 with 13/18.
2. **The square field keeps the buckets.** Focused → the recipe focus shadow
   (3 px, `alpha(ring, .5)`); invalid → the destructive border; invalid and
   focused → destructive border *and* the focus shadow; disabled → `opacity
   .5`, `pointerEvents: none`, no shadow.
3. **The field row is a row.** `fieldRowStyle` declares `display: flex`,
   `flexDirection: "row"`, `alignItems: "center"`, `minWidth: 0` — the layout
   the recipe cannot supply.
4. **The caller still wins last** — covered by `style-order.test.tsx`; one case
   here proves a caller `height` overrides the square field's width pairing
   only through the component merge, not inside the resolver.

### 5.2 Offline — `src/components/field-family.test.tsx` (new)

One table over the five text-entry surfaces, asserting the shared facts by
name so a control that drifts fails by name:

| Surface | How the test reads it |
| ------- | --------------------- |
| `Input` | `renderInput(...)` style |
| `TextArea` | `renderTextArea(...)` style |
| `NumberField` | `renderNumberField(...)` style |
| `Select` trigger | `selectTriggerStyle({}, theme)(state)` |
| `OTPField` cell | `otpCellStyle(...)` |

5. **Same geometry**: height 36, `fontSize` 14, `lineHeight` 20,
   `borderRadius` 6, `borderWidth` 1 on every surface.
6. **Same padding**, with the two documented exceptions: the field is 12/12;
   `NumberField` is 12 left / 0 right (the steppers own the right edge); an OTP
   cell is 0/0 and 36 wide.
7. **The select hugs**: the trigger's `width` is `undefined`, not `"100%"`, and
   `justifyContent` is `"space-between"`. The `fullWidth` root still paints
   100 % (the existing `Select` element test covers the root).
8. **The cell is square**: width equals height equals 36, `textAlign` centre,
   `justifyContent` centre.
9. **Caller style last** on the new seam: a caller `height` on `NumberField`
   wins over 36 (the existing `style-order` guard covers the family; this case
   pins the new resolver).

### 5.3 Runtime

10. **Field heights** (`runtime/fields.runtime.test.tsx`): an `Input`,
    `NumberField`, `Select` trigger and `OTPField` cell each paint a 36-high
    box; the OTP cell is 36 wide. Measured before: 32.
11. **The select list is not an input**: an option row still paints
    `density.controlHeight.sm` (28) inside the list, so the slice did not leak
    into rows without a recipe.
12. **The ring** (`focus-ring.runtime.test.tsx`): `Select`, `NumberField` and
    `OTPField` join `Button`/`Input`/`TextArea` on `RECIPE_RING` — exactly one
    ring, 3 px spread, `alpha(ring, .5)`, inside the control. The other
    controls keep `focusRing(theme)`.
13. **The Select ring** (`fields.runtime.test.tsx`): the five existing
    trigger-ring assertions now expect the recipe ring; the ring still clears
    when focus leaves and still paints while the list is open.
14. **Density** (`theme-axes.runtime.test.tsx`): at `compact` and `spacious`,
    `Toggle` moves with `density.controlHeight.md` while `Input` and
    `NumberField` stay at 36 — the remaining density proof is explicit and the
    exception is real.

### 5.4 Two-direction proof

- Revert `selectTriggerStyle` to `controlStyle` (and `NumberField`/`otpCellStyle`
  with it) and run 5.1 + 5.2: the cases fail with **32/10/13** instead of
  36/12/14 (recorded, with the failing case names).
- Remove the square override: the OTP cell is 36 high × 100 % wide, and 5.2's
  square case fails by name.
- Remove `width: undefined` from the trigger: the trigger reports `"100%"`, and
  the hugging case fails by name.
- Restore; run the offline suite, the runtime suite, then the three gates.

## 6. STOP conditions

1. `INPUT_BASE` cannot be compiled on `PrimitiveTheme` for a non-`<input>` host
   (a type or role mismatch) — stop and report the exact class and error; do not
   patch the recipe.
2. The select trigger cannot keep hugging without losing the recipe's geometry
   (e.g. the runtime ignores an undefined `width` and paints full width) —
   report the measured box instead of inventing a second recipe.
3. The OTP cell cannot be square through width/minWidth because the native
   input's content box overrides it — report the measured bounds; do not switch
   the cell to a div.
4. A recipe class the slice needs is returned as `unsupported` — record it and
   stop; that is a `packages/tw` gap.
5. A gate fails for an unrelated reason — report it with the failing output.

## 7. Outcome

Implemented.

- `core/recipes.ts` now owns the field row layout, the square field and the OTP
  cell. `Select`'s trigger, `NumberField` and `OTPField`'s cells resolve the same
  `INPUT_BASE` recipe as `Input`/`TextArea`: **36 high, radius 6, 14/20 type**,
  with the recipe's focus/invalid/disabled buckets. Measured before: 32 high,
  radius 6, 13/18.
- The select trigger hugs by default (`width: undefined`) and its root keeps
  `fullWidth`; the list rows remain density-driven (28) because `select.tsx`'s
  item string is not in `@gpuixui/tw` — recorded as a cross-team row.
- OTP cells are square 36 × 36 with zero horizontal padding and a centred
  digit. `NumberField` keeps `paddingRight: 0` for its stepper column.
- `fieldTextStyle` and the OTP cell's `controlStyle` copy are gone; the field
  family has one chrome resolver.
- The toggle and selection families are recorded, not faked: their recipes do
  not exist in `@gpuixui/tw`, and copying class strings into primitives would
  break the one-owner rule plan `370` established.
- Tests: the recipe cases, a new field-family table, element cases per control,
  the focus-ring matrix, a measured height case and the moved density proof.
  Both directions proven (§5.4).
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D42 and the plan index record the
  slice.

Measured: offline **45 files / 653 tests**, runtime **32 files / 608 tests**;
`nub run check`, `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] `Select`'s trigger, `NumberField` and `OTPField`'s cells paint 36/12/4/6/14/20.
- [x] Every field surface's focus/invalid/disabled state comes from the recipe buckets.
- [x] OTP cells are square and centred; `NumberField` keeps its stepper edge.
- [x] The select still hugs unless `fullWidth`, and its rows keep their own metrics.
- [x] `fieldTextStyle` and the duplicated OTP chrome are deleted.
- [x] The new cases fail against the pre-slice 32/10/13 chrome (both directions recorded).
- [x] Docs, inventory, `TODO.md`, `PLAN.md` and the index record the slice; the remaining families are a cross-team row.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
