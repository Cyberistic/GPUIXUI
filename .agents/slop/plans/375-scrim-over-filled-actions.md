# Plan 375 — the modal scrim over the filled actions and status panels a window shows

**Workstream:** `tokens-theme` · **Phase:** F (integration and polish) ·
**Depends on:** 071, 099, 309, 311, 359 · **Status:** done when every step below
has been run.

## 1. The defect

`overlayWashPairs` composites the modal scrim (`colors.overlay`) over the
surfaces a Dialog covers and holds the painted result to the `surface` floor
(1.05:1). Plan 099 measured the four base surfaces; plan 359 added `input` and
`selected` because they persist while a dialog opens. The list still stops at
the layout, and a window is not only layout: it shows filled actions and status
panels.

A dialog opens over a page that carries a primary action, a neutral action, a
destructive action, a toggled-on accent control and an Alert or Toast. The
scrim covers all of them, and its job is to change what is beneath it. If an
edited theme sets `overlay` to a value that composites to the fill it covers,
the control or panel does not dim, while `themeContrastFailures` returns `[]`.

The omission is in the same class as plan 359's: a persistent surface a modal
covers was not measured because the list was read as "the base layout" rather
than "what the window shows".

## 2. Evidence

A temporary probe (removed after measuring, as the workstream's other probes
were) applied `overlay` over the 24 shipped colour sets — identity, the three
platform variants and the two recipes, in both modes and both contrast levels —
and measured the composited ratio. Every proposed surface already clears the
1.05:1 floor; the tightest is **1.075:1** (high-contrast dark, `overlay` on
`primary`), then **1.105:1** (high-contrast dark on `destructive`). So no token
value moves.

The checker currently returns `[]` for a theme whose `overlay` equals one of
those fills, because none of the eight surfaces is in `overlayWashPairs`.

## 3. Decision

Extend `overlaySurfaces` with the persistent surfaces a window shows:

| Group | Roles | Why the scrim covers it |
| ----- | ----- | ----------------------- |
| filled actions | `primary`, `secondary`, `destructive` | the resting fills of buttons on the page behind the dialog |
| toggled-on accent | `accent` | the resting fill of a toggle that is on (the same role is a row hover wash; the role is persistent in this composition) |
| status panels | `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft` | an Alert, Badge or Toast on the page behind the dialog |

The transient pointer washes `hover` and `active` stay out: reaching the dialog
takes the pointer off the row. `accentHover`, `accentActive`, `primaryHover`,
`primaryActive`, `secondaryHover`, `secondaryActive`, `destructiveHover` and
`destructiveActive` stay out for the same reason — a scrim over a pointer state
is not a composition the system supports.

`disabled`, `skeleton` and `track` stay out deliberately: they are not the
content a dialog opens over, and a scrim that is invisible on a disabled
control, a loading placeholder or a progress groove still dims the layout the
reader is looking at.

## 4. Files to change

1. `packages/tokens/src/contrast.ts`
   - `overlaySurfaces`: append the eight roles, in documentation order:
     `primary`, `secondary`, `accent`, `destructive`, `infoSoft`, `successSoft`,
     `warningSoft`, `destructiveSoft`.
   - Rewrite the JSDoc above it: name the layout, the filled actions and the
     status panels; state that `hover`/`active` and the filled-family pointer
     steps are excluded because they are transient; state that `disabled`,
     `skeleton` and `track` are not the content behind a dialog.
   - Update the `overlayWashPairs` JSDoc (it inherits the list) and the
     `themeContrastFailures` JSDoc paragraph that names the scrim surfaces.
2. `packages/tokens/src/contrast.test.ts`
   - Update the header comment for plan 375.
   - `expect(overlayWashPairs.length).toBe(6)` → `14`.
   - The header paragraph at lines 91–97 that says "the four base surfaces, the
     `input` fill and the persistent `selected` fill" gains the eight new
     surfaces.
3. `packages/tokens/src/overlay-scrim.test.ts`
   - Header comment: add plan 375 and the new defect statement.
   - `shipped`: include every shipped colour set the contract runs on — identity
     four, `getPlatformTheme(platform, mode, contrast)` for both contrast
     levels, and `getPlatformRecipeTheme(recipe, mode, contrast)` for both
     recipes and both levels (24 themes). Import
     `getPlatformRecipeTheme`/`platformRecipeNames`/`platformRecipes` from
     `./index.js`.
   - Rename `covers the six surfaces a dialog sits on` to
     `covers the surfaces a dialog sits over` and assert the exact 14-entry
     list in `overlaySurfaces` order.
   - Add one regression case: for each of the eight new surfaces, build
     `extendTheme(theme, { colors: { overlay: theme.colors[surface] } })` from
     the identity light theme and assert a failure exists with
     `background: surface`, `wash: "overlay"`, `pairClass: "surface"`,
     `floor: contrastFloors.default.surface` and `ratio: 1`. Filter the
     failures by `background` so a different surface failing at the same time
     does not make the case brittle.
   - Keep the existing AAA-dark and macOS-selected cases; if adding surfaces
     changes their exact expected arrays, split the expectation to the
     failure for the named surface instead of weakening it.
