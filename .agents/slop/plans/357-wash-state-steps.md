# Plan 357 — The generic wash ladder's press is not in the contract

**Phase:** F · **Owner:** `tokens-theme` · **Status:** done
**Depends on:** 071 (the public contract), 097 (designed filled families), 306
(the inactive class), 309 (fills as surfaces), 334 (the shipped secondary
control's label on the generic washes), 342 (the filled families' step floor),
354 (the interaction-state table), 356 (the last unguarded documentation
surface).
**Owns:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/contrast.test.ts`,
`packages/tokens/src/contrast.example.ts`,
`packages/tokens/src/wash-steps.test.ts` (new),
`packages/tokens/src/docs.test.ts`,
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

Plan `342` published one rule the library already enforced on its own themes:
a filled family walks `x` → `xHover` → `xActive`, and each step must be
perceivable (`contrastRatio(later, earlier) >= 1.05`) or it is not a state. It
did that by adding `stateStepPairs` to `themeContrastFailures`.

The **generic** pointer ladder — `hover` under the pointer, `active` while
pressed — never got the same treatment. It is not a niche wash:

- `primitives/src/core/variants.ts` gives the `ghost` and `outline` button
  variants `hover: { backgroundColor: hover }` and
  `active: { backgroundColor: active }`, and the same pair drives the
  outline toggle's off state;
- `components/src/internal/button.tsx` gives the shipped `secondary` Button
  exactly that pair (plan `334` already holds its *label* on both washes);
- `components/src/menu/item.tsx`, `combobox.tsx` and `collapsible.tsx` paint
  `hover` while highlighted and `active` while pressed.

Every one of those pairs is measured today only as *a wash against a surface*
(`stateFillSurfacePairs`): `hover` on `background`/`card`/`popover`/`muted`
and `active` on the same four. A theme whose `active` is the colour of `hover`
therefore returns `[]` from `themeContrastFailures` while a ghost or outline
control's press paints no visible change — the identical defect plan `342`
fixed one ladder over.

The audit's measurements (all 24 shipped sets: four identity themes, three
platform variants × two modes × two contrast levels, two recipes × two modes ×
two contrast levels):

| Pair | Tightest shipped | Where |
| ---- | ---------------- | ----- |
| `hover` → `active` | **1.059:1** | identity dark and the `default` platform's dark half |
| `secondary` → `hover` (the shipped mixed ladder) | **1.000:1** | 23 of 24 sets — see §7 |
| `accent` → `active` (the selectable row's press) | **1.004:1** | identity dark — see §7 |

The first pair passes everywhere, so the plan **moves no colour**. It publishes
the floor so an edited theme cannot collapse the press, exactly as plan `342`
did for the filled families.

## 2. Decision (do not re-litigate)

- **Publish `active` against `hover` as one `step` pair.** The floor is
  `contrastFloors[level].step`, already 1.05:1 at both levels. No new class, no
  new floor, no colour change.
- **Do not publish `secondary` → `hover` or `accent` → `active`.** Both are
  shipped compositions on the *wrong role pair*, and both fail shipped palettes:
  `secondary` and `hover` are the same neutral in 19 of the 24 shipped sets by
  design (a
  secondary control's resting fill and the generic hover wash), and the
  selectable row's hover is `accent` while its press is the neutral `active`.
  The designed replacements already exist and are already measured —
  `secondaryHover`/`secondaryActive` (plan `097`) and
  `accentHover`/`accentActive` (plan `327`) — so a pair would bless the
  composition the docs tell consumers to migrate away from. Plan `338` set this
  precedent for an unpaletteable composition. The evidence lives in §7 and the
  two cross-team rows instead.
- **Name it `washStepPairs`,** plural, so a second generic ladders can join
  without a rename.

## 3. Exact files and changes

### 3.1 `packages/tokens/src/contrast.ts`

1. After `stateStepPairs` (and before the mark block), add:

   ```ts
   /**
    * The generic pointer ladder. A ghost or outline control paints no fill at
    * rest, the `hover` wash under the pointer and the `active` wash while
    * pressed; the shipped secondary control still paints the same two washes
    * (plan 334) while it migrates to the designed family. A press that is not a
    * step past the hover it follows is not a press, exactly the rule
    * {@link stateStepPairs} publishes for the filled families.
    */
   export const washStepPairs: readonly ContrastPair[] = [
     ["active", "hover", "step"],
   ];
   ```

2. Add `...washStepPairs` to `contrastPairs` immediately after
   `...stateStepPairs`.

3. Extend the `contrastPairs` doc comment with one sentence, after the filled
   family paragraph:

   > The generic washes are a ladder too: `active` is held one perceivable step
   > from `hover` (`washStepPairs`, the same `step` class), because a ghost or
   > outline control paints no fill at rest and its press is the only change the
   > pointer sees.

4. Extend the `themeContrastFailures` doc comment with one clause: a collapsed
   generic press is reported with `pairClass: "step"` and
   `foreground: "active"`, `background: "hover"`.

### 3.2 `packages/tokens/src/contrast.test.ts`

- `expect(contrastPairs.length).toBe(337)` → `338`.
- Import `washStepPairs` and assert `expect(washStepPairs).toHaveLength(1)` in
  the same test (`covers every documented pair`).
- Add `["washStepPairs", washStepPairs]` to `publishedPairLists`, after
  `stateStepPairs`, so the content-uniqueness guard covers it.
- Append one paragraph to the file header's plan history:

  > Plan 357 publishes the generic pointer ladder: `active` is one perceivable
  > step from `hover`, the ghost and outline press. Every shipped set already
  > clears 1.05:1 (identity dark is tightest at 1.059:1), so no colour moves.

### 3.3 `packages/tokens/src/wash-steps.test.ts` (new)

Header comment states the guarded bug: *a ghost or outline control's press was
unmeasured — every wash pair measured a wash against a surface, so a theme whose
`active` equalled `hover` returned `[]` while the press had no visible state;
the shipped secondary control still paints those two washes.*

Cases (pure values, `describe`/`it` from vitest):

1. **Every shipped set passes.** Build the 24 themes the way
   `filled-state-steps.test.ts` does (`themeContrasts` × `themeModes` for the
   identity, `platformNames` without `"default"` × both axes, both recipes at
   both modes and both contrast levels via `getPlatformRecipeTheme(recipe, mode,
   contrast)`); assert
   `contrastRatio(theme.colors.hover, theme.colors.active) >=
   contrastFloors[theme.contrast].step` and that
   `themeContrastFailures(theme).filter(({ pairClass }) => pairClass === "step")`
   has no `active`/`hover` entry.
2. **Identity dark's shipped ladder is measured, not assumed.** Assert the ratio
   is `1.059` to three decimals (the tightest shipped value) and above `1.05`.
3. **A collapsed press is reported.** Override
   `colors: { active: dark.colors.hover }` on `getTheme("dark")` and expect the
   step failures to equal exactly
   `{ foreground: "active", background: "hover", pairClass: "step",
   floor: contrastFloors.default.step, ratio: 1 }`. (That override leaves every
   other pair passing, because `hover` already clears every pair `active` is
   measured on.)
4. **The floor is level-independent.** The same collapse on
   `getTheme("light", "high")` reports `floor: contrastFloors.high.step` and
   `contrastFloors.high.step === contrastFloors.default.step`.
5. **The example the catalogue teaches.** Import `quietPressTheme` and
   `quietPressFailures` from `contrast.example.js` (added in 3.4) and assert the
   failures name only the generic press pair.

### 3.4 `packages/tokens/src/contrast.example.ts`

Append:

```ts
/**
 * A theme whose press is its own hover. Every wash still clears the surface
 * floor on every panel, so the old check passed; `washStepPairs` is what
 * reports the ghost control that no longer reacts to a press.
 */
