# 309 — The state fills on the panel they paint on

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
063, 076–095, 300, 306–308 · **Touches:** `packages/tokens`,
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`COMPONENTS.md`, `TODO.md`, this index

## 1. The gap

The contract measures text *on* a wash and a control edge *on* a fill, but it
never measures the wash or the fill itself against the **surface it is painted
on**. Every perceivability pair added so far is either a status surface
(`xSoft`), a loading placeholder (`skeleton`) or a composited wash (`selection`,
`overlay`). The interactive neutrals — `hover`, `active`, `accent`, `selected`
and the `secondary` family — have no such pair, and neither do the coloured
filled families (`primary`, `destructive`).

That is a real composition gap, not a theoretical one. Rows and controls are
painted on four base surfaces: `background`, `card`, `popover` and the `muted`
panel a sidebar or settings group uses. Plans 084 and 086 already treat `muted`
as a surface a control sits on (the checkbox edge and the focus ring are
measured there), and the design system calls the `muted` panel the sidebar
surface. A hovered row or a filled button in a sidebar is therefore a supported
composition, and it is unmeasured.

The audit found **21 shipped pairs below the library's own 1.05:1
perceivability floor** in seven themes, and the worst of them are invisible:

| Theme | Pair | Measured |
| ----- | ---- | -------- |
| identity light | `hover` / `secondary` / `accent` / `selected` on `muted` | **1.000:1** |
| identity dark | `hover` on `muted` and on `popover` | **1.000:1** |
| macOS light | `accent` / `selected` on `background` | **1.021:1** |
| macOS light | `accent` / `selected` on `muted` | 1.034:1 |
| macOS light | `hover` / `secondary` on `muted` | 1.036:1 |
| Linux light | `accent` on `muted` | 1.001:1 |
| Linux light | `hover` on `muted` | 1.016:1 |
| Linux light | `secondary` on `muted` | 1.035:1 |
| Windows light | `secondary` on `muted` | **1.000:1** |
| Windows light | `hover` on `muted` | 1.018:1 |
| Windows light | `accent` on `background` | 1.034:1 |
| Windows light | `accent` on `muted` | 1.021:1 |
| high-contrast dark | `accent` / `selected` on `muted` | 1.034:1 |

The identity light theme is the clearest case: `muted`, `hover` and `secondary`
are the **same value** (`#EEF1F5`), and `accent`/`selected` are `#EEF0FF`. A
sidebar row in the default theme has no hover feedback, a secondary button on the
panel has no shape, and a selected row is invisible. The identity dark theme has
`hover` equal to `muted` and `popover` (`#222730`), so a menu item does not react
to the pointer at all. The macOS and Windows light accents are also too close to
their own canvases for the toggle-on fill to read.

The reasons these survived every previous audit: the contract measured the
*contents* of these fills (text, edges, rings) and never the fill as a shape of
its own on a surface. Plan 097 made filled-control **states** perceivable
relative to each other (`x` → `xHover` → `xActive`), but not relative to the
surface the control sits on.

## 2. Decision (do not re-litigate)

- Add `stateFillRoles` × `stateFillSurfaces` = **52 pairs** at the `surface`
  floor (1.05:1 default and high contrast):
  - fills: `primary`, `primaryHover`, `primaryActive`, `secondary`,
    `secondaryHover`, `secondaryActive`, `destructive`, `destructiveHover`,
    `destructiveActive`, `accent`, `hover`, `active`, `selected`;
  - surfaces: `background`, `card`, `popover`, `muted`.
  `contrastPairs` grows **180 → 232**.
- Do **not** include `disabled`: the design system states the fill is allowed to
  sit within the panel's value (no neutral clears both a white card and the quiet
  panel), and the control's `border` edge carries the shape (plan 306).
- The fix is to move the **quiet panel one step toward the card in light mode**,
  not to darken five shared washes. On the current ladder the washes and the
  panel are adjacent steps: `hover`, `active`, `secondary` and `border` are all
  within 1.05:1 of each other, so moving a wash darker collides with the
  `border` edge (plan 080) or with `secondaryHover`/`secondaryActive` (plan
  097). Moving `muted` toward white is one value per light theme, keeps the
  filled-state matrix, the divider contract and the ring contract untouched,
  and *raises* every text, edge, ring, inactive and soft-tint pair measured on
  the panel.
- Light layering becomes canvas → quiet panel → card: the panel is a grouping
  surface a step toward raised content, and the canvas-to-panel separation is
  carried by the panel's own divider where a design draws one. This is stated in
  the design system so it is a decision, not an accident.

Value changes:

