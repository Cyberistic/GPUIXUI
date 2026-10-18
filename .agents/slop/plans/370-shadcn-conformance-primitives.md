# 370 — The first shadcn conformance slice in `packages/primitives`

| Field | Value |
| ----- | ----- |
| Phase | F (design-system conformance) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `079`, `084`, `097`, `099`, `352`, `524` |
| Status | done |

Self-contained: §0 the measured values, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. What was measured before the plan (2026-10-18)

`@gpuixui/tw` (plan `524`) compiles the verbatim new-york-v4 class strings to a
`StyleDesc`. Its own tests pin:

| Recipe | Geometry and type |
| ------ | ----------------- |
| `INPUT_BASE` + `INPUT_FOCUS` + `INPUT_INVALID` | `h-9 px-3 py-1` → **36 high, 12 horizontal, 4 vertical**, `rounded-md` → **6**, `text-sm` → **14/20**, border width 1, `w-full min-w-0` |
| `BUTTON_BASE` + `BUTTON_SIZES.default` | `h-9 px-4 py-2` → **36 / 16 / 8**, gap 8, radius 6, 14/20 |
| `BUTTON_SIZES.sm` | `h-8 px-3` → **32 / 12** |
| `BUTTON_SIZES.lg` | `h-10 px-6` → **40 / 24** |
| `BUTTON_SIZES.icon` | `size-9` → **36 × 36** |

The primitives' fields and buttons currently resolve from the **density
presets** (`comfortable`: `md` = 32 high, 10 horizontal; `label` type 13/18).
So the native Input is 4 px shorter than shadcn's, its horizontal padding 2 px
smaller, and a button label is one size smaller. The tw package records the
divergences it must bridge:

- `bg-transparent` on the field: our tokens define `input` as the field **fill**
  (and `border-input` is mapped to our `border` role by the compiler);
- `text-white` on the destructive button: a literal, while the theme has
  `destructiveForeground`;
- `ghost`/`link` have no resting text colour (CSS inheritance), which a native
  element cannot inherit;
- the runtime has no `focusVisible`/`data-*` style properties, so the compiler
  returns `focus`, `invalid` and `disabled` as separate buckets.

## 1. The decision

**Input, TextArea and Button consume the shadcn recipes; the tokens remain the
single source of colour.**

- A new `core/recipes.ts` calls `classesToStyle` on the verbatim constants and
  returns the resolved chrome. No class string is copied into primitives.
- **Geometry, type, radius, gap and layout** come from the recipe, exactly:
  36/12/4/6/14/20 for a field; 36/16/8, 32/12, 40/24 and `size-9` for a button.
