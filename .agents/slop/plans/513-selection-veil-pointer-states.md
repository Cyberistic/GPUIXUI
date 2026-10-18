# Plan 513 — the inverse veil's pointer-state gap and its stale rationale

**Workstream:** `tokens-theme` · **Phase:** F (contract completeness) · **Depends
on:** 344 (the inverse veil), 382 (the accent family), 504 (`selectionFillRoles`),
506 (the identity and Windows selection washes), 510 (`selectionInactivePairs`),
387 (`shippedThemes`).

**Status:** done.

## 1. The defect

Two related gaps in the text-selection contract, both around the neutral
`selectionOnFill` veil.

### 1.1 A filled control's label is selected while its fill moves

`selectionFillRoles` names the eight **resting** opaque fills a reader can select
content on. But a filled control does not keep its resting fill while the
pointer is over it: it steps to `xHover` and then `xActive` (plan 097). A label
inside `<Button>Save</Button>` is a raw text child — neither
`primitives` `controlStyle` nor `components` `internal/button.tsx` sets
`userSelect: "none"` — so dragging over it selects the label while the fill
becomes `primaryHover`/`primaryActive` (or `secondary`, `accent`, `destructive`,
`softAction`), and the veil composites over that state fill.

Measured with the package's own `contrastRatio`/`compositeOver` at the shipped
15% veil, across the five filled families' resting, hover and press fills
(fifteen fills × 24 shipped sets = 360 label pairs):

| measurement | result |
| ----------- | ------ |
| pairs below the on-colour floor | **60** |
| shipped sets affected | **20 of 24** |
| worst | **3.353:1**, macOS dark `accentActive` |
| next | identity dark `accentActive` 3.624:1, identity dark `secondaryActive` 3.679:1 |

Every failing pair is in `accentHover` (15), `accentActive` (20),
`secondaryHover` (6), `secondaryActive` (7), `softActionHover` (6) or
`softActionActive` (6); `primary` and `destructive` still pass because their
on-colour roles have more headroom.

The gap cannot be closed by adding a pair. The veil is one neutral role, and a
neutral veil always moves a fill toward one of its labels: if a lower alpha were
chosen to rescue the state labels, the veil stops being perceivable. Probed over
every integer alpha from 1% to 30%, in both directions (black and white), **no
single neutral alpha clears both the on-colour floor and the 1.05:1 veil floor on
the high-contrast light set** (the set needs an alpha of 1–4% for text and a
higher one for perceivability). A state-fill pair would therefore publish a
guarantee the AAA palette cannot meet.

The honest resolution is a design rule, not a pair: a filled control's label is
chrome. It sets `userSelect: "none"` — the same opt-out a toolbar or tab strip
uses — and the resting-fill pairs cover the content that keeps its fill while
selected: a user message bubble on `primary`, a solid status chip, the panel
action `softAction`. This is a cross-team change for `primitives` and
`components`, recorded in `TODO.md`.

### 1.2 The rationale still states the pre-506 palette

`selectionFillRoles`' JSDoc and the header of `selection-on-fill.test.ts` still
justify the veil with the figures plan 504 measured:

> fourteen shipped compositions — identity light `success` 1.046:1, Windows
> light `info` 1.011:1 and every high-contrast dark `softAction` 1.047:1

Plans 506 and 510 moved the identity and Windows selection washes and the dark
selected fills, and plan 504 itself moved the AAA dark `softAction`. Measured
now:

- **17** shipped compositions across the eight resting fills are under the
  1.05:1 floor, not fourteen;
- **6** of them are the accent wash on `primary` (identity dark, macOS light and
  dark, Linux light, the Windows light variant and the Aero recipe);
- **11** are the three solid status chips and `softAction` (the list the second
  exact-list case in `selection-on-fill.test.ts` holds);
- the AAA dark `softAction` is **not** one of them: its veil now measures
  **1.574:1**, not 1.047:1.

`contrast.test.ts`'s plan 344 paragraph says the accent wash is invisible on
`primary` "in seven shipped sets"; the exact list is **six**. The public
catalogue and the design system already quote the current tightest figures
(4.827:1 text, 1.060:1 veil), which `docs.test.ts` guards; the stale facts are
the counts and the retired example beside them.

## 2. The rule

1. **State the pointer-state exclusion in the contract and all three documents.**
   The veil is measured on each fill's **resting** value. A filled control's
   label is chrome and opts out of selection; no state fill joins
   `selectionFillRoles`, because no single neutral alpha can hold both floors at
   AAA light. Name the measured cost (60 of 360, worst 3.353:1, 20 of 24 sets)
   and the recommendation (`userSelect: "none"`).