export const quietPressTheme = extendTheme(getTheme("light"), {
  name: "Quiet press",
  colors: { active: getTheme("light").colors.hover },
});

/** The one generic press pair the quiet theme misses. */
export const quietPressFailures = themeContrastFailures(quietPressTheme);
```

The new test imports the file, so plan `350`'s "every example runs" guard stays
green.

### 3.5 `docs/tokens.md`

1. After the filled-family step paragraph (ends "…so an edited theme that
   collapses a step is reported with the roles and the ratio."), add:

   > The generic washes are a ladder too. A ghost or outline control paints no
   > fill at rest, the `hover` wash under the pointer and the `active` wash while
   > pressed, and the shipped secondary control still paints that pair while it
   > migrates to the designed family. `washStepPairs` holds `active` to 1.05:1
   > from `hover` under the same `step` class, so an edited theme that sets them
   > equal is reported instead of returning `[]`. Every shipped set already
   > clears the floor — identity dark is tightest at **1.059:1** — so no colour
   > moves.

2. In `## Verification`, after the sentence about the inactive floor, add one
   sentence: the generic pointer ladder is held one 1.05:1 step (`washStepPairs`,
   `active` from `hover`), and the audit's cross-team findings (a secondary
   control whose hover is its resting fill, a selectable row whose press is the
   neutral `active` wash) are recorded in `TODO.md` rather than blessed as pairs.

