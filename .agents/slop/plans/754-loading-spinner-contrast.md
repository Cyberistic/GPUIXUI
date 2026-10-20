# 754 — A busy button's spinner is invisible on its own fill

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (Tier 1 truth + one rule) |
| Owner | primitives workstream |
| Depends on | `086` (IconButton tint), `328` (loading tone), `370` (button recipe), `644` (spinner fits a square button) |
| Feeds | `core/loading.ts`, `Spinner`, `Button`/`IconButton`, `docs/spinner.mdx`, `docs/button.mdx`, `docs/icon-button.mdx`, `COMPONENTS.md` |

## 1. Goal and the defect being guarded

`Button` paints a `Spinner` while `loading` is true (`Button.tsx`, the `loading`
branch). The spinner resolves its **lit** dot from `accent` (default
`"primary"`) and its fading trail from `mutedForeground` (`core/loading.ts`
`spinnerDotStyle`). A `primary` button's fill is also `colors.primary`, and a
`destructive` button's fill is `colors.destructive`.

Measured from the shipped source (no runtime needed):

| Surface | Button fill | Active spinner dot | Result |
| --- | --- | --- | --- |
| `variant="primary"` (default) | `colors.primary` | `colors.primary` | the dot is the fill: **1:1, invisible** |
| `variant="destructive"` | `colors.destructive` | `colors.primary` | visible, but the trail is `mutedForeground`, unrelated to the fill |
| `IconButton` (default primary) | `colors.primary` | `colors.primary` | same invisibility in a 36 px square |

The animation therefore reads as **a hole moving across the button** rather than
a lit dot, and the busy state — the only feedback that an action is running — is
weakest on the most common variant. `docs/icon-button.mdx` already promises that
the icon is tinted with the variant's **foreground** "so it cannot disappear on
a filled button"; the spinner that replaces that icon does not follow the same
rule.

## 2. Measured evidence (this worktree, 2026-10-20)

The offline element tree was inspected in `src/components/Button.test.tsx`'s
shape: a loading `renderButton` has a `Spinner` as its first child, and that
`Spinner` has no `color` and no `accent` prop. The default `accent` is
`"primary"`. `buttonRecipeStyle` paints the fill from the `bg-*` recipe class
(`colors.primary` for the default variant), and `IconButton` already tints its
icon with `buttonVariants[variant].foreground(theme)`.

A runtime case was added in §6 to pin the painted dot colours against the
button's own painted fill.

## 3. The rule

`Spinner` gains one optional prop:

```ts
readonly color?: string;
```

- Absent: the shipped behaviour is unchanged — the lit dot uses `accent`, the
  trail uses `mutedForeground`.
- Present: **every** dot uses `color`; the existing per-dot opacity supplies the
  trail. This is the correct shape on a filled surface: the whole indicator is
  the surface's foreground, fading behind the lit dot.
- `Button` always passes the variant's foreground
  (`buttonVariants[variant].foreground(theme)`), the exact role it already
  paints its label and `IconButton`'s icon in. `IconButton` inherits the fix
  because it composes `Button`.
- The default `Spinner` stays standalone-safe (no consumer change).

`color` is a resolved colour string, like `Icon.color`; it is not a second
`accent` vocabulary. `accent` remains the role-based default for a spinner on a
neutral surface.

## 4. Files (exact)

