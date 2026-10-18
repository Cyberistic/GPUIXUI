# Plan 383: one total check for an edited theme

> **Status (2026-10-18).** Done. `themeFailures` and `ThemeFailure` ship in
> `src/theme-check.ts`; `theme-check.test.ts` is 28 cases (20 shipped sets plus
> 8 contract cases); the focused suite fails before the module exists and passes
> after. No role, theme, metric or pair changes. The documented type-size
> example was completed too (`bodyStrong` moves with `body`) because the new
> total check reported it.

## Why

The package's promise to a consumer who copies a platform style or builds a
brand theme is three checks:

- `themeColorFailures(theme)` — every role is a hex colour the helpers parse;
- `themeContrastFailures(theme, contrast = theme.contrast)` — every documented
  pair clears its floor;
- `themeMetricFailures(theme)` — every numeric invariant holds.

The reference page teaches them in three subsections, and each is total over its
own domain. The *guarantee* is not: a consumer who runs one or two of the three
gets an empty array and believes the theme is usable. That is not hypothetical —
`TODO.md` records the docs site as the first such consumer:

> Cross-team: `docs-site` calls `themeColorFailures(theme)` beside
> `themeContrastFailures` and `themeMetricFailures` on the Theming page …

A copied style whose only defect is a zero `borderWidth.strong` (no focus ring),
or a `shadow: "black"` tint (every elevation fully opaque) returns `[]` from the
contrast check, which is the check the docs introduce first and the one most
likely to be adopted alone. The extension mechanism therefore has a
three-call gate where it advertises one guarantee.

There is no aggregate today (`rg "themeFailures|checkTheme|validateTheme"`
returns nothing). The package's own shipped-set suites always call all three —
which is exactly why the gap is invisible from inside the package.

## Decision

1. **Ship one total function** in a new module
   `packages/tokens/src/theme-check.ts`:

   ```ts
   export type ThemeFailure =
     | (ColorFailure & { readonly kind: "color" })
     | (ContrastFailure & { readonly kind: "contrast" })
     | (MetricFailure & { readonly kind: "metric" });

   export function themeFailures(
     theme: Theme,
     contrast: ThemeContrast = theme.contrast,
   ): ReadonlyArray<ThemeFailure>;
   ```

   It composes the existing three checks in diagnostic order — **format, then
   contrast, then metrics** — and returns one flat, discriminated list. A
   malformed role is named before the `NaN` contrast ratios it causes, and a
   numerical breakage follows the colours it interacts with.

2. **Do not change the three checks.** `themeFailures` is a composition, not a
   reimplementation; the existing suites and the documented pair lists stay the
   source of truth. No duplicate rule may be written in the new module.

3. **The `contrast` argument passes through** with the same default as
   `themeContrastFailures`: the level the theme declares. A caller can ask a
   stricter question — `themeFailures(getTheme("light"), "high")` — and gets the
   contrast failures inside the same total result.

4. **Publish, document and execute it.**
   - `src/index.ts` exports the module.
   - `docs/tokens.md` gains `ThemeFailure` in the Types table and a
     **`#### One check`** subsection after Colour format; the intro to
     *Checking a theme* and the two "run beside" sentences point at it.
   - `docs/design-system.md` §11 (Extension) names the one-call gate.
   - `packages/tokens/README.md` *Checking a theme* names it beside the three.
   - `COMPONENTS.md` gets a **Total theme check** row.
   - `src/theme-check.example.ts` is the copyable snippet, imported by the test,
     so `examples.test.ts` keeps it running (plan 350).

5. **Record the consumer migration.** Update the `docs-site` cross-team row in
   `TODO.md` to call `themeFailures(theme)` on the Theming page instead of the
   three separately. The row keeps its owner (`docs-site`); this plan only
   changes the instruction it carries.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/theme-check.ts` | New: `ThemeFailure`, `themeFailures`, JSDoc with a runnable `@example`. |
| `packages/tokens/src/index.ts` | Export `./theme-check.js` between `theme.js` and `theme-choice.js`. |
| `packages/tokens/src/theme-check.test.ts` | New suite: every shipped set is empty; each failure class is reported; a partial check cannot pass a broken theme; the `contrast` argument reaches the contrast half. |
| `packages/tokens/src/theme-check.example.ts` | New executed example: a usable brand theme (empty) and an edited one (three classes). |
| `packages/tokens/src/theme-check.test.ts` | Imports the example and asserts both outcomes. |
| `docs/tokens.md` | Types table row for `ThemeFailure`; `#### One check` subsection; two cross-references. |
| `docs/design-system.md` | §11 Extension: one total check beside the three. |
| `packages/tokens/README.md` | *Checking a theme*: the total call and the `kind` table. |
| `COMPONENTS.md` | New Design system row `Total theme check`. |
| `TODO.md` | Tick the new tokens row; update the `docs-site` interlock row. |
| `.agents/slop/plans/README.md` | Index 383 and add it to the closing audit paragraph. |

No change to `color.ts`, `contrast.ts`, `metrics.ts`, `theme.ts`, any palette,
any role count, any pair, any floor, or any shipped theme value.