2. **Correct the stale rationale** to the current counts: 6 primary palettes, 11
   chip/panel compositions, 17 total, and no "every high-contrast dark
   `softAction`" example. State no count in the source JSDoc; point at
   `selectionFillRoles` and the two pair lists instead, so the next palette edit
   cannot leave a number behind.
3. **Guard both.** Derive the three counts and the state-fill cost in
   `selection-on-fill.test.ts`; hold the documented figures in `docs.test.ts`;
   fail if the `selectionFillRoles` JSDoc restates a count or the retired
   example.

No colour, pair, floor or role changes. `contrastPairs` stays **394**;
`selectionFillRoles` stays **8**.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

Replace the paragraph in `selectionFillRoles`' JSDoc that starts

> Every one is a filled surface a reader can drag a selection over, and the
> accent wash is under the perceivability floor on fourteen shipped
> compositions — identity light `success` 1.046:1, Windows light `info` 1.011:1
> and every high-contrast dark `softAction` 1.047:1 — so the inverse veil is the
> wash.

with a version that:

- says **resting** fills explicitly;
- names no count, no ratio and no set (the accent wash *is* the accent, so it
  cannot be perceived on `primary`; the solid chips and panel action sit in the
  same band);
- names `selectionFillRoles`, `selectionFillPairs` and
  `selectionFillWashPairs` as the owner;
- adds the pointer-state exclusion: a filled control steps to `xHover`/`xActive`
  under the pointer and its label is chrome — the state fills stay out of the
  index because a neutral veil cannot hold both the on-colour and perceivability
  floors at AAA light; the cross-team `userSelect: "none"` change is recorded in
  `TODO.md`.

Do not change the array.

### 3.2 `packages/tokens/src/selection-on-fill.test.ts`

1. Header:
   - change "**1.000:1** there in seven shipped sets — identity dark, macOS light
     and dark, Linux light, Windows light, Aero light and the `default` platform
     dark" to "**1.000:1** there in six shipped sets — identity dark, macOS light
     and dark, Linux light and the two Windows light sets";
   - replace the plan 504 paragraph's "fourteen of their shipped compositions —
     identity light `success` 1.046:1, Windows light `info` 1.011:1 and every
     high-contrast dark `softAction` 1.047:1" with the measured current facts:
     eleven chip/panel compositions, 17 across the eight fills, and the AAA dark
     `softAction` moved out of the list by plan 504 (veil 1.574:1);
   - add plan 513: the pointer-state gap and the design rule from §2.
2. New imports: `filledControlFamilies` is already imported; add
   `themeContrastFailures` is already imported. Needs `readFileSync` from
   `node:fs` for the JSDoc guard.
3. New cases:
   - **`measures the state fills the veil cannot cover`**: build the fifteen
     family pairs — resting, `xHover` and `xActive` for each of
     `filledControlFamilies`, then the three `softAction` fills — compute the
     veiled label ratio over `shippedThemes`, and assert 360 measured pairs,
     exactly 60 failures, 20 distinct `theme.name`s, and the worst
     `["Dark · macOS", "accentActive", 3.353]` (three decimals). This is the
     evidence the documents quote.
   - **`cannot be repaired by one neutral alpha at high contrast`**: for
     `getTheme("light", "high")`, for each base `#000000`/`#FFFFFF` and each
     integer percent 1…30, build the hex veil and require at least one state
     pair to miss `contrastFloors.high.secondary` or one veil to miss
     `contrastFloors.high.surface`; assert the feasible list is empty. Use a
     small local `hexAlpha` helper.
   - **`keeps the state fills out of the resting index`**: assert none of the ten
     state fills appears in `selectionFillRoles`, and the list stays the eight
     resting roles (the existing exact-list case already proves the content).
   - **`keeps the role's rationale off a stale count`**: read `./contrast.ts`
     with `node:fs`, slice the JSDoc immediately before
     `export const selectionFillRoles`, and assert it does not contain
     `"fourteen"`, `"1.047"` or `"every high-contrast dark"`, while it contains
     `selectionFillRoles`, `selectionFillPairs`, `selectionFillWashPairs` and
     `userSelect`.
4. Import and exercise the new example from §3.3 in a case: for every shipped
   set, `filledActionChrome(theme)` returns `userSelect: "none"` and the fill
   veil for the resting fill.

### 3.3 `packages/tokens/src/selection.example.ts`

Add a runnable example below `filledContentStyle`:

```ts
/**
 * A filled control's chrome opts out of text selection. Its fill steps to
 * `xHover`/`xActive` under the pointer, where one neutral veil cannot hold the
 * label at every contrast level; selectable content on an opaque fill
 * (`filledContentStyle`) keeps its resting fill instead.
 */
export const filledActionChrome = (theme: Theme) => ({
  ...selectionStyle(theme, "fill"),
  userSelect: "none" as const,
});
```

It must be imported by the suite in §3.2 so `examples.test.ts` keeps passing.

