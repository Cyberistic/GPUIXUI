# Plan 689 — A field's typed text through a text selection

> **Status: executed 2026-10-19.** `selectionInputPairs` ships, the total check
> composes it, and the regression suite proves the pre-fix checker returned
> `[]`. No shipped colour, pair count or metric moves. Execution evidence is at
> the end of this plan.

## Why

`inputForeground` is a text role with at-rest pairs on thirteen surfaces: the
field's own `input` fill, the four `Surface` tones a transparent field sits on,
the four row washes an in-place editor paints and the four soft status fills a
field inside an Alert paints (`inputTextSurfacePairs`, `inputTextWashPairs`,
`softFieldPairs`). A reader can select typed text in every one of those
compositions, and the wash is inherited from the app root.

The washed contract measured that role on `input` only: `selectionForegrounds`
in `src/contrast.ts` maps the `input` surface to `inputForeground`, and every
other surface in `selectionPairs` uses the body role that surface paints
(`foreground`, `popoverForeground`, `selectedForeground`). A theme may legally
set `inputForeground` apart from `foreground` — the two are different roles with
different jobs — and the editor surface can be one of the row washes.

**Measured defect.** A probe on the shipped dark theme, changing one role and
nothing else:

```ts
extendTheme(darkTheme, { colors: { inputForeground: "#D3D8E1" } })
```

returns `themeFailures(theme) === []`, while the same role through the
composited selection wash measures:

| Surface | Ratio | Floor |
| ------- | ----- | ----- |
| `active` | 6.600:1 | 7:1 |
| `selected` | 5.657:1 | 7:1 |
| `infoSoft` | 6.446:1 | 7:1 |
| `successSoft` | 6.638:1 | 7:1 |
| `warningSoft` | 6.613:1 | 7:1 |
| `destructiveSoft` | 6.943:1 | 7:1 |

The pattern is exactly the one plans 087, 362, 506, 510 and 528 closed one role
over: text readable at rest loses its floor once the translucent wash is
composited over the fill, and no check reports it.

## Exact files and changes

### 1. `packages/tokens/src/contrast.ts`

Add one exported list after `selectionSoftWashPairs`. Keep the surface list
module-local unless a second consumer appears; the pair list is public.

```ts
/**
 * The surfaces a field's typed text sits on, beyond the `input` fill
 * `selectionPairs` already holds: the four `Surface` tones a transparent field
 * paints, the four washes an in-place editor paints and the four soft status
 * fills a field inside a status panel paints. The role is `inputForeground`,
 * not the `foreground` the surface's body copy uses — a theme may give a field
 * its own ink — and a reader selects typed text on every one of them. The
 * `input` fill itself is measured by {@link selectionPairs}; together the two
 * lists cover every surface `inputForeground` is measured on at rest.
 *
 * The hint (`placeholder`) is deliberately absent: a placeholder is not typed
 * text and is not a selection a reader can drag. The pressed `selectedActive`
 * row is absent for the same reason the pressed row stays out of the selection
 * wash contract: a row is selected at rest.
 */
export const selectionInputPairs: readonly ContrastPair[] = [
  ...inputTextSurfaces,
  ...stateWashes,
  ...softSurfaceRoles,
].map(
  (background): ContrastPair => ["inputForeground", background, "body"],
);
```

`inputTextSurfaces`, `stateWashes` and `softSurfaceRoles` are already defined
above this point in the file; use them rather than retyping the names. Confirm
the order is documentation order (Surface tones, washes, soft fills).

Add the list to `themeContrastFailures` after the `selectionSoftWashPairs`
walk:

```ts
...textOverWashFailures(selectionInputPairs, "selection", theme, floors),
```

Add a bullet to the function's JSDoc list, beside the selection bullet:

```md
 * - `selectionInputPairs` — a field's typed text (`inputForeground`) through the
 *   same wash on the twelve surfaces a field sits on beyond its own `input`
 *   fill; the fill itself is the `inputForeground` pair in `selectionPairs`, so
 *   the two together cover every surface the role is measured on at rest.
```

### 2. `packages/tokens/src/selection-input-text.test.ts` (new)

Header comment states the defect being guarded, in the style of the other
`selection-*.test.ts` files.

Cases:

1. **The regression, can fail.** Build the theme above and assert the checker
   reports the washed composition:

   ```ts
   const theme = extendTheme(darkTheme, {
     colors: { inputForeground: "#D3D8E1" },
   });
   const failures = themeContrastFailures(theme).filter(
     ({ foreground, wash }) =>
       foreground === "inputForeground" && wash === "selection",
   );
   expect(
     failures.map(({ background }) => background).sort(),
   ).toEqual([
     "active",
     "destructiveSoft",
     "infoSoft",
     "selected",
     "successSoft",
     "warningSoft",
   ].sort());
   failures.forEach(({ ratio }) =>
     expect(ratio).toBeLessThan(contrastFloors.default.body),
   );
   ```

   Without the new list this array is `[]`; with it, the six entries appear.

