# Plan 344 — The selection veil for content on a filled action

**Phase:** F · **Owner:** `tokens-theme` · **Status:** ready
**Depends on:** 069 (`selectionStyle`), 071 (the public contract), 081 (the nine
selection surfaces), 087 (secondary text through the wash), 091 (soft status
fills), 099 (the scrim as a measured wash), 343 (the last pair).
**Owns:** `packages/tokens/src/color.ts`, `packages/tokens/src/contrast.ts`,
`packages/tokens/src/contrast.test.ts`, `packages/tokens/src/styles.ts`,
`packages/tokens/src/styles.test.ts`, `packages/tokens/src/color.test.ts`,
`packages/tokens/src/selection.example.ts`,
`packages/tokens/src/selection-on-fill.test.ts` (new),
`packages/tokens/src/docs.test.ts`, `packages/tokens/src/inventory.test.ts`,
`packages/tokens/src/readme.test.ts`, `packages/tokens/README.md`,
`docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`,
`.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

`selection` is the accent-tinted wash a drag-select paints behind text. The
contract measures it on nine content surfaces (`selectionSurfaces`) and on the
four soft status fills, in both directions (text through the wash, the wash
against its surface) — plans 081, 087 and 091.

It is **not** measured on the filled action families, and one shipped composition
paints body content there:

```tsx
// packages/components/src/message.tsx (agent/components, 37c0f44)
Match.when("user", () => ({
  backgroundColor: theme.colors.primary,
  color: theme.colors.primaryForeground,
}))
```

`MessageContent` renders a `<markdown>` (or `<text>`) inside that bubble and
nothing in the component opts text out of selection, so a reader drag-selecting
their own message selects text on `primary`.

Because `selection` **is** the accent, an accent fill hides it. Measured over all
24 shipped colour sets (identity 4, three platform variants × 2 modes × 2
contrasts, XP and Aero × 2 modes × 2 contrasts):

| pair | measured |
| ---- | -------- |
| `selection` composited over `primary` | **1.000:1** in identity dark, macOS light, macOS dark, Linux light, Windows light, Aero light and the `default` platform in both modes — an invisible highlight on the one surface a chat message is painted on |
| `primaryForeground` through that wash | **4.70:1** at the tightest (macOS light) — under the 7:1 a body-sized message would need, and only just above the 4.5:1 an on-colour label is held to |
| `selection` composited over `secondary` / `destructive` | passes today, but by accident: neither is a contract surface |

The same audit measured what a **neutral** veil does, at 15% of the mode's ink
(`#00000026` light, `#FFFFFF26` dark), composited over `primary`, `secondary` and
`destructive` and read with each family's own foreground:

| level | tightest text | tightest wash |
| ----- | ------------- | ------------- |
| default | 6.10:1 (macOS light `primary`) | 1.105:1 (Windows dark `primary`) |
| high contrast | 8.45:1 (identity dark `secondary`) | 1.075:1 (identity dark `primary`) |

Both clear the floors the family foreground already has (`secondary`: 4.5:1,
7:1 at AAA) and the `surface` floor (1.05:1) with margin, in every shipped set.

## 2. The decision

Ship a **second selection role**, `selectionOnFill`: the veil for content painted
on a filled action. A content surface keeps `selection`; a filled action uses
`selectionOnFill`, so the accent keeps its identity tint where an accent tint is
perceivable and the filled family gets a neutral step where it cannot be.

Alternatives rejected:

- **Move the bubble to a neutral content surface.** It fixes the highlight by
  giving up the brand fill, and it makes the library's answer to "content on a
  filled action" depend on a component restyle instead of a token.
- **Derive the veil in the helper as `alpha(familyForeground, 0.15)`.** It
  repeats the alpha-composite defect plans 055/097/327 removed: the state would
  take its colour from a computed fraction, could not be edited in a copied
  platform style, and could not be measured as a role.
