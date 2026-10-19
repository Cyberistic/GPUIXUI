# 659 — The field's own content inside a status panel and a pressed selected row

**Phase:** F (an edited theme must not erase painted content) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 092 (a field inside a tone-tinted Alert), 306/307 (the inactive
state on soft fills), 315/317/319 (typed text and the hint on the surfaces a
field sits on), 391 (the contrast reference names its lists), 527 (the same two
roles on the row washes), 649 (the latest audit of a painted surface), 651 (the
pressed selected row) ·
**Number block:** 500–699 (`tokens-theme` overflow; the highest shipped plan is
`658`, so `659` is the next free) ·
**Status:** done

## 1. The defect

Two painted compositions have no contrast pair, and one of them already fails in
a shipped theme.

**A field inside a tone-tinted status panel.** `contrast.ts`'s
`controlBoundarySoftPairs` records the composition in its own JSDoc:

> A tone-tinted Alert carries an action — a field, a "don't show again"
> checkbox — and inline validation renders inside a soft `destructive` block, so
> the edge a reader uses to see an unchecked control is painted on these fills
> too.

`softBodyPairs` measures the Alert's *body* (`foreground`) on the four soft
fills, and `softPanelTextPairs` measures a caption and a link. The two roles a
field itself paints are missing: `inputForeground` (its typed text) and
`placeholder` (its hint). `inputTextSurfacePairs`/`inputTextWashPairs` and
`placeholderSurfacePairs`/`placeholderWashPairs` name the `input` fill, the four
`Surface` tones and the four row washes — not the four soft status fills.

A probe (2026-10-19) of the shipped identity light theme finds
`placeholder: "#5C6574"` on the soft fills:

| Surface | Ratio | Floor |
| ------- | ----- | ----- |
| `destructiveSoft` | **4.4390:1** | 4.5 (`secondary`) |
| `successSoft` | **4.4954:1** | 4.5 |
| `warningSoft` | 4.5601:1 | 4.5 |
| `infoSoft` | 4.5649:1 | 4.5 |

The high-contrast light palette's hint (`#3D4047`) has the same gap one floor
up: **6.9929:1** on `destructiveSoft`, under the 7:1 AAA secondary floor, and
every AAA light set (the identity and its five platform variants) reads it.

Two of the four identity light pairs are below the library's own secondary floor
while `themeFailures(getTheme("light"))` returns `[]`. A hint in a
validation block or an inline Alert is the exact surface `destructiveSoft`
exists for. Typed text (`inputForeground`) passes in every shipped set
(10.455:1 at the tightest) but is unmeasured: an edited theme can collapse it
with no diagnostic.

**A transparent field in a pressed selected row.** Plan `527` added
`inputForeground` and `placeholder` to the four row washes an `InlineEdit`
paints, and plan `651` added `selectedActive` as the fifth row surface. Its
`selectionPressPairs` carries the row's title, inherited label, metadata, hint,
link, disabled label and chrome — and `placeholder` is there — but **not**
`inputForeground`. A reader who presses a selected row that holds an open
in-place editor paints typed text on `selectedActive` with no pair behind it.

Every shipped set clears the missing pairs (`inputForeground` on the four soft
fills ≥ 10.455:1, on `selectedActive` ≥ 11.432:1), so the only colour that moves
is the identity light hint that already fails.

## 2. Decision

1. **Publish the composition** as `softFieldPairs`: `inputForeground` (body) and
   `placeholder` (secondary) on each of the four soft status fills — eight pairs,
   derived from `statusTones`.
2. **Complete `selectionPressPairs`** with `inputForeground` on `selectedActive`
   (body), because the pressed row is where plan `651` put the hint.
3. **Move the two shipped hints** one designed half-step. The identity light
   `placeholder` goes from `#5C6574` to `#5A6372`, which clears 4.5:1 on
   `destructiveSoft` (4.5753:1) and `successSoft` (4.6334:1) and stays 1.5945:1
   below `mutedForeground`. The AAA light `placeholder` goes from `#3D4047` to
   `#3B3E45`, which clears 7:1 on `destructiveSoft` (7.2134:1) and stays
   1.5392:1 below its `mutedForeground`. Both keep the text tier in kind. No
   other shipped value moves.
4. **Guard the pair lists and the fixed value** in a new suite, and hold the
   documents, README and ledger to the new counts and figures.