3. In the pair-count history, after the plan `348` sentence
   (`from 333 to **337**`), append:

   > Plan `357` publishes the generic wash ladder — `active` one perceivable step
   > from `hover`, the ghost and outline press — taking it from 337 to **338**.

### 3.6 `docs/design-system.md`

1. §8 `hover` row: after "…instead of compositing an alpha fill", add "; a ghost
   or outline control paints no fill at rest, so its ladder is
   `surface` → `hover` → `active`".
2. §8 `pressed` row: after "filled actions step to `xActive`, one 1.05:1 step past
   their hover", add "— and a ghost or outline control's `active` wash is held
   one 1.05:1 step from its `hover` (`washStepPairs`)".
3. §8, after the paragraph beginning "A filled control steps through its own
   family", add one sentence: "The generic `hover`/`active` pair is a ladder of
   two, not two unrelated washes: `washStepPairs` holds the press one 1.05:1
   step from the hover, so a collapsed press in an edited theme is reported."
4. §9 floor table: replace the
   `| filled-control state steps (…) |` row with one row that covers both
   ladders:

   ```
   | state steps (`xHover` from `x` and `xActive` from `xHover` for `primary`/`secondary`/`destructive`/`accent`, and the generic wash's `active` from `hover`) | 1.05:1 | 1.05:1 |
   ```

### 3.7 `packages/tokens/src/docs.test.ts`

1. In `states the floors the contrast checker enforces`, replace the
   `filled-control state steps` row with the new `state steps` row built from
   `contrastFloors.default.step` / `.high.step`.
2. In `has a floor row for every pair class the checker enforces`, change
   `step: "| filled-control state steps ("` to `step: "| state steps ("`.
3. In `ends the pair-count history at the contract's shipped size`, change the
   expected earlier figure from `333` to `337`, so the assertion reads
   `taking it from 337 to **${contrastPairs.length}**`.
4. Extend `states the filled family's step floor` with:

   ```ts
   expect(markdownProse).toContain("`washStepPairs` holds `active` to 1.05:1");
   ```

### 3.8 `packages/tokens/README.md`

After the plan-342 `stateStepPairs` paragraph, add:

> The generic washes are one ladder: `washStepPairs` holds `active` to 1.05:1
> from `hover`, so a ghost or outline control whose press equals its hover is
> reported at both contrast levels.

### 3.9 `COMPONENTS.md`

`Theme contrast check` row:

- `the same 337 contrast pairs` → `338 contrast pairs`;
- add one sentence after the plan-348 clause: "Plan 357 publishes the generic
  wash ladder — `active` one perceivable step from `hover`, the ghost and
  outline press — taking it from 337 to 338; every shipped set already clears
  1.059:1 at the tightest, so no colour moves."