- **Change `selection` itself to a neutral veil.** The identity wash follows the
  accent on purpose (plan 331), and a neutral wash on the canvas would lose it.

The role is deliberately **mode-based, not platform- or brand-tinted**: a veil
whose job is to guarantee a visible highlight cannot inherit the family it sits
on. Platform styles therefore inherit it from the identity rather than overriding
it; the high-contrast sets carry the same 15% veils, which the audit measured at
their own floors.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/color.ts`

1. In `ThemeColors`, after `selection` and before `overlay`, add:

   ```ts
   /**
    * Text-selection veil for content painted on a filled action. Neutral, because
    * an accent-tinted wash cannot be perceived on the accent fill itself.
    */
   readonly selectionOnFill: string;
   ```

2. In `lightColors`, after `selection: "#7567F23D"`, add
   `selectionOnFill: "#00000026",`.
3. In `darkColors`, after `selection: "#A7A9FF33"`, add
   `selectionOnFill: "#FFFFFF26",`.
4. In `highContrastLightColors`, after `selection: "#7567F24D"`, add
   `selectionOnFill: "#00000026",`.
5. In `highContrastDarkColors`, after `selection: "#4C39B54D"`, add
   `selectionOnFill: "#FFFFFF26",`.
6. In `colorRoles`, after `"selection"`, add `"selectionOnFill"`.

`color.test.ts` asserts `colorRoles` equals `Object.keys(lightColors)`, so the
interface, the record and the index must be in the same position.

### 3.2 `packages/tokens/src/contrast.ts`

1. After `selectionWashPairs` and before `selectionSoftPairs`, add:

   ```ts
   /**
    * Content painted on a filled action — a user message bubble on `primary`, a
    * neutral filled surface, a destructive one — uses the inverse veil rather
    * than the accent-tinted `selection`, which is invisible on the accent fill
    * itself. The veil is held to the perceivability floor on each fill, and each
    * family's own foreground to the floor it already has on that fill.
    */
   export const selectionFillWashPairs: readonly ContrastPair[] = [
     ["selectionOnFill", "primary", "surface"],
     ["selectionOnFill", "secondary", "surface"],
     ["selectionOnFill", "destructive", "surface"],
   ];

   /** The family foreground through the inverse veil, at the on-colour floor. */
   export const selectionFillPairs: readonly ContrastPair[] = [
     ["primaryForeground", "primary", "secondary"],
     ["secondaryForeground", "secondary", "secondary"],
     ["destructiveForeground", "destructive", "secondary"],
   ];
   ```

2. In the big JSDoc above `contrastPairs`, after the sentence about the selection
   wash, add: "Content painted on a filled action uses `selectionOnFill`, a
   neutral veil measured on `primary`, `secondary` and `destructive`."
3. In `themeContrastFailures`, after the `selectionSoftWashPairs` call and before
   the `overlayWashPairs` call, add:

   ```ts
   ...textOverWashFailures(selectionFillPairs, "selectionOnFill", theme, floors),
   ...washVisibilityFailures(
     selectionFillWashPairs,
     "selectionOnFill",
     theme,
     floors,
   ),
   ```

4. Extend the `themeContrastFailures` JSDoc with one sentence naming the two
   lists.

### 3.3 `packages/tokens/src/contrast.test.ts`

1. Append to the header comment:

   ```
    * Plan 344 closes the last content surface the selection contract never
    * reached: a user message bubble paints body text on `primary`
    * (`components/message.tsx`), where the accent-tinted `selection` wash
    * composites to 1.000:1 in seven shipped sets. `selectionFillPairs` and
    * `selectionFillWashPairs` hold the neutral `selectionOnFill` veil on
    * `primary`, `secondary` and `destructive`; every shipped set clears the
    * floors, so no colour moves.
   ```

2. Import `selectionFillPairs` and `selectionFillWashPairs`.
3. In `"covers every documented pair"`, after the `selectionSoftWashPairs`
   assertions add:

   ```ts
   expect(selectionFillPairs).toHaveLength(3);
   expect(selectionFillWashPairs).toHaveLength(3);
   expect(selectionFillPairs.map(([role, fill]) => [role, fill])).toEqual([
     ["primaryForeground", "primary"],
     ["secondaryForeground", "secondary"],
     ["destructiveForeground", "destructive"],
   ]);
   ```

4. Add the two lists to `measuredRoles` in the completeness suite:
   `...selectionFillPairs, ...selectionFillWashPairs,`.
5. Add a case `"reports a selection veil that paints nothing on a filled action"`:
   extend the light theme with `{ selectionOnFill: getTheme("light").colors.primary }`
   and expect three failures with `wash: "selectionOnFill"`, `pairClass:
   "surface"`, `floor: 1.05`, `ratio: 1`, one per fill.

### 3.4 `packages/tokens/src/styles.ts`

1. Change `selectionStyle` to:

   ```ts
   export function selectionStyle(
     theme: Theme,
     on: "surface" | "fill" = "surface",
   ): SelectionStyle {
     return {
       selectionColor:
         on === "fill" ? theme.colors.selectionOnFill : theme.colors.selection,
     };
   }
   ```

2. Extend its JSDoc: after the paragraph about the wash, add:

   > Content painted on a filled action uses `selectionStyle(theme, "fill"): the
   > accent-tinted wash cannot be perceived on the accent fill itself, while the
   > neutral veil steps away from every filled family in both modes.

   Keep the native-field paragraph byte-identical — `docs.test.ts` holds it.

