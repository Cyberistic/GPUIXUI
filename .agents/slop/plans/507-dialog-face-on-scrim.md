# Plan 507 — The dialog's face on the scrim

**Status:** done · **Workstream:** `tokens-theme` · **Phase:** F
**Depends on:** 099 (the scrim became a measured wash), 359 (the scrim on
`selected`/`input`), 375/395 (the scrim on filled actions and status panels),
505 (the elevation shadow over the page surfaces).
**Owns:** `packages/tokens/src/contrast.ts`, a new test file, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, the ledger row.

---

## 1. The defect

`overlayWashPairs` measures the modal scrim **itself** against everything it
covers (plans 099, 359, 375, 395). Nothing measures the element that sits **on**
the scrim: the dialog's own face.

A dialog paints `popover` over the scrim (`components/dialog.tsx:181` for the
surface, `:248` for the scrim; `drawer.tsx:189`/`:258` are the same pair; a
command palette is a dialog). A theme whose `overlay` composites to its
`popover` therefore ships a dialog with **no face** — only its 1px `border` —
while `themeFailures` returns `[]`. The contract's own reasoning ("a scrim that
composites to the surface beneath it is an invisible modal backdrop") has the
mirror case unmeasured: a face that composites to the scrim.

The elevation contract does not cover it either. Plan 505 measures each level's
shadow over the four **page** surfaces (`elevationSurfaces`). While a dialog is
open its shadow lands on the **scrim**. Measured on the identity dark theme:

- scrim = `compositeOver("#000000A6", "#11141A")` = `#060709`;
- `lg` shadow `#000000CC` over it paints `#010102` → **1.0353:1**;
- **no** black tint can clear 1.05: pure black over that scrim is **1.0421:1**.

So in the default dark sets the shadow cannot be the modal's separation. The
surface is — and it is unmeasured.

### Why the fix is a pair, not a palette move

The dialog's face over the scrim **over the content fills** cannot be a floor:

- macOS dark (`getPlatformTheme("darwin", "dark")`) paints the scrim over a
  primary action as `#032E59`; its `popover` is `#2C2C2E`, so the face measures
  **1.0213:1** on that patch. The 1px `border` on the same patch measures
  **1.4954:1** — the edge is what carries the silhouette there.
- No single `popover` value leaves the band the scrim compresses the page into.
  Probes (recorded below, re-derivable in the test):
  - raising the scrim to 70% clears `primary` (1.0775:1) but collapses
    `destructive` to **1.0185:1**;
  - lightening `popover` to `#343436` clears the bright patches but fails five
    existing pairs (`placeholder` on `popover` 4.44:1 under 4.5, and
    `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft` on `popover`
    under 1.05).

So this plan measures the composition that *is* designed — the dialog on the
page layout — and records the content-patch case and the shadow cap as measured
limitations. The scrim's own perceivability on the content fills stays measured
(`overlayWashPairs`), and the dialog keeps its border.

## 2. What to change

### 2.1 `packages/tokens/src/contrast.ts`

1. Split the surface list that `overlaySurfaces` is built from. Keep the
   exported value and its order **identical**:

```ts
/**
 * The page layout a modal covers: the canvas, a card, the quiet panel, the
 * field fill a form paints, the persistent `selected` fill a table or list
 * keeps, and a floating surface (a nested dialog). A dialog's face is painted
 * on the scrim over this layout, so it is the list `dialogSurfacePairs` is
 * measured on.
 */
const layoutSurfaces = [
  "background",
  "card",
  "muted",
  "input",
  "selected",
  "popover",
] as const;

/**
 * The content fills a window also shows behind the scrim. The scrim's own
 * perceivability is measured on them (`overlayWashPairs`), but a dialog's face
 * is not: the four soft status fills sit in one narrow luminance band, so a
 * face can and does meet the scrim over a bright action patch (macOS dark,
 * 1.0213:1 on `primary`), where the dialog's `border` edge carries the
 * silhouette. No single `popover` value can leave that band: lightening the
 * face breaks the soft fills on `popover`, and raising the scrim trades the
 * `primary` patch for the `destructive` one.
 */
const contentFillSurfaces = [
  "primary",
  "secondary",
  "accent",
  "destructive",
  "softAction",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

export const overlaySurfaces = [
  ...layoutSurfaces,
  ...contentFillSurfaces,
] as const;
```

2. Add the pair list **after** `overlayWashPairs`:

