# 308 — The soft status edge on the surfaces a badge sits on

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
090–095, 300, 306 · **Touches:** `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`,
this index

## 1. The gap

Plan 090 gave the soft status family a designed edge, `xSoftBorder`, and plan 300
settled the composition question for a soft chip: it is **not** measured as a
fill on a row wash, because a chip is "bounded by its designed `xSoftBorder`
edge, unlike a full Alert panel". That rationale is only true if the edge itself
is measured where the chip sits. Today it is measured on exactly one surface —
its own `xSoft` fill (`softBorderPairs`) — so the outer edge of a Badge on a
canvas, a card, a popover, the `muted` panel or a `hover`/`active`/`accent`/
`selected` row wash is unmeasured.

A shipped defect hides behind the missing pairs. The identity light
`warningSoftBorder` is `#FCD47B`; the macOS light pressed wash is `#DCDCE2`
(1.036:1) and the Linux light one is `#DEDDDB` (1.042:1), both under the 1.05:1
the design system gives a decorative divider. On a pressed row the warning
Badge's fill is also 1.00–1.04:1 against the wash, so with the edge gone too the
chip has no visible boundary at all — the exact "state erases the component"
class of defect plans 080, 094 and 306 closed for the control edge, the skeleton
and the inactive label.

The soft **fills** stay out of the wash contract, as plan 300 decided: a pale
tint cannot clear both a white card and a light pressed wash without leaving its
family. The edge is the designed answer, so the edge is what the contract must
hold.

## 2. Decision (do not re-litigate)

- Add `softBorderSurfacePairs`: the four `xSoftBorder` roles × the eight
  surfaces a chip sits on — `background`, `card`, `popover`, `muted`, `hover`,
  `active`, `accent`, `selected` — at the `divider` floor (1.05:1 default, 3:1
  at high contrast). `contrastPairs` grows 148 → 180.
- Do **not** add the four soft fills as surface pairs on the washes. Plan 300's
  reasoning stands; the edge is the shape, not the fill.
- Move the identity light `warningSoftBorder` one designed step,
  `#FCD47B` → `#EFC055`. It is the only role that fails: it clears the four
  light platform pressed washes at 1.246:1 (macOS), 1.254:1 (Linux) and
  1.265:1 (Windows), the identity `active` at 1.109:1, and its own
  `warningSoft` fill at 1.319:1 (was 1.096:1). No other shipped value changes:
  dark and both high-contrast variants already clear 1.05:1 / 3:1 on all eight
  surfaces.
- The surface list is module-local and the pairs are exported, so the test and
  the documents read one list; the four tones come from `softSurfaceRoles`, so
  a fifth tone cannot ship unmeasured.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. After `softBorderPairs`, declare the surfaces and the new pairs:

   ```ts
   /**
    * The surfaces a soft status chip occupies. A Badge sits on the plain
    * surfaces, the quiet panel and the four washes a row paints, so the chip's
    * designed edge is the boundary a reader sees — its fill is deliberately
    * near the row wash (plan 300), which makes the edge the shape.
    */
   const softBorderSurfaces = [
     "background",
     "card",
     "popover",
     "muted",
     "hover",
     "active",
     "accent",
     "selected",
   ] as const;

   /** The designed edge of each soft status surface, on the surfaces it sits on. */
   export const softBorderSurfacePairs: readonly ContrastPair[] =
     softSurfaceRoles.flatMap((tone) =>
       softBorderSurfaces.map(
         (background): ContrastPair => [
           `${tone}SoftBorder`,
           background,
           "divider",
         ],
       ),
     );
   ```

2. Spread `...softBorderSurfacePairs` into `contrastPairs` immediately after
   `...softBorderPairs`, so the contract reads: the edge on its own fill, then
   the edge on every surface it sits on.

3. Extend the `contrastPairs` JSDoc with one clause: the designed edge is
   measured on its own fill **and** on the eight surfaces a chip occupies.

### 3.2 `packages/tokens/src/color.ts`

Change `lightColors.warningSoftBorder` from `"#FCD47B"` to `"#EFC055"`. No other
value changes.

### 3.3 `packages/tokens/src/contrast.test.ts`

- `contrastPairs.length` 148 → 180.
- Add an assertion that the new pairs are exactly four tones × eight surfaces in
  `softBorderSurfacePairs` order and that they are unique (the existing
  `new Set(contrastPairs).size` check already covers the second half).

### 3.4 `packages/tokens/src/soft-edge-surfaces.test.ts` (new)

Header comment: *Guards the gap plan 308 closed: plan 300 declined a fill pair
for a soft chip on a row wash because the designed `xSoftBorder` edge carries
the shape — but the edge was measured only on its own fill, so the macOS light
`warningSoftBorder` measured 1.036:1 and Linux light 1.042:1 on the pressed
wash, and a warning Badge on a pressed row had no visible boundary at all.*