2. **The list is the whole washed domain.** Derive the at-rest surfaces from
   `contrastPairs`:

   ```ts
   const atRest = new Set(
     contrastPairs
       .filter(([role]) => role === "inputForeground")
       .map(([, surface]) => surface),
   );
   atRest.delete("input"); // measured by selectionPairs
   atRest.delete("selectedActive"); // a transient press, like every pressed row
   expect(
     new Set(selectionInputPairs.map(([, surface]) => surface)),
   ).toEqual(atRest);
   expect(selectionInputPairs).toHaveLength(12);
   ```

   This fails when a new at-rest field surface is added and the wash list is
   not, which is the class of defect being fixed.

3. **Every shipped set still passes.** `shippedThemes.forEach(({ theme }) =>
   expect(themeFailures(theme)).toEqual([]))` — or narrower: every pair in
   `selectionInputPairs` measures at or above the theme's body floor.

### 3. `packages/tokens/src/contrast.test.ts`

- Import `selectionInputPairs` from `./index.js`.
- Add it to `publishedPairLists` (the compile-checked record). A missing entry
  fails `check-types`.
- Add `...selectionInputPairs` to the `measuredRoles` union in
  *contract completeness*.
- Add `expect(selectionInputPairs).toHaveLength(12)` to
  *covers every documented pair*.
- Extend the *reports an opaque selection wash over every painted surface* case
  with the twelve new entries, in emission order after `selectionSoftPairs`:

  ```ts
  ...selectionInputPairs.map(([foreground, background]) => [
    foreground,
    background,
  ]),
  ```

  Do not change `contrastPairs.length` — it stays **461**; this is a washed
  list, like `selectionLinkPairs`.

### 4. `packages/tokens/src/contrast-reference.test.ts`

Add `"selectionInputPairs"` to `appliedLists`, so the published JSDoc must keep
naming it.

### 5. `packages/tokens/src/inventory.test.ts`

Add to the pair-count phrases:

```ts
`${selectionInputPairs.length} field-selection text pairs`,
```

Import it beside the other selection lists.

### 6. `COMPONENTS.md`

In the **Theme contrast check** row, add the matching phrase
`12 field-selection text pairs` beside the other list counts, and name
`selectionInputPairs` in the surrounding sentence if the row enumerates the
selection lists.

### 7. `docs/tokens.md`

- **Text selection** section: extend the sentence held verbatim by
  `docs.test.ts` (search for `so selected text keeps the body contrast`) so it
  says the field's typed text is held on every surface a field sits on, not only
  `input`:

  > … `popover` with `popoverForeground`; `input` with `inputForeground`, and
  > the same role on the `background`/`card`/`popover`/`muted` tones, the
  > `hover`/`active`/`accent`/`selected` washes and the four soft status fills a
  > transparent field sits on; and `selected` with both of the roles a selected
  > row paints …

  Update the exact expected string in `docs.test.ts` at the same time.
- Add a paragraph beside the other selection lists:

  > `selectionInputPairs` holds a field's typed text through the same wash on
  > the twelve surfaces a field sits on beyond its own `input` fill — the four
  > `Surface` tones, the four row washes an in-place editor paints and the four
  > soft status fills. The `input` fill is the `inputForeground` pair in
  > `selectionPairs`, so the two lists together cover every surface the role is
  > measured on at rest. A theme may give a field its own ink apart from
  > `foreground`; an edited theme with `inputForeground: "#D3D8E1"` on the dark
  > identity returned `[]` from every check while its selected text measured
  > 5.657:1 on `selected`, under the body floor (plan `689`).
- **Verification** section: add `selectionInputPairs` to the
  *Every colour role is accounted for* list and to the text-selection paragraph.
  Do not restate the 461 count for this list.
- The pair-count history sentence near the end of *Verification* may gain
  "plan `689` added the washed field-text list without moving the plain
  contract".

### 8. `docs/design-system.md`

- §8 `text selection` row: name the field's typed text as a measured role:
  "… a field's typed text (`inputForeground`) on every surface a field sits on
  …".
- §9 floor table: add one row after the *text selection on a soft status fill*
  row:

  ```md
  | text selection of typed text in a field (`inputForeground` over the composited `selection` wash on the `background`/`card`/`popover`/`muted` tones, the `hover`/`active`/`accent`/`selected` washes and the four soft status fills; the `input` fill is the body-text row) | 7:1 | 7:1 |
  ```

  Add the same derived string to the `docs.test.ts` *states the floors the
  contrast checker enforces* array, built from `contrastFloors`, so it cannot
  drift.

### 9. `packages/tokens/README.md`