### 3.4 `packages/tokens/src/contrast.test.ts`

In the plan 344 paragraph, change "composites to 1.000:1 in seven shipped sets"
to "composites to 1.000:1 in six shipped sets (the exact list is in
`selection-on-fill.test.ts`)" and add one sentence: the veil is measured on each
fill's resting value; the state fills are documented as unsupported because a
neutral veil cannot hold the AAA on-colour floor there (plan 513).

### 3.5 `docs/tokens.md`

After the paragraph ending "…above the 1.05:1 perceivability floor." (the
`selectionFillPairs`/`selectionFillWashPairs` tightest figures), insert:

> The veil is measured on each fill's **resting** value. A filled control steps
> to `xHover`/`xActive` under the pointer, and its label is chrome: at the
> shipped 15% veil **60 of the 360** shipped state-fill label pairs measure under
> the on-colour floor (worst **3.353:1**, macOS dark `accentActive`), and no
> single neutral alpha keeps both that floor and the 1.05:1 veil floor on the
> high-contrast light set. A pair would promise a floor the AAA palette cannot
> meet, so the state fills stay out of `selectionFillRoles`; a control that must
> not be selectable sets `userSelect: "none"` on its chrome, and the resting
> pairs cover content that keeps its fill — a message bubble, a solid chip, the
> panel action.

The catalogue's existing six-set sentence, the historical 1.047/7.165/1.071
sentence and the 4.827/1.060 figures stay.

### 3.6 `docs/design-system.md`

