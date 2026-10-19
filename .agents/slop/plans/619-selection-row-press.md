# 619 — The selectable row's press step

**Phase:** F (contrast completeness)
**Workstream:** `tokens-theme`
**Depends on:** 327 (the accent family's designed states), 357 (the generic wash
ladder), 381 (the selection step), 502 (the direction contract), 595 (the field
fill as a surface)
**Status:** done

## 1. The bug

A selectable `List` row paints `accent` under the pointer and `active` while
pressed (`packages/components/src/list.tsx:930-931`). The contract measures the
generic pointer ladder `hover` → `active` (`washStepPairs`) and the selection
step `accent` → `selected` (`selectionStepPairs`), but it never measures the
transition the shipped row actually makes: **`accent` → `active`**. Two shipped
sets collapse it while `themeFailures` returns `[]`:

| Shipped set | `accent` | `active` | Ratio | Step floor |
| ----------- | -------- | -------- | ----- | ---------- |
| identity dark | `#2E2370` | `#2A303B` | **1.004:1** | 1.05:1 |
| XP light | `#C6DAFA` | `#DDD7BE` | **1.019:1** | 1.05:1 |

A pressed row therefore changes hue but not luminance in those sets — the pointer
state the `step` class exists to catch. The remaining 22 shipped sets already
clear 1.05:1; the tightest of them is 1.05–1.06.

The audit also answers the open cross-team row in `TODO.md` that told
`components` to move the row's press to `accentActive`. That role is a **filled
control** press: on `Dark · macOS` a row label (`foreground`) measures 6.677:1 on
it, under the 7:1 body floor, and a field edge (`borderStrong`) 2.320:1 on it,
under the 3:1 boundary floor. It cannot host row content without a much broader
palette change, so the truthful fix is the palette: keep `active` as the row's
press and make it a perceivable step from `accent` in the two sets that miss it.

## 2. What changes, and what deliberately does not

**Does not change:** no role is added; no pair list other than the new
`rowPressStepPairs`; no floor; no typography, spacing, radius, density,
dimension, elevation or motion value; no platform style except the XP light
recipe's own `active`; no consumer source.

**Changes:**

1. `rowPressStepPairs` publishes `["active", "accent", "step"]` and joins
   `contrastPairs` (420 → **421**).