- **Paint** is layered from the theme where the recipe assumes the browser:
  - the field keeps `colors.input` / `inputForeground` (not `transparent`) and
    its hover/active boundary (`borderStrong` / `ring`), because the tokens'
    field role is a fill and the pointer-feedback matrix requires the feedback;
  - a button takes its `color` from the variant table (this replaces the
    destructive variant's literal white with `destructiveForeground`), its
    `borderColor` where the variant is bordered, its `active` state (the recipe
    has none) and the native `pointer`/`not-allowed` cursor (the runtime has no
    default button cursor). Hover, background and the variant's structural
    borders stay the recipe's;
  - `focus`, `invalid` and `disabled` are the recipe's buckets, applied by the
    component's own state (0.10.0 has no `focusVisible`): focus is shadcn's
    `border-ring` + 3 px 50 % ring; invalid is `border-destructive` + 3 px 20 %
    ring and wins over focus so a failed field keeps its error cue; disabled is
    `opacity 0.5` + `pointer-events: none` + `cursor: not-allowed`.
- **TextArea keeps its rows for height.** `h-9` is a single-line input height;
  applying it to a textarea would clip the second line. TextArea takes the
  recipe's padding, radius, type and paint, drops `height`, and keeps
  `minRows`/`maxRows` driving the box. This is the one deliberate deviation.
- **The density presets are untouched.** The three wired components stop
  following density (the recipe is fixed); every other control keeps following
  it until its own slice lands. The theme-wide density proof moves to a
  control that still follows it.
- `size` and `fullWidth` stay in `FieldProps` for API stability. The recipe has
  one field size and is always `w-full`; the docs say so instead of pretending
  the props still move the field.

Alternatives rejected:

- **Copy the numbers into `controlStyle`** would duplicate the upstream recipe
  and lose the provenance guard `packages/tw` already has.
- **Use the recipe's `bg-transparent`** would remove the field fill the tokens
  define, and the both-theme matrix rejects a non-palette `transparent` paint.
- **Use `text-white` on destructive** breaks the single-source-of-colour rule
  and the theme matrix.
- **Let density scale the recipe** would mean the numbers are not shadcn's, and
  the instruction is explicit that the presets do not change.

## 2. The rule

```ts
// core/recipes.ts — the only place primitives read the recipes
const FIELD = [INPUT_BASE, INPUT_FOCUS, INPUT_INVALID].join(" ");

export const fieldRecipeStyle = (theme, { focused, invalid, disabled }) => {
  const recipe = classesToStyle(FIELD, theme);
  const paint = {
    backgroundColor: theme.colors.input,
    color: theme.colors.inputForeground,
    cursor: "text",
    userSelect: "text",
    hover: { borderColor: theme.colors.borderStrong },
    active: { borderColor: theme.colors.ring },
  };
  const base = mergeTwStyle(recipe.style, paint);
  return mergeTwStyle(
    mergeTwStyle(
      mergeTwStyle(base, focused && !disabled ? recipe.focus : {}),
      invalid ? recipe.invalid : {},
    ),
    disabled ? recipe.disabled : {},
  );
};

export const buttonRecipeStyle = (theme, spec) => {
  const recipe = classesToStyle(
    [
      BUTTON_BASE,
      TW_BUTTON_SIZES[sizeKey(spec)],
      TW_BUTTON_VARIANTS[variantKey(spec.variant)],
    ].join(" "),
    theme,
  );
  const paint = {
    color: spec.variant.foreground(theme),          // not `text-white`
    borderColor: spec.variant.border?.(theme),
    active: spec.variant.active(theme),             // the recipe has no active
    cursor: spec.disabled ? "not-allowed" : "pointer",
  };
  const base = mergeTwStyle(recipe.style, paint);
  const radius = spec.radius === undefined ? base : { ...base, borderRadius: theme.radius[spec.radius] };
  const width = spec.fullWidth === true ? { ...radius, width: "100%" } : radius;
  return spec.disabled ? mergeTwStyle(width, recipe.disabled)
    : spec.focused ? mergeTwStyle(width, recipe.focus)
    : width;
};
```

`Input`/`TextArea`'s `fieldChrome` and `Button`'s renderer call these instead of
`controlStyle`; `Button`'s clipped-group overlay draws the recipe's ring
(`spreadRadius` 3, `alpha(ring, 0.5)`) rather than the token 2 px ring, so a
focused button looks the same inside and outside an attached group.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/package.json` | `@gpuixui/tw` is a dependency |
| `packages/primitives/src/core/recipes.ts` | new: the field and button recipe resolvers + the focus ring for the clipped overlay |
| `packages/primitives/src/core/index.ts` | export them |
| `packages/primitives/src/core/recipes.test.ts` | new: the exact numbers and equality with the compiler |
| `packages/primitives/src/components/Input.tsx` | `fieldChrome` resolves the recipe |
| `packages/primitives/src/components/TextArea.tsx` | recipe chrome, `height` dropped for rows |
| `packages/primitives/src/components/Button.tsx` | recipe chrome; the clipped ring uses the recipe ring |
| `packages/primitives/src/core/style.ts` | `clippedFocusRingStyle` takes the ring it draws |
| `packages/primitives/runtime/focus-ring.runtime.test.tsx` | Button/Input/TextArea expect the recipe's 3 px ring |
| `packages/primitives/runtime/disabled.runtime.test.tsx` | a "ring" is a zero-offset zero-blur spread, not any shadow (the recipe adds `shadow-xs`) |
| `packages/primitives/runtime/theme-axes.runtime.test.tsx` | the density proof moves to `NumberField`; Button/Input are pinned to the recipe at both densities |
| `packages/primitives/runtime/layout.runtime.test.tsx` | the density test uses `Toggle` |
| `packages/primitives/runtime/controls.runtime.test.tsx` | IconButton's `lg` box is the recipe's 40 |
| `packages/primitives/src/components/{Button,fields}.test.tsx` | the new metrics, buckets and radius |
| `packages/primitives/docs/{input,textarea,button}.mdx` | the recipe values, the `size`/`fullWidth` note, the TextArea height deviation |
| `docs/design-system.md`, `docs/tokens.md` | **not edited**: they are the tokens workstream's paths, so the density exception is recorded as a `TODO.md` cross-team row instead |
| `COMPONENTS.md` | the three rows, the density row and the runtime count |
| `TODO.md` | the task and the follow-up row for the remaining controls |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub install` | links `@gpuixui/tw` into `packages/primitives` |
| `nub run --filter @gpuixui/tw test` | 15 tests pass (the compiler is unchanged) |
| `nub run --filter @gpuixui/primitives test -- src/core/recipes.test.ts` | the exact 36/12/4/6/14/20 and 36/32/40/icon values pass |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass |
| `nub run --filter @gpuixui/primitives test:runtime -- --only <scenario>` | the changed runtime case passes (the full suite is not required for this slice) |
| `nub run check`, `nub run lint`, `nub run test` | exit 0 |

## 5. Test plan

### 5.1 Offline (`src/core/recipes.test.ts`)

1. **Input consumes the recipe** — `fieldRecipeStyle` (resting) equals the
   compiler's values for `height`, `paddingLeft/Right/Top/Bottom`,
   `borderRadius`, `fontSize`, `lineHeight`, `borderWidth`, `width`, `minWidth`
   (compare each with `classesToStyle(INPUT_BASE + INPUT_FOCUS + INPUT_INVALID)`
   and with the literal numbers 36/12/4/6/14/20). Before: the field chrome was
   the density 32/10 and the label type 13.
2. **The buckets reach the field** — focused: `borderColor` ring and a 3 px
   50 % ring; invalid: destructive border and a 3 px 20 % ring, and invalid
   wins over focus; disabled: `opacity 0.5`, `pointerEvents: none`, cursor
   `not-allowed`.
3. **Button consumes base + size + variant** — for `primary`/`md`, `sm`, `lg`
   and `square`, the chrome's height/padding/radius/gap/font equal the
   compiler's for the matching constants, and the literal 36/16/8, 32/12,
   40/24 and 36×36. `destructive`'s colour is `destructiveForeground`, not
   `#FFFFFF`. `outline` keeps a 1 px themed border.
4. **The caller's style still wins last** — the existing style-order guard
   covers it; one case here proves a caller `height` overrides the recipe.

### 5.2 Runtime

5. **The painted heights** — a Button is 36 high at `md`, 32 at `sm`, 40 at
   `lg` and square at `icon`; the Input's painted box follows the recipe (the
   native content box is the declared height minus its two borders, measured).
