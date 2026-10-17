# 070 — `Rating` cannot show a failed validation

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `054`, `061` |
| Status | **done** |

Self-contained: §1 measurement, §2 the rule, §3 files, §4 tests, §5 STOP list,
§6 outcome.

---

## 1. The gap, measured

Every value-bearing control in this package paints a failed validation:

| Control | `invalid` |
| ------- | --------- |
| `Input`, `TextArea`, `NumberField`, `OTPField`, `Select` | border → `destructive` |
| `Checkbox`, `Switch`, `RadioGroup` (plan `061`), `CheckboxGroup` | empty mark → `destructive`, a chosen one keeps its accent |
| `Slider`, `RangeSlider` | invalid rail/track |
| `Rating` | **absent** |

`RatingProps` has no `invalid`, and `ratingStarColor(filled, theme)` has no
invalid branch, so an app that validates "you must rate this" has no way to
paint the failure. The example (`examples/rating.example.tsx`) is a review form,
which is exactly where a required rating lives.

## 2. The rule

- An **empty** star's tint becomes `theme.colors.destructive` when `invalid`.
- A **filled** star keeps `theme.colors.primary` — the same rule as
  `RadioGroup` (plan `061`): the error marks what is missing, not what is chosen.
- `invalid` is paint only. The runtime has no `aria-invalid`, so the accessible
  state is unchanged (the same limitation as every other control).
- Disabled/read-only still win for behaviour; invalid is orthogonal, exactly as
  on `RadioGroup`.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | `ratingStarColor(filled, theme, invalid = false)` |
| `packages/primitives/src/components/Rating.tsx` | `RatingProps.invalid`; pass it to `ratingStarColor` |
| `packages/primitives/src/components/Rating.test.tsx` | the icon child's colour for empty/filled stars when invalid, plus the valid control |
| `packages/primitives/runtime/rating.runtime.test.tsx` | the `<svg>`'s painted `style.color` in both states |
| `packages/primitives/docs/rating.mdx` | API row, Theming, Limitations, Verification |
| `COMPONENTS.md` | `Rating` row |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Test plan and commands

Offline:

1. The element tree with `invalid` and `defaultValue={2}`: the first two icons'
   `color` prop is `primary`, the remaining three `destructive`.
2. The control: the third star's icon is `mutedForeground` without `invalid`.

Runtime:

3. Mount an invalid rating with `defaultValue={2}`; the first icon's authored
   `style.color` is `primary`, the third is `destructive`. Without the prop the
   third is `mutedForeground` (the current behaviour), which is the failing
   direction.

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
```

Expected: offline **338** (337 + 1); runtime **164** (163 + 1).

**Two-direction proof:** remove the `invalid` argument from `ratingStarColor`,
run the new offline and runtime tests, record the exact failure, restore.

## 5. STOP conditions

- Stop if the runtime does not expose the `<svg>`'s authored colour in
  `TestElement.style` — then the only honest proof is a pixel capture; report
  the measured tree instead of weakening the test to a prop read.
- Stop if adding the prop changes the tab stop or activation contract; `invalid`
  is paint only.
- Stop if `nub run check` cannot stay green.

## 6. Outcome

Executed on this host, 2026-10-17.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 29 files, **338 tests green** |
| `nub run --filter @gpuixui/primitives test:runtime` | 15 files, **164 tests green** |
| empty star, invalid | `#00000F` (`destructive`) |
| filled star, invalid | `#000007` (`primary` — the chosen value is not the error) |
| empty star, valid | `#00000C` (`mutedForeground`, unchanged) |

**Two-direction proof:** removed the `invalid` argument → the element-tree
assertion failed (`expected ['#000007', '#000007', ...] to strictly equal [...]`)
and the runtime one failed with `expected '#00000C' to be '#00000F'`; restored,
both green.
