# Plan 342 — The filled family's step is not in the public contract

**Phase:** F · **Owner:** `tokens-theme` · **Status:** ready
**Depends on:** 071 (the public contract), 097 (the designed family),
327 (the accent family), 306 (a pair class with its own intent), 338
(`filledControl`), 341 (the last pair added).
**Owns:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/contrast.test.ts`,
`packages/tokens/src/filled-states.test.ts`,
`packages/tokens/src/filled-state-steps.test.ts` (new),
`packages/tokens/src/docs.test.ts`,
`packages/tokens/src/inventory.test.ts`,
`packages/tokens/src/mark-contrast.test.ts`,
`packages/tokens/README.md`,
`docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`,
`.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

`contrast.ts` is the contract a **consumer** runs:
`themeContrastFailures(theme)` must return every documented pair the theme
misses, so an edited platform style or a brand theme gets the library's
guarantee in one assertion.

The filled-control state matrix has two rules:

1. each family's three fills (`x`, `xHover`, `xActive`) exist and are distinct;
2. each step is **perceivable**: `contrastRatio(x, xHover) >= 1.05` and
   `contrastRatio(xHover, xActive) >= 1.05`.

Rule 1 is enforced by `filled-states.test.ts` (a *shipped-theme* test) and rule 2
is enforced there too — but **neither rule is in `contrastPairs`**, so
`themeContrastFailures` never sees them. A consumer theme whose
`primaryHover === primary` returns `[]` from the checker while its primary
button has no hover: `stateFillSurfacePairs` measures each fill against the
surfaces behind it, and a fill that equals the fill before it still clears every
surface pair.

This is the same class of gap plans 071 and 332 closed: a rule the library
enforces on its own themes but does not publish. The fix is to move the step
floor into the contract as eight pairs — `xHover` against `x`, and `xActive`
against `xHover`, for `primary`, `secondary`, `destructive` and `accent` — and
give them their own pair class, `step`, because a state step is not "a surface
against a panel" (the `surface` class) and filters in `docs.test.ts` and
`contrast.test.ts` key on `(fill role, "surface")`; reusing `surface` would
change what those filters select.

The step is **1.05:1 at both levels**. A perceivable change is not a WCAG text
floor: default and high contrast use the same number, exactly as the
shipped-theme test asserts today.

## 2. Files and exact changes

### 2.1 `packages/tokens/src/contrast.ts`

1. Add `"step"` to `ContrastPairClass`, after `"surface"`, with this comment:

   ```ts
   /**
    * One designed state of a fill against the state before it. A hover or a
    * press that is not perceivable is not a state; the floor is the same at
    * every contrast level because the change is geometry-like, not text.
    */
   | "step"
   ```

2. Add the pair list beside `stateFillSurfacePairs`:

   ```ts
   /**
    * The designed steps within each filled family. A filled control walks
    * `x` → `xHover` → `xActive`; each step must be perceivable against the fill
    * before it, or the pointer state is invisible on an edited theme. The
    * shipped themes are held to this by `filled-states.test.ts`; these pairs
    * expose the same rule through `themeContrastFailures`.
    */
   export const stateStepPairs: readonly ContrastPair[] =
     filledStateFamilies.flatMap((family) => [
       [`${family}Hover`, family, "step"],
       [`${family}Active`, `${family}Hover`, "step"],
     ] as const);
   ```

   with, above it:

   ```ts
   /** The colours a filled control steps through, in documentation order. */
   const filledStateFamilies = [
     "primary",
     "secondary",
     "destructive",
     "accent",
   ] as const;
   ```

   (The list is local; `styles.ts` keeps `filledControlFamilies` for the
   runtime helper. Do **not** import it — `contrast.ts` must not gain a runtime
   dependency on `styles.ts` beyond the existing `statusTones` import if that
   would create a cycle. `statusTones` is already imported from `./styles.js`,
   so importing `filledControlFamilies` would also work; prefer importing it
   instead of duplicating the list **if** `pnpm`/`tsc` reports no cycle. If in
   doubt, use the local list and add a test that it matches
   `filledControlFamilies`.)

   → Preferred final shape: import `filledControlFamilies` from `./styles.js`
   and use it, so the family list has one owner. `styles.ts` imports only types
   from `theme.js`, and `contrast.ts` already imports `statusTones` from it, so
   there is no new cycle.