6. **Focus ring** — Button/Input/TextArea paint the recipe's ring: zero offset,
   zero blur, 3 px spread, `alpha(ring, 0.5)`, one ring inside the control. The
   other controls keep `focusRing(theme)`.
7. **Disabled** — Button/Input/TextArea paint no ring once disabled even if
   they still hold focus; their base `shadow-xs` is not counted as a ring.
8. **Density** — at `compact` and `spacious`, a `NumberField` moves and
   Button/Input stay at the recipe's numbers; colours are unchanged.

### 5.3 Two-direction proof

- Revert `fieldChrome`/`Button` to `controlStyle` and run 5.1: the recipe tests
  fail with 32/10/13 instead of 36/12/14 (recorded).
- Remove the focus bucket from `fieldRecipeStyle`: the focus-ring case fails.
- Restore; green suites, then the gates.

## 6. STOP conditions

1. The compiler cannot resolve a recipe on our `PrimitiveTheme` (type or role
   mismatch) — stop and report the exact class and error; do not patch the
   recipe.
2. A recipe class is returned as `unsupported` that the slice needs (e.g.
   `ring-[3px]`) — record it and stop: that is a `packages/tw` gap, not a
   primitives workaround.
3. The field cannot keep its fill without breaking the recipe's geometry —
   report the measured conflict instead of dropping the token role silently.
4. A gate fails for an unrelated reason — report it.

## 7. Outcome

Implemented.

- `@gpuixui/tw` is a dependency of `@gpuixui/primitives`; `src/core/recipes.ts`
  resolves the field and button recipes and exports the recipe's focus ring.
- Input/TextArea resolve 36/12/4/6/14/20 from `INPUT_BASE`; the field keeps
  `colors.input`/`inputForeground` and its hover/active boundary, and applies
  the recipe's focus/invalid/disabled buckets (invalid wins over focus).
- Button resolves base + size + variant: 36/16/8, 32/12, 40/24 and 36×36; the
  destructive label is `destructiveForeground` (not the recipe's literal
  white), the theme's `active` and cursor are added, and the clipped-group
  overlay draws the recipe's 3 px ring.
- TextArea takes the recipe's padding/radius/type/paint and drops `height` so
  `minRows`/`maxRows` still own the box (the one deliberate deviation).
- The density presets are untouched. The three wired components no longer
  follow density; the density proof moves to `NumberField`/`Toggle`.
- Tests, docs, inventory, `TODO.md` and the index are updated; the recipe test
  fails against the old `controlStyle` chrome with 32/10/13.
- One recorded compiler gap: `aria-invalid:ring-destructive/20` is a
  colour-only ring in the `invalid` bucket, while `focus-visible:ring-[3px]`
  carries the width in the `focus` bucket, so the invalid halo has no width and
  is dropped. Invalid still wins the border; the soft halo needs a
  `packages/tw` change (recorded in `TODO.md` as a cross-team row).
- Measured: offline **44 files / 626 tests**, runtime **31 files / 610 tests**;
  `nub run check`, `nub run lint` and `nub run test` pass. The changed native
  cases were run by file (`runtime/controls`, `focus-ring`, `theme`,
  `theme-axes`, `layout`, `pointer-feedback`), not the full suite.

## 8. Acceptance

- [x] Input resolves the shadcn 36/12/4/6/14/20 values through `classesToStyle`.
- [x] Button resolves base + size + variant to 36/16/8, 32/12, 40/24 and 36×36.
- [x] focus/invalid/disabled come from the returned buckets.
- [x] The global density presets are unchanged, and the remaining controls keep
      following them.
- [x] The new test fails against the pre-slice chrome.
- [x] Docs, inventory, `TODO.md` and the index record the slice.
- [x] The gates pass.
