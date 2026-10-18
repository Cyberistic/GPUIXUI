# 332 — The fill as a mark: a graphic needs more than 1.05:1

**Phase:** F (truth pass) · **Workstream:** `tokens-theme` · **Depends on:** 057
(status text roles), 082 (`primaryText`), 097 (filled states), 309 (fills as
surfaces), 314 (row compositions)

## The defect

The contract has one way to measure a solid role: as a **surface**. Plan 309
holds `primary`, `secondary`, `destructive`, `accent`, the washes and the
selected fill to the 1.05:1 perceivability floor on the canvas, card, popover
and quiet panel, because "a fill that matches its panel is not a state".

That is the right floor for a fill **behind text**. It is the wrong floor for a
fill painted as a **mark** — a glyph, a bar or a dot that *is* the information:

| Paint | Mark | Surface behind it |
| ----- | ---- | ----------------- |
| `packages/primitives/src/core/style.ts` `progressFillStyle` | `primary`, `success`, `destructive` | the `muted` track (`progressTrackStyle`) |
| same, `sliderFillStyle` | `primary`, `destructive` | the `muted` rail (`sliderRailStyle`) |
| same, `sliderThumbStyle` | `primary`, `destructive` border | its own `input` fill |
| same, `ratingStarColor` | `primary`, `destructive` glyph | whatever surface the rating sits on |
| `packages/components/src/combobox.tsx:569` | `primary` check glyph | the menu's `popover`, `hover` and `selected` fills |
| `packages/components/src/timeline.tsx` `dotFill` | `primary` current dot | whatever surface the timeline sits on |

Every one of those pairs is either unmeasured (`primary` on `input`, `success`
on `muted`) or measured at 1.05:1 (`primary`/`destructive` on the four panels).
A theme can therefore collapse `primary` into its card and still pass: a 100%
progress bar, a filled rating star and a slider's filled rail all disappear,
because 1.05:1 is the floor for a wash, not for a 4px bar or a 16px glyph.
WCAG 1.4.11 asks 3:1 for a graphical object that conveys information; the
library's AAA level already uses 4.5:1 for its `boundary` class, so a mark
inherits the same numbers with a different intent.

The same audit found two **shipped** marks that are already below any defensible
floor. Both are the *wrong role*, not a colour to move:

- `packages/components/src/avatar.tsx` `statusFill` paints the presence dot with
  the solid roles: `success`, `warning`, `destructive` and `mutedForeground` on
  a `card`-coloured ring. Light `warning` measures **1.78:1** on its card (plan
  057 already recorded that ratio for the canvas) — the "away" dot is
  effectively invisible, and the ring does not fix it because the ring separates
  the dot from the avatar, not from the surface.
- `packages/components/src/timeline.tsx` `dotFill` paints the *upcoming* dot
  with `muted`, which is the quiet-panel role: **1.036:1** on the identity light
  canvas and 1.014:1 on Aero light. The upcoming event has no dot.

Status marks belong to the `xText` roles, which plan 057 shipped and the
contract already measures on every surface and wash; the timeline's pending dot
belongs to `borderStrong`, the functional-boundary role plan 084 holds to 3:1.
Both fixes live in `components`, so they are recorded cross-team rather than
edited here (AGENTS §6). No pair may be added for a composition that is being
fixed to a different role — that would bless the defect.

## Exact files

Change (this workstream):

- `packages/tokens/src/contrast.ts` — the `mark` pair class, `markPairs`, the
  floor row and the contract JSDoc.
- `packages/tokens/src/contrast.test.ts` — the floors deep-equal and the pair
  count (276 → 290).
- `packages/tokens/src/inventory.test.ts` — `floorRow` names the new class.
- `packages/tokens/src/docs.test.ts` — the floor table row, the pair-count
  history's fixed `from`, the mark sentence and the audit range.
- `packages/tokens/src/mark-contrast.test.ts` — **new**, the regression suite.
- `packages/tokens/src/readme.test.ts` — hold the new README sentence.
- `packages/tokens/README.md` — the mark floor beside the fill floor.
- `docs/tokens.md` — the two floor blocks, the contract paragraph, the
  pair-count history and the audit range.
- `docs/design-system.md` — §9's floor table and a paragraph on graphics.
- `COMPONENTS.md` — the Theme contrast check row (pair count and mark clause)
  and the Design tokens row (the mark floor).

Add cross-team rows to `TODO.md` (owned by `components`, not edited here):

- the avatar presence dot paints solid status roles on `card` (light `warning`
  1.78:1) — use `statusTone(...).text`;
- the timeline upcoming dot paints `muted` on the canvas (1.036:1) — use
  `borderStrong`;
- the accordion trigger's hover label paints `primary` as text (macOS light
  4.21:1, macOS card 3.82:1) — use `primaryText`, the role plan 082 shipped;
- the toast icon and 3px tone bar paint `xSoftForeground` on the `popover` card
  — a soft-surface tone used on a neutral surface; use `statusTone(...).text`.