| Theme | Role | Old | New | Why |
| ----- | ---- | --- | --- | --- |
| identity light | `muted` | `#EEF1F5` | `#FBFCFD` (`palette.neutral[25]`) | clears every wash at 1.103:1; one value, no cascade |
| identity dark | `hover` | `#222730` | `#262C36` | a designed step between `muted` (850) and `active` (800): 1.068 on `muted`/`popover`, 1.059 vs `active` |
| macOS light | `muted` | `#ECECF0` | `#F7F7FA` | 1.142 on the washes, 1.277 on `active` |
| macOS light | `accent`, `selected` | `#E7F1FF` | `#D9EAFD` | 1.098 on the canvas, 1.146 on the panel |
| Linux light | `muted` | `#EBEBEA` | `#FBFBFA` | 1.171 / 1.193 on hover/secondary, 1.154 on `accent` |
| Windows light | `muted` | `#EDEDED` | `#F7F7F7` | 1.113 on `hover`, 1.093 on `secondary` |
| Windows light | `accent` | `#E5F1FB` | `#DCEBF8` | 1.095 on the canvas, 1.134 on the panel |
| high-contrast dark | `accent`, `selected` | `#1C1547` | `#251B5C` | a lighter iris: 1.152 on `muted`, 1.219 on `popover`; `selectedForeground` is 11.943:1 on it |

No other value moves. The dark platform variants already clear the floor
(`hover` is a designed step off `muted` there), and the identity/high-contrast
light accents already clear it on their canvases.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. After `controlFillPairs`, declare the role and surface lists and the group:

   ```ts
   /**
    * The interactive fills a control or row paints as its own shape: the two
    * generic washes, the accent and selected fills, and the filled-action
    * families. A filled control is a surface, so its fill must stay
    * perceivable on the surface behind it.
    */
   export const stateFillRoles = [...] as const;

   /**
    * The surfaces an interactive fill is painted on: the canvas, a card, a
    * popover (a menu item) and the quiet `muted` panel (a sidebar row or a
    * settings-group control).
    */
   export const stateFillSurfaces = ["background", "card", "popover", "muted"] as const;

   /** Every interactive fill, measured on each surface it paints on. */
   export const stateFillSurfacePairs: readonly ContrastPair[] =
     stateFillRoles.flatMap((fill) =>
       stateFillSurfaces.map(
         (background): ContrastPair => [fill, background, "surface"],
       ),
     );
   ```

2. Spread `...stateFillSurfacePairs` into `contrastPairs` beside the other
   `surface` groups.
3. Extend the `contrastPairs` and `themeContrastFailures` JSDoc with one clause:
   an interactive fill or wash is a surface and is measured against the panels it
   paints on.