2. Identity dark `active` moves `#2A303B` → `#2E3543` (one designed neutral step
   lighter, which is the dark mode's required press direction). It still clears
   every other pair: `hover` → `active` becomes 1.18:1, the text roles on
   `active` stay at 7:1+, and the divider, boundary, skeleton and track pairs on
   the wash all pass (measured below).
3. XP light `active` moves `#DDD7BE` → `#D8D2B7` (one designed step darker, the
   light mode's required press direction). `hover` → `active` becomes 1.136:1
   and every existing pair on the wash still passes.
4. The `TODO.md` cross-team row for the `List` press is closed as resolved by
   the palette, with the evidence that `accentActive` is not a row fill.

**Why not `accentActive`:** see §1. The new pair measures the role the shipped
consumer already paints, so the fix needs no component migration and no new
role.

## 3. Measured candidates

Identity dark, from `#2A303B`:

| `active` | `accent` step | `hover` step | existing failures |
| -------- | ------------- | ------------ | ----------------- |
| `#2A303B` (old) | 1.004 | 1.059 | — |
| `#2C3340` | 1.040 | 1.101 | — |
| `#2D3442` | **1.057** | 1.121 | none |
| `#2E3543` | **1.073** | 1.139 | none |
| `#313845` | 1.120 | 1.191 | `border`/`active` divider 1.045 |

Use `#2E3543`: a designed step with margin on both sides.

XP light, from `#DDD7BE`:

| `active` | `accent` step | `hover` step | existing failures |
| -------- | ------------- | ------------ | ----------------- |
| `#DDD7BE` (old) | 1.019 | 1.080 | — |
| `#DAD4BA` | 1.050 | 1.113 | none |
| `#D8D2B7` | **1.071** | 1.136 | none |
| `#D6D0B5` | 1.093 | 1.159 | placeholder 4.499, track 1.039, skeleton 1.049 |

Use `#D8D2B7`.

## 4. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/contrast.ts` | add `rowPressStepPairs`, join `contrastPairs`, extend the list's JSDoc |
| `packages/tokens/src/color.ts` | identity dark `active` → `#2E3543` |
| `packages/tokens/src/platform-styles/recipes/xp.ts` | XP light `active` → `#D8D2B7` |
| `packages/tokens/src/contrast.test.ts` | `contrastPairs.length` 420 → 421 |
| `packages/tokens/src/resting-fill-scrim.test.ts` | the comment and assertion 420 → 421 |
| `packages/tokens/src/selection-row-press.test.ts` | create |
| `packages/tokens/src/docs.test.ts` | add one guard for the new paragraph |
| `docs/tokens.md` | the row-state paragraph, the count history and the role table |
| `docs/design-system.md` | the `pressed` and `selected` rows in §8 |
| `COMPONENTS.md` | the `Theme contrast check` row |
| `TODO.md` | tick the new token row; close the `List` cross-team row |
| `.agents/slop/plans/README.md` | index this plan and add its summary |

No other file. In particular, do **not** edit
`packages/components/src/list.tsx` in this worktree.

## 5. `packages/tokens/src/contrast.ts`

After `selectionStepPairs` (around line 393), add:

```ts
/**
 * The selectable row's press. A row paints `accent` under the pointer and
 * `active` while pressed, so the press must be a perceivable step from the
 * accent hover, not only from the generic `hover` wash {@link washStepPairs}
 * measures. Identity dark (1.004:1) and XP light (1.019:1) shipped a press
 * that changed hue but not luminance; the two `active` values move one
 * designed step so every shipped set clears the floor.
 */
export const rowPressStepPairs: readonly ContrastPair[] = [
  ["active", "accent", "step"],
];
```

Spread `...rowPressStepPairs,` into `contrastPairs` immediately after
`...selectionStepPairs,` and extend the big `contrastPairs` JSDoc sentence that
names the step lists, so the new list is described beside the wash ladder and
the selection step.

## 6. `selection-row-press.test.ts`

Header comment states the guarded bug: a selectable row paints `accent` under
the pointer and `active` while pressed, and identity dark measured **1.004:1**
and XP light **1.019:1** while `themeContrastFailures` returned `[]`.

Cases:

1. **The contract names the pair once.** Filter `contrastPairs` for
   `["active", "accent", "step"]`; expect exactly one, and expect it to be in
   `rowPressStepPairs`.
2. **Every shipped set clears the step floor.** For each `shippedThemes` entry,
   `contrastRatio(theme.colors.active, theme.colors.accent) >=
   contrastFloors[theme.contrast].step`; collect failures as strings and expect
   `[]`. Report the tightest pair in the failure message.
3. **The old identity dark value is reported.** Build
   `extendTheme(getTheme("dark"), { colors: { active: "#2A303B" } })`; filter
   `themeContrastFailures` for `foreground === "active"`, `background ===
   "accent"`, `pairClass === "step"`; expect exactly one failure with
   `floor === contrastFloors.default.step` and ratio `toBeCloseTo(1.004, 3)`.
4. **The old XP light value is reported.** Build the XP light theme with
   `extendTheme(getPlatformRecipeTheme("xp", "light"), { colors: { active:
   "#DDD7BE" } })`; expect one failure, ratio `toBeCloseTo(1.019, 3)`.
5. **The corrected values and the tightest set.** Assert identity dark's
   `active` is `#2E3543` and its step is `1.073`; XP light's is `#D8D2B7` and
   `1.071`; and the minimum across `shippedThemes` is XP light's 1.071.
6. **The total check reports it.** `themeFailures` on the old identity dark
   theme contains the same `step` entry (not only the contrast subset).

Use `getPlatformRecipeTheme` from `./platform-recipes.js` (the recipe's public
name for XP is `"xp"`).

## 7. Documentation

### `docs/tokens.md`

- In the colour-role table, identity dark `active` changes `#2A303B` →
  `#2E3543`; the table is derived by the existing guard.
- After the plan-381 selection paragraph, add:

> The same row presses to `active` while the pointer is down, so the press must
> be a perceivable step from the `accent` hover it follows. `rowPressStepPairs`
> publishes that step. Identity dark measured **1.004:1** and XP light
> **1.019:1** until plan `619` moved the two `active` values one designed step
> (`#2A303B` → `#2E3543`, `#DDD7BE` → `#D8D2B7`); every shipped set now clears
> 1.05:1, the tightest being Windows 7 light at **1.059:1**. The row keeps `active`
> rather than `accentActive`: that role is a filled control's press, and on
> macOS dark a row label measures 6.677:1 on it, under the 7:1 body floor.

- Change the pair-count history's final sentence from
  `taking it from 396 to **420** across plans \`527\`, \`557\` and \`595\`` to
  `taking it from 396 to **421** across plans \`527\`, \`557\`, \`595\` and \`619\``.

### `docs/design-system.md` §8

- In the **pressed** row, after the wash-ladder sentence, add: a selectable row's
  press is `active` one step from the `accent` hover (`rowPressStepPairs`),
  and name the identity dark / XP light correction.
- In the **selected** row, add that a chosen row keeps `selected` at rest and
  presses to `active`, and that the step from `accent` is measured.

### `COMPONENTS.md`

`Theme contrast check` row: `420` → `421` and append the plan-619 clause:

> Plan 619 publishes the selectable row's press — `active` one 1.05:1 step from
> the `accent` hover (`rowPressStepPairs`); identity dark and XP light moved
> their `active` one designed step (1.004:1 and 1.019:1 before), and every
> shipped set now clears 1.05:1 (420 → 421 pairs).

### `TODO.md`

Add under “Design tokens and theming (`tokens-theme`)”:

```
`[x]` Publish the selectable row's press step — a `List` row hovers `accent` and presses `active`, but the contract measured only `hover` → `active` and `accent` → `selected`; identity dark (1.004:1) and XP light (1.019:1) changed hue but not luminance while `themeFailures` returned `[]`. `rowPressStepPairs` publishes `active`/`accent` under the `step` class, the two `active` values move one designed step (`#2A303B` → `#2E3543`, `#DDD7BE` → `#D8D2B7`), and every shipped set clears 1.05:1 (Windows 7 light 1.059:1 at the tightest); `contrastPairs` grows 420 → 421, no other value moves (plan 619)
```

Replace the cross-team `List` row (currently “moves a selectable `List` row's
press off the neutral `active` wash … use `accentActive`”) with a ticked row:

```
`[x]` Resolved by the token palette, no consumer change: a selectable `List` row's press stays `active`, and `rowPressStepPairs` now holds it one 1.05:1 step from the `accent` hover; identity dark and XP light moved their `active` one designed step (1.004:1 → 1.073:1 and 1.019:1 → 1.071:1). `accentActive` is a filled control's press, not a row fill: on macOS dark a row label measures 6.677:1 on it, under the 7:1 body floor, so the migration the old row proposed is withdrawn (plan 619; owner: `tokens-theme`)
```

Bump the section count by one and update the bar text accordingly (261/333 →
262/334 manually; the bar's filled squares stay as rendered).

### `.agents/slop/plans/README.md`

Add the table row after 618 and a summary paragraph before “How to use a plan”.
Status `done`.

## 8. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/selection-row-press.test.ts` →
   all cases pass.
3. `nub run --filter @gpuixui/tokens test` → every suite green; file count
   grows by one, test count by the new cases.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 9. STOP conditions

Stop and report, do not improvise, if:

- any shipped set still measures `active`/`accent` below its `step` floor after
  the two moves — that is a palette decision outside this plan;
- either candidate value breaks an existing pair (the measured tables in §3 are
  the evidence it does not) — choose the other candidate only if it also clears
  the new pair;
- `themeDirectionFailures` reports the moved wash ladders (dark must lighten,
  light must darken) — that contradicts §3 and needs a design decision;
- a consumer source in another worktree has already migrated the row to
  `accentActive` — then the evidence has moved and this plan must be re-scoped;
- a docs guard fails for an unrelated existing sentence — that is a baseline
  problem, not this unit.

## 10. Acceptance

- `rowPressStepPairs` is public, indexed, and part of `contrastPairs`; the
  contract grows 420 → 421.
- Identity dark and XP light `active` carry the designed values; every shipped
  theme, platform variant and recipe clears the step at its declared contrast.
- The new test fails on the pre-fix tree (cases 3, 4 and 6) and passes after it.
- The catalogue, design system and ledger name the pair, the old ratios and the
  corrected values; the `TODO.md` cross-team row is closed with evidence.
- No other colour, role, floor, metric, platform style or recipe value moves.
- `nub run check`, `nub run lint` and `nub run test` pass.