No colour, token, theme, platform style, recipe or existing pair moves.

## Exact change

### 1. `packages/tokens/src/contrast.ts`

Add the class after `boundary`:

```ts
  /**
   * A solid role painted as a glyph, a bar or a dot rather than behind text.
   * WCAG's non-text requirement (3:1, 4.5:1 at AAA) is the same number the
   * boundary class uses; the separate name records the intent, so a fill's
   * 1.05:1 wash floor cannot be mistaken for a mark's floor.
   */
  | "mark"
```

Add the list after `stateFillSurfacePairs`:

```ts
/**
 * The solid roles painted as marks, and the surfaces they sit on. A progress
 * segment (`primitives/src/core/style.ts` `progressFillStyle`) and a slider fill
 * paint over the `muted` track; a slider thumb rings its own `input` fill with
 * the same role; a rating star and a combobox check are glyphs on the surface
 * they sit on; a timeline's current dot is a `primary` dot on the canvas, card,
 * popover or quiet panel. A mark is the information, so a fill that matches its
 * surface is a failed state, not a subtle one.
 */
const markSurfaces = ["background", "card", "popover", "muted"] as const;

/** The solid roles the library paints as a mark. */
export const markRoles = ["primary", "success", "destructive"] as const;

/** Every mark on every surface it can sit on, plus the thumb's own fill. */
export const markPairs: readonly ContrastPair[] = [
  ...markRoles.flatMap((role) =>
    markSurfaces.map((background): ContrastPair => [role, background, "mark"]),
  ),
  ["primary", "input", "mark"],
  ["destructive", "input", "mark"],
];
```

Add `...markPairs` to `contrastPairs` (after `...invalidEdgePairs` is fine;
ordering is not significant), and add the floor row in both levels **after
`boundary`** (the docs code blocks are generated in insertion order):

```ts
default: { body: 7, secondary: 4.5, inactive: 3, boundary: 3, mark: 3, surface: 1.05, divider: 1.05 },
high: { body: 7, secondary: 7, inactive: 4.5, boundary: 4.5, mark: 4.5, surface: 1.05, divider: 3 },
```

Extend the `ContrastPair` / `contrastPairs` / `themeContrastFailures` JSDoc: a
mark is the current progress segment, slider fill and thumb ring, rating star,
combobox check and timeline dot; the solid status roles are not marks (an
indicator uses `xText`), which is why the two cross-team rows exist.

The pair count is 276 + 14 = **290**.

### 2. `packages/tokens/src/mark-contrast.test.ts` (new)

Header states both bugs: a solid role painted as a mark was measured only at the
1.05:1 surface floor, so a progress bar, slider or rating star could vanish while
the checker returned `[]`; and the two shipped marks that paint the wrong role
are held by the cross-team rows, not by a pair.

Cases:

- every `markPairs` entry is in `contrastPairs` and uses a `colorRoles` member;
- `contrastFloors.default.mark` is 3, `contrastFloors.high.mark` is 4.5, and both
  are strictly above the `surface` floor;
- every shipped theme (identity × mode × contrast, the four platform variants in
  both modes, both recipes in both modes) returns no `mark` failure from
  `themeContrastFailures`, and the tightest mark clears its floor — assert the
  measured minimum against the floor rather than a hard-coded ratio so a palette
  edit reports the new number;
- regression A: `extendTheme(lightTheme, { colors: { primary: lightTheme.colors.card } })`
  yields a failure with `{ foreground: "primary", background: "card", pairClass: "mark" }`;
- regression B: `success = muted` yields `success` on `muted` as a `mark`;
- regression C: `destructive = input` yields `destructive` on `input` as a `mark`;
- the class coverage is exact: `markRoles` × `markSurfaces` plus the two `input`
  pairs, so a new role or surface cannot be added to one side only.

The tightest shipped mark is `primary` on `selected`? No — on the four panels and
`input`: **3.82:1** (macOS dark on card/popover) at the default floor and the
`success`/`destructive` values are higher. The test computes it.

### 3. Existing test updates

- `contrast.test.ts` — add `mark: 3` / `mark: 4.5` to the floors deep-equal and
  change `contrastPairs.length` from `276` to `290`.
- `inventory.test.ts` — `floorRow` becomes
  `[body, secondary, inactive, boundary, mark, surface, divider]`, so the
  COMPONENTS.md floor phrase must carry the new class.
- `docs.test.ts`:
  - the design-system floor rows array gains
    ``| graphic marks (`primary`/`success`/`destructive` on `background`/`card`/`popover`/`muted`, and `primary`/`destructive` on the `input` fill a slider thumb rings) | ${contrastFloors.default.mark}:1 | ${contrastFloors.high.mark}:1 |``;
  - the pair-count history guard changes its fixed start from `264` to `276`;
  - the audit-range guard changes ``plans `076`–`327` closed`` to
    ``plans `076`–`332` closed``;
  - a new case in the contract describe holds the mark paragraph (below).

### 4. `docs/tokens.md`

