# 623 — The selected row's label is a tier below its title

**Status:** done
**Phase:** F (integration and polish)
**Depends on:** 312 (the row's own text on the washes it paints), 316 (the
selected label on the `accent` wash), 381 (the selected step), 500 (the text
hierarchy on each surface's own body role).

## 1. The defect

A selected row paints two text roles on the same fill: its title is
`foreground` (`ListItemTitle` overrides the inherited colour) and its inherited
label is `selectedForeground`, which the catalogue documents as a
secondary-strength tint. Both roles have contrast pairs at their own floors, so
each is readable, but nothing holds the **relationship** between them: a theme
can make the label as strong as, or stronger than, the title and every check
returns `[]`.

A probe on the identity dark theme:

```ts
const theme = extendTheme(getTheme("dark"), {
  colors: { selectedForeground: "#FFFFFF" },
});

contrastRatio(theme.colors.selectedForeground, theme.colors.selected); // 10.23
contrastRatio(theme.colors.foreground, theme.colors.selected); //         9.03
themeContrastFailures(theme); // []
themeTextTierFailures(theme); // [] — no pair names this relationship
themeFailures(theme); // []
```

The label is brighter than the title while the package says it is the
secondary tier. `themeTextTierFailures` already compares two roles **on the
surface both are documented on**, which is exactly this composition: the four
fills a selected row keeps (`hover`, `active`, `accent`, `selected`) are in
`contrastPairs` for both roles.

The three documents currently argue the pair cannot exist:

> `selectedForeground` is deliberately not a body tier: it is the
> secondary-strength tint an inherited label keeps inside a selected row, whose
> title is painted with `foreground`. Adding it would demand a step the design
> does not have and report every shipped set.

The second sentence is false. Every one of the 24 shipped sets already clears a
1.05:1 step; the tightest is **1.106:1** (`Dark · Windows`, `hover`). The pair
belongs in the check as a **state** tier, the same way
`disabledForeground`/`softActionForeground` is a state pair rather than a body
tier.

## 2. Decision

Add `["selectedForeground", "foreground"]` to `textTiers` after the two existing
state pairs. It is not a body tier: `selectedForeground` is documented only on
the four row fills, so the shared-surface derivation in
`themeTextTierFailures` compares it with `foreground` on exactly those four
fills and nowhere else. No colour, floor or pair in `contrastPairs` moves.

Placement: the pair is last, after `["disabledForeground",
"softActionForeground"]`, because both are state comparisons appended after the
body hierarchy.

## 3. Files to create or change

Only this workstream's paths.

### 3.1 `packages/tokens/src/contrast.ts`

1. In `textTiers` (the array around line 1126), append:

   ```ts
   ["selectedForeground", "foreground"],
   ```

   after the `["disabledForeground", "softActionForeground"]` entry.

2. Update the `textTiers` JSDoc block (around lines 1107–1125):
   - change “The last pair is a **state** rather than a hierarchy” to name the
     last two pairs as states;
   - add one sentence: a selected row's inherited label (`selectedForeground`)
     stays one step below its title (`foreground`) on the four fills both roles
     are documented on — `hover`, `active`, `accent` and `selected` — because a
     label at title strength erases the row's hierarchy even though both roles
     clear their floors.

3. Update the `themeTextTierFailures` JSDoc (around line 1164) only if the
   sentence “The last pair is a **state**…” appears there; keep the description
   of shared surfaces.

Do **not** change `contrastPairs`, `contrastFloors`, `textSurfaces` or the
function body: the existing mechanism already does the work.

### 3.2 `packages/tokens/src/selected-label-tier.test.ts` (new)

Header comment must state the guarded bug: the selected row's inherited label
could be raised to the title's strength (or above it) while
`themeContrastFailures` and therefore `themeFailures` returned `[]`, because
`textTiers` named no pair for the relationship.

Five cases:

1. **The shipped guarantee.** Iterate `shippedThemes`; for each theme and each of
   `["hover", "active", "accent", "selected"]`, compute
   `contrastRatio(foreground, fill) / contrastRatio(selectedForeground, fill)`
   and assert it is `>= contrastFloors[theme.contrast].step`. Collect failures
   as `name: surface` strings and expect `[]`.
2. **The shipped tightest figure.** Derive the minimum step over the same walk
   and assert it is `toBeCloseTo(1.106, 3)` with the set `Dark · Windows` and
   surface `hover`. This pins the figure the docs quote and fails if a palette
   edit moves it.
3. **A label raised to title strength.** `extendTheme(getTheme("dark"), {
   colors: { selectedForeground: getTheme("dark").colors.foreground } })`;
   assert `themeContrastFailures(regressed)` is `[]` (the contrast check cannot
   see it), `themeTextTierFailures(regressed)` has four failures — one per
   shared fill — each `dimmer: "selectedForeground"`, `brighter: "foreground"`,
   `step: 1.05`, and the ratios equal on each surface (ratio 1.0), and
   `themeFailures(regressed)` contains four `kind: "hierarchy"` entries.
4. **A label brighter than the title.** The probe theme with
   `selectedForeground: "#FFFFFF"` on identity dark; assert the label's ratio on
   `selected` is greater than the title's (the inversion), the contrast check is
   still `[]`, and the hierarchy check reports the four fills.
5. **The pair is a state, not a body tier.** Assert the pair appears exactly once
   in `textTiers`, and that the failure surfaces for case 3 are exactly
   `["hover", "active", "accent", "selected"]` in the theme's documented order
   (derive from `textTiers`/`contrastPairs`, do not retype the order in a second
   list where a `Set` comparison would suffice).

Use `@effect/vitest` only if the suite needs effects; it does not — use plain
`vitest` like the other pure token suites.

### 3.3 `docs/tokens.md` (*Text hierarchy*, around lines 2610–2670)

- The `textTiers` sentence gains the pair and says the last two are states:
  `disabledForeground` below `softActionForeground`, and the selected row's
  inherited `selectedForeground` below its title `foreground`.
- The derived-surface paragraph gains “four for the selected row's label below
  its title (the `hover`/`active`/`accent`/`selected` fills both roles are
  documented on)”.
- The minima list gains **1.106:1** (`selectedForeground` vs `foreground`,
  `Dark · Windows` on `hover`) in the same style as the other figures.
- Replace the “deliberately not a body tier … Adding it would demand a step the
  design does not have and report every shipped set” paragraph with: it is
  deliberately not a body tier (it is documented only on the four row fills),
  but it **is** a state tier, and every shipped set already clears the step —
  the false claim is the bug this plan closes.

### 3.4 `docs/design-system.md` (text hierarchy paragraph, around lines 729–748)

Add the selected-row state relationship beside the panel-action one: the
inherited label stays 1.106:1 below the title at the tightest shipped set
(`Dark · Windows` on `hover`), and the paragraph no longer says the role is
simply “not a body tier” without saying what it is.

### 3.5 `packages/tokens/README.md` (the `themeTextTierFailures` paragraph,
around lines 329–334)

