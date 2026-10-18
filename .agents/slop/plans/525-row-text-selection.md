# 525 — The row's own text through a text selection

**Phase:** F (integration and polish) · **Workstream:** `tokens-theme` ·
**Depends on:** plans 071, 081, 087, 312, 316, 363, 506, 510 · **Number block:**
500–599 (`tokens-theme` overflow).

## 1. The bug

`selectionPairs` measures text through the composited `selection` wash, but it
assumes **one body role per surface**: `foreground` on the four washes and the
quiet panel, `popoverForeground` on `popover`, `inputForeground` on `input`,
`selectedForeground` on `selected`. A surface can carry more than one body role:

- A **menu row** paints `popoverForeground` on the `hover`, `active` and
  `selected` fills (`rowTextPairs`, plan `312`). The selection list measures
  `foreground` on those same fills, so a menu label is measured at rest but not
  through a drag-selection.
- A **selected row** keeps its inherited label `selectedForeground` on the
  `hover`, `active` and `accent` fills while the pointer crosses it
  (`rowTextPairs`, plan `316`). `selectionPairs` measures that role through the
  wash only on `selected`, so the three other fills are unmeasured.

Both roles are real, selectable text: `selectionColor` inherits into a row's
label like any other text, and a reader can drag across a hovered menu option or
a selected row before the pointer leaves it.

This is not hypothetical. High-contrast light ships
`selectedForeground: #2E2370`. Through the 30% iris wash `#7567F24D` over the
`active` fill `#D6D6D6` it composites to `#B9B4DE` and measures **6.693:1**,
under the 7:1 AAA secondary floor. All six high-contrast light sets fail
(identity, macOS, Linux, Windows, XP, Aero) because the AAA palette ignores
platform colours, and every check returns `[]`.

## 2. Decisions

1. **Extend `selectionPairs`; do not add a second list.** The object is the same
   composition (text through the accent wash); a second exported list would need
   a name in the `themeContrastFailures` JSDoc, a `contrast-reference.test.ts`
   entry, a ledger count and a documentation paragraph for no gain. The new
   pairs are appended after the selected-row title and before the secondary
   block.
2. **Move one AAA light value, not the wash.** `highContrastLightColors`
   `selectedForeground` moves one palette step from iris 900 (`#2E2370`) to iris
   950 (`#1C1547`, `palette.iris[950]`). The washed pair becomes **8.533:1** on
   `active` (the tightest of the four fills), and at rest it only gains
   contrast. Changing the wash would touch every selection pair and the
   highlight's own perceivability; changing the `active` fill would move the
   generic press ladder and its direction check. One role, one designed step.
3. **No other colour moves.** The audit of the six new pairs over all 24 shipped
   sets finds no other miss (the shipped sets are measured in §6).

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

In `selectionPairs`, after `["foreground", "selected", "body"],` and before the
`...selectionSurfaces.map(... "mutedForeground" ...)` block, add:

```ts
  // A menu row's own label on the washes it paints (plan 312): its body role is
  // `popoverForeground`, not `foreground`.
  ["popoverForeground", "hover", "secondary"],
  ["popoverForeground", "active", "secondary"],
  ["popoverForeground", "selected", "secondary"],
  // A selected row's inherited label on the other fills the pointer crosses
  // (plan 316); `selected` is already the surface pair above.
  ["selectedForeground", "hover", "secondary"],
  ["selectedForeground", "active", "secondary"],
  ["selectedForeground", "accent", "secondary"],
```

Then extend the JSDoc block above `selectionPairs` (currently starting “Every
text pair a selected glyph paints…”) with one sentence:

> A surface can carry more than the one body role the map names: a menu row
> paints `popoverForeground` on the three washes it highlights with, and a
> selected row keeps its inherited `selectedForeground` on the `hover`/`active`
> fills and the `accent` a selectable row hovers, so those six compositions are
> named explicitly beside the map.

In the JSDoc above `themeContrastFailures`, inside the `selectionPairs` bullet,
after the sentence ending “through the composited `selection` colour.”, add:

> A menu row's `popoverForeground` on the three washes it paints and a selected
> row's inherited `selectedForeground` on `hover`, `active` and `accent` are
> part of the same list.

Do **not** add a new exported list. `contrast-reference.test.ts` keeps passing
unchanged.

### 3.2 `packages/tokens/src/color.ts`

- In the `highContrastLightColors` doc block, after the sentence about the
  selected row (plan 381), add:
  “The selected row's inherited label is iris 950, so it keeps 7:1 through the
  selection wash on the pressed row a reader drags across (plan 525).”
- Change:
  ```ts
  selectedForeground: "#2E2370",
  ```
  to:
  ```ts
  selectedForeground: palette.iris[950],
  ```
  It is the only value that moves.

### 3.3 `packages/tokens/src/selection-text.test.ts`

Update the exact lists for the new 26-entry `selectionPairs` (order matters;
run `nub run --filter @gpuixui/tokens test -- selection-text` and compare):

- `map(([, background]) => background)` becomes:
  `[...surfaces, "card", "selected", "hover", "active", "selected", "hover", "active", "accent", ...surfaces]`.
- `map(([foreground]) => foreground)` becomes, in order: six `foreground` values
  (surfaces 0–5), `popoverForeground`, `inputForeground`,
  `selectedForeground`, `cardForeground`, `foreground`, then
  `popoverForeground` ×3, `selectedForeground` ×3, `mutedForeground` ×9.
- The pre-081 AAA wash regression (`names the surface when a theme regresses`)
  now reports 16 failures. Its `backgrounds` list becomes:
  `["hover", "active", "selected", "selected", "hover", "active", "selected", "hover", "active", "accent", "muted", "hover", "active", "accent", "popover", "selected"]`
  and its role/class list becomes `foreground/body/7`,
  `foreground/body/7`, `selectedForeground/secondary/7`,
  `foreground/body/7`, `popoverForeground/secondary/7` ×3,
  `selectedForeground/secondary/7` ×3, `mutedForeground/secondary/7` ×6.

### 3.4 Length assertions (mechanical)

Change `20` to `26` in:

- `packages/tokens/src/contrast.test.ts` (`expect(selectionPairs.length)`).
- `packages/tokens/src/selected-title-selection.test.ts`.
- `packages/tokens/src/selection-card-foreground.test.ts`.
- `packages/tokens/src/selection-secondary.test.ts`.

No other `selectionPairs` length is hard-coded; `inventory.test.ts` derives it.

### 3.5 New regression test `packages/tokens/src/row-text-selection.test.ts`

Header comment must state the bug in one paragraph: the six unmeasured row-text
compositions, and the shipped AAA light **6.693:1** on `selectedForeground` over
the wash on `active`. Cases:

1. **The six pairs are published** — `selectionPairs` contains each of the six
   `[role, surface, "secondary"]` rows by content (not only the length).
2. **Every shipped set passes** — map `shippedThemes`, measure each new pair with
   `compositeOver(theme.colors.selection, theme.colors[surface])` and assert
   `>= contrastFloors[theme.contrast].secondary`, labelled with `theme.name`.
   The tightest is macOS light `selectedForeground` on `active` (**4.898:1**);
   AAA light is **8.533:1** after the move.
3. **The shipped regression fails without the pair or the value** —
   ```ts
   const regressed = extendTheme(getTheme("light", "high"), {
     colors: { selectedForeground: "#2E2370" },
   });
   const failures = themeContrastFailures(regressed).filter(
     ({ foreground, background, wash }) =>
       foreground === "selectedForeground" &&
       background === "active" &&
       wash === "selection",
   );
   expect(failures).toEqual([
     {
       foreground: "selectedForeground",
       background: "active",
       wash: "selection",
       pairClass: "secondary",
       floor: 7,
       ratio: expect.closeTo(6.693, 3),
     },
   ]);
   ```
   `toEqual` with `expect.closeTo` works in Vitest; alternatively read
   `failures[0]?.ratio` and use `toBeCloseTo(6.693, 3)`. This case fails on the
   pre-fix tree because the filtered list is `[]`; it passes with the pair. The
   shipped AAA theme (without the override) must return no failures.