- The two `contrastFloors` code blocks gain `mark: 3` / `mark: 4.5` after
  `boundary` (the guard generates them from the record).
- In "Checking a theme", after the filled-control sentence, add:

  > A solid role painted as a **mark** is held to 3:1 (4.5:1 at AAA) instead:
  > a progress segment and a slider fill sit on the `muted` track, a slider
  > thumb rings its own `input` fill, and a rating star, combobox check or
  > timeline dot sits on the panel it paints on — `markPairs` is that list.
  > A status indicator is not a mark: the solid `warning` is **1.78:1** on the
  > light canvas, so a status dot uses `xText`, which the status-text pairs
  > already measure.

- The pair-count history gains:
  > Plan `332` adds the graphic-mark pairs — the brand, success and destructive
  > fills as bars and glyphs on the four panels, and the slider thumb's ring on
  > its `input` fill — taking it from 276 to **290**.
- The audit-range sentence becomes ``plans `076`–`332` closed``.

### 5. `docs/design-system.md` §9

Add the floor row from `docs.test.ts` after the focus/boundary row, and after
the inactive paragraph add:

> A fill is not automatically a surface. A solid role painted as a bar, a glyph
> or a dot — a progress segment, a slider fill, a slider thumb's ring, a rating
> star, a combobox check, a timeline dot — is a **mark**, held to 3:1 (4.5:1 at
> AAA). The 1.05:1 floor plan `309` gives an interactive fill is a wash's floor:
> it says a hover is visible, not that a 4px bar is. Status marks are `xText`,
> never the solid status fill, because the light `warning` fill is **1.78:1** on
> the canvas.

### 6. `COMPONENTS.md`

- **Theme contrast check** row: `276 contrast pairs` → `290 contrast pairs`, the
  floor phrase gains ` / 3` and ` / 4.5` in the boundary/mark position, and the
  row gains one clause: the mark pairs hold the progress segment, slider fill,
  slider thumb ring, rating star, combobox check and timeline dot at 3:1/4.5:1.
- **Design tokens** row: one clause naming the mark floor beside the fill floor.

### 7. `packages/tokens/README.md`

In "Checking a theme", add one sentence:

> A solid role painted as a mark — a progress segment, slider fill, thumb ring,
> rating star or timeline dot — is held to 3:1 (4.5:1 at AAA) by `markPairs`,
> not to the 1.05:1 an interactive fill's wash needs.

`readme.test.ts` gains a case holding that sentence.

### 8. `TODO.md` and the plan index

Tick a new row under "Design tokens and theming" and add the four cross-team
rows named above. Add this plan to `.agents/slop/plans/README.md` with status
`done`.

## Commands and expected results

1. Before the source change, with the new test in place:
   `nub run --filter @gpuixui/tokens test -- src/mark-contrast.test.ts`
   Expected: fail on the missing `mark` class / empty `markPairs` (record the
   message in the commit body).
2. After the source change:
   `nub run --filter @gpuixui/tokens test -- src/mark-contrast.test.ts`
   Expected: pass, with the tightest shipped mark at 3.82:1 or above its floor.
3. `nub run --filter @gpuixui/tokens test`
   Expected: every file passes, including `color.test.ts`, `platforms.test.ts`
   and `docs.test.ts` on the new pairs and the new floor rows.
4. `nub run check`
   Expected: test-lint, lint, format and type-check clean.
5. `nub run test`
   Expected: the workspace suite passes.

## Test plan

- The three regressions fail on the pre-fix source: `themeContrastFailures`
  has no `mark` pair, so it returns `[]` for a theme whose `primary` is its card.
  After the fix each returns the exact pair.
- The shipped-theme case is the second direction: a real palette edit that
  collapses a mark to its surface turns it red.
- Prove both directions by running command 1 before the source edit and command
  2 after it; do not commit the pre-fix state.
- The coverage case fails if a role or surface joins `markRoles` /
  `markSurfaces` without the matching pair.

## STOP conditions

- Stop if any shipped theme fails a new `mark` pair. The plan measures the
  values first (tightest 3.82:1); a failure means the palette or a platform
  style moved since this plan was written. Report the exact pair and ratio
  rather than lowering the floor.
- Stop if a colour has to move. This plan's premise is that no shipped value
  changes; a fix that retints a theme is a different plan with its own evidence.
- Stop if the cross-team defect can only be fixed by editing `packages/components`
  or `packages/primitives`; record the TODO row instead.
- Stop if a command fails for a reason outside this plan's files; report the
  exact output instead of editing another workstream's path.

## Acceptance

- `mark` is a documented pair class at 3:1 / 4.5:1, and `themeContrastFailures`
  reports it.
- The three regressions fail before and pass after; the shipped themes pass.
- `contrastPairs` is 290, and both documents, the ledger and the README state
  that count and the new class from the implementation.
- The four cross-team defects are recorded in `TODO.md` with file:line evidence.
- Every command above is green, and no token value, theme, platform style,
  recipe or existing pair changes.