## Command sequence

Run from the worktree root, in order.

```sh
# 1. Red: the suite exists before the module does; the example imports
#    `themeFailures` from the entry, so it lands as a non-function.
#    Expected: "TypeError: themeFailures is not a function".
nub run --filter @gpuixui/tokens test src/theme-check.test.ts

# 2. Green: write the module and export it, then run the focused suite.
#    Expected: 28 cases pass (20 shipped sets plus 8 contract cases).
nub run --filter @gpuixui/tokens test src/theme-check.test.ts

# 3. The guards the new public surface touches.
#    Expected: public types, docs coverage, snippets and examples pass after the
#    docs edits; no count changes.
nub run --filter @gpuixui/tokens test src/public-types.test.ts src/docs.test.ts src/snippets.test.ts src/examples.test.ts

# 4. The whole tokens suite.
nub run --filter @gpuixui/tokens test

# 5. Types, lint and format.
nub run --filter @gpuixui/tokens check-types
nub run lint
nub run fmt

# 6. The repo gates.
nub run check
nub run test
```

Expected end state: all green. The only red step is step 1, which proves the
suite can fail.

## Test plan

`packages/tokens/src/theme-check.test.ts`. Header comment states the gap being
guarded: the extension path advertises one guarantee but ships three checks, and
a theme whose only defect is format or a metric returns `[]` from the contrast
check — the check the docs introduce first and the one a consumer is most likely
to run alone (the docs site among them).

Shipped sets are the same matrix the other suites use: four identity variants,
every real platform × mode × contrast, and every recipe × mode.

| Case | What it proves | How it fails without the fix |
| ---- | -------------- | ---------------------------- |
| every shipped set returns `[]` | the aggregate is the same guarantee the package holds itself to | importing the function fails (red step 1); any divergence from the three checks shows here |
| a theme broken in all three classes reports all three `kind`s in format → contrast → metric order | the union is complete and the diagnostic order is the documented one | no aggregate exists; the three calls are separate |
| a metric-only defect (zero `borderWidth.strong`) returns `[]` contrasts but a non-empty total | the exact partial-check mistake is caught | `themeContrastFailures` alone returns `[]` (the regression the plan exists for) |
| a format-only defect (`shadow: "black"`) returns `[]` contrasts but a non-empty total | the tint role has no pair, so only the format check sees it | `themeContrastFailures` alone returns `[]` |
| a contrast-only defect (body text = canvas) returns the expected pair through the aggregate | the contrast half is not filtered or reshaped | an aggregate that drops its payload would lose `foreground`/`background` |
| `themeFailures(getTheme("light"), "high")` is non-empty while `themeFailures(getTheme("light"))` is empty | the `contrast` argument reaches the contrast half | a hard-coded default would return `[]` for both |
| the total length equals the sum of the three lists, and the kinds are grouped | nothing is dropped or duplicated | a hand-written subset would disagree |
| the executed example: the usable theme is empty, the edited one names the three classes | the documented snippet runs (plan 350) | `examples.test.ts` fails on an unimported example; the assertions fail if the call cannot fail |

Prove both directions before committing:

```sh
# Red: move `theme-check.test.ts` into place before `theme-check.ts` exists.
nub run --filter @gpuixui/tokens test -- theme-check

# Green: add the module and the docs, restore, run again.
git stash -- packages/tokens/src/theme-check.ts packages/tokens/src/index.ts
nub run --filter @gpuixui/tokens test -- theme-check
git stash pop
nub run --filter @gpuixui/tokens test -- theme-check
```

The whole suite is claimed only after it runs.

## STOP conditions

- A shipped set is non-empty from `themeFailures`: stop and report. The three
  individual suites pass on this branch, so this means the composition changed
  behaviour (an argument or a default is wrong), not that a token should move.
- The aggregate needs a fourth check the package does not ship (shape/schema,
  theme-name uniqueness, anything outside the three): stop. The total check
  composes what exists; a new domain is its own plan.
- A docs or inventory guard fails on an unrelated figure (the 339 pairs, the
  66 roles, the floor table): fix the document, never the guard.
- `public-types.test.ts` and the Types table disagree on `ThemeFailure`: add the
  row to the table; do not exempt the type.
- `snippets.test.ts` rejects the fenced block: make the block import what it
  uses; do not add a rule to the guard.

## Acceptance

- `themeFailures(theme, contrast = theme.contrast)` composes the colour,
  contrast and metric checks into one discriminated list; `ThemeFailure` is
  exported and documented.
- Every shipped theme, platform variant and recipe returns `[]`; a theme broken
  in each class is reported in the documented order; the partial-check cases
  return non-empty from the total where the contrast check alone returns `[]`.
- `docs/tokens.md`, `docs/design-system.md`, the package README and
  `COMPONENTS.md` name the total check and derive no number from it that a test
  does not hold.
- The focused suite fails before the module exists and passes afterwards; the
  tokens suite, type check, lint, format and the repo gates pass.
- `TODO.md` carries the ticked row and the updated `docs-site` instruction; the
  plan index lists 383; the work is committed on `agent/tokens-theme` and
  pushed.