Same correction: name the state pair and the 1.106:1 tightest figure; remove the
claim that adding it would report every shipped set.

### 3.6 `COMPONENTS.md`

In the **Total theme check** row, replace

> `selectedForeground` is deliberately not a body tier (plan 500).

with

> `selectedForeground` is deliberately not a body tier (plan 500) but is held
> one 1.05:1 step below `foreground`, the row title, on the four fills it keeps
> (plan 623).

Do not change the row's role/check counts; the check count stays ten and the
`contrastPairs` count stays 421.

### 3.7 `TODO.md`

Under *Design tokens and theming*, add one checked row after the plan-622 row:

```
`[x]` Hold the selected row's inherited label a perceivable step below its
title — a theme could raise `selectedForeground` to (or above) `foreground` on
the four row fills while `themeContrastFailures` and the hierarchy check both
returned `[]`; `textTiers` gains the state pair, every shipped set already
clears the step (1.106:1 at the tightest, `Dark · Windows` on `hover`) and no
colour moves (plan 623)
```

Update the workstream's count line from `265/338` to `266/339`; keep the bar at
eight filled blocks (the ratio is still 78.5%).

### 3.8 `.agents/slop/plans/README.md`

Add the table row after `622`:

```
| [623](./623-selected-label-tier.md) | The selected row's label is a tier below its title | F | 312, 316, 381, 500 | done |
```