4. **A menu label can be erased** — extend the identity dark theme with
   `colors: { popoverForeground: "#AEB6C4" }`. Every at-rest pair still passes
   (`popoverForeground` on `hover` 6.877, `active` 6.493, `selected` 5.013,
   `popover` 7.344), but through the wash on `selected` it measures **3.965:1**.
   Before the fix `themeContrastFailures` returns `[]`; after it reports
   `popoverForeground`/`selected`/`wash: "selection"` at the secondary floor
   (4.5, ratio ≈ 3.965).
5. **The shipped theme has no failure at all** — `themeFailures(getTheme("light", "high"))` is
   `[]` (the five-check composition), so the colour move satisfies colour format,
   typeface, contrast, hierarchy, direction and metrics.

### 3.6 `packages/tokens/src/docs.test.ts`

- In `states the floors the contrast checker enforces` (`rows` array):
  - Replace the row
    `| text selection of a selected row's inherited label (\`selectedForeground\` over the wash on \`selected\`) | 4.5:1 | 7:1 |`
    with one naming `hover`/`active`/`accent` and `selected`.
  - Add a row:
    `| text selection of a menu row's label (\`popoverForeground\` over the composited \`selection\` wash on \`hover\`/\`active\`/\`selected\`) | 4.5:1 | 7:1 |`.
- In `quotes the selection wash strength each mode uses`, append a `claim`:
  “\`selectionPairs\` measures a menu row's label on the three washes it paints
  and a selected row's inherited label on all four fills”.
- Add a case that holds the new `docs/tokens.md` sentence (see §3.7) with
  `expect(markdownProse).toContain(sentence)`.

### 3.7 `docs/tokens.md`

- After the sentence ending “so both are measured through the wash.” (§ “Both
  selection properties…”, around line 1255), add:

  > A surface can carry a second body role. A menu row paints
  > `popoverForeground` on the `hover`, `active` and `selected` fills, and a
  > selected row keeps its inherited `selectedForeground` on `hover`, `active`
  > and the `accent` a selectable row hovers, so `selectionPairs` measures both
  > through the wash beside the `foreground` the list-row title uses. The audit
  > found high-contrast light's inherited label at **6.693:1** on the pressed
  > row's wash, under 7:1, while every check returned `[]`; the value moves one
  > iris step (`#2E2370` → `#1C1547`) and the four fills measure **8.533:1** at
  > the tightest, no other colour moving.

- In the `themeContrastFailures` description (around line 1614) extend the
  `selectionPairs` sentence:

  > …the inherited `selectedForeground` on all four fills it keeps, and a menu
  > row's `popoverForeground` on the three washes it paints.

- In the audit history (after the plan `520` paragraph, before the Toast
  paragraph), add:

  > Plan `525` measures the row's own text through the selection wash:
  > `selectionPairs` assumed one body role per surface, so a menu row's
  > `popoverForeground` on `hover`/`active`/`selected` and a selected row's
  > inherited `selectedForeground` on `hover`/`active`/`accent` were unmeasured.
  > High-contrast light's `selectedForeground` measured **6.693:1** through the
  > wash on `active`, under 7:1, while all six checks returned `[]`; the role
  > moves one iris step (`#2E2370` → `#1C1547`), the six pairs join the list
  > (20 → **26**), every shipped set passes (4.898:1 macOS light at the
  > tightest), and `contrastPairs` stays **396**.

- In the design-system contrast section (around line 2810), extend
  “`selectionPairs` holds the body role each surface uses and `mutedForeground`…”
  with the menu/selected-row roles.

### 3.8 `docs/design-system.md`

In the §9 floor table:

- Replace
  `| text selection of a selected row's inherited label (\`selectedForeground\` over the wash on \`selected\`) | 4.5:1 | 7:1 |`
  with
  `| text selection of a selected row's inherited label (\`selectedForeground\` over the wash on \`selected\`, the \`accent\` wash a hovered selectable row paints and the \`hover\`/\`active\` pointer washes) | 4.5:1 | 7:1 |`.