3. Add `...stateStepPairs` to `contrastPairs`, after `...stateFillSurfacePairs`
   and before `...markPairs`.

4. Add `step: 1.05` to both levels of `contrastFloors`, after `surface`.

5. Extend the `contrastPairs` doc comment with one sentence: the filled families
   are measured as fills on the panels they paint on **and** one perceivable
   step from the fill before them (`stateStepPairs`, the `step` class).

6. Extend the `themeContrastFailures` doc comment with one sentence: a collapsed
   hover or press inside a filled family is reported with `pairClass: "step"`.

### 2.2 `packages/tokens/src/contrast.test.ts`

- `expect(contrastPairs.length).toBe(306)` → `toBe(314)`.
- In the same test, after the uniqueness assertion, add
  `expect(stateStepPairs).toHaveLength(8);` and
  `expect(new Set(stateStepPairs).size).toBe(8);` — and import
  `stateStepPairs`.

Count: 4 families × 2 steps = 8. 306 + 8 = 314.

### 2.3 `packages/tokens/src/filled-states.test.ts`

In the test named `"measures every filled state role in the contrast
contract"`, add a loop that asserts the step pairs are in the contract, so the
shipped-theme rule and the public rule cannot drift:

```ts
expect(
  contrastPairs.some(
    ([foreground, pairBackground, pairClass]) =>
      pairClass === "step" &&
      foreground === `${family}Hover` &&
      pairBackground === family,
  ),
  `${family}Hover step`,
).toBe(true);
```

(and the same for `${family}Active` against `${family}Hover`). Keep the
existing per-theme assertions: they prove the *shipped* values, the contract
proves an *edited* theme.

### 2.4 `packages/tokens/src/filled-state-steps.test.ts` (new)

Header comment must state the bug this guards: *a filled family whose hover or
press equals the fill before it was accepted by `themeContrastFailures`, because
the step floor lived only in `filled-states.test.ts` and ran on shipped themes.*

Cases:

1. **The shipped sets pass.** Every identity, platform and recipe theme at both
   contrast levels returns no failure with `pairClass === "step"` (build the
   list the way `filled-states.test.ts` does: `themeModes`, `themeContrasts`,
   `platformNames` without `"default"`, `platformRecipeNames`;
   `getTheme`, `getPlatformTheme`, `getPlatformRecipeTheme`).
2. **A collapsed hover is reported.** `extendTheme(getTheme("light"), { colors:
   { primaryHover: getTheme("light").colors.primary } })` — expect
   `themeContrastFailures` to contain exactly
   `{ foreground: "primaryHover", background: "primary", pairClass: "step",
   floor: 1.05, ratio: 1 }`.
3. **A collapsed press is reported.** Same with
   `secondaryActive: secondaryHover` — the pair is
   `secondaryActive`/`secondaryHover`.
4. **The step is a step at AAA too.** Build the same collapse on
   `getTheme("light", "high")` and expect `floor` `1.05` (not `3`): the step
   floor is level-independent.
5. **The family list has one owner.** `expect(stateStepPairs).toHaveLength(
   filledControlFamilies.length * 2)`.

Use `describe`/`it` from vitest, no Effect needed (pure values).

### 2.5 `docs/tokens.md`

1. Append to the pair-count history paragraph that ends at plan `341`
   (`taking it from 305 to **306**`):

   > Plan `342` publishes the filled families' step floor: each `xHover` is held
   > to one perceivable step from its `x` and each `xActive` from its `xHover`,
   > taking it from 306 to **314**.

   Keep the existing sentence structure; the guard in `docs.test.ts` reads
   `taking it from 305 to **${contrastPairs.length}**`, so the earlier sentence
   is unchanged and the new one makes the *latest* sentence's number 314.
