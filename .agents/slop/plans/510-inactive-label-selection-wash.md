# Plan 510 — the unavailable label under the text-selection wash

Status: done
Phase: F (contract completeness)
Depends on: 306 (the inactive floor), 087 / 091 / 362 / 366 / 506 (the selection
wash lists), 392 (the text tiers), 387 (the shipped-set enumeration).

## 1. The defect

`disabledForeground` is measured on the thirteen surfaces an unavailable label
paints (`inactivePairs`: the `disabled` fill, the four plain surfaces, the four
row washes and the four soft status fills). It is **not** measured through the
text-selection wash, although `selectionColor` is inherited by that same text
and every other text role the library paints is held through it
(`selectionPairs`, `selectionStatusPairs`, `selectionSoftPairs`,
`selectionFillPairs`).

For an unavailable label the omission is not academic. Measured on the shipped
themes with the existing paint (`compositeOver(theme.colors.selection, surface)`)
against the `inactive` floor (`contrastFloors[level].inactive`, 3:1 default and
4.5:1 at AAA):

| shipped set | tightest surface | ratio | floor |
| --- | --- | --- | --- |
| Light (identity) | `destructiveSoft` | **2.635:1** | 3 |
| Light · macOS | `active` | **2.604:1** | 3 |
| Light · Linux | `active` | **2.622:1** | 3 |
| Light · Windows | `selected` | **2.586:1** | 3 |
| High contrast light (and every AAA light platform variant) | `destructiveSoft` | **3.430:1** | 4.5 |
| High contrast dark (and every AAA dark platform variant) | `active` | **4.357:1** | 4.5 |

`Light · Windows 7` (3.177:1) and `Light · Windows XP` (4.099:1) pass, as do the
default dark sets (3.42:1 or better). Every shipped set returns `[]` from all six
`themeFailures` checks, because no pair paints the composition.

Why the wash and not the panel is the hard case: on a light surface the selection
wash darkens the surface toward the disabled grey, and on a dark surface it
lifts the surface toward it. The empty-looking middle is real — a lighter
`disabledForeground` cannot satisfy the selection floor, and the reader still has
to tell the unavailable label from secondary text.

## 2. The rule

Publish the composition as a pair list, on the one list that already owns the
surfaces:

```ts
export const selectionInactivePairs: readonly ContrastPair[] =
  inactiveSurfaces.map(
    (background): ContrastPair => ["disabledForeground", background, "inactive"],
  );
```

and apply it in `themeContrastFailures` with the same `textOverWashFailures`
helper the other selection lists use:

```ts
...textOverWashFailures(selectionInactivePairs, "selection", theme, floors),
```

Thirteen pairs, `inactive` class, reported with `wash: "selection"` and the
level's own floor. `contrastPairs` therefore stays **394**; this list is a wash
list, like the other `selection*` lists.

## 3. The values that move

Fixing the floors needs three values, each a designed step *away* from the panel
in its mode, chosen so the text tier (`disabledForeground` one 1.05:1 step below
`mutedForeground`, plan 392) still holds:

| role | now | new | why |
| --- | --- | --- | --- |
| `lightColors.disabledForeground` | `#6E7787` | `#545D6C` (`palette.neutral[600]`) | the four default light variants inherit this value and all four fail through the wash; the new value clears 3:1 at **3.808:1** (Windows light `selected`) and keeps a **1.455:1** tier step below `mutedForeground` |
| `highContrastLightColors.disabledForeground` | `#5A5A5A` | `#444444` | clears 4.5:1 through the wash at **4.844:1** (`destructiveSoft`) and keeps a **1.69:1** tier step |
| `highContrastDarkColors.disabledForeground` | `#A9A9A9` | `#B0B0B0` | clears 4.5:1 through the wash at **4.722:1** (`active`) and keeps a **1.643:1** tier step |

Every high-contrast platform variant inherits the AAA palettes (no platform
style names `disabledForeground`), so the two AAA moves fix all of them. XP and
Aero light name their own values (`#5A5445`, `#5A6678`) and already pass; they do
not move. The shipped tightest after the move is **3.177:1** (Aero light
`destructiveSoft`) at the default level and **4.722:1** at AAA.

## 4. Files to change

### 4.1 `packages/tokens/src/contrast.ts`

1. After `selectionStatusPairs` (the status text through the same wash), add
   `selectionInactivePairs` exactly as in §2, with a JSDoc that says:
   - `inactiveSurfaces` is the list (one edit point);
   - the wash is a composition the label is painted on, because `selectionColor`
     inherits;
   - WCAG 1.4.3 exempts inactive text, so the floor is the library's own design
     floor, the same one `inactivePairs` enforces;
   - the three values that moved and the measured figures (no floating claim).
2. Add the list to `themeContrastFailures` after
   `textOverWashFailures(selectionStatusPairs, …)`.
3. Extend the function's JSDoc bullet list with a `selectionInactivePairs`
   entry. State no count (the `contrast-reference.test.ts` guard rejects a
   count word before "surfaces"/"pairs"/"families").