4. `packages/tokens/src/inventory.test.ts` — no code change: it derives
   `<overlayWashPairs.length> scrim pairs`; the `COMPONENTS.md` row must say
   `14 scrim pairs`.
5. `docs/tokens.md`
   - The contract section around line 1363: name all fourteen surfaces, state
     the persistent filled actions and status panels, keep the transient-wash
     exclusion, and add the tightest figure `1.075:1` (AAA dark, `primary`).
   - The verification section around line 2067: same list and plan 375.
6. `docs/design-system.md`
   - The accessibility floor table's modal-scrim row: list all fourteen
     surfaces.
   - The paragraph that explains the scrim: "the fourteen surfaces a dialog
     covers — the four base surfaces, the `input` fill, the persistent
     `selected` fill, the four filled actions and the four soft status panels"
     and the tightest figure.
7. `packages/tokens/README.md` — the scrim paragraph: fourteen surfaces,
   filled actions and status panels, the transient wash exclusion, and the
   tightest figure.
8. `COMPONENTS.md` — the `Theme contrast check` row:
   - change `6 scrim pairs` to `14 scrim pairs`;
   - append a concise plan 375 clause: the scrim now covers the four filled
     actions and the four soft status panels a window shows; every shipped set
     already clears 1.05:1 (1.075:1 at the tightest, AAA dark on `primary`), so
     no colour moves.
9. `TODO.md` — add a row under the `tokens-theme` block and tick it:
   "Hold the modal scrim over the filled actions and status panels a window
   shows — it covered the layout only, so a theme whose scrim composited to
   `primary` or a soft status fill left a control or Alert undimmed while the
   checker returned `[]`; every shipped set already clears the floor
   (1.075:1 at the tightest), so no colour moves and the contract grows
   6 → 14 scrim pairs (plan 375)".
10. `.agents/slop/plans/README.md` — add the plan 375 row and a summary
    paragraph, and leave the block note unchanged.

## 5. Exact commands and expected results

Run from the worktree root.

```sh
nub run --filter @gpuixui/tokens test
```

Expected: every suite passes; `contrast.test.ts` asserts 14 scrim pairs;
`overlay-scrim.test.ts` asserts the exact 14-surface list and the eight
erased-surface cases; `inventory.test.ts` passes against the updated
`COMPONENTS.md` row.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: no output and exit 0.

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. `check:tests` must accept the new cases (they assert real
failures, not literals) and `docs.test.ts`/`readme.test.ts`/`inventory.test.ts`
must pass against the updated prose.

## 6. Test plan (write these before the fix and watch them fail)

| Test | What it catches | Without the fix |
| ---- | --------------- | --------------- |
| exact `overlayWashPairs` list | a new scrim surface missing or reordered | list has 6 entries, fails |
| erased scrim on each of the eight new surfaces | a scrim that composites to the fill it covers escaping `themeContrastFailures` | filter finds no failure, fails |
| shipped-set loop | a shipped platform variant or recipe below 1.05:1 on a filled action or status panel | passes today, must keep passing |
| AAA-dark and macOS-selected regressions | the 099/359 defects stay fixed | must keep passing |

The first two failing cases prove the guards can fail; the two regression cases
prove the old defects stay caught. Verify both directions before committing:
run the new tests with the `overlaySurfaces` extension reverted and confirm the
exact-list and erased-surface cases fail.

## 7. STOP conditions

- Any shipped theme measures below 1.05:1 on a new surface: stop and report the
  theme, surface and ratio. Do not move a colour to make a new pair pass; the
  probe measured 1.075:1 as the tightest, so a failure means the probe and the
  suite disagree.
- Adding the surfaces changes an existing `themeContrastFailures` result that a
  shipped-theme test asserts. Report it; do not rewrite the assertion to hide
  the extra failure until the cause is understood.
- `docs.test.ts`, `readme.test.ts` or `inventory.test.ts` rejects a prose change:
  read the assertion and fix the prose, do not delete the guard.
- The contract's uniqueness guard reports a duplicate pair: remove the
  duplicate from the new list rather than loosening the guard.

## 8. Acceptance

- `overlaySurfaces` names all fourteen surfaces; `overlayWashPairs` has 14
  entries.
- `themeContrastFailures` reports a theme whose scrim equals each of the eight
  new surfaces.
- Every shipped theme, platform variant and recipe passes all three checks, and
  no token value moved.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and the
  `COMPONENTS.md` row state the same list and count, and the page guards pass.
- `TODO.md` and the plan index are updated; the work is committed on
  `agent/tokens-theme` and pushed.