and one narrative paragraph before *How to use a plan*, in the style of the
622 paragraph, stating the bug, the planted values, the 1.106:1 shipped
tightest and that no colour moves.

## 4. Commands and expected results

Run from the worktree root
`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Pre-fix proof** (the pair absent; the test file present):

   ```sh
   nub run --filter @gpuixui/tokens test -- src/selected-label-tier.test.ts
   ```

   Expected: **3 failed / 2 passed**. Cases 3 (label raised to title strength),
   4 (label brighter than the title) and 5 (the pair is published) fail because
   `textTiers` has no pair; cases 1 and 2 pass because they measure the maths
   directly. Record the exact split in §7.

2. **Two directions** (mandatory, per `AGENTS.md` §3):

   ```sh
   git stash push -- packages/tokens/src/contrast.ts
   nub run --filter @gpuixui/tokens test -- src/selected-label-tier.test.ts
   git stash pop
   ```

   Expected: the same failures pre-fix, then all five pass after the pop.
   If a stash pop conflicts, `git checkout -- packages/tokens/src/contrast.ts`
   would lose the one-line fix; resolve by re-applying the pair from §3.1.

3. **The package suite:**

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: green, one new file and five new tests plus the parameterised
   figure case over the 166-file baseline,
   no shipped theme, platform variant, recipe or executed example failing the
   new pair.

4. **The gates:**

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all green. `nub run check` includes `check:tests`, lint, format and
   `check-types`; the new test asserts real values and is not rejected.

5. **Docs guards** are part of the package suite (`docs.test.ts`,
   `figures.test.ts`, `readme.test.ts`, `inventory.test.ts`). If one fails on a
   number, derive the number from the implementation instead of pasting a new
   literal, and re-run.

## 5. STOP conditions

Stop and report instead of improvising when:

- **Any shipped set fails the new pair.** A token value would have to move; this
  plan changes no colour. Report the set, surface, both ratios and the step.
- **The shared surfaces are not exactly `hover`, `active`, `accent`,
  `selected`.** Report the derived list; the docs and the check's rationale
  assume those four.
- **A documented example fails `themeFailures` after the pair lands.**
  `brand-theme.example.ts`, `platform-styles.example.ts`,
  `applied-level.example.ts`, `quiet AAA` or `resolveEditedPlatformTheme` are
  consumer-facing themes; report the failure instead of editing their values in
  this plan.
- **`nub` is missing or does not resolve Node 24.18.0.** Do not fall back to a
  bare `node`.
- **A command in §4 exits non-zero for a reason unrelated to this change.**
  Record the exact command and the first error; do not retry it unchanged.

## 6. Acceptance criteria

- [x] The new suite fails without the one-line `textTiers` pair and passes with
      it (both directions observed and recorded).
- [x] `themeTextTierFailures` reports a theme whose `selectedForeground` equals
      or out-contrasts `foreground` on each of the four fills.
- [x] `themeContrastFailures` still returns `[]` for that theme, proving the new
      check catches something the colour contract cannot.
- [x] Every shipped theme, platform variant, recipe and executed example passes
      `themeFailures`.
- [x] `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and
      `COMPONENTS.md` state the state pair and the 1.106:1 tightest figure; no
      document still says adding it would report every shipped set.
- [x] `TODO.md` ticks the new row, `COMPONENTS.md` carries the row, the plan
      index lists 623 as done.
- [x] `nub run check`, `nub run lint` and `nub run test` are green.
- [x] Commits are on `agent/tokens-theme` and pushed to `origin`.

## 7. Verification

- New suite, pre-fix (`git stash push -- packages/tokens/src/contrast.ts`):
  **3 failed / 2 passed**. Post-fix: **5 passed**.
- `nub run --filter @gpuixui/tokens test`: **167 files / 6,091 tests** green
  (one new file with five tests, plus the parameterised figure case for the new
  tier, over the 166-file / 6,085-test baseline).
- `nub run check`: `check:tests`, lint, format and type-check green.
- `nub run lint`: green.
- `nub run test`: **167 files / 6,091 tests** green.
- The new pair changes no shipped colour: the tightest shipped step is
  **1.106:1** (`Dark · Windows`, `hover`), which `figures.ts` now derives and
  `docs/tokens.md` states. The figure table grows 28 → 29 entries.