### 3.5 `packages/tokens/src/selection.example.ts`

Add, after `appRootStyle`:

```ts
/**
 * Content on a filled action: a user-authored chat bubble. The bubble paints the
 * brand fill, so its selectable text takes the inverse veil.
 */
export const filledContentStyle = (theme: Theme) => ({
  ...selectionStyle(theme, "fill"),
  backgroundColor: theme.colors.primary,
  color: theme.colors.primaryForeground,
});
```

### 3.6 `packages/tokens/src/selection-on-fill.test.ts` (new)

Header comment states the bug: a user message bubble paints body text on
`primary`, the accent-tinted `selection` composites to 1.000:1 there in seven
shipped sets, and the contract measured no selection pair on a filled action.

Imports: `contrastFloors`, `contrastPairs`, `contrastRatio`, `compositeOver`,
`extendTheme`, `getPlatformRecipeTheme`, `getPlatformTheme`, `getTheme`,
`platformNames`, `platformRecipeNames`, `selectionFillPairs`,
`selectionFillWashPairs`, `selectionStyle`, `themeContrastFailures`,
`themeModes`, `themeContrasts`, `type Theme` from `./index.js`; plus
`filledContentStyle` from `./selection.example.js`.

Build the 24-set list the way `invalid-field-edge.test.ts` does (identity, three
platform styles, two recipes × `themeModes` × `themeContrasts`).

Cases:

1. `"publishes the inverse veil on each filled family"` — expect the three wash
   pairs in `primary`, `secondary`, `destructive` order, class `surface`, and the
   three text pairs in family order, class `secondary`.
2. `"keeps every shipped set's veil and family text at their floors"` — for each
   set, for each of the three pairs: wash visibility
   `contrastRatio(selectionOnFill, fill)` ≥ `surface` floor **when composited**
   (use `compositeOver(theme.colors.selectionOnFill, theme.colors[fill])`), and
   the family foreground on the composite ≥ the `secondary` floor; collect
   failures and expect `[]`.
3. `"records the selection wash the defect replaced"` — for the identity light,
   macOS light and identity dark sets, assert the accent-tinted `selection` over
   `primary` is **below** the `surface` floor (the reason the role exists), and
   `selectionOnFill` over `primary` is at or above it. This is the limitation
   guard: if a future palette ever makes the accent wash perceivable on the brand
   fill, the role and this file must be revisited.
