# 781 — An invalid field loses its error border under the pointer

**Phase** F · **Block** `730+` primitives defects · **Owner** primitives ·
**Depends on** `030`, `041`, `047`, `079`, `091`, `351`, `356`, `370`, `372` ·
**Status** done — 1 resolver + 10 runtime cases, both directions measured (§5)

## 0. The defect, in one sentence

The field family paints the destructive boundary for a failed validation at rest,
but its declared `hover`/`active` rules still recolour that boundary to the
**healthy** interaction roles, so the only error cue disappears for the whole
gesture — the exact class plan `091` fixed and plan `356` guarded for selection
controls, reintroduced when plan `372` moved the fields onto the recipe.

## 1. Measured evidence (2026-10-20, offline resolver)

`fieldRecipeStyle({ focused: false, invalid: true, disabled: false }, testTheme)`
returns (probe printed the object; the same probe is the test in §4):

```
invalid border      #00000F   ← testTheme.colors.destructive
invalid hover       #000014   ← testTheme.colors.borderStrong  (a VALID field's hover)
invalid active      #000018   ← testTheme.colors.ring          (a VALID field's press)
valid   hover       #000014
valid   active      #000018
```

Rest is right; hover and press are byte-identical to the valid field. The field
family is five surfaces and every one of them resolves this object:

| Surface | Resolver call |
| ------- | ------------- |
| `Input` | `fieldChrome` → `fieldRecipeStyle` |
| `TextArea` | `fieldChrome` (via `Input.js`) |
| `Select` trigger | `selectTriggerStyle` → `fieldRecipeStyle` |
| `NumberField` | `renderNumberField` → `fieldRecipeStyle` |
| `OTPField` cells | `otpCellStyle` → `squareFieldRecipeStyle` → `fieldRecipeStyle` |

Why the existing guards miss it:

- `runtime/invalid.runtime.test.tsx`'s matrix scans **top-level** colours, and
  the rest border is correct;
- its nested case (plan `356`) covers `Checkbox` and `Switch` only;
- `src/core/recipes.test.ts` asserts the invalid **rest** border and the focus
  case, never the nested interaction rules.

The rule itself is already written down twice: `docs/input.mdx` says the error
survives the caret, and `core/selection.ts`'s `interactionBorder` comment says it
"mirrors `controlStyle`'s rule for fields (plan 091)". The recipe path no longer
calls `controlStyle`, so the comment is now false.

## 2. Files to change (exact)

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | add exported `interactionBorder(theme, invalid, fallback)` — the one rule: a failed boundary keeps `theme.colors.destructive`, a valid one takes `fallback` |
| `packages/primitives/src/core/selection.ts` | delete the local `interactionBorder`; the two call sites call the core helper with `spec.invalid === true && !filled(spec)` (the "unfilled" half stays selection-specific) |
| `packages/primitives/src/core/recipes.ts` | `fieldPaint` takes `invalid` and builds `hover`/`active` through the helper; `fieldRecipeStyle` passes its state through |
| `packages/primitives/src/core/recipes.test.ts` | 2 cases: the invalid field keeps the destructive boundary through both interaction states; a valid field keeps `borderStrong`/`ring` (the negative, so the fix cannot flatten the feedback) |
| `packages/primitives/runtime/invalid.runtime.test.tsx` | extend the nested case: the five field surfaces keep the destructive boundary through `hover` and `active`, and a valid `Input` still takes the healthy pair |
| `packages/primitives/docs/input.mdx` | the `invalid` row states the interaction rule (the field family shares it) |
| `COMPONENTS.md` | one `**Invalid boundary (781):**` clause on the text-inputs row |
| `TODO.md` | one ticked row under the primitives workstream |
| `.agents/slop/plans/README.md` | index row for this plan |

No component signature changes, no new files outside the two test files' cases.

## 3. Implementation steps