| File | Change |
| --- | --- |
| `packages/primitives/src/core/loading.ts` | `SpinnerSpec` gains `readonly color?: string`; `spinnerDotStyle` paints both the active and inactive dot with `spec.color` when it is present, otherwise keeps the accent/muted rule; JSDoc states the filled-surface case |
| `packages/primitives/src/components/Spinner.tsx` | `SpinnerProps` gains `readonly color?: string`; `renderSpinner` passes it into `spinnerDotStyle`; the TSDoc says use the surrounding surface's foreground |
| `packages/primitives/src/components/Button.tsx` | import `buttonVariants`; render `<Spinner … color={buttonVariants[variant].foreground(theme)} />` |
| `packages/primitives/src/core/loading.test.ts` | add the case in §6 (every dot takes `color`; the active dot differs from the default accent) |
| `packages/primitives/src/components/Button.test.tsx` | add the case in §6 (the `Spinner` child carries the variant foreground for `primary`, `destructive` and `outline`) |
| `packages/primitives/runtime/loading.runtime.test.tsx` | add the case in §6 (a loading `Button`'s painted fill is `colors.primary`, and every painted dot is `colors.primaryForeground`) |
| `packages/primitives/docs/spinner.mdx` | API row for `color`; Theming sentence; Verification names the new case |
| `packages/primitives/docs/button.mdx` | the `loading` row / busy paragraph states that the spinner takes the variant's foreground |
| `packages/primitives/docs/icon-button.mdx` | the busy paragraph states the spinner inherits the same foreground tint as the icon |
| `COMPONENTS.md` | the Buttons row and the Loading indicators row record the busy-spinner colour rule |
| `TODO.md` | add a ticked row for this plan under the primitives section |
| `.agents/slop/plans/README.md` | add the plan `754` row |

No other component needs a change: `IconButton` composes `Button`, and the
standalone `Spinner`/`Skeleton`/`Progress` surfaces keep their existing paint.

## 5. Commands and expected results

Run from the repository root unless a package filter is given:

| Command | Expected |
| --- | --- |
| `nub run --filter @gpuixui/primitives test src/core/loading.test.ts` | the file passes; the new colour case fails **before** the fix on `backgroundColor` (`primary` instead of `primaryForeground`) |
| `nub run --filter @gpuixui/primitives test src/components/Button.test.tsx` | the file passes; the new prop case fails **before** the fix (`color` is `undefined`) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/loading.runtime.test.tsx` | 1 file, exit `0`; the new case fails **before** the fix because the lit dot equals the button fill |
| `nub run --filter @gpuixui/primitives test` | all offline files green (the current count plus the two new cases) |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run lint` | exit `0` |

Do not run the full live suite: this is one pure rule, one component prop and one
runtime file, so the scoped runtime file is the proof (workstream rule).

## 6. Test plan and failing directions

| Where | Case | Asserts |
| --- | --- | --- |
| core | a custom colour on a filled surface | `spinnerDotStyle({ size, accent: "primary", color: primaryForeground }, …)` paints **both** the active and inactive dots `primaryForeground`, and the active dot is not `primary` |
| core | the default is unchanged | the existing "tints the lit dot with the accent…" case still paints `primary` / `mutedForeground` |
| component | the Button passes the variant foreground | `renderButton({ loading: true, variant })`'s first child is a `Spinner` whose `color` is `buttonVariants[variant].foreground(testTheme)` for `primary`, `destructive` and `outline` |
| runtime | the painted busy button | the button's own `backgroundColor` is `colors.primary`; every dot inside its `Spinner` is `colors.primaryForeground`; no dot equals the fill |
| runtime | the standalone Spinner | the existing lit-dot case (accent `primary`, trail `mutedForeground`) still passes, so the default path did not change |

**Failing directions to measure and record in §8:**

1. Revert `Button` to `<Spinner … />` with no `color` → the component case
   reports `undefined`, and the runtime dots include `colors.primary` (the fill).
2. Make `spinnerDotStyle` apply `color` only to the active dot → the core case
   fails on the trail dot, and the runtime trail stays `mutedForeground`.
3. Keep the `color` rule but pass `buttonVariants[variant].background` instead of
   `.foreground` → the runtime dots equal the button fill and the case fails,
   proving the assertion is about contrast, not merely a prop value.

## 7. STOP conditions

- Stop if the runtime button's painted background is not `colors.primary` for
  the default variant: re-read `buttonRecipeStyle`'s recipe/variant merge and
  record the actual role before changing the fixture.
- Stop if the `Spinner` default (no `color`) changes its painted colours: the
  new rule must be opt-in; a change to the standalone indicator is a different
  plan.
- Stop if any existing `loading`, `theme-matrix` or `IconButton` assertion
  changes; this fix must be additive.
- Do not add a second indicator or a button-local spinner copy. The one
  `Spinner` gains the seam.

## 8. Outcome

_Landed 2026-10-20._

- The element tree showed `Button`'s spinner with no `color` at all
  (`undefined`), so the default `accent: "primary"` painted the lit dot with
  `colors.primary`. The core case failed against the shipped rule
  (`expected false to be true` on "every dot takes the colour"), and the Button
  case failed with `expected undefined to be '#000008'`.
- The native case failed exactly as the defect describes: the button's painted
  fill was `#000007` (`colors.primary`) and the first dot was also `#000007`
  where the variant foreground is `#000008` (`colors.primaryForeground`).
- After the fix: `SpinnerSpec.color` paints every dot, `Spinner` exposes the
  prop, and `Button` passes `buttonVariants[variant].foreground(theme)`. The
  scoped runtime file `runtime/button-loading.runtime.test.tsx` is 1/1, the
  existing loading runtime file is 9/9, and the offline suite is **71 files /
  986 tests** green. `check-types` and `lint` pass.
- The default spinner (no `color`) still paints `colors.primary` on the lit dot
  and `colors.mutedForeground` on the trail; the existing loading assertions
  were not changed. `IconButton` inherits the fix through `Button`.
- The new runtime case lives in its own file rather than beside the loading
  suite's spinner case, so this plan touches no shared runtime file. That also
  keeps the proof narrow: one button, one fill, three dots.