In **Selection and scrollbars**, after the native-field paragraph, add:

> A field's typed text is held through the inherited wash on every surface a
> field sits on (`selectionInputPairs`): the four `Surface` tones, the four row
> washes an in-place editor paints and the four soft status fills, beside the
> `input` fill `selectionPairs` already holds.

### 10. `TODO.md`

Add one completed row under *Design tokens and theming* and move the progress
bar from `311/388` to `312/389`:

```
`[x]` Hold a field's typed text through a text selection on every surface a
field sits on — `inputForeground` had at-rest pairs on thirteen surfaces but a
washed pair on `input` only, so an edited dark theme with
`inputForeground: "#D3D8E1"` returned `[]` from every check while its selected
text measured 5.657:1 on `selected`; `selectionInputPairs` adds the twelve
washed pairs and the documents name them (plan 689)
```

### 11. `.agents/slop/plans/README.md`

Add one row to the tokens table:

```
| [689](./689-field-text-selection.md) | A field's typed text through a text selection | F | 071, 087, 362, 506, 510, 527, 528, 659 | done |
```

## Commands

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| New suite only | `cd packages/tokens && nub exec vitest run src/selection-input-text.test.ts` | passes with the fix |
| Prove it fails without the fix | comment out the `textOverWashFailures(selectionInputPairs, …)` line, rerun | case 1 fails (`[]` vs six surfaces) |
| Package suite | `nub run --filter @gpuixui/tokens test` | 193 files pass |
| Types | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| Whole gate | `nub run check` | exit 0 |
| Format | `nub run fmt` | exit 0 |

## Test plan

- The regression case above is the required both-directions proof: it fails on
  the pre-fix tree and passes after, and it names the six measured surfaces.
- The domain case fails when an at-rest `inputForeground` surface is added
  without a washed pair.
- The shipped-set case proves the new list moves no colour in any of the 24
  sets.
- `contrast.test.ts`'s compile-checked pair inventory and uniqueness case make
  the new list a first-class part of the contract rather than a private test
  concern.

## Acceptance

- [ ] `selectionInputPairs` is exported, documented and composed into
      `themeContrastFailures`.
- [ ] The regression suite fails without the fix and passes with it.
- [ ] `contrastPairs.length` is still 461; no shipped colour moves.
- [ ] `docs/tokens.md`, `docs/design-system.md`, the README and `COMPONENTS.md`
      name the list, and their guards pass.
- [ ] `nub run check` and the tokens suite pass.

## STOP conditions

- A shipped set fails the new pairs → stop and report the set, surface and
  ratio; do not adjust a shipped colour from this plan.
- `inputTextSurfaces`, `stateWashes` or `softSurfaceRoles` is not in scope
  above the insertion point → re-read `contrast.ts` and place the list after
  them; do not retype the surface names.
- The opaque-wash case reports a different list order → fix the expectation to
  the checker's emission order (it is ordered), not the checker to the test.
- A gate fails for a file this plan did not touch → report the failure; do not
  fix another workstream's tree.

## Execution (2026-10-19)

`selectionInputPairs` (12 pairs) ships in `src/contrast.ts`, derived from
`inputTextSurfaces`, `stateWashes` and `softSurfaceRoles`; `themeContrastFailures`
composes it after `selectionSoftPairs`, and the JSDoc bullet names it.

The new suite `selection-input-text.test.ts` ran three cases green:

- the edited dark theme reports exactly the six under-floor surfaces (`active`,
  `selected`, the four soft status fills) at their measured ratios;
- the washed list equals the at-rest `inputForeground` domain minus `input`
  (already in `selectionPairs`) and `selectedActive` (transient);
- all 24 shipped sets clear 7:1 / 4.5:1 at their declared contrast.

**Both directions.** Removing the `textOverWashFailures(selectionInputPairs, …)`
line and rerunning the suite makes case 1 fail with `Set {}` where the six
surfaces are expected; restoring it passes. The probe that found the gap was
`extendTheme(darkTheme, { colors: { inputForeground: "#D3D8E1" } })`, whose
`themeFailures` was `[]` before the fix.

Four existing suites asserted that the washed contract could not see the field's
ink, so they were narrowed to the composition they actually test:
`canvas-input-text` filters the at-rest pair (`wash === undefined`),
`selection-text` excludes `inputForeground` beside the link and inactive
exclusions, `soft-field` expects the at-rest and washed pair and checks each
ratio, and `text-hierarchy` notes that a flattened `inputForeground` is now both
a hierarchy and a contrast failure — the card and menu roles stay hierarchy-only.

Gates: `nub run check` exit 0; `nub run --filter @gpuixui/tokens test`
193 files / 6740 tests; `nub run test` the same. `contrastPairs` stays **461**;
the new list is published and documented but not part of that plain count.