1. **Core rule** — in `core/style.ts`, beside `controlStyle`:

   ```ts
   /**
    * The border an interacting surface paints.
    *
    * Interaction feedback is a border change, so a healthy hover/press rule
    * would paint over a failed validation. A failed boundary keeps the
    * destructive role through the gesture (plans 091, 356, 781).
    */
   export const interactionBorder = (
     theme: PrimitiveTheme,
     invalid: boolean,
     fallback: string,
   ): string => (invalid ? theme.colors.destructive : fallback);
   ```

   Export it from `core/index.ts` next to `controlStyle` (the package exports
   every public core helper; `TODO.md`'s TSDoc guard requires a summary).
2. **Selection uses it** — in `core/selection.ts` delete the private helper and
   replace `interactionBorder(spec, theme, x)` with
   `interactionBorder(theme, spec.invalid === true && !filled(spec), x)`.
   Import the helper from `./style.js` (no cycle: `style.ts` does not import
   `selection.ts`).
3. **The field paint** — in `core/recipes.ts`:

   ```ts
   const fieldPaint = (
     theme: PrimitiveTheme,
     disabled: boolean,
     invalid: boolean,
   ): StyleDesc => ({
     // …unchanged fields…
     hover: { borderColor: interactionBorder(theme, invalid, theme.colors.borderStrong) },
     active: { borderColor: interactionBorder(theme, invalid, theme.colors.ring) },
   });
   ```

   and `const base = mergeTwStyle(recipe.style, fieldPaint(theme, disabled, invalid));`
   in `fieldRecipeStyle`. `inert()` still clears both rules for a disabled field,
   so disabled behaviour is untouched.
4. **Tests** — the two offline cases and the runtime extension in §4.
5. **Docs/ledger** — the `docs/input.mdx` row, the `COMPONENTS.md` clause, the
   `TODO.md` row, this plan's index row.

## 4. Test plan (both directions)

**Offline** (`src/core/recipes.test.ts`, new `it`):

```ts
it("keeps the destructive boundary through hover and press", () => {
  const invalid = fieldRecipeStyle({ focused: false, invalid: true, disabled: false }, testTheme);
  expect(invalid.hover?.borderColor).toBe(testTheme.colors.destructive);
  expect(invalid.active?.borderColor).toBe(testTheme.colors.destructive);
  const valid = fieldRecipeStyle(resting, testTheme);
  expect(valid.hover?.borderColor).toBe(testTheme.colors.borderStrong);
  expect(valid.active?.borderColor).toBe(testTheme.colors.ring);
});
```

**Runtime** (`runtime/invalid.runtime.test.tsx`, same file, after the plan-356
case): for each of

| Case | Locator |
| ---- | ------- |
| `<Input testId="input" label="Name" invalid />` | `input` |
| `<TextArea testId="textarea" label="Notes" invalid />` | `textarea` |
| `<NumberField testId="number" label="Count" invalid />` | `number` |
| `<Select testId="select" label="Pick" options={[{ value: "a", label: "A" }]} invalid />` | `select-trigger` |
| `<OTPField testId="otp" label="Code" invalid />` | `otp-cell-1` |

assert `interactionOf(node, locator, "hover")` and `"active"` both
`toMatchObject({ borderColor: testTheme.colors.destructive })`; add
`interactionOf(<Input testId="ok" label="Name" />, "ok", "hover")` =
`borderStrong` and `"active"` = `ring` as the negative.

Both directions:

- **Old direction:** with the `fieldPaint` change reverted, the two offline
  assertions fail (`#000014`/`#000018`) and all ten invalid runtime cases fail by
  locator; the valid pair passes either way.
- **New direction:** all green.
- **Regression:** the plan-356 `Checkbox`/`Switch` interaction case must stay
  green after the helper move, and the selection suites must be unchanged.

## 5. Commands and expected results

```sh
# old direction (before the fix, with the new tests in place)
nub run --filter @gpuixui/primitives test src/core/recipes.test.ts
# 1 failed (the new case), the existing cases green

nub run --filter @gpuixui/primitives test:runtime runtime/invalid.runtime.test.tsx
# the matrix green, the new field cases 10 failed

# new direction
nub run --filter @gpuixui/primitives test
# 71 files, 995 tests, 0 failed

nub run --filter @gpuixui/primitives test:runtime runtime/invalid.runtime.test.tsx
# 1 file, 25 tests, 0 failed (15 existing + 10 new)

nub run --filter @gpuixui/primitives test:runtime runtime/pointer-feedback.runtime.test.tsx
# 1 file, 31 tests, 0 failed (the selection feedback rule is unchanged)

nub run --filter @gpuixui/primitives check-types
```

Measured results (2026-10-20): old direction offline `1 failed | 15 passed`
(`#000014` vs `#00000F`) and runtime `10 failed | 15 passed` (all ten field
cases, the valid negative green); new direction offline `71 files / 995 tests`,
`invalid` runtime `25/25`, `pointer-feedback` `31/31`, `check-types` green,
`nub run lint` and `nub run check:tests` green. Repo `nub run fmt` still reports
the other workstream's `apps/docs/src/components/docs/demos.tsx` (the recorded
cross-team row); this change's files are formatted.

## 6. STOP conditions

Stop and report instead of improvising if:

- `core/style.ts` importing a selection helper would create a cycle (it must not:
  the helper only reads `PrimitiveTheme`), or `core/index.ts` already exports a
  symbol with this name;
- the runtime locator for a surface does not exist (do not invent one: use the
  surface's documented `testId` and record the missing locator instead);
- a valid field's interaction colours change (the fix is only allowed to keep the
  error boundary, never to flatten normal feedback);
- `runtime/invalid.runtime.test.tsx` fails for a reason other than the new cases.

## 7. Acceptance criteria

- An invalid `Input`, `TextArea`, `Select` trigger, `NumberField` and `OTPField`
  declares the destructive border in its `hover` and `active` blocks, proven in
  the real renderer.
- A valid field still declares `borderStrong` (hover) and `ring` (press).
- The selection controls' rule is unchanged and `interactionBorder` has one
  owner.
- The docs, inventory and `TODO.md` record the rule; `nub run check` and
  `nub run lint` are green.