4. Extend the big `contrastPairs` JSDoc only if a sentence there now claims
   "every text role through the wash" — it does not; leave it.

### 4.2 `packages/tokens/src/color.ts`

1. `lightColors.disabledForeground: "#6E7787"` → `palette.neutral[600]`.
2. `highContrastLightColors.disabledForeground: "#5A5A5A"` → `"#444444"`.
3. `highContrastDarkColors.disabledForeground: "#A9A9A9"` → `"#B0B0B0"`.
4. Update the `lightColors` JSDoc sentence that calls the role "a half-step
   between neutral 500 and 600 so an inactive label clears the 3:1 floor on the
   darkest platform pressed wash" — it now names neutral 600 and adds the
   selection wash.
5. Update the AAA JSDoc sentence ("a mid grey because the pressed wash needs
   4.5:1") to name the selection wash too, and the dark set's comment if it
   names the value.

### 4.3 `packages/tokens/src/inactive-state.test.ts`

Update the four pinned values (lines that assert `#6E7787`, `#5A5A5A`,
`#A9A9A9`; `#A1A9B7` stays). Keep the "pre-fix" cases: they set the old values
explicitly and still fail at rest.

### 4.4 New `packages/tokens/src/selection-inactive.test.ts`

Header comment names the bug and the table in §1. Cases:

1. **`holds every shipped set to the inactive floor through the wash`** —
   iterate `shippedThemes`, `contrastFloors[theme.contrast].inactive`, and every
   `inactiveSurfaces` entry:
   `contrastRatio(disabledForeground, compositeOver(selection, surface))` ≥ the
   floor. Labelled with `theme.name`.
2. **`reports the shipped pre-fix value through the public checker`** — extend
   `themes.light` with `disabledForeground: "#6E7787"`, assert the failures at
   `pairClass === "inactive"` all carry `wash: "selection"`, include
   `destructiveSoft`, and that the measured ratio is ≈2.635. Add the AAA light
   `#5A5A5A` case (≈3.430 on `destructiveSoft`) and the AAA dark `#A9A9A9` case
   (≈4.357 on `active`).
3. **`the old light value still clears every at-rest surface`** — assert
   `#6E7787` against every `inactiveSurfaces` entry without the wash is ≥3, so
   the regression is provably selection-only (this is why `inactivePairs`
   stayed green).
4. **`the AAA floor is live`** — extend `highContrastThemes.light` with
   `disabledForeground: "#4A4A4A"` (one step lighter than the shipped
   `#444444`): the checker reports exactly the washed `destructiveSoft` pair at
   ≈4.408 < 4.5, while the at-rest pairs pass.
5. **`pins the shipped values`** — `lightTheme`, `highContrastLightTheme` and
   `highContrastDarkTheme` carry `#545D6C`, `#444444`, `#B0B0B0`.

Use `shippedThemes` (not a hand-built matrix) for the full-set claim, as
`shipped-themes.test.ts` requires. Do not use `node:fs`; this is a runtime test.

### 4.5 `packages/tokens/src/inactive-soft.test.ts` and `selection-text.test.ts`

Two existing regression suites filter `themeContrastFailures` by pair class
alone, so the new washed pairs join lists they were not written for. Make each
filter name the composition it means:

- `inactive-soft.test.ts`, "reports an inactive label that the soft fill
  erases": add `wash === undefined` (the case is the fill at rest).
- `selection-text.test.ts`, "names the surface when a theme regresses": exclude
  `foreground === "disabledForeground"` (it has its own washed list now) beside
  the existing `statusTextRoles` exclusion.

No expected array changes; the filters keep each case's intent.

### 4.6 `packages/tokens/src/metric-rule-index.test.ts`? No.

No metric rule is added. Do not touch `metricRules`.

### 4.7 `packages/tokens/src/contrast-reference.test.ts`

The guard's `appliedLists` is hand-typed and is missing `dialogSurfacePairs`
(plan 507) as well as the new list. Add both, so the guard's title ("names every
list the function applies") is true again. This is the one unrelated correction
in this plan; no prose change beyond §4.1.3.

### 4.8 `packages/tokens/src/docs.test.ts`

Keep the guards honest:

1. The exact design-system inactive row string (in the `docs/design-system.md`
   table assertion) gains the selection clause — copy the new row from §4.8.2.
2. `names every surface an inactive label is measured on` currently reads
   `backgroundsOf("disabledForeground")` from `contrastPairs`. Extend it to the
   union of `inactivePairs` and `selectionInactivePairs` surfaces so the
   selection clause is guarded by derivation, not by the exact-row string alone.
3. If the prose section asserts the inactive list sentence
   (`inactivePairs` measures `disabledForeground` on …), keep it and add the new
   list's sentence in §4.8.1 to the same guard (a `toContain` on the new phrase).

### 4.8 Documentation

#### 4.8.1 `docs/tokens.md`

1. Role tables: `#6E7787` → `#545D6C` (default table) and
   `#5A5A5A` / `#A9A9A9` → `#444444` / `#B0B0B0` (high-contrast table). The
   tables are guarded against the themes, so they must move.
2. After the inactive paragraph (`plan 306` paragraph, "The disabled `Select`
   item …"), add one paragraph:
   - the label is selected with the copy around it, `selectionColor` inherits;
   - the wash composites over the thirteen `inactiveSurfaces`;
   - the measured figures in §1 and the fact that all six checks returned `[]`;
   - `selectionInactivePairs` holds the composition to the `inactive` floor;
   - the three values that moved and why the tier still holds;
   - the new tightest (3.177:1 Aero light, 4.722:1 AAA dark).
3. In the long "Text selection is measured in both directions" paragraph, add
   the inactive role beside the body/secondary/status/soft roles that are listed.
4. In "Every colour role is accounted for", add `selectionInactivePairs` to the
   named lists.
5. Append to the pair-count history: plan `510` adds a wash list of thirteen
   pairs, `contrastPairs` stays **394**, no `contrastPairs` entry moves, and the
   three `disabledForeground` values move. State the plan number and the values.
6. The `contrastFloors` snippet does not change (no class is added).

#### 4.8.2 `docs/design-system.md`

1. §8 `disabled` row: add "and through the composited `selection` wash" to the
   surfaces clause.
2. §9 floor table `inactive label` row — the exact new string:

   ```
   | inactive label (`disabledForeground` on the `disabled` fill, `background`/`card`/`popover`/`muted`, the `hover`/`active`/`accent`/`selected` washes and the four soft status fills, and through the composited `selection` wash on the same thirteen surfaces) | 3:1 | 4.5:1 |
   ```

   (the floors in the guard are derived from `contrastFloors`; keep the shape of
   the line so the derived cells remain last).
3. §9 prose ("The inactive state is measured too …"): add the selection
   finding and the three moved values in one paragraph, naming
   `selectionInactivePairs`.
4. Do not add a new floor class.

#### 4.8.3 `packages/tokens/README.md`

In the contrast-contract section, after the inactive paragraph, add two
sentences: the label is held through the selection wash
(`selectionInactivePairs`, thirteen surfaces); the old light `#6E7787` measured
**2.586:1** on Windows light's `selected` fill and the AAA sets 3.43 / 4.36:1,
so `#545D6C`, `#444444` and `#B0B0B0` ship and the tightest is 3.177:1. Keep the
README's existing figures (1.99:1, 2.09:1) untouched — those are the at-rest
history.

#### 4.8.4 `COMPONENTS.md`

In the `Theme contrast check` row, add `13 inactive-selection text pairs` to the
enumeration after `12 soft-selection text pairs`, and append one sentence at the
end of the row (before the closing `|`) naming plan `510`, the washed
`disabledForeground`, the moved values and the tightest figures. Do not
restate a role count.

#### 4.8.5 `TODO.md`

Add a ticked row at the end of the design-tokens list:

```
`[x]` Hold an unavailable label through the text-selection wash — ...
```

with the evidence (2.586:1 Windows light `selected`, 3.430 / 4.357:1 AAA), the
new list, the three moved values and `(plan 510)`. Bump the section's progress
bar by one task (read the current numerator/denominator and add one to each).

#### 4.8.6 Plans index

Add the plan row to the `tokens-theme` table (`510 | The unavailable label
through the text-selection wash | F | 306, 087, 091, 362, 366, 392, 506 | done`)
and a narrative paragraph at the end of the README describing the finding, the
measurements, the new list and the moved values.

## 5. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens test`
   - before the edit: **fails** the new suite (proves it can fail);
   - after all edits: `Test Files … passed`, no failures.
2. `nub run --filter @gpuixui/tokens check-types` — clean.
3. `nub run check` — clean (includes `check:tests`; the new suite asserts real
   ratios, so it passes that gate).
4. `nub run lint` — clean.
5. `nub run test` — clean.

No native runtime check is required: this plan changes the token contract and
three palette values, and every consumer composition is a colour pair the suite
measures. The existing playground gallery already paints `disabledForeground`
through `colorRoles`.

## 6. STOP conditions

Stop and report (do not improvise) if:

- any shipped set still misses a floor after the three value moves — report the
  set, surface and ratio;
- a moved value breaks `themeTextTierFailures`, `themeColorFailures`,
  `themeContrastFailures` or `themeMetricFailures` on any shipped set;
- the docs guards (`docs.test.ts`, `contrast-reference.test.ts`,
  `snippets.test.ts`, `inventory.test.ts`) fail in a way this plan does not
  name;
- a test cannot fail in either direction (the pre-fix values must fail the new
  pairs; the shipped values must pass).

## 7. Acceptance criteria

- `selectionInactivePairs` is exported, applied by `themeContrastFailures`, and
  documented.
- Every shipped theme, platform variant and recipe passes the six checks.
- The new suite fails on the pre-fix values and passes on the shipped ones.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
  `COMPONENTS.md`, `TODO.md` and the plans index state the same list, values and
  figures the code produces.
- `nub run check`, `nub run lint` and `nub run test` pass.