4. `"reports an edited theme whose veil matches its fill"` — extend the light
   theme with `selectionOnFill: lightTheme.colors.primary`; filter
   `themeContrastFailures` for `wash === "selectionOnFill"`; expect the three
   `surface` failures at `ratio: 1`.
5. `"reports an opaque veil that erases the family label"` — extend the dark
   theme with `selectionOnFill: darkTheme.colors.primaryForeground`; expect the
   `primaryForeground`/`primary` failure as a `secondary` pair with a ratio near
   1.
6. `"maps the fill selector to the inverse role, and the default to the content
   wash"` — `selectionStyle(theme, "fill").selectionColor` is
   `theme.colors.selectionOnFill`; `selectionStyle(theme)` is unchanged;
   `filledContentStyle(theme)` spreads the veil and paints the brand fill.
7. `"keeps the two washes distinct"` — every shipped set's `selection` and
   `selectionOnFill` differ, and `selectionOnFill` is a translucent 8-digit hex.

### 3.7 `packages/tokens/src/styles.test.ts`

In the `selectionStyle` describe, add a case asserting the fill selector maps
`theme.colors.selectionOnFill` for `lightTheme` and `darkTheme`, that the default
call is unchanged, and that the two values differ. Update the `selection example`
case to assert `filledContentStyle(lightTheme)` equals
`{ ...selectionStyle(lightTheme, "fill"), backgroundColor:
lightTheme.colors.primary, color: lightTheme.colors.primaryForeground }`.

### 3.8 `packages/tokens/src/color.test.ts`

In `describe("text selection")`, after the `selection` translucency case, add one
per set:

```ts
it(`${label}: selectionOnFill is a translucent veil`, () => {
  expect(colors.selectionOnFill).toMatch(/^#[0-9A-F]{8}$/);
});
```

### 3.9 `packages/tokens/src/docs.test.ts`