After the filled-control paragraph ("A filled control steps through its own
family … no text, edge, ring, selection or tint pair changes."), add one
paragraph with the same rule: the inverse veil is measured on resting fills, the
state fills are outside the contract because 60 of 360 state-fill labels miss
the on-colour floor at 15% (worst 3.353:1, macOS dark `accentActive`) and no
neutral alpha clears both floors at AAA light, and a filled control's chrome
sets `userSelect: "none"`.

Update the `text selection` row of the interaction-state table: append "on each
fill's resting value; a filled control's label opts out with
`userSelect: "none"`, because its `xHover`/`xActive` fills are outside the
veil's reach (plan 513)".

### 3.7 `packages/tokens/README.md`

In **Selection and scrollbars**, after "…indexed by `selectionFillRoles`)
foreground and the veil itself to their floors.", add two sentences: the veil is
measured on each fill's resting value; a filled control's chrome sets
`userSelect: "none"` because its state fills are outside the veil (60 of 360
labels below the floor at 15%, worst 3.353:1, and no neutral alpha clears both
floors at AAA light).

### 3.8 `COMPONENTS.md`

In the **Theme contrast check** row, after the fill-veil clause, add: "the veil
is measured on each fill's **resting** value; a filled control's `xHover` and
`xActive` fills are deliberately outside the contract — 60 of 360 shipped
state-fill labels miss the on-colour floor at the 15% veil (worst 3.353:1, macOS
dark `accentActive`) and no single neutral alpha clears both floors at AAA light
— so a control opts its label out with `userSelect: "none"` and the resting
pairs cover the content that keeps its fill (plan 513)."

Do not change the pair counts.

### 3.9 Tests in `docs.test.ts`

Add one case next to the existing veil-figure case ("quotes the filled-action
veil …"):

```ts
it("states the pointer-state gap the veil cannot cover", () => {
  const statePairs = [
    ...filledControlFamilies.flatMap((family) => [
      [`${family}Hover`, `${family}Foreground`] as const,
      [`${family}Active`, `${family}Foreground`] as const,
    ]),
    ["softActionHover", "softActionForeground"] as const,
    ["softActionActive", "softActionForeground"] as const,
  ];
  const measured = shippedThemes.flatMap(({ theme }) => { /* veiled ratio */ });
  const failing = measured.filter(/* < floors.secondary */);
  const worst = failing.toSorted((a, b) => a.ratio - b.ratio)[0];
  expect(failing).toHaveLength(60);
  expect(measured).toHaveLength(360);
  expect(new Set(failing.map(({ name }) => name)).size).toBe(20);
  expect([worst?.name, worst?.fill, Number(worst?.ratio.toFixed(3))]).toEqual([
    "Dark · macOS",
    "accentActive",
    3.353,
  ]);
  expect(markdownProse).toContain("60 of the 360");
  expect(markdownProse).toContain("**3.353:1**");
  expect(markdownProse).toContain("`userSelect: \"none\"`");
  expect(designSystem).toContain("60 of 360");
  expect(designSystem).toContain("3.353:1");
  expect(readme).toContain("userSelect");
});
```

Use the file's existing `shippedThemes`, `filledControlFamilies`,
`contrastFloors`, `contrastRatio`, `compositeOver`, `markdownProse`,
`designSystem` and `readme` bindings; add `filledControlFamilies` to the
`./contrast.js` import if it is not already there.

### 3.10 Ledger

- `TODO.md`: add one ticked row under the design-tokens list, after the plan 512
  row:

  ```
  `[x]` Hold the inverse veil's pointer-state gap and stale rationale — a filled
  control's label can be selected while its fill steps to `xHover`/`xActive`, and
  at the shipped 15% veil **60 of 360** state-fill label pairs miss the on-colour
  floor (worst **3.353:1**, macOS dark `accentActive`, 20 of 24 sets) while no
  single neutral alpha clears both that floor and the 1.05:1 veil floor on the
  AAA light set; the state fills stay out of `selectionFillRoles`, the documents
  state the gap and recommend `userSelect: "none"` on a control's chrome, and the
  role's JSDoc no longer says "fourteen" or that the AAA dark `softAction`
  measures 1.047:1 (it is 1.574:1 after plan 504); no colour, pair or floor moves
  (plan 513)
  ```

- Add one cross-team pending row:

  ```
  `[ ]` Cross-team: `primitives` `controlStyle` and `components`
  `internal/button.tsx` set `userSelect: "none"` on a filled control's chrome,
  so its label is not selectable while the fill is `xHover`/`xActive`, where the
  15% veil measures **60 of 360** label pairs under the on-colour floor (worst
  3.353:1, macOS dark `accentActive`) and no neutral alpha holds both floors at
  AAA light (owner: those workstreams; plan 513)
  ```

- Correct the section bar, which is stale: it says `178/231` while the section
  holds 178 done and 57 pending non-blocked tasks (235). The two rows above make
  it `179/237`.

### 3.11 `.agents/slop/plans/README.md`

Add the table row after `512`:

```
| [513](./513-selection-veil-pointer-states.md) | The inverse veil's pointer-state gap and its stale rationale | F | 344, 382, 504, 506, 510, 387 | done |
```

Add a narrative paragraph at the end: the 60/360 measurement, the 20-set spread,
the worst pair, the AAA-light alpha impossibility, the `userSelect: none` design
rule, the corrected 6/11/17 counts and retired 1.047 example, and the fact that
no colour, pair or floor moves.

## 4. Commands and expected results

Run from the worktree root.

1. **Prove the guard before the fix.** Write §3.9 and the JSDoc guard from §3.2
   first, then `nub run --filter @gpuixui/tokens test -- docs selection-on-fill`.
   Expected: `docs.test.ts` fails on the missing "60 of the 360"/"3.353:1"/
   `userSelect` sentences and `selection-on-fill.test.ts` fails on the JSDoc
   containing "fourteen", `1.047` or `every high-contrast dark`. That proves the
   guard cannot pass without the source and document edits.
2. Apply §3.1–3.8; run the same command — all cases pass.
3. `nub run --filter @gpuixui/tokens check-types` — clean.
4. `nub run --filter @gpuixui/tokens test` — all 108 files pass.
5. `nub run check` — clean (`check:tests`, lint, format, type-check).
6. `nub run lint` — clean.
7. `nub run test` — clean.

## 5. STOP conditions

Stop and report rather than improvise if:

- the state-fill measurement is not **60 of 360**, the affected set count is not
  **20**, or the worst is not macOS dark `accentActive` at **3.353:1** — recheck
  the pairs, do not change the figures;
- some integer alpha in either direction clears both floors on the AAA light
  set — then the "no single neutral alpha" sentence is false and the plan must
  stop for a design decision;
- a resting pair fails anywhere — that would be a separate defect;
- `docs.test.ts`, `examples.test.ts`, `snippets.test.ts`, `readme.test.ts` or
  `inventory.test.ts` fails in a way this plan does not name;
- `selectionFillRoles` would need to change for any reason.

## 6. Acceptance criteria

- `selectionFillRoles` still has eight resting fills and no state fill; no
  colour, pair or floor moves and `contrastPairs` stays **394**.
- `selection-on-fill.test.ts` derives 60/360, 20 sets and the 3.353:1 worst
  pair, proves no neutral alpha clears both floors at AAA light, and fails if the
  `selectionFillRoles` JSDoc restates a count or the retired 1.047 example.
- `docs/tokens.md`, `docs/design-system.md`, the README and `COMPONENTS.md` state
  the pointer-state gap, the measured cost and the `userSelect: "none"` rule;
  `docs.test.ts` holds the figures and the recommendation.
- The stale "seven shipped sets" headers read six; the rationale no longer says
  fourteen or claims the AAA dark `softAction` veil is 1.047:1.
- `filledActionChrome` is a runnable example imported by the suite.
- `TODO.md` has the ticked row, the cross-team row and a current bar; the plan
  index carries plan 513.
- `nub run check`, `nub run lint` and `nub run test` pass.