Tests:

1. **The pairs exist in tone × surface order** — `softBorderSurfacePairs` is
   the four `xSoftBorder` roles derived from the four soft fills, each measured
   on the eight documented surfaces; assert the exact pair list (or its key
   sequence).
2. **Every shipped set clears the divider floor** — identity, high-contrast and
   platform themes, at each theme's declared floor (1.05 default, 3 high), for
   every pair. This fails on the current tree for macOS light and Linux light.
3. **The regression is stated** — `contrastRatio("#FCD47B",
   getPlatformTheme("darwin", "light").colors.active)` is below 1.05, and the
   shipped `warningSoftBorder` is not `#FCD47B`; both platform pressed washes
   clear the floor.
4. **The public checker reports an erased edge** — extend the macOS light theme
   with `warningSoftBorder: theme.colors.active` and assert
   `themeContrastFailures` returns the `warningSoftBorder`/`active` failure at
   ratio 1, so the new pairs are wired into the checker rather than declared
   only.
5. **A copied style may design its own edge** — a platform style that sets a
   deeper warning edge applies and passes through `getPlatformTheme` (evidence
   that the value is editable).

### 3.5 Documents

- `docs/tokens.md`
  - The colour table's light `warningSoftBorder` value `#FCD47B` → `#EFC055`.
  - The soft-edge paragraph (after "The edge is a role, not a mixture"): the
    edge is measured on its own fill **and** on the eight surfaces a chip sits
    on, and the light warning edge moved one step because a warning Badge on a
    pressed row measured 1.036:1 on macOS light and 1.042:1 on Linux light.
  - The "Every colour role is accounted for" sentence's soft-edge clause names
    the eight surfaces.
  - The Verification section: `softEdgeSurfacePairs` joins the checker's
    description.
- `docs/design-system.md`: the §9 floor table's soft-edge row becomes
  ``soft status edge (`xSoftBorder` on `xSoft` and on the eight surfaces a chip sits on)``
  with the same 1.05:1 / 3:1 floors.
- `packages/tokens/README.md`: the soft-edge sentence gains "and on the eight
  surfaces a chip sits on", with the two measured figures.
- `COMPONENTS.md`: the "Theme contrast check" row's 148 → 180 and a clause for
  the new pairs; the "Design tokens" row's soft-edge sentence gains the surface
  list.
- `TODO.md`: add and tick the row, progress 75/99 → 76/100.
- Plan index: add 308 as `done` with a closing paragraph.

## 4. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | before §3.1–3.2: `soft-edge-surfaces.test.ts` fails on the pair list and on macOS/Linux light |
| 2 | same | after: every file green |
| 3 | `nub run check` | exit 0 (docs tables agree with the new value; test-quality guard passes) |
| 4 | `nub run lint` | exit 0 |
| 5 | `nub run test` | exit 0 |

## 5. STOP conditions

Stop and report if:

- any other shipped `xSoftBorder` is under the divider floor on any of the eight
  surfaces (the plan says only the identity light warning edge moves; a second
  failing role means the premise is wrong);
- the `#EFC055` change breaks an existing pair (its own fill, any soft text, or
  a status-text pair);
- a change is needed outside the paths listed above.

## 6. Acceptance

- [x] `softBorderSurfacePairs` is four tones × eight surfaces and is in
      `contrastPairs`; the pair count is 180.
- [x] Every shipped theme clears its declared divider floor on all 32 pairs.
- [x] The macOS light and Linux light regressions are stated in the test.
- [x] The public checker reports an erased chip edge.
- [x] Documents, ledger and TODO are current; gates pass; committed and pushed.

## 7. Outcome

- The gap was real and the audit named only one role: of 128 shipped
  `xSoftBorder` pairs (4 tones × 8 surfaces × 4 colour sets, platform variants
  included), two failed the divider floor — macOS light and Linux light
  `warningSoftBorder` on their own `active` wash, 1.036:1 and 1.042:1.
- `softBorderSurfacePairs` is public (32 pairs, `statusTones` × the eight chip
  surfaces) and spread into `contrastPairs` beside `softBorderPairs`;
  `contrastPairs` is 180.
- The identity light `warningSoftBorder` moves `#FCD47B` → `#EFC055`: 1.109:1 on
  the identity pressed wash, 1.246 / 1.254 / 1.265 on macOS / Linux / Windows
  light, 1.319:1 on its own `warningSoft` fill (was 1.096:1). No other shipped
  value changed.
- Both directions were proved: with only the colour reverted the new suite fails
  two tests (the shipped-pass loop and the stated regression); with only
  `contrast.ts` reverted it fails three (the export, the pass loop and the
  checker test). Restored, all pass.
- Green: **42 test files, 2312 tests**. `nub run check`, `nub run lint` and
  `nub run test` were run and passed. Committed and pushed.