1. Add a case in the selection area:

   ```ts
   it("states the inverse veil for content on a filled action", () => {
     expect(markdownProse).toContain(
       "Content painted on a filled action uses `selectionOnFill`",
     );
     expect(markdownProse).toContain(
       "`selectionStyle(theme, \"fill\")`",
     );
     ["selectionFillPairs", "selectionFillWashPairs"].forEach((name) => {
       expect(markdown).toContain(name);
     });
   });
   ```

2. Add the two floor rows to the §9 row array (see 3.11), in the same position
   the document places them.

### 3.10 `packages/tokens/src/inventory.test.ts`

Role counts are derived from `colorRoles.length`, so no number changes. Run the
suite; if a phrase in the **Design tokens** row is quoted literally, update it to
65 (see 3.12).

### 3.11 `docs/design-system.md`

1. §4, change "the same 64 roles" to "the same 65 roles".
2. §8 **text selection** row: after "including the four soft status fills
   (`xSoftForeground`), and the wash itself stays perceivable", add:

   > Content painted on a **filled action** uses `selectionOnFill`, a neutral 15%
   > veil: the accent-tinted wash cannot be seen on the accent fill itself
   > (measured 1.000:1 on `primary` in seven shipped sets), while the veil keeps
   > every family's own foreground above its floor in both modes.

3. §9 floor table: after the "text selection wash" row, add:

   ```
   | text selection on a filled action (`primaryForeground`/`secondaryForeground`/`destructiveForeground` over the composited `selectionOnFill` veil) | 4.5:1 | 7:1 |
   | text selection veil on a filled action (`selectionOnFill` over `primary`/`secondary`/`destructive`) | 1.05:1 | 1.05:1 |
   ```

   Fill the first cell's numbers from `contrastFloors` in the test array (3.9.2).

### 3.12 `docs/tokens.md`

1. Types index: `ThemeColors` row → "The 65 semantic colour roles."
2. Colour-role prose: "There are 64 roles." → "There are 65 roles."; "the same
   64 roles" → "the same 65 roles" (both occurrences, including the `Theme`
   paragraph).
3. In the default and high-contrast role tables, add after the `selection` row:

   ```
   | `selectionOnFill` | `#00000026` | `#FFFFFF26` | text selection veil for content painted on a filled action (15% in both modes; `selectionColor`) |
   ```

   (high-contrast table: same two values).
4. Text selection section, after the paragraph ending "fails the check too.":

   > Content painted on a filled action uses `selectionOnFill` instead of
   > `selection`: the accent-tinted wash is the accent, so on a `primary` fill it
   > composites to **1.000:1** — an invisible highlight on the one surface a user
   > message is painted on (identity dark, macOS light and dark, Linux light,
   > Windows light and Aero light). The neutral 15% veil steps away from the fill
   > in both modes; `selectionFillPairs` holds each family's own foreground
   > through it (6.10:1 at the tightest, above the 4.5:1 the on-colour role
   > already has) and `selectionFillWashPairs` the veil itself (1.105:1 at the
   > tightest, above the 1.05:1 perceivability floor). `selectionStyle(theme,
   > "fill")` applies it to a subtree:
   >
   > ```tsx
   > import { selectionStyle } from "@gpuixui/tokens";
   >
   > <div style={{ ...selectionStyle(theme, "fill"),
   >               backgroundColor: theme.colors.primary }}>
   >   {children}
   > </div>;
   > ```
   >
   > A runnable version is `filledContentStyle` in
   > [`src/selection.example.ts`](../packages/tokens/src/selection.example.ts).
   >
   > The two lists join the checker as six pairs, reported with
   > `wash: "selectionOnFill"`; every shipped set already clears them, so no
   > colour moves.

5. History paragraph: append "Plan `344` adds the inverse veil for content on a
   filled action — `selectionOnFill` on `primary`/`secondary`/`destructive` — as
   six wash pairs beside the plain `contrastPairs` list." and change
   "plans `076`–`343` closed" to "plans `076`–`344` closed".

### 3.13 `COMPONENTS.md`

1. **Design tokens** row: "64 semantic roles" → "65 semantic roles"; every other
   numeric role phrase in the row must stay `colorRoles.length` (the guard scans
   them). Add, after the `selectionStyle` clause: "content on a filled action
   uses the neutral `selectionOnFill` veil (`selectionStyle(theme, "fill")`),
   because the accent wash is invisible on the accent fill (plan 344)".
2. **High-contrast theme** row: "same 64 roles" → "same 65 roles".
3. **Theme contrast check** row: add "6 fill-selection pairs" to the enumerated
   list and append: "Plan 344 holds compact content painted on a filled action —
   `primaryForeground`/`secondaryForeground`/`destructiveForeground` through the
   neutral `selectionOnFill` veil, and the veil on each fill — after the
   accent-tinted `selection` measured 1.000:1 on `primary` in seven shipped sets
   (3 + 3 pairs, every set already passes, so no colour moves)."
4. **Text selection** is not its own row; §1 is enough.

### 3.14 `packages/tokens/README.md`

1. Role count: "64 roles" → "65 roles".
2. In the selection paragraph (~line 377), after the `selectionStyle(theme)`
   explanation, add:

   > Content painted on a filled action uses `selectionStyle(theme, "fill")`: the
   > accent-tinted `selection` wash composites to 1.000:1 on `primary` in seven
   > shipped sets, so `selectionOnFill` is a neutral 15% veil. `selectionFillPairs`
   > and `selectionFillWashPairs` hold each family's foreground and the veil
   > itself to their floors.

   `readme.test.ts` fails if the README drifts; run it.

### 3.15 `TODO.md`

1. In **Design tokens and theming**, add a ticked row after the plan 343 row:

   ```
   `[x]` Ship the inverse selection veil for content painted on a filled action —
   a user message bubble paints body text on `primary`, where the accent-tinted
   `selection` composites to 1.000:1 in seven shipped sets; `selectionOnFill` is a
   neutral 15% veil, `selectionStyle(theme, "fill")` applies it, and
   `selectionFillPairs`/`selectionFillWashPairs` hold the three families to their
   floors with no colour change (plan 344)
   ```

2. Add an **unchecked** cross-team row:

   ```
   `[ ]` Cross-team: `components` applies `selectionStyle(theme, "fill")` — or
   `theme.colors.selectionOnFill` — to the user `Message` bubble in
   `message.tsx` `bubble()`, which paints body text on `primary`; the
   accent-tinted `selection` wash composites to 1.000:1 there in identity dark,
   macOS light/dark, Linux light, Windows light and Aero light, so selecting a
   sent message shows no highlight. The token and helper ship in plan 344; the
   bubble keeps its brand fill (owner: `components`; plan 344)
   ```

3. Update the section's progress bar to 112 done of 148 tracked.

### 3.16 Plan index

`.agents/slop/plans/README.md`: add the table row after 343 and append a prose
paragraph stating the gap, the seven 1.000:1 sets, the neutral veil's measured
minima (6.10:1 text, 1.105:1 wash default; 8.45:1 and 1.075:1 at AAA), the six
pairs, and the cross-team `components` fix.

## 4. Commands

From the worktree root:

```sh
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