4. Export the three names from `index.ts` if that file re-exports `*` (check
   first; it does export the module's public values).

### 3.2 `packages/tokens/src/color.ts`

- `lightColors.muted`: `palette.neutral[100]` → `palette.neutral[25]`.
- `darkColors.hover`: `palette.neutral[850]` → `"#262C36"`.
- `highContrastDarkColors.accent` and `.selected`: `palette.iris[900]` →
  `"#251B5C"`.
- Update each palette block's JSDoc: the light quiet panel is a step toward the
  card so a wash on it stays perceivable; the dark hover is a designed step
  between the 850 panel and the 800 pressed wash; the AAA accent is lighter so a
  selected row is perceivable on the AAA dark panel.

### 3.3 `packages/tokens/src/platform-styles/*.ts`

- `macos.ts` light: `muted: "#F7F7FA"`, `accent: "#D9EAFD"`,
  `selected: "#D9EAFD"`.
- `linux.ts` light: `muted: "#FBFBFA"`.
- `windows.ts` light: `muted: "#F7F7F7"`, `accent: "#DCEBF8"`.
- Add one line to each file's header note naming the plan-309 reason.

### 3.4 `packages/tokens/src/contrast.test.ts`

- `contrastPairs.length` 180 → 232.
- Assert `stateFillSurfacePairs.length` is 52 and its keys are the 13 roles ×
  the 4 surfaces in declaration order.

### 3.5 `packages/tokens/src/state-fill-surfaces.test.ts` (new)

Header comment: *Guards the gap plan 309 closed: the contract measured what is
painted on a fill but never the fill itself, so the identity light `muted`,
`hover` and `secondary` were the same value (1.000:1), the identity dark `hover`
was its `muted` and `popover`, macOS light's `selected` was 1.021:1 on its own
canvas, and a secondary button or hovered row in any light sidebar disappeared.*

Tests:

1. **The pairs exist in role × surface order** — `stateFillSurfacePairs` is the
   13 documented roles × 4 surfaces, 52 pairs, exported and spread into
   `contrastPairs`.
2. **Every shipped theme clears the floor** — identity, high contrast and each
   real platform theme, at its declared floor, for every pair. Fails on the
   current tree for the 21 pairs above.
3. **The regression is stated** — the historical pairs are written out
   (`contrastRatio("#EEF1F5", "#EEF1F5")` is 1, the old dark `hover` on
   `popover` is 1, macOS light `#E7F1FF` on `#F2F2F7` is 1.021) and the shipped
   values pass. Do not import the old values from the theme — the point is that
   the defect is recorded.
4. **The public checker reports an erased fill** — extend the identity light
   theme with `muted: theme.colors.hover` and assert `themeContrastFailures`
   returns the `hover`/`muted` failure at ratio 1; the same for dark
   `popover: theme.colors.hover`.
5. **A copied style may design its own panel** — a style that sets a deeper
   `muted` still applies and passes through `getPlatformTheme` (the value is
   editable, like every other role).
6. **The filled families are not exempt** — assert `primary`, `secondary` and
   `destructive` (and their hover/pressed steps) are in the role list, so a
   future edit cannot reduce the check back to the neutral washes.

### 3.6 Documents

- `docs/tokens.md`
  - The four colour-table rows the palette moves: light `muted`, dark `hover`,
    high-contrast dark `accent` and `selected`.
  - The Verification section: a paragraph stating that an interactive fill is a
    surface, naming the 13 roles and four surfaces, and quoting the identity
    light and macOS light defects. Name `stateFillRoles`, `stateFillSurfaces`
    and `stateFillSurfacePairs` (the public-value guard requires every export to
    appear).
  - The `muted` role description prose (if the table description is not enough)
    gains the light layering rule: canvas → quiet panel → card.
- `docs/design-system.md`
  - §4 or §7: the light layering rule and why the panel moves toward the card.
  - §8: the state table's `hover`/pressed/selected rows say the wash must stay
    perceivable on the surface it paints on, including the quiet panel.
  - §9: a new floor-table row, `interactive fills and washes (...) on
    background/card/popover/muted`, 1.05:1 in both columns.
- `packages/tokens/README.md`: one sentence in the contrast paragraph naming the
  new group and the identity light regression; guard it in `readme.test.ts` if it
  contains a figure.
- `COMPONENTS.md`: "Theme contrast check" row's 180 → 232 pairs and one clause
  for the interactive fills; the "Design tokens" row's contrast sentence gains
  the panel/wash rule.
- `TODO.md`: add the row under the design-tokens section and tick it; progress
  76/100 → 77/101.
- This index: add 309 as `done` with a closing paragraph.

## 4. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | before §3.1–3.3: `state-fill-surfaces.test.ts` fails on the pair group and the 21 shipped pairs |
| 2 | same | after: every file green |
| 3 | `nub run check` | exit 0 (docs tables and guarded sentences agree with the new values; test-quality guard passes) |
| 4 | `nub run lint` | exit 0 |
| 5 | `nub run test` | exit 0 |

## 5. STOP conditions

Stop and report if:

- a pair outside the 21 listed fails after the value changes (the fix was meant
  to be isolated; a second failing theme or role means the premise is wrong);
- an existing contract pair breaks under the new `muted`/`hover`/`accent`
  values (text, ring, border, inactive, selection, soft tint or scrim);
- the light panel cannot be moved without also moving `border`, a filled-control
  step or a soft tint (that would mean the layering decision, not the check, is
  wrong);
- a change is needed outside the paths listed above.

## 6. Acceptance

- [x] `stateFillSurfacePairs` is 13 roles × 4 surfaces and is spread into
      `contrastPairs`; the pair count is 232.
- [x] Every shipped theme clears its declared surface floor on all 52 pairs.
- [x] The identity light, identity dark, macOS light and Windows light
      regressions are stated in the new test.
- [x] The public checker reports an erased fill on a panel.
- [x] Documents, ledger and TODO are current; gates pass; committed and pushed.

## 7. Outcome

- The gap was real in six of the ten shipped themes: **21 pairs** were under
  the 1.05:1 floor, five of them exactly 1.000:1 (the identity light
  `hover`/`secondary` on the panel, the identity dark `hover` on
  `muted`/`popover`, and Windows light `secondary` on its panel; the identity
  light `accent`/`selected` were 1.0004:1).
  macOS light `selected` was 1.021:1 on the canvas, Linux light `accent`
  1.001:1 on the panel, and the AAA dark `accent` 1.034:1 on the panel.
- `stateFillSurfacePairs` is public (52 pairs: the 13 interactive fills ×
  `background`/`card`/`popover`/`muted`) and is spread into `contrastPairs`; the
  public checker reports an erased fill like it reports an erased edge.
- The fix moved the light quiet panel toward the card rather than darkening the
  shared wash ladder, which already sits within 1.05:1 of the control `border`
  edge: identity `#EEF1F5` → `#FBFCFD` (`palette.neutral[25]`), macOS
  `#ECECF0` → `#F7F7FA`, Linux `#EBEBEA` → `#FBFBFA`, Windows `#EDEDED` →
  `#F7F7F7`. The identity dark `hover` is now `#262C36` (1.068 on the panel,
  1.059 vs the press), macOS light `accent`/`selected` `#D9EAFD` (1.098 on the
  canvas), Windows light `accent` `#DCEBF8` (1.095) and the AAA dark
  `accent`/`selected` `#251B5C` (1.152 on `muted`, 1.219 on `popover`). No text,
  edge, ring, inactive, selection, soft-tint or scrim pair changed.
- Both directions were proved: with only the colour values reverted, the shipped
  suite fails on the 21 pairs (the new suite plus the generic surface loops in
  `color.test.ts` and `contrast.test.ts`); with only the `contrastPairs` spread
  removed, the new checker case fails. Restored, all pass.
- Green: **43 test files, 2842 tests**. `nub run check`, `nub run lint` and
  `nub run test` were run and passed. Committed and pushed.
