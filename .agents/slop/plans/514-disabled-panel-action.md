# Plan 514 — The disabled action inside a status panel

**Phase:** F · **Owner:** `tokens-theme` · **Status:** done (2026-10-18)
**Depends on:** 306 (the inactive state), 307 (the inactive label on the soft
fills), 392/500 (the text tiers), 394 (`softAction`), 397 (the panel action's
scope), 502 (state direction), 512 (the panel action's label through the wash),
513 (the inverse veil's pointer-state gap).

**Owns:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/contrast.test.ts`,
`packages/tokens/src/inactive-panel-action.test.ts` (new),
`packages/tokens/src/docs.test.ts`, `packages/tokens/src/styles.ts`,
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

`softAction` is the raised fill an action inside a tone-tinted Alert or Badge
paints (plans 394 and 397). The contract publishes its surface pairs, its
hover/press ladder and its one foreground:

- `softActionPairs` — the three fills on the four soft status fills;
- `softActionStepPairs` — `softActionHover` from `softAction`, `softActionActive`
  from `softActionHover`;
- `softActionLabelPairs` — `softActionForeground` on the three fills and on the
  four soft fills a ghost action's label rests on.

There is **no disabled state**. Plan 306 designs the inactive state as the
`disabled` fill plus `disabledForeground`, and plan 307 measures that label on
the four soft panels for a *ghost* action. A **filled** panel action that becomes
unavailable — the documented "Try again" button while a retry is in flight — has
no defined presentation and no pair.

Two facts make the missing state concrete:

1. **The canvas `disabled` fill is not a panel shape.** Measured on the four soft
   tints, `disabled` reaches **1.0066:1** on XP light's `warningSoft` and
   **1.0242:1** on the high-contrast dark `destructiveSoft`, under the library's
   own 1.05:1 surface floor. A disabled action that swapped its raised fill for
   `disabled` would dissolve into the panel; its edge could carry the silhouette,
   but the action would no longer read as a raised control at all.
2. **The disabled label is readable on the raised fill, but nothing holds it.**
   `disabledForeground` on the resting `softAction` measures:

   | set | ratio | floor |
   | --- | ----- | ----- |
   | identity light | 6.647:1 | 3:1 |
   | identity dark (tightest default) | **4.343:1** | 3:1 |
   | high-contrast light | 9.740:1 | 4.5:1 |
   | high-contrast dark (tightest AAA) | **5.199:1** | 4.5:1 |

   every shipped set clears its inactive floor, so no colour moves. An edited
   theme can still set `disabledForeground` equal to `softAction` and the
   checker returns `[]` while the disabled action's label is gone.

The same audit found the **state itself unguarded**. `softActionForeground` is
the enabled label on the raised fill and on the soft panel; `disabledForeground`
is the unavailable one. Nothing requires the second to be a perceivable step
below the first, so a copied theme can flatten them and a disabled action looks
enabled while it is not interactive. Measured across the five surfaces the two
labels share (`softAction` and the four soft fills), the shipped step is at
least **2.156:1** (high-contrast light, on `successSoft`), far above the
1.05:1 `step` the tiers use.

`softAction`'s own JSDoc and `docs/tokens.md` describe the family as if every
action were available, and the design system's disabled row names only the
canvas `disabled` fill.

## 2. Decision (do not re-litigate)

1. A **filled** panel action keeps its resting **`softAction` fill** when it is
   disabled and paints **`disabledForeground`**. The raised fill is the action's
   shape, not its state; the dimmed label is the disabled signal, the same
   convention the canvas uses. The disabled action does not step: a disabled
   control does not receive hover or press.
2. A **ghost** panel action keeps the existing rule — no fill, label on the
   panel — and plan 307 already measures `disabledForeground` on the four soft
   fills.
3. Publish the resting pair as `inactivePanelActionPairs`
   (`disabledForeground` on `softAction`, `inactive` class) through
   `contrastPairs`. Do **not** add `softAction` to `inactiveSurfaces`: that list
   derives `selectionInactivePairs`, which measures the accent-tinted
   `selection` wash, while content on an opaque fill uses the inverse
   `selectionOnFill` veil and a disabled control's chrome opts out of selection
   (plan 513). The resting pair is the whole guarantee.
4. Publish the **enabled/disabled step** as a `textTiers` pair,
   `["disabledForeground", "softActionForeground"]`. Both roles already have
   pairs on the raised fill and the four soft fills, so the existing
   `themeTextTierFailures` walk compares them there with no new machinery.
5. No colour, floor or public type moves. `contrastPairs` grows 394 → **395**;
   `textTiers` grows 6 → **7**.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. Beside `softActionLabelPairs` (after it), add a named list:

   ```ts
   /**
    * The disabled action inside a tone-tinted status panel. A raised action keeps
    * its resting `softAction` fill when it becomes unavailable — the canvas
    * `disabled` fill measures 1.0066:1 on XP light's `warningSoft` and 1.0242:1
    * on the high-contrast dark `destructiveSoft`, so it would replace the
    * action's shape with the panel — and paints `disabledForeground`. It does
    * not step: a disabled control does not hover or press, so the hover and
    * press fills are deliberately outside this list. A ghost action is already
    * covered by {@link inactiveSoftPairs}.
    */
   export const inactivePanelActionPairs: readonly ContrastPair[] = [
     ["disabledForeground", "softAction", "inactive"],
   ];
   ```

2. Spread it into `contrastPairs` immediately after `...softActionLabelPairs,`:

   ```ts
   ...softActionLabelPairs,
   ...inactivePanelActionPairs,
   ```

3. Extend the big JSDoc block above `contrastPairs` where it describes the panel
   action — after the sentence that ends "on the panel a ghost action rests on
   (`softActionLabelPairs`)`" — with:

   > A disabled panel action keeps the resting fill and dims its label: the
   > canvas `disabled` fill is 1.0066:1 on XP light's `warningSoft`, so
   > `inactivePanelActionPairs` holds `disabledForeground` on `softAction` at the
   > inactive floor, and a disabled control does not step.

4. In `textTiers`, add the state pair after `["placeholder", "mutedForeground"]`:

   ```ts
   ["disabledForeground", "softActionForeground"],
   ```

   and extend the array's JSDoc: the last pair is a **state** rather than a
   hierarchy tier — the unavailable label of a filled status-panel action must
   stay a perceivable step below the enabled one on the fill they share.

### 3.2 `packages/tokens/src/styles.ts`

Extend `softAction`'s JSDoc (keep it short, no example change): a disabled
filled action keeps `background` and paints `theme.colors.disabledForeground`;
the canvas `disabled` fill is not perceivable on the four soft tints. Mention
`inactivePanelActionPairs`.

### 3.3 `packages/tokens/src/contrast.test.ts`

1. Change `expect(contrastPairs.length).toBe(394);` to `395`.
2. Append a short header paragraph naming plan 514 and the two additions
   (one pair, one tier), and the fact that no colour moves.

### 3.4 `packages/tokens/src/inactive-panel-action.test.ts` (new)

Header comment states the guarded defect: a disabled filled panel action had no
pair, and an edited theme could erase its label.

Imports from `./index.js`: `contrastFloors`, `contrastPairs`, `contrastRatio`,
`extendTheme`, `getTheme`, `inactivePanelActionPairs`, `shippedThemes`,
`textTiers`, `themeContrastFailures`, `themeFailures`,
`themeTextTierFailures`.

Cases:

1. **`"publishes the resting pair once"`** — filter
   `contrastPairs` for `foreground === "disabledForeground" && background ===
   "softAction"`; expect exactly one entry, `pairClass === "inactive"`, and that
   `inactivePanelActionPairs` is the list that carries it.
2. **`"keeps the label readable on every shipped set"`** — for every
   `shippedThemes` entry, `contrastRatio(theme.colors.disabledForeground,
   theme.colors.softAction) >= contrastFloors[theme.contrast].inactive`; expect
   `[]` of labelled failures.
3. **`"reports an edited theme whose disabled label matches the fill"`** —
   `extendTheme(getTheme("dark"), { colors: { disabledForeground:
   getTheme("dark").colors.softAction } })`; `themeContrastFailures` must contain
   the pair with `pairClass: "inactive"`, `floor: 3`, `ratio: 1`.
4. **`"keeps the disabled label a step below the enabled one"`** — assert
   `textTiers` contains `["disabledForeground", "softActionForeground"]`; for
   the shipped sets, the ratio of `softActionForeground` to `disabledForeground`
   on `softAction` and the four soft fills is at least
   `contrastFloors[theme.contrast].step`; and a theme that sets
   `disabledForeground` to `softActionForeground` is reported by
   `themeTextTierFailures`.
5. **`"measures the resting fill only"`** (rationale guard) — the hover and press
   pairs are absent from `contrastPairs`, and the high-contrast dark set's
   `disabledForeground` on `softActionActive` is **below** its inactive floor
   (3.519:1 < 4.5:1). This pins why a disabled control must not step; if a future
   palette makes the state fills readable, the case fails and the decision is
   revisited rather than silently blessing them.

`check-tests` requires every assertion to be able to fail; each case compares
two independent values or a published list against the contract.

### 3.5 `packages/tokens/src/docs.test.ts`

1. In `"ends the pair-count history at the contract's shipped size"`, change the
   anchor to `` `taking it from 394 to **${contrastPairs.length}**` ``.
2. Add a case in the text-hierarchy block: the docs name
   `` `disabledForeground` below `softActionForeground` `` and quote
   `**2.156:1**` (the derived tightest step — compute it from `shippedThemes`
   the way the neighbouring cases do, do not hardcode the source measurement
   beyond the documented value).
3. Add a case in the contract block: `docs/tokens.md` contains
   "a disabled panel action keeps the resting `softAction` fill and paints
   `disabledForeground`".

### 3.6 `docs/tokens.md`

1. In §Status tones → *An action inside a status panel*, after the ghost/filled
   sentences, add the disabled rule (resting fill, `disabledForeground`, no
   step, the ghost state already covered, the 1.0066:1/1.0242:1 reason).
2. In §Text hierarchy, add the seventh tier to the enumerated list and a
   sentence naming it a **state** pair with its tightest shipped step
   (**2.156:1**, high-contrast light on `successSoft`); update the shared-surface
   sentence with "five for the disabled panel-action label below the enabled
   one".
3. Append to the pair-count history after the plan 512 sentence:

   > Plan `514` gives the disabled action inside a tone-tinted panel its resting
   > pair — `disabledForeground` on `softAction` — and the enabled/disabled step
   > its tier, taking `contrastPairs` from 394 to **395**.

   The history's newest sentence must be the one the docs guard anchors on.
4. In §Verification, extend the inactive paragraph: the filled panel action's
   resting label is measured (`inactivePanelActionPairs`) and is a step below
   `softActionForeground`; the hover/press fills are deliberately out of reach.

### 3.7 `docs/design-system.md`

1. §8 disabled row: append the panel action rule with both figures (the canvas
   `disabled` fill at 1.0066:1 on XP light's `warningSoft`; the label is a step
   below `softActionForeground`).
2. §8, near the status-panel action paragraph: one sentence — a disabled raised
   action keeps its fill and dims its label; a ghost action keeps no fill.
3. §9 floor table's inactive row is generated from `inactivePairs`; leave its
   surface list unchanged. Add the panel action to the row's explanation only if
   the existing guard allows it without re-deriving the 13-surface sentence.

### 3.8 `packages/tokens/README.md`

In the status-panel-action paragraph (§ where `softAction(theme)` is introduced),
add: a disabled filled action keeps `softAction` and paints
`disabledForeground`, a step below `softActionForeground`; the canvas `disabled`
fill is 1.0066:1 on XP light's `warningSoft`, so it is not a panel shape.

`readme.test.ts` guards drift; run it.

### 3.9 `COMPONENTS.md`

1. **Theme contrast check** row: "the same 394 contrast pairs" → 395, and add the
   new walk (the disabled panel action's resting pair and its step).
2. **Status tones** row: add the disabled panel-action rule and both lists.
3. **Design tokens** row: only if it enumerates the panel-action states; keep
   the edit to one clause if so.

### 3.10 `TODO.md`

1. Add a ticked rows in **Design tokens and theming**:

   ```
   `[x]` Hold the disabled action inside a status panel — the raised fill is the
   action's shape, so a disabled action keeps `softAction` and paints
   `disabledForeground` (identity dark 4.343:1, AAA dark 5.199:1, so no colour
   moves), and the unavailable label must stay a step below
   `softActionForeground` (2.156:1 at the tightest); `contrastPairs` grows
   394 → 395 and `textTiers` gains its state pair (plan 514)
   ```

2. Add an unchecked cross-team row, because the consumers have not migrated to
   `softAction` yet:

   ```
   `[ ]` Cross-team: `components` paints a disabled action inside a tone-tinted
   Alert or Badge with the resting `softAction` fill and `disabledForeground`,
   not the canvas `disabled` fill (1.0066:1 on XP light's `warningSoft`) and not
   a pointer step; a ghost disabled action keeps no fill. The pairs and the
   enabled/disabled step ship in plan 514 (owner: `components`)
   ```

3. Update the section's progress denominator from 237 to the new total and
   adjust the numerator/bar to the real ticked count (currently 179/239
   including the two `[!]` rows; re-count after the edit).

### 3.11 Plan index

In `.agents/slop/plans/README.md`:

1. Add the table row after 513:

   ```
   | [514](./514-disabled-panel-action.md) | The disabled action inside a status panel | F | 306, 307, 392, 394, 397, 500, 502, 512, 513 | done |
   ```

2. Append a prose paragraph stating the gap, the two measured facts (the canvas
   `disabled` fill at 1.0066:1, the label's 4.343/5.199 floors), the step
   (2.156:1), the counts (394 → 395, tiers 6 → 7), and the cross-team row.

## 4. Commands

Run from the worktree root (`workspaces/tokens-theme`):

```sh
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

While iterating:

```sh
cd packages/tokens && nub x vitest run src/inactive-panel-action.test.ts
```

Expected: the new file's five cases pass; the package suite is 108 files (107 +
1), tests grow by the new cases; all gates pass.

## 5. STOP conditions

Stop and report (do not improvise) if:

- `contrastPairs.length` is not 394 before the change — another plan landed;
  rebase, re-derive the history anchor and the ledger count;
- any shipped set fails `disabledForeground` on `softAction` at its declared
  inactive floor — that is a palette defect, not a missing pair; report the set
  and ratio instead of moving colour;
- the new `textTiers` entry fails on a shipped set (the measured 2.156:1 is the
  shipped minimum; a set below 1.05:1 means the palette changed) — report;
- `softActionActive` becomes readable at AAA in a palette change, so case 5's
  rationale no longer holds — stop and re-derive whether the state fills should
  join the list;
- a docs guard's expected sentence no longer matches after a concurrent docs
  edit — reconcile the document and the guard, never delete the guard.

## 6. Test plan (both directions)

- **Without the fix:** run `inactive-panel-action.test.ts` before editing
  `contrast.ts`. Case 1 fails (no pair), case 3 returns `[]`, and case 4 fails
  on the tier lookup. Case 2 passes either way — shipped sets were never the
  problem.
- **With the fix:** all five pass; `contrastPairs.length` is 395;
  `themeTextTierFailures` reports an edited theme whose disabled label equals
  the enabled one; the docs, ledger and README agree.
- Prove case 5's limitation is real: the AAA dark `disabledForeground` on
  `softActionActive` is 3.519:1, under the 4.5:1 inactive floor. If that ever
  changes, the case fails and the decision is revisited.
- Verify the tier's own two directions with `text-hierarchy.test.ts`: its
  "can fail every tier" loop now covers the new pair because it iterates
  `textTiers`.

## 7. Acceptance

- `themeContrastFailures` reports `disabledForeground` on `softAction` as an
  `inactive` pair for an edited theme whose label matches the fill.
- Every shipped theme clears it at the level it declares, with no colour change.
- `themeTextTierFailures` reports a theme whose disabled panel-action label is
  not a step below the enabled one.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and
  `COMPONENTS.md` name the disabled panel-action state and the 395-pair
  contract; `docs.test.ts`, `inventory.test.ts` and `readme.test.ts` hold them.
- The cross-team consumer row exists in `TODO.md` with the measured reason.
- `nub run check`, `nub run lint` and `nub run test` pass; the commits are on
  `agent/tokens-theme` and pushed.