The contract grows 451 → **460** pairs. `themeChecks`, `contrastPairClasses`,
the floors and every other colour do not move.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/659-field-content-surfaces.md` | this plan |
| `packages/tokens/src/contrast.ts` | `softFieldPairs` (new, exported); `inputForeground` in `selectionPressPairs`; JSDoc for both; compose `softFieldPairs` into `contrastPairs` |
| `packages/tokens/src/color.ts` | identity light `placeholder: "#5C6574"` → `"#5A6372"`; AAA light `placeholder: "#3D4047"` → `"#3B3E45"` |
| `packages/tokens/src/soft-field.test.ts` | new regression suite (§5) |
| `packages/tokens/src/placeholder-surfaces.test.ts` | exact list gains the four soft fills; header |
| `packages/tokens/src/canvas-input-text.test.ts` | exact list gains the four soft fills and `selectedActive`; header |
| `packages/tokens/src/selection-press.test.ts` | the foreground list gains `inputForeground` |
| `packages/tokens/src/contrast.test.ts` | pair count 451 → 460; `placeholder` typo case 10 → 14; import and inventory entry for `softFieldPairs` |
| `packages/tokens/src/resting-fill-scrim.test.ts` | pair count 451 → 460 |
| `packages/tokens/src/docs.test.ts` | the pinned body-text paragraph, the floor-table secondary-text row, and any derived tier phrase the new pairs change |
| `docs/tokens.md` | the `placeholder` role row; the body-text paragraph; the tier paragraph's counts/figures; the audit history's last sentence and pair count |
| `docs/design-system.md` | the accessibility floor table's secondary-text row |
| `packages/tokens/README.md` | the typed-text/placeholder paragraph and the plan reference |
| `COMPONENTS.md` | **Theme contrast check** row: 451 → 460, the new list, the identity hint move |
| `TODO.md` | one new ticked row; counter `288/362` → `289/363` |
| `.agents/slop/plans/README.md` | index `659` and add its summary paragraph |

No other file. **Do not** edit `packages/components`, `packages/primitives`,
`apps/*`, or any other token value, pair or floor.

## 4. `packages/tokens/src/contrast.ts`

Add beside `softPanelTextPairs` (which already derives from `statusTones`):

```ts
/**
 * The field's own content inside a tone-tinted status panel. An Alert carries a
 * field — its `borderStrong` edge is already measured on the four soft fills
 * (plan 092) — and the typed text and hint sit on the tone-tinted fill, not on
 * the `input` fill a field usually paints. The body floor applies to typed text
 * and the secondary floor to the hint, the same split the `input` fill and the
 * row washes use. Identity light's hint measured **4.439:1** on
 * `destructiveSoft` and 4.4954:1 on `successSoft` while `themeFailures`
 * returned `[]`; the hint moves one half-step (plan 659).
 */
export const softFieldPairs: readonly ContrastPair[] =
  softSurfaceRoles.flatMap(
    (background): ReadonlyArray<ContrastPair> => [
      ["inputForeground", background, "body"],
      ["placeholder", background, "secondary"],
    ],
  );
```

Compose it next to `softPanelTextPairs` in `contrastPairs`:

```ts
  ...softBodyPairs,
  ...softPanelTextPairs,
  ...softFieldPairs,
```

In `selectionPressPairs`, insert the typed-text role beside the hint and update
the JSDoc sentence:

```ts
  ["mutedForeground", "selectedActive", "secondary"],
  ["inputForeground", "selectedActive", "body"],
  ["placeholder", "selectedActive", "secondary"],
```

## 5. `packages/tokens/src/soft-field.test.ts`

Header: state both bugs — the soft status fill a field sits in measured its
edge, body, caption and link but not its typed text or hint, and the identity
light hint measured 4.439:1 on `destructiveSoft` while `themeFailures` returned
`[]`; and `selectedActive` carried the hint but not the typed text.

Imports from `./index.js`: `contrastFloors`, `contrastPairs`,
`contrastRatio`, `extendTheme`, `getTheme`, `lightColors`,
`selectionPressPairs`, `shippedThemes`, `softFieldPairs`, `softSurfaceRoles`
(if exported; otherwise derive tone names from `statusTones`),
`themeContrastFailures`, `themeFailures`, `themeTextTierFailures`.

Cases:

1. **The list is the four fills, once each, at the two floors** — `softFieldPairs`
   has 8 entries; per tone the entries are
   `["inputForeground", "xSoft", "body"]` and `["placeholder", "xSoft",
   "secondary"]`; `softFieldPairs` is contained in `contrastPairs` and has no
   duplicate composition.
2. **The pressed row carries typed text too** — `selectionPressPairs` contains
   `["inputForeground", "selectedActive", "body"]` exactly once.
3. **Every shipped set clears the new pairs** — fold `shippedThemes` over the
   new list with `contrastFloors[theme.contrast][pairClass]`; failures `[]`.
4. **Both light hints clear their floors on the four soft fills** — for each
   tone, `contrastRatio(lightColors.placeholder, lightColors[`${tone}Soft`]) >=
   4.5` (tightest `4.5753:1` on `destructiveSoft`) and the same for
   `highContrastLightColors` at 7:1 (tightest `7.2134:1` on `destructiveSoft`).
5. **The pre-fix values are reported, so the guard can fail** — build
   `extendTheme(getTheme("light"), { colors: { placeholder: "#5C6574" } })` and
   filter `themeContrastFailures` to `foreground === "placeholder"`; exactly two
   entries, `destructiveSoft` at **4.4390:1** and `successSoft` at **4.4954:1**,
   each `pairClass: "secondary"`, floor 4.5. The AAA value was caught by the
   shipped-set case before it moved: all six AAA light sets reported
   `destructiveSoft` at **6.9929:1** under 7:1. This is the can-fail fixture; the
   shipped theme passes only after both values move.
6. **The hint stays a tier below secondary text** — `themeTextTierFailures` is
   `[]` for every shipped set and for the identity theme; in particular the
   `placeholder`/`mutedForeground` step on each soft fill is at least 1.05:1
   (derive it, do not hard-code).
7. **Typed text inside a panel is a measured composition** — the filtered
   failures for a planted theme whose `inputForeground` equals its `infoSoft`
   include `inputForeground` on `infoSoft` at the `body` floor (proves the pair
   is load-bearing even though no shipped set fails it).
8. **Every shipped set still passes the whole guarantee** —
   `shippedThemes.flatMap(({ theme }) => themeFailures(theme))` is `[]`.

## 6. Existing suites to update

- `placeholder-surfaces.test.ts`: the expected list stays in the same order as
  `contrastPairs`; append the four soft fills after `selectedActive` if that is
  where `contrastPairs` places `softFieldPairs`, otherwise keep the actual
  order. Update the header sentence and any length/count assertion.
- `canvas-input-text.test.ts`: add the four soft fills and `selectedActive` to
  the surface loop; the typed-text count moves 9 → 14; the header states the
  new surfaces.
- `selection-press.test.ts`: the `selectionPressPairs` foreground list gains
  `inputForeground` after `mutedForeground`.
- `contrast.test.ts`: `contrastPairs.length` 451 → 460; the unparseable
  `placeholder` case now reports 14 failures and its surface set gains the four
  soft fills; add `softFieldPairs` to `publishedPairLists` (the record remains
  compile-enforced).
- `resting-fill-scrim.test.ts`: the guard that pins `contrastPairs.length` moves
  to 460 with a sentence naming this plan.
- `docs.test.ts`: update the pinned paragraph, the floor-table row and any
  derived phrase the new surfaces change (`countWord(shared(...))`, the tier
  minimum). Do **not** weaken a derived assertion; update the document instead.

## 7. Documents

`docs/tokens.md`:

- The `placeholder` role row: new value `#5A6372`; the surfaces gain "the four
  soft status fills a field inside a status panel paints".