Expected: the package type check is clean; every tokens file passes (one new test
file); the repo gates pass. While iterating:

```sh
cd packages/tokens && nub x vitest run src/selection-on-fill.test.ts
```

## 5. STOP conditions

Stop and report (do not improvise) if:

- `contrastPairs.length` is not 315 before the change — another plan landed;
  rebase and re-derive counts and doc anchors;
- any shipped variant fails the new veil or text pairs at the level it declares —
  that is a palette defect; report the set and ratio instead of choosing new
  values without a plan;
- `components/message.tsx` no longer paints the user bubble with `primary`
  (the cross-team row is then stale) — re-read the component before shipping the
  rationale;
- `selectionStyle` already has a second parameter or a `selectionOnFill` name
  exists — reconcile instead of adding a second spelling;
- a `docs.test.ts` expected sentence no longer matches the document after the
  edit (a concurrent docs change) — re-read both and reconcile;
- `nub run test` fails outside `packages/tokens` for a reason unrelated to this
  plan — record it in `TODO.md` and leave it to its owner.

## 6. Test plan (both directions)

- **Without the fix:** `selection-on-fill.test.ts` case 1 fails (the lists do not
  exist), case 4/5 return `[]` from the checker (no fill-selection pairs), and
  case 6 fails to compile (`selectionStyle` takes one argument). Run the file
  against the pre-change tree to record this.
- **With the fix:** every case passes; `themeContrastFailures` reports a fill
  veil that matches its fill and an opaque veil that erases a family label;
  `filledContentStyle` is the executed example the docs quote.
- **Limitation case 3** passes before and after the veil (it pins the reason the
  accent wash cannot serve a filled action); prove it can fail by temporarily
  changing the sampled set to identity light, where the wash is visible, then
  restore.
- `nub run check`, `nub run lint`, `nub run test` pass; commits are on
  `agent/tokens-theme` and pushed.

## 7. Acceptance

- `selectionOnFill` exists in every shipped colour set and in `colorRoles`, and
  the two role tables name it.
- `selectionStyle(theme, "fill")` returns it; the no-argument call is unchanged.
- `themeContrastFailures` reports the six fill-selection pairs on an edited theme
  and returns `[]` for every shipped theme at its declared level.
- The docs state the measured 1.000:1 defect, the veil's minima, and the
  copy-and-own snippet; `docs.test.ts`, `readme.test.ts` and `inventory.test.ts`
  hold them.
- The `components` migration is recorded in `TODO.md` with the evidence.
- All three gates pass and the branch is pushed.