2. In the filled-control-states paragraph, add one sentence after
   "`filled-states.test.ts` proves the direction follows the mode": the same
   step is in the public checker (`stateStepPairs`, `pairClass: "step"`), so an
   edited theme that collapses a step is reported with the roles and the ratio.
3. The floors code block is derived by `docs.test.ts` from
   `Object.entries(contrastFloors)`; update it to:

   ```ts
   contrastFloors.default; // { body: 7, secondary: 4.5, inactive: 3, boundary: 3, mark: 3, surface: 1.05, step: 1.05, divider: 1.05 }
   contrastFloors.high; // { body: 7, secondary: 7, inactive: 4.5, boundary: 4.5, mark: 4.5, surface: 1.05, step: 1.05, divider: 3 }
   ```
4. Change the audit-series sentence `plans \`076\`–\`341\` closed.` to
   `plans \`076\`–\`342\` closed.`
5. In the Verification section, the bullet that lists the filled-control checks
   gains "and one perceivable step between each family's fills (`step`, 1.05:1
   at every level)".

### 2.6 `docs/design-system.md`

1. §8 hover and pressed rows: after the 1.05:1 surface sentence, add "and one
   1.05:1 step from the fill before it — `x` → `xHover` → `xActive`".
2. §9 table: add this row **after** "interactive fills and washes" —

   ```
   | filled-control state steps (`xHover` from `x`, `xActive` from `xHover`, for `primary`/`secondary`/`destructive`/`accent`) | 1.05:1 | 1.05:1 |
   ```

   The row is guarded by the `docs.test.ts` rows list (2.7), so both documents
   and the floors move together.

### 2.7 `packages/tokens/src/docs.test.ts`

1. Add the new §9 row to the `rows` array in "states the floors the contrast
   checker enforces", written from `contrastFloors.default.step` /
   `contrastFloors.high.step` like its neighbours.
2. Change `expect(prose).toContain("plans \`076\`–\`341\` closed")` to `342`.
3. In "ends the pair-count history at the contract's shipped size", no change is
   needed (it reads `contrastPairs.length`); confirm it still passes.
4. Add a case named `"states the step floor beside the fill floor"` asserting
   `markdownProse` contains `"one perceivable step from its \`x\`"` and
   `"stateStepPairs"`, so the new prose cannot drift.

### 2.8 `packages/tokens/src/inventory.test.ts`

`floorRow` builds the ledger's tuple by hand. Insert `floors.step` after
`floors.surface`.

### 2.9 `COMPONENTS.md`

1. `Theme contrast check` row:
   - `306 contrast pairs` → `314 contrast pairs`;
   - the floor tuple `… 1.05 / 1.05 default, 7 / 7 / 4.5 / 4.5 / 4.5 / 1.05 / 3
     high contrast` becomes `… 1.05 / 1.05 / 1.05 default, 7 / 7 / 4.5 / 4.5 /
     4.5 / 1.05 / 1.05 / 3 high contrast` (order: body, secondary, inactive,
     boundary, mark, surface, step, divider);
   - add one sentence after the plan 341 sentence: "Plan 342 publishes the filled
     families' step floor — `xHover` one perceivable step from `x`, `xActive`
     from `xHover` — so an edited theme that collapses a hover or a press is
     reported (306 → 314 pairs)."
2. `Filled control states` row: add one clause naming `stateStepPairs` and the
   `step` floor beside the existing "`filled-states.test.ts` proves the
   direction…" sentence.

Do **not** change the 64-role count or any role value: no colour moves.

### 2.9b `packages/tokens/README.md`

After the paragraph that ends "the two light accents one step deeper." (the
`stateFillSurfacePairs` paragraph), add:

> Each filled family also walks `x` → `xHover` → `xActive`, and a step that is
> not perceivable is not a state: `stateStepPairs` holds every `xHover` to
> 1.05:1 from its `x` and every `xActive` from its `xHover`, under the `step`
> class, at both contrast levels.