`Design tokens` row: add "the generic `hover` → `active` press" to the list of
step floors the suite publishes (it already names the selected secondary text,
the wash's perceivability and the interactive fills).

### 3.10 `TODO.md`

Add and tick, in the tokens section:

> `[x]` Publish the generic wash ladder in the public contrast contract — a ghost
> or outline control's press was measured only as `active` on a surface, so an
> edited theme whose `active` equalled `hover` returned `[]` while the press had
> no visible change; `washStepPairs` holds it to the same 1.05:1 `step` floor as
> the filled families, every shipped set passes (1.059:1 at the tightest) and the
> contract grows 337 → 338 (plan 357)

Add two cross-team rows with the measured evidence:

> `[ ]` Cross-team: `components` moves the secondary Button off the mixed
> `secondary` → `hover` → `active` ladder — `internal/button.tsx` rests on
> `secondary` and hovers to `hover`, and the two roles are the **same value** in
> 23 of the 24 shipped sets and are the same value in 19 (identity light and both AAA sets, macOS light and dark,
> Linux dark, Windows light and dark, the XP/Aero dark halves and the `default`
> variants), so the shipped secondary control has **no hover state** there; use
> `secondaryHover`/`secondaryActive`, the designed family plan 097 shipped and
> plan 334 already holds the label on (plan 357)

> `[ ]` Cross-team: `components` moves a selectable `List` row's press off the
> neutral `active` wash — `list.tsx` hovers to `accent` and presses to `active`,
> which measure **1.004:1** in identity dark (and the `default` dark half) and
> **1.019:1** in the XP light recipe, under the 1.05:1 step floor, so a pressed
> row changes hue but not luminance; use `accentActive`, the designed pressed
> accent plan 327 shipped and `washStepPairs`/`stateStepPairs` already measure
> (plan 357)

### 3.11 `.agents/slop/plans/README.md`

Add the row to the tokens table and one paragraph to the rationale series:

```
| [357](./357-wash-state-steps.md) | The generic wash ladder's press | F | 071, 097, 306, 309, 334, 342, 354, 356 | done |
```

Paragraph: plan 342 published the filled families' step; the generic ladder
(`hover` → `active`) that every ghost, outline, menu and secondary control
paints was still measured only against surfaces, so a collapsed press passed.
The pair moves the contract 337 → 338 with no colour change; the audit also
found two shipped compositions on the wrong role pair (the secondary control's
`secondary`/`hover` collision in 23 of 24 sets and the selectable row's
`accent`→`active` press at 1.004:1) and records them cross-team rather than
blessing them.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/tokens test` | 72 files pass (71 + `wash-steps.test.ts`), 0 failures |
| `nub run check` | `check:tests`, lint, format and every workspace type-check pass |
| `nub run lint` | exit 0 |
| `nub run test` | every workspace passes |

If `contrastPairs.length` is not 338 after the change, **STOP** and report the
actual count with `washStepPairs` printed; do not adjust the test to fit.

## 5. STOP conditions

- Any *shipped* theme fails the new `active`/`hover` step. Report the theme and
  ratio; do not move a colour in this plan.
- The collapse case in §3.3 reports more than one failure. That means the
  override touches another measured pair; report the extra failures instead of
  weakening the assertion.
- A test outside the files in §2 fails for a reason other than a count. STOP and
  report; do not edit another workstream's file.

## 6. Test plan — prove both directions

1. Write `wash-steps.test.ts` **before** adding `washStepPairs`, with the
   contract import. Run the suite: the file fails on the collapse case (no
   `step` pair for `active`/`hover`). That proves the test can fail.
2. Add the pair, the example and the exports. Re-run: all green.
3. Temporarily set `darkColors.active = darkColors.hover` in `color.ts` and run
   the suite: the shipped-theme case and the checker case fail. Revert.
4. `git diff --stat` at the end: only the files in §2 are touched.

## 7. Found while auditing (recorded, not fixed here)

Both are consumer compositions on the wrong role pair; a pair would bless what
the docs tell consumers to migrate away from (plan 338's precedent).

1. **`components` secondary Button.** `internal/button.tsx` rests on `secondary`
   and hovers to `hover` (then presses to `active`). The pair is below the
   1.05:1 step floor in **23 of the 24 shipped sets**, and the two roles are the
   *same value* in **19** of them — identity light (`#EEF1F5`), both AAA sets
   (`#E8E8E8` light, `#2E2E2E` dark), macOS light (`#E8E8ED`) and dark
   (`#3A3A3C`), Linux dark (`#3A3A3A`), Windows dark (`#383838`) and the XP/Aero
   dark halves — so the shipped secondary control has no hover state there;
   Windows light measures 1.018:1, Linux light 1.019:1, XP light 1.026:1 and
   Aero light 1.040:1, all under the floor. Only the identity dark default set
   passes (1.059:1). A split into two 1.05:1 steps is impossible in macOS dark
   (rest→press is 1.097:1) and XP light (1.052:1) without moving `active` as
   well, which is why the fix is the designed `secondaryHover`/
   `secondaryActive` family.
2. **`components` selectable row.** `list.tsx` hovers a selectable row to
   `accent` and presses it to `active`, measuring **1.004:1** in identity dark
   and the `default` dark half and **1.019:1** in XP light. `accentActive` is the
   designed press (plan 327) and the family steps are already measured.

## 8. Acceptance

- `washStepPairs` is exported, has one pair, and appears in `contrastPairs`.
- `themeContrastFailures` reports a collapsed generic press with
  `pairClass: "step"` and `floor: 1.05` at both contrast levels.
- Every shipped theme passes; no colour value changes.
- `docs/tokens.md`, `docs/design-system.md`, the README and `COMPONENTS.md`
  agree with the implementation; the counts are derived by tests.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 9. Implementation record

- `washStepPairs` (`active` from `hover`, `step`) is exported and in
  `contrastPairs`; the contract is **338** pairs.
- `wash-steps.test.ts` holds the 24 shipped sets, the identity dark 1.059:1
  figure, the collapse on both contrast levels and the executed
  `quietPressTheme` example.
- Both directions were proven: removing `...washStepPairs` from `contrastPairs`
  failed 3 of the 6 new cases, and setting identity light `active` to `hover`
  failed the shipped-set case. Both changes were reverted.
- `nub run check`, `nub run lint` and `nub run test` are green (72 files, 4261
  tests in `@gpuixui/tokens`).
- The two cross-team findings are in `TODO.md`; no colour, role or floor moved.
