# Plan 520 — The disabled panel action through the inverse selection veil

| Field | Value |
| ----- | ----- |
| Workstream | `tokens-theme` |
| Block | `500–599` (tokens overflow) |
| Phase | F — integration and polish |
| Depends on | `306`, `344`, `394`, `397`, `399`, `504`, `510`, `512`, `513`, `514` |
| Files owned | `packages/tokens/src/contrast.ts`, `packages/tokens/src/color.ts`, `packages/tokens/src/selection-panel-action.test.ts` (new), `packages/tokens/src/selection-inactive.test.ts`, `packages/tokens/src/inactive-state.test.ts`, `packages/tokens/src/contrast.test.ts`, `packages/tokens/src/contrast-reference.test.ts`, `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md` |
| Status | done |

## 1. The defect

Plans `394`, `397` and `514` give an action inside a tone-tinted status panel its
own raised family — `softAction`, `softActionHover`, `softActionActive` and the
one `softActionForeground` — and plan `514` gives its disabled state a resting
label: a disabled raised action keeps the resting `softAction` fill (the canvas
`disabled` fill measures 1.0066:1 on XP light's `warningSoft`, so it cannot be
the panel shape) and paints `disabledForeground`. `inactivePanelActionPairs`
holds that label at rest.

Plan `504` states the selection rule for content on an opaque fill: it uses the
inverse `selectionOnFill` veil, not the accent-tinted `selection` wash, because
the accent wash is invisible on the accent fill and under 1.05:1 on a solid
`success`/`info` chip. `softAction` joined `selectionFillRoles`, so
`selectionFillPairs` measures `softActionForeground` through that veil — but
only the **enabled** label. The disabled label on the same fill has no pair.

A probe over the 24 shipped sets shows the composition is not hypothetical:

| Set | `disabledForeground` through `selectionOnFill` over `softAction` | Floor |
| --- | ---------------------------------------------------------------- | ----- |
| identity dark (and every dark platform variant that inherits it) | **2.799:1** | 3:1 |
| high-contrast dark (and every AAA variant that inherits it) | **3.304:1** | 4.5:1 |
| every other shipped set | clears its floor | — |

So selecting an unavailable "Try again" inside a dark Alert erases the label
below the library's own inactive floor, while all six `themeFailures` checks
return `[]`. The composition is the intersection of two contracts that each
believe the other covers it: `inactivePanelActionPairs` measures the resting
fill, and `selectionFillPairs` measures the fill's on-colour foreground, which
is the enabled label.

## 2. Decision

Add one published list and one check pass:

```ts
/**
 * The disabled action inside a tone-tinted status panel, through the inverse
 * selection veil. A disabled raised action keeps its resting `softAction` fill
 * (`inactivePanelActionPairs`) and a reader can select its label, so the
 * `selectionOnFill` veil composites over the fill. The accent `selection` wash
 * is not the right one here: plan `504` uses the inverse veil for content on an
 * opaque fill, and `selectionFillPairs` measures only the enabled
 * `softActionForeground`. The disabled state does not step, so the hover and
 * pressed fills are deliberately outside this list.
 */
export const selectionFillInactivePairs: readonly ContrastPair[] = [
  ["disabledForeground", "softAction", "inactive"],
];
```

Wire it through `textOverWashFailures(selectionFillInactivePairs,
"selectionOnFill", theme, floors)` in `themeContrastFailures`, beside
`selectionFillPairs` and `selectionFillWashPairs`. `contrastPairs` is not
touched (this is a wash pass, like `selectionPairs`), so its count stays 395.

### 2.1 The palette fix

Two shipped values move; the compositions above cannot be repaired by moving
`softAction` (plan `504` already darkened the AAA fill to give the enabled
white label 7:1 through the same veil, and moving it back or further breaks the
four soft-surface pairs) and the veil cannot weaken (plan `513`: 10% stops being
perceivable on `primary` at 1.048:1).