- Add
  `| text selection of a menu row's label (\`popoverForeground\` over the composited \`selection\` wash on \`hover\`/\`active\`/\`selected\`) | 4.5:1 | 7:1 |`.

Both rows must match `docs.test.ts` exactly.

### 3.9 `COMPONENTS.md` and `TODO.md`

- `COMPONENTS.md`, **Theme contrast check** row: change
  “20 selection pairs” to “26 selection pairs”; leave the other derived counts
  alone.
- `TODO.md`, under **Design tokens and theming**, tick the new row and add it
  above the closing rows:
  `` `[x]` Hold the row's own text through a text selection — ... (plan 525) ``.
  Keep the progress bar at 189/251 or update the count if the new row changes
  the denominator (add 1 to both).

### 3.10 Plan index

Add to `.agents/slop/plans/README.md`:

```
| [525](./525-row-text-selection.md) | The row's own text through a text selection | F | 071, 081, 087, 312, 316, 363, 506, 510 | done |
```

and append a short paragraph after the plan `524` description.

## 4. Commands and expected results

Run in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

1. `nub run --filter @gpuixui/tokens test -- row-text-selection`
   → the new file passes (5 cases). Before the implementation the same command
   fails at cases 1–4.
2. `nub run --filter @gpuixui/tokens test -- selection-text`
   → updated exact lists pass.
3. `nub run --filter @gpuixui/tokens test`
   → 118 files, 5406+ tests, all pass.
4. `nub run check`
   → `check:tests`, lint, format and `check-types` pass.
5. `nub run test` and `nub run lint`
   → both pass.

## 5. STOP conditions

Stop and report instead of improvising if:

- `selectionPairs` does not reach exactly 26 or a pair duplicates an existing
  `[foreground, background, class]` (the content-uniqueness guard fails).
- Any shipped set other than the six high-contrast light sets fails a new pair
  (the plan's evidence says only `selectedForeground`/`active` does). Record the
  exact theme and ratio; a second palette move needs its own plan.
- Moving `selectedForeground` to `palette.iris[950]` makes the shipped AAA light
  theme fail a different check (direction, hierarchy, format, metric).
- A documentation test fails on a sentence that is not the one edited in §3.6 —
  do not rewrite an unrelated claim to make it pass; find the drift.

## 6. Test plan

| What can break | The case that catches it |
| --- | --- |
| A new pair is dropped from the list | `row-text-selection.test.ts` case 1 (content) |
| A shipped set misses a new floor | case 2 (all 24 sets) |
| The pre-081 AAA pair regresses (old `#2E2370`) | case 3 (6.693:1 on `active`) |
| A menu label becomes unreadable through the wash | case 4 (`#AEB6C4`, 3.965:1) |
| The colour move breaks another check | case 5 (`themeFailures` is `[]`) |
| The docs table or catalogue drifts | `docs.test.ts` exact rows and claims |
| The ledger count drifts | `inventory.test.ts` derives `selectionPairs.length` |
| The reference JSDoc loses a list | `contrast-reference.test.ts` (unchanged list set) |

To prove the test fails without the fix:
`bash scripts/verify-two-directions.sh` (follow the repo convention already used
for plans `500`–`524`), or stash the source edit and re-run case 3; it must
return `[]` and fail.

## 7. Acceptance criteria

- [ ] `selectionPairs` has 26 entries: the six row-text compositions are present
      and unique.
- [ ] High-contrast light `selectedForeground` is `palette.iris[950]`; every other
      colour is unchanged.
- [ ] All 24 shipped sets clear all six new pairs (4.898:1 at the tightest).
- [ ] `themeFailures(getTheme("light", "high"))` is `[]`.
- [ ] `docs/tokens.md` and `docs/design-system.md` name the new compositions and
      the regression; `docs.test.ts` holds both.
- [ ] `COMPONENTS.md` says 26 selection pairs; `TODO.md` and the plan index
      record plan 525.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.