```ts
/**
 * The dialog's face on the scrim. A dialog, drawer or command palette paints
 * `popover` over the modal scrim, so the surface a reader sees is the `overlay`
 * wash composited over the page layout — not `popover` on a page surface, which
 * is a different composition. `overlayWashPairs` measures the scrim itself;
 * this list measures what sits on it, because a theme whose scrim composites to
 * its own floating surface ships a dialog with no face and only a 1px edge.
 *
 * The layout list is `layoutSurfaces`, the six page surfaces `overlaySurfaces`
 * begins with. The content fills are deliberately absent: a face can meet the
 * scrim over a bright action patch — macOS dark measures 1.0213:1 on `primary`
 * — and no `popover` value clears the whole band the scrim compresses the page
 * into (see the list above), so the edge carries that patch and the scrim's own
 * perceivability there is measured by `overlayWashPairs`.
 */
export const dialogSurfacePairs: readonly ContrastPair[] = layoutSurfaces.map(
  (background): ContrastPair => ["popover", background, "surface"],
);
```

3. In `themeContrastFailures`, after `washVisibilityFailures(overlayWashPairs…)`:

```ts
    ...textOverWashFailures(dialogSurfacePairs, "overlay", theme, floors),
```

(`textOverWashFailures` already takes `foreground`, composites the `wash` over
`background`, compares against `floors[class]` and reports `wash`. No new
failure kind.)

4. Extend the `themeContrastFailures` JSDoc bullet list with one bullet naming
   `dialogSurfacePairs` (the reference guard requires every applied list to be
   named):

```
 * - `dialogSurfacePairs` — the dialog's face, `popover` composited over the
 *   `overlay` scrim the page layout is veiled with, because a theme whose scrim
 *   meets its own floating surface ships a dialog with no face.
```

### 2.2 `packages/tokens/src/contrast.test.ts`

Add `["dialogSurfacePairs", dialogSurfacePairs]` to `publishedPairLists` (the
uniqueness guard must see the new list) and to its import.

### 2.3 `packages/tokens/src/dialog-scrim.test.ts` (new)

Header comment must state the bug being guarded (plan 507). Cases:

1. **Shipped guarantee.** For every `shippedThemes` entry, each
   `dialogSurfacePairs` entry measures at or above
   `contrastFloors[theme.contrast].surface`, and `themeContrastFailures(theme)`
   contains no failure whose `foreground` is `popover` and `wash` is `overlay`.
   Expected: `[]` failures; tightest shipped pair is **1.2100:1** (Dark,
   `popover` on the scrim over `selected`).
2. **The erased face (regression).** For light and dark:
   `extendTheme(getTheme(mode), { colors: { overlay: getTheme(mode).colors.popover } })`
   → exactly `dialogSurfacePairs.length` failures, each with
   `foreground: "popover"`, `wash: "overlay"`, `pairClass: "surface"`,
   `floor: 1.05`, and a ratio of 1. The case fails on the current code (0
   failures).
3. **The list is the layout prefix.** `dialogSurfacePairs.map(([, surface]) =>
   surface)` equals `overlaySurfaces.slice(0, dialogSurfacePairs.length)` — so a
   new layout surface joins the face list and a content fill cannot.
4. **The shadow cap (evidence).** Identity dark: the scrim over `background` is
   `#060709`; `elevationShadow(getTheme("dark"), "lg")` paints `#000000CC`, the
   composited pair measures **1.0353:1**, and pure black over the same scrim
   measures **1.0421:1** — under `contrastFloors.default.surface`. Assert both
   figures with `toBeCloseTo(…, 4)`, so a later palette edit that makes the
   shadow a valid separation is visible (the case then fails and the docs must
   change).
5. **The content-patch band (evidence).** macOS dark: the face on the scrim over
   `primary` measures **1.0213:1** and the `border` on that patch **1.4954:1**.
   With only `overlay` edited to `#000000B3` (70%) the `primary` patch measures
   **1.0775:1** and `destructive` **1.0185:1** — the trade that makes the content
   fills unmeasurable.

### 2.4 `docs/design-system.md`

- **§7**, after the scrim paragraph (before "Dark shadows are darker…"), add a
  paragraph:

> A raised element normally floats over the page, which `elevationSurfaces`
> names. A modal is the exception: its face and its shadow sit on the scrim, so
> the face is measured through the scrim — `dialogSurfacePairs` composites
> `overlay` over the six layout surfaces and holds `popover` to 1.05:1, because
> a theme whose scrim meets its own floating surface ships a dialog with no face
> and only a 1px edge (tightest shipped 1.210:1). The shadow is not a modal
> separation in the default dark sets and cannot be made one: on the identity
> dark scrim (`#060709`) the `lg` tint paints 1.035:1 and pure black reaches
> only 1.042:1. Over a bright action patch the face can also meet the scrim
> (macOS dark measures 1.021:1 on `primary`); the dialog's edge carries that
> patch (1.495:1) and the scrim's own perceivability there is measured. No
> single `popover` value leaves the band the scrim compresses the page into:
> lightening the face fails the soft status fills on `popover`, and raising the
> scrim to 70% clears `primary` but collapses `destructive` to 1.019:1.

- **§9 floor table**, one new row after the modal scrim row:

```
| dialog face (`popover` over the `overlay` scrim on the six page layout surfaces — `background`/`card`/`muted`/`input`/`selected`/`popover`) | 1.05:1 | 1.05:1 |
```

- **§9 explanation**, after the scrim paragraph: the modal's face paragraph
  (the same rationale, naming `dialogSurfacePairs`, the tightest 1.210:1 and the
  shadow cap).

### 2.5 `docs/tokens.md`

- "Checking a theme" list: after the selection wash sentence, add
  "the dialog's face on the scrim — `popover` over the composited `overlay` on
  the six page layout surfaces (`dialogSurfacePairs`)".
- The `overlay` role row description in the catalogue already says "a Dialog
  paints across the window"; extend it: "and the face a dialog paints on it is
  measured through the wash".
- Verification narrative: one paragraph describing the new list, the erased-face
  regression, the tightest 1.210:1, and the two measured limitations (shadow cap
  1.042:1; content-patch 1.021:1 with the 1.495:1 edge).
- Pair-count history: add a final step "plan `507` adds the same six dialog-face
  pairs through the scrim; `contrastPairs` stays **394** and the checker's own
  lists grow by six." (The existing guard reads `contrastPairs.length` for the
  `388 → 394` step; do not touch that number.)

### 2.6 `packages/tokens/README.md`

The contrast paragraph: add `dialogSurfacePairs` to the list of checks and the
six-pair count; state the shadow cap in one clause.

### 2.7 `COMPONENTS.md`

Row **Theme contrast check**: add "6 dialog-face pairs (`popover` over the
`overlay` scrim on the six layout surfaces)" to the counts sentence and a plan
`507` clause to the narrative.

### 2.8 Indexes

- `.agents/slop/plans/README.md`: add
  `| [507](./507-dialog-face-on-scrim.md) | The dialog's face on the scrim | F | 099, 359, 375, 395, 505, 506 | done |`
- `TODO.md`, tokens section: add the task row (one sentence, with the measured
  defect) and tick it.

## 3. Commands and expected results

Run from the repository root of this worktree.

```sh
nub run --filter @gpuixui/tokens test
```

Expected: `104 → 105` test files, all green; the new file runs its five cases.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: no output (exit 0).

```sh
nub run check
nub run lint
nub run test
```

Expected: all three green (the completion gate).

```sh
nub scripts/check-tests.ts
```

Expected: green — every assertion in the new file compares a derived value, and
the failure cases construct a theme whose defect is real.

## 4. STOP conditions

Stop and report instead of improvising if:

- `themeContrastFailures` on any shipped theme returns a new failure (the
  measured tightest is 1.2100:1; if a set fails, do **not** move a colour — the
  plan's decision is a guard, and a palette change here needs its own plan);
- `dialogSurfacePairs` cannot be derived from `overlaySurfaces` without changing
  the exported list's content or order (the scrim's own 15 pairs must not move);
- the reference guard or a documentation guard fails for a reason other than the
  text this plan changes;
- any existing suite changes its expected pair count (`contrastPairs` must stay
  394, `overlayWashPairs` 15, `selectionPairs` 20).

## 5. Acceptance

- `dialogSurfacePairs` is public, typed, documented in `docs/tokens.md`, and
  named in the `themeContrastFailures` reference.
- The new test fails on the pre-change tree (case 2 returns 0 failures) and
  passes after it; cases 4 and 5 pin the evidence the documents quote.
- A dialog whose scrim meets its own face is reported by
  `themeContrastFailures` and by `themeFailures` with six `surface` failures.
- The design system no longer presents elevation as the modal's separation in
  the default dark sets, and the reason is measured, not asserted.
- Every gate in §3 is green, the plan is indexed, and the TODO row is ticked.