| Role | Set | Before | After | New washed ratio | Tier below `mutedForeground` |
| ---- | --- | ------ | ----- | ---------------- | ---------------------------- |
| `disabledForeground` | identity dark | `#A1A9B7` (neutral 400) | `#B0B8C6` (half-step between neutral 400 and 300) | 3.317:1 | 1.301:1 |
| `disabledForeground` | high-contrast dark | `#B0B0B0` | `#D0D0D0` (half-step between neutral 300 and 200) | 4.645:1 | 1.168:1 |

Both stay above the 1.05:1 hierarchy step (`textTiers`), and every other pair
the roles paint — the thirteen at-rest surfaces and the accent-wash selection
list — improves because the label moves away from the panel. The platform dark
variants inherit the identity palette and the AAA variants inherit the AAA
palette, so two edits fix all eight affected dark sets. Light and AAA light
already pass (their disabled labels are dark on a light veil).

## 3. Update the pinned values and counts

1. `packages/tokens/src/inactive-state.test.ts` — the two shipped-value
   assertions (`#A1A9B7`, `#B0B0B0`) become the new values. The at-rest ratio
   assertion that uses the literal `#A1A9B7` stays as a *probe* of the old value;
   it is not a shipped assertion.
2. `packages/tokens/src/selection-inactive.test.ts` — the header names the moved
   values (`#545D6C`, `#444444`, and now `#B0B8C6` / `#D0D0D0` instead of
   `#B0B0B0`). The "AAA values one step lighter than the shipped ones" case sets
   `#A9A9A9` on the AAA dark theme; with the new pair that value now produces
   **two** failures (the accent-wash pair on `active` and the inverse-veil pair
   on `softAction`), so the expected count and array change. The light and AAA
   light probes do not gain a failure (`#6E7787` measures 3.198:1 and `#5A5A5A`
   4.886:1 through the inverse veil, both passing).
3. `packages/tokens/src/contrast.test.ts` — import
   `selectionFillInactivePairs` and add it to `publishedPairLists` (the
   duplicate-composition guard must see every published list). Add a length
   assertion beside the other fill lists: `expect(selectionFillInactivePairs)
   .toHaveLength(1)`.
4. `packages/tokens/src/contrast-reference.test.ts` — add
   `selectionFillInactivePairs` to the named list the JSDoc must mention.
5. `packages/tokens/src/contrast.ts` — name the new list in the
   `themeContrastFailures` JSDoc (the paragraph that lists
   `selectionFillPairs`/`selectionFillWashPairs`) and in the module header, so
   the reference guard and the doc generator both see it.

## 4. The regression test

Create `packages/tokens/src/selection-panel-action.test.ts`. Its header states
the bug: plan `514` gave the disabled panel action a resting label and plan
`504` routes content on `softAction` through the inverse veil, but no pair
measured the disabled label there; identity dark measured 2.799:1 and AAA dark
3.304:1, under the 3:1 / 4.5:1 inactive floors, while the checker returned `[]`.

Cases:

1. **The pair list is exactly one resting composition.** Assert
   `selectionFillInactivePairs` equals
   `[["disabledForeground", "softAction", "inactive"]]`; assert it does not name
   `softActionHover`/`softActionActive` (a disabled control does not step) and
   does not name `softActionForeground` (the enabled label is
   `selectionFillPairs`' job).
2. **Every shipped set clears the floor through the veil.** For every
   `shippedThemes` entry, composite `selectionOnFill` over `softAction` and hold
   `disabledForeground` to `contrastFloors[theme.contrast].inactive`; assert
   `themeFailures(theme)` is `[]`. Label the failure with `theme.name`.
3. **The pre-fix values fail.** Assert the identity dark value `#A1A9B7`
   measures 2.799:1 and the AAA dark `#B0B0B0` measures 3.304:1 on the
   composited veil — the measurement in §1, pinned so a future palette edit
   cannot quietly reintroduce it.
4. **The public checker reports an edited theme.** Set
   `disabledForeground` to the composited veil colour on the identity dark theme
   and assert `themeFailures(theme)` contains one `kind: "contrast"` failure with
   `foreground: "disabledForeground"`, `background: "softAction"`,
   `wash: "selectionOnFill"`, `pairClass: "inactive"` and the default floor 3.
5. **The other checks are blind to it.** On the same edited theme, assert
   `themeColorFailures`, `themeTypefaceFailures`, `themeTextTierFailures`,
   `themeDirectionFailures` and `themeMetricFailures` are all `[]`, proving the
   new pair is the only thing that can catch it.

## 5. Documentation

- `docs/tokens.md`, the `disabledForeground` role-table row: the dark value
  becomes `#B0B8C6`; the AAA table's `disabledForeground` becomes `#D0D0D0`.
- `docs/tokens.md`, the plan-510 paragraph and the audit history paragraph:
  update the moved-value sentence and the derived tightest figures
  (1.455 / 1.69 / **1.168**:1; the 1.643 figure belonged to the old AAA dark
  value). Add one paragraph for plan 520 after the plan-514 paragraph: the
  disabled panel action through the inverse veil, the two failing sets, the new
  list and the two values.
- `docs/tokens.md`, the verification paragraph that lists the published pair
  lists: add `selectionFillInactivePairs` and the disabled panel action.
- `docs/tokens.md`, the `Theme contrast check` material and the fill-selection
  section: name the one new pair beside `selectionFillPairs` and
  `selectionFillWashPairs`; keep the eight enabled fill pairs and the eight veil
  pairs.
- `docs/design-system.md`, §8 disabled row: state that the raised action's
  label is also held through the inverse veil, not only at rest.
- `docs/design-system.md`, §9 disabled narrative: update the moved values and
  the tier figures, and add the inverse-veil sentence with the two failing
  ratios.
- `packages/tokens/README.md`: the disabled paragraph and the fill-selection
  paragraph name the new pair and the two new values.
- `COMPONENTS.md`, `Design tokens`, `Theme contrast check`, `Status tones` and
  `Filled control states` rows: name the disabled panel action's inverse-veil
  pair, and update any count that totals the selection passes.
- `color.ts`, the dark-palette and AAA-dark-palette JSDoc paragraphs: describe
  the new `disabledForeground` values and why they moved (the inverse veil over
  `softAction`).

## 6. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test
```

Expected: all files pass; the suite grows by one file (five cases), and the two
updated files still pass. Record the real file/test counts.

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. `check` runs `check:tests`, `lint`, `fmt`, `check-types`.

Two-direction proof (the repo's `scripts/verify-two-directions.sh` uses `jj`,
which is not installed here, so record the manual proof in the commit body):

- Remove the two colour edits (restore `#A1A9B7` and `#B0B0B0`) and run the new
  suite: cases 2, 3 and 4 fail (identity dark 2.799:1, AAA dark 3.304:1, and the
  shipped set reports a contrast failure). Restore.
- Remove `selectionFillInactivePairs` from `themeContrastFailures` and run case
  4: the checker no longer reports the edited theme, so the case fails.
  Restore.

## 7. STOP conditions

- Any shipped set still fails `themeFailures` after the two colour edits. Do not
  relax a floor or move an unrelated role; report the set and its pair.
- A colour edit breaks a different contract (`textTiers`, the at-rest inactive
  pairs, or the accent-wash selection pairs). Report the pair and the floor
  rather than choosing a value that satisfies this plan at the expense of
  another.
- `selectionFillInactivePairs` cannot be added without a second copy of the same
  composition in `contrastPairs` (the uniqueness guard).
- A completion gate stays red.

## 8. Acceptance

- The disabled raised action's label is measured through the inverse veil in
  the public contrast contract, and the checker reports an edited theme that
  erases it.
- Every shipped set passes all six checks; identity dark and AAA dark move
  `disabledForeground` one designed step.
- The reference, the design system, the README, the ledger and the palette JSDoc
  name the new list and the new values.
- The regression suite fails in both directions described in §6.
- All three completion gates are green.