- The body-text paragraph (~line 3247): typed text now names the four soft
  fills; the hint's list becomes thirteen surfaces; replace "nine-surface list"
  with the correct count. Quote the fix: identity light's hint measured
  **4.439:1** on `destructiveSoft` and 4.4954:1 on `successSoft` while every
  check returned `[]`; the move to `#5A6372` clears all four at **4.575:1**;
  typed text inside a panel is 10.455:1 at the tightest and the pressed selected
  row 11.432:1.
- The tier paragraph: typed text's shared surfaces 9 → 14, the hint's 10 → 14,
  and the derived minimum figures the tests print.
- The audit history's final sentence: append plan `659` and change the final
  pair count to **460**.

`docs/design-system.md`: the floor table's secondary-text row names the four
soft status fills for the hint, and the body row (typed text) names them too if
it lists surfaces.

`packages/tokens/README.md`: the same two sentences, plus the plan reference.

`COMPONENTS.md` **Theme contrast check**: 451 → 460; name `softFieldPairs` and
the pressed-row typed text; record the identity light hint move with its before
and after figures.

## 8. Commands and expected results

In `packages/tokens`:

```sh
nub exec vitest run src/soft-field.test.ts
```

Before the fix, cases 1, 4 and 5 fail (the list is absent, the shipped hint is
4.439:1, and the pre-fix fixture is the shipped theme). After the fix, all pass.
Then:

```sh
nub exec vitest run src/soft-field.test.ts src/placeholder-surfaces.test.ts src/canvas-input-text.test.ts src/selection-press.test.ts src/contrast.test.ts src/resting-fill-scrim.test.ts src/docs.test.ts
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check:tests
nub run check
nub run lint
```

Expected: clean. Record the exact results in the commit message.

## 9. STOP conditions

Stop and report with evidence if:

- `#5A6372` or `#3B3E45` does not clear its floor on all four soft fills, or
  drops the `placeholder`/`mutedForeground` step below 1.05:1 on any shared
  surface — choose another half-step and record the probe; do not weaken a
  floor;
- any other shipped set fails a new pair — do **not** move a second value
  without a probe; report the set and ratio;
- a shipped `inputForeground` pair fails on a soft fill or `selectedActive` —
  this plan expects no colour move there;
- `docs.test.ts` derives a count or figure this plan did not anticipate — update
  the document to the derived value and say so in the commit; never relax the
  guard;
- the new suite cannot be made to fail on the unfixed tree in both directions
  (list absent + pre-fix value reported).

## 10. Acceptance

- [x] `softFieldPairs` ships and is composed into `contrastPairs` (451 → 460);
      `selectionPressPairs` carries `inputForeground` on `selectedActive`.
- [x] The identity light and AAA light hints clear their floors on all four soft
      fills; every shipped set clears both new roles at their floors.
- [x] `soft-field.test.ts` states both bugs and proves the guard can fail with
      the pre-fix hint value.
- [x] Every existing suite, `check:tests`, `check` and `lint` pass; no other
      token value, pair, floor or check kind moves.
