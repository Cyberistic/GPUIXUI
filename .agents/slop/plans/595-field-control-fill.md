# 595 — The interactive fill a control paints inside a field

**Phase:** F (contract completeness)
**Depends on:** 309 (the fill-on-surface contract), 353 (component dimensions and
the field's adornment), 357 (the generic wash ladder), 394 (the panel action),
503 (the track's row washes), 527 (a field inside a row)
**Owner:** `tokens-theme`
**Paths:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/field-control-fill.test.ts` (new),
`packages/tokens/src/state-fill-surfaces.test.ts`,
`packages/tokens/src/contrast.test.ts`, `packages/tokens/src/docs.test.ts`,
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md`

## Why

A field is a surface that hosts controls. `packages/primitives`' `NumberField`
paints its chrome with `fieldRecipeStyle`, whose `fieldPaint` sets
`backgroundColor: theme.colors.input`, and renders its two step buttons with
`numberStepperStyle` — `hover: { backgroundColor: theme.colors.hover }` and
`active: { backgroundColor: theme.colors.active }` (`core/style.ts`, the same
resolver a ghost control uses). The steppers are children of the field, so the
wash they paint lands **on the field's `input` fill**. A field's adornment slot
(`dimensions.fieldAdornmentSize`, plan 353) and an input-group action are the
same composition, and a chip inside a field paints one of the other interactive
fills there too.

`stateFillSurfaces` names the surfaces an interactive fill is painted on:

```ts
export const stateFillSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;
```

`input` is not in the list, so `stateFillSurfacePairs` measures every one of the
fifteen fills on four surfaces and none on the field the stepper actually paints
on. A probe on the identity light theme with

```ts
const plant = extendTheme(getTheme("light"), {
  colors: { input: getTheme("light").colors.hover },
});
```

returns `[]` from `themeFailures(plant)` — all nine checks pass — while
`contrastRatio(plant.colors.hover, plant.colors.input)` is **1.000:1** and
`hover` on `card` is 1.133:1. So the copied theme erases the NumberField
stepper's hover and press, and the checker that exists to catch exactly that
composition reports nothing. The same hole covers `secondaryHover` and
`secondaryActive` on an input-group action, `accent`/`selected` on a chip, and
the filled families on a button placed inside a field.

A second probe over all twenty-four shipped sets shows every interactive fill
already clears the 1.05:1 `surface` floor on `input`; the tightest is
`accent` on `input` at **1.1176:1** (Dark · Windows), then `hover` and
`secondary` at **1.1329:1** (Light). So the missing surface is a contract hole,
not a palette defect: adding it moves no shipped colour.

## What to change

### 1. `packages/tokens/src/contrast.ts`

Add `"input"` after `"muted"` in `stateFillSurfaces`:

```ts
/**
 * The surfaces an interactive fill is painted on: the canvas, a card, a
 * popover (a menu item), the quiet `muted` panel (a sidebar row or a
 * settings-group control) and the field's `input` fill. A field hosts its own
 * controls — the NumberField steppers, a field adornment action or an
 * input-group button — and a chip can sit inside it, so a wash or fill that
 * matches the field is not a state. A fill that matches its panel is not one
 * either.
 */
export const stateFillSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "input",
] as const;
```

Nothing else in the module changes: `stateFillSurfacePairs` is derived from the
two lists, `stateFillCompositions` (used to dedupe `statusFillPairs`) gains the
new pairs and the chip filter is unaffected because `input` is not a
`chipSurfaces` member. The contract grows by 15 pairs: 60 → 75 fill-on-surface
pairs and 405 → 420 in `contrastPairs`.

### 2. `packages/tokens/src/field-control-fill.test.ts` (new)

State the bug in the header: the NumberField's steppers paint `hover`/`active`
on the field's `input` fill, `stateFillSurfaces` omitted `input`, and a theme
with `input = hover` passed all nine checks while the wash measured 1.000:1.

Cases:

1. **The plant is accepted by every other check.** Build the theme above and
   assert `themeFailures(plant)` is `[]` *before* the fix is applied — after the
   fix this case must instead assert the failure, so write it as the regression:
   the plant reports a `contrast` failure with `foreground: "hover"`,
   `background: "input"`, `pairClass: "surface"`, `floor` equal to the declared
   level's surface floor and `ratio === 1`. This case fails without `input` in
   the list (the checker returns `[]`), and it is the defect stated in the
   test's own terms. Use `expect(...).toContainEqual(...)` on the failure
   object, not a length assertion, so a second unrelated pair cannot satisfy
   it.
2. **Every interactive fill is measured on the field.** For every
   `stateFillRoles` member, assert `stateFillSurfacePairs` contains
   `[fill, "input"]`; assert `stateFillSurfaces` contains `"input"` once.
3. **Every shipped set clears the floor on the field.** For every
   `shippedThemes` entry and every `[fill, "input"]` pair, assert the ratio is
   at or above `contrastFloors[theme.contrast].surface`, labelled with
   `theme.name`. Assert the tightest pair is `accent` on `input` at
   `1.1176` to two decimals so a future palette edit cannot silently move the
   claim this plan publishes. (Derive the tightest entry from the shipped walk
   rather than retyping the fill name; the figure is the shipped minimum.)
4. **The ghost wash ladder is the one a stepper paints.** Assert
   `stateFillSurfacePairs` contains `["hover", "input", "surface"]` and
   `["active", "input", "surface"]`, and that `washStepPairs` still holds the
   press a perceivable step above the hover, so this plan adds the surface
   without redefining the ladder.

### 3. `packages/tokens/src/state-fill-surfaces.test.ts`

- Change `expect(stateFillSurfacePairs).toHaveLength(60)` to `75` and the title
  from "the four surfaces it paints on" to "the five surfaces it paints on".
- The derived `stateFillRoles.length * stateFillSurfaces.length` assertion
  follows automatically.
- The header comment's "the four panels" is now five surfaces; adjust the
  wording. Do not change any shipped ratio case.

### 4. `packages/tokens/src/contrast.test.ts`

- `expect(contrastPairs.length).toBe(405)` → `420`.

### 5. `packages/tokens/src/docs.test.ts`

- In the exact-row array for "states the floors the contrast checker enforces",
  the interactive-fill row's surface list becomes
  `` `background`/`card`/`popover`/`muted`/`input` ``. Keep the rest of the row
  text identical.
- Update the comment in "names every interactive fill and the surfaces it is
  held against" from "four panels" to "five surfaces" if it names the count.
- No other case changes: the derived checks (`stateFillSurfaces.forEach`) will
  require the documents to name `input` in the interactive-fill clauses, which
  step 6 supplies.

### 6. `docs/tokens.md`

In the interactive-fill paragraph ("An interactive fill is a surface too…"):

- say the fifteen fills are held on **five** surfaces: `background`, `card`,
  `popover`, the quiet `muted` panel and the field's `input` fill;
- state the shipped composition and the probe: the NumberField steppers paint
  `hover`/`active` inside the field, and a theme with `input = hover` returned
  `[]` from `themeFailures` while the wash measured **1.000:1**; every shipped
  set already clears the floor on `input` (tightest **1.1176:1**, `accent` on
  `input` in Dark · Windows), so no colour moves and the contract grows 405 →
  420;
- change the pair-count history sentence "taking it from 396 to **405** across
  plans `527` and `557`" to "taking it from 396 to **420** across plans `527`,
  `557` and `595`." (the sentence is the running endpoint the docs guard
  asserts);
- add plan `595` to the narrative in the same paragraph, naming
  `stateFillSurfaces` as the owner.

### 7. `docs/design-system.md`

- In §7 (radii, borders and elevation) the sentence "every fill and wash is
  also held to 1.05:1 against the four surfaces it paints on — `background`,
  `card`, `popover` and the quiet `muted` panel" becomes five surfaces, naming
  the field's `input` fill and the reason (the field hosts its own controls).
- In §8's interaction-state table:
  - the **hover** row adds the field's `input` fill to the surface list, with
    "a field's stepper or adornment action paints its wash there";
  - the **pressed** row does the same.
- In §9's accessibility floor table, the interactive-fills row adds `/input`
  to the surface list (the exact row is guarded; keep the rest identical).

### 8. `packages/tokens/README.md`

The guard derives this sentence from `stateFillSurfaces`, so update the prose
to:

> `stateFillSurfacePairs` holds every interactive fill — the two washes, the
> `accent` family at rest, hover and press, `selected` and the
> `primary`/`secondary`/`destructive` families — to 1.05:1 on `background`,
> `card`, `popover`, `muted` and `input`, because a fill that matches its panel
> is not a state and a field hosts its own controls.

and keep the rest of the paragraph. `sentenceList` renders the same five names
in `stateFillSurfaces` order, so the test passes only when the list and the
sentence agree.

### 9. `COMPONENTS.md`, `TODO.md`, plan index

- In the **Theme contrast check** row, change the leading "the same 405 contrast
  pairs" to "the same 420 contrast pairs" and append one sentence before the
  final `|`: "Plan 595 holds every interactive fill on the field's `input` fill
  the NumberField steppers paint their hover and press on: an edited theme with
  `input = hover` passed all nine checks while the wash measured 1.000:1, so the
  surface joins the list (405 → 420 pairs) and every shipped set already clears
  the floor (tightest 1.1176:1)."
- Add one ticked row at the end of the design-tokens section:
  `[x]` Hold every interactive fill on the field's `input` fill — the
  NumberField steppers paint `hover`/`active` there and a theme with
  `input = hover` passed all nine checks while the wash measured 1.000:1; the
  surface joins `stateFillSurfaces` (405 → 420 pairs), every shipped set already
  clears 1.05:1 (1.1176:1 at the tightest, Dark · Windows `accent`) and no
  colour moves (plan 595).
  Advance the progress numerator by one.
- Add plan 595 to `.agents/slop/plans/README.md` after 592 with status `done`,
  and a narrative paragraph that names the defect, the probe and the count.

## Commands and expected results

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `nub run --filter @gpuixui/tokens test -- src/field-control-fill.test.ts` →
   the four new cases pass after the change; case 1 fails before it
   (`themeFailures(plant)` is `[]` when `input` is absent).
3. `nub run --filter @gpuixui/tokens test` → green (the four new cases
   included).
4. `nub run check` → exit 0.
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

Both directions: with `"input"` removed from `stateFillSurfaces`, case 1 fails
(`themeFailures(plant)` has no `contrast` failure) and case 2 fails on the
missing pair; with it restored every case passes, every shipped ratio is above
the floor and no token value moves. The document cases fail before the three
pages are updated.

## STOP conditions

- Any shipped `[fill, input]` pair measures under its declared 1.05:1 floor —
  stop and report; do not move a shipped colour or narrow the list. (The probe
  says the minimum is 1.1176:1, so this should not happen.)
- `themeFailures(plant)` reports a failure for a pair other than `hover` on
  `input` — the plant is not isolating the defect; adjust the test theme rather
  than weakening the assertion.
- A docs guard derives the surface list and cannot be satisfied by naming
  `input` in the three documents — stop and show the failing derived list.
- The pair-count guard disagrees with 420 after the change — the list was not
  added once; recount `stateFillRoles.length * stateFillSurfaces.length`
  (15 × 5 = 75) before editing a number.

## Acceptance

- `stateFillSurfaces` names `input` and the contract holds all fifteen
  interactive fills on it, 405 → 420 pairs.
- A theme with `input = hover` is reported by `themeFailures` as a `surface`
  failure with `ratio === 1`; without the change it returned `[]`.
- Every shipped set clears the floor on `input` and no colour, metric, pair
  floor or existing ratio moves.
- The reference, design system, README and ledger name the field and the
  evidence; the plan is indexed.
- `nub run check`, `nub run lint` and `nub run test` pass.

## Outcome

Landed on `agent/tokens-theme`. `stateFillSurfaces` names the field's `input`
fill and `stateFillSurfacePairs` grows 60 → 75 (contract 405 → 420). The plant —
identity light with `input = hover` — is now reported as a `surface` failure at
**1.000:1**; before the change all nine checks returned `[]` while the shipped
NumberField stepper had no hover or press. Every shipped set already cleared the
1.05:1 floor on `input` (tightest **1.1176:1**, `accent` on `input` in
Dark · Windows), so no colour moves. The reference, design system, README and
ledger name the composition and the probe. Both directions were verified:
removing `input` fails the regression case and the pair case; the document cases
failed before the three pages were updated. The suite grows by four cases
(5,966 tests, 152 files). `nub run check`, `nub run lint` and `nub run test`
pass.