### 2.10 Plan index and TODO
- Add the plan row to `.agents/slop/plans/README.md` (block `300–399`):
  `| 342 | The filled family's step in the public contract | F | 071, 097, 306, 327, 338, 341 | done |`
  plus a paragraph in the rationale series after 341.
- In `TODO.md`, tokens section: add and tick
  `[x] Publish the filled families' step floor in the public contrast contract — a collapsed hover or press was invisible to `themeContrastFailures` because the 1.05:1 step lived only in `filled-states.test.ts` (plan 342)`.

## 3. Commands and expected results

Run from the worktree root.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/tokens test` | 62 files pass (61 + the new file), 0 failures |
| `nub run check` | `check:tests` passes, lint passes, format passes, every workspace type-checks |
| `nub run lint` | no output, exit 0 |
| `nub run test` | every workspace passes |

If `contrastPairs.length` is not 314 after the change, **STOP** and report the
actual number with the eight new pairs printed; do not adjust the test to fit.

## 4. STOP conditions

- Any *shipped* theme fails a new `step` pair. That means a delivered family
  already steps below 1.05:1 — report the theme, the family and the ratio, and
  do not move a colour in this plan (a palette change needs its own plan).
- `tsc` reports an import cycle after `contrast.ts` imports
  `filledControlFamilies`. Use the local list plus the equality test in 2.4 §5
  and note the decision in the plan index.
- The `docs.test.ts` derived floors block cannot be made to match because
  `Object.entries` order differs. Match the object's declaration order; do not
  hand-write a different order in the document.
- Any test outside the files listed in §1 fails for a reason other than the
  count. STOP and report; do not edit another workstream's file.

## 5. Test plan — prove both directions

1. Write `filled-state-steps.test.ts` **before** adding the pairs, run
   `nub run --filter @gpuixui/tokens test`. Expected: the file fails on the
   contract cases (no `step` pairs exist) — this proves the test can fail.
2. Add the pairs and the class. Re-run: everything passes.
3. Temporarily set `primaryHover: primary` in `getTheme("light")`
   (`color.ts`) and run the suite: the new regression case and the generic
   shipped-theme loops must fail. Revert — every shipped theme passes again.
4. `git diff --stat` at the end: only the files in §1 are touched.

## 6. Acceptance

- `stateStepPairs` is exported, has 8 pairs, and appears in `contrastPairs`.
- `themeContrastFailures` reports a collapsed hover or press with
  `pairClass: "step"` and `floor: 1.05` at both contrast levels.
- Every shipped theme (identity light/dark, both AAA sets, three platform
  variants, two recipes) returns no step failure.
- `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md` and the README
  agree with the implementation, and every number in them is derived by a test.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Found while auditing (recorded, not fixed here)

The same audit that found the contract gap measured two shipped compositions
whose paint is on the wrong role. They belong to other workstreams, so they are
`TODO.md` cross-team rows plus a line in the design system's mark section — not
pairs (a pair would bless a composition no palette can pass):

1. **`primitives` selection controls.** `selectionBoxStyle` and
   `switchTrackStyle` set `active: { borderColor: ring }` on a filled box whose
   fill is `primary` or `destructive`. `ring` measures **1.000:1** on `primary`
   in the identity dark, Linux dark, Windows dark, the XP and Aero dark recipes
   and both AAA dark sets, and 1.000:1 on `primary` in the macOS, Linux and
   Windows light variants; on `destructive` it measures 1.02–1.42:1. A pressed
   checked checkbox or switch therefore shows no change on its only state
   signal. The hover and press fills are also `alpha(fill, 0.9/0.8)` — plan 097's
   defect one component over. `filledControl(theme, family)` is the shipped
   replacement.
2. **`components` menu highlight bar.** `menu/item.tsx` paints a 2px left border
   in `accent` on the highlighted row. `accent` measures 1.118–1.392:1 on the
   menu's `popover` and 1.000–1.113:1 on the `hover` fill the row also paints,
   under the 3:1 mark floor. `borderStrong` is the functional boundary and is
   already measured on `popover`, `hover` and `active`; `popoverForeground` is
   the row's own text role.
