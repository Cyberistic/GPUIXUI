# Plan 377 — the design-system's current scrim and wash-link figures

**Workstream:** `tokens-theme` · **Phase:** F (integration and polish) ·
**Depends on:** 062, 071, 075, 087, 336, 375, 376 · **Status:** done when every
step below has been run.

## 1. The defect

`docs/design-system.md` quotes two figures that are computed from the shipped
palette, and no test reads either:

1. §9, the scrim explanation: "The tightest of the fourteen pairs is
   **1.075:1** (high-contrast dark, `overlay` on `primary`)." This is the
   minimum of `compositeOver(colors.overlay, colors[surface])` against
   `colors[surface]` over all fourteen `overlaySurfaces` and all 24 shipped
   colour sets (identity × 2 modes × 2 contrasts, three platform variants × the
   same four, two recipes × the same four).
2. §9, "Not covered, deliberately": "the shipped `primaryText` does not clear
   7:1 through the AAA light wash (6.75:1 on the `muted` panel and 5.48:1 on
   `active`)". Both are `primaryText` over
   `compositeOver(selection, surface)` in `getTheme("light", "high")`.

Plan 336 pinned the *catalogue's* quoted figures (`docs/tokens.md`) and plan 375
updated the design-system's scrim list and count, but neither holds this page's
figures. A palette edit can therefore leave the page quoting a number the
package no longer produces while every pair still passes. Examples that would
not fail any pair:

- raising the AAA dark `overlay` alpha enough to move 1.075 → 1.08 (still above
  the 1.05 floor);
- moving `primaryText` inside the iris ramp at AAA light (still above the
  secondary floor where it is measured plainly, while the wash figure changes).

The page is the rationale a consumer reads before copying a theme; a figure
that is stale is a false claim in the same class as plan 336's catalogue
figures.

## 2. Evidence

A temporary probe (removed after measuring) over the 24 shipped sets found:

- tightest scrim pair: **1.0745437039273649** on `primary` in
  `high-contrast dark` (the identity AAA dark set; macOS and Linux AAA dark
  share the same value, and the reduce keeps the first minimum). Rounded to
  three decimals: **1.075**, matching the page.
- AAA light `primaryText` through the wash: **6.748** on `muted` (two decimals:
  **6.75**) and **5.48** on `active`. Both match the page.

So no document value and no token value changes; the plan only pins what the
page already says.

## 3. Decision

Add one `describe("docs/design-system.md current figures", …)` block to
`packages/tokens/src/docs.test.ts`, built from the shipped themes exactly as the
existing catalogue guards are:

- **Scrim:** build a labelled list of all 24 themes, reduce over
  `overlaySurfaces`, and assert the label, surface and ratio (three decimals)
  against `"high-contrast dark"`, `"primary"`, `"1.075"`, then assert the page
  contains the derived sentence
  `**${ratio}:1** (${label}, \`overlay\` on \`${surface}\`)`.
- **AAA wash links:** derive from `getTheme("light", "high")`, composite
  `selection` over `muted` and `active`, assert the two `toFixed(2)` values are
  `"6.75"` and `"5.48"`, then assert the page contains
  `does not clear 7:1 through the AAA light wash (${muted}:1 on the \`muted\` panel and ${active}:1 on \`active\`)`.

Rejected alternatives:

- **Deleting the figures** removes the evidence that makes the rationale
  credible; the point of the paragraph is to state the measured cost.
- **Asserting literals without deriving them** would let the test and the page
  drift together; every expected number is computed from the shipped themes and
  the page sentence is built from the computed number.
- **Pinning the historical figures** on the same page (the pre-336 ratios quoted
  as "until plan NNN moved it") is out of scope: those values no longer exist in
  the package, so they cannot be derived. Only current claims are pinned, as in
  plan 336.

## 4. Files to change

1. `packages/tokens/src/docs.test.ts`
   - Import `themeContrasts` from `./theme.js` (the block is currently imported
     without it; `themeModes`, `getTheme`, `getPlatformTheme`,
     `getPlatformRecipeTheme`, `platformNames`, `platformRecipeNames` are
     already present).
   - Add the describe block after the elevation-paragraph block (so both
     design-system truth guards sit together):
     - local `platformLabels` / `recipeLabels` records matching the ones the
       catalogue block uses (`macOS`/`Linux`/`Windows`, `XP`/`Aero`);
     - `scrimSets`: identity (`high-contrast light`/`high-contrast dark` when
       `contrast === "high"`, else `identity light`/`identity dark`), platforms
       (`macOS light`, `macOS dark high`, …), recipes (`XP light`, `Aero dark
       high`, …) — 24 entries;
     - `tightestScrim()`: flat-map the sets × `overlaySurfaces`, compute
       `contrastRatio(painted, surface)`, reduce with strict `<` so the first
       minimum wins;
     - two `it` cases as described in §3.
   - Keep the existing design-system figure guard for the light `warning`
     ratio; do not duplicate it.
2. `TODO.md` — add a row under the `tokens-theme` block and tick it:
   "Pin the design-system's current figures — the §9 scrim paragraph quoted
   1.075:1 (high-contrast dark, `overlay` on `primary`) and the AAA wash-link
   cost (6.75:1 on `muted`, 5.48:1 on `active`) with no test, so a palette edit
   could leave the page quoting a ratio the package no longer produces while
   every pair passed; both are now derived from the 24 shipped sets and no value
   moves (plan 377)". Update the block bar from `144/196` to `145/197`.
3. `.agents/slop/plans/README.md`
   - Add a row after plan 376:
     `| [377](./377-design-system-figures.md) | The design-system's current
     scrim and wash-link figures | F | 062, 075, 087, 336, 375, 376 | done |`
   - Append a summary paragraph after the plan 376 paragraph.
4. `docs/design-system.md`, `COMPONENTS.md`, every token module: **no change**.
   The figures are correct today; this plan guards them.

## 5. Exact commands and expected results

Step 0 — prove the guards can fail. Before adding the new cases, copy the
paragraph text aside and temporarily change one figure in
`docs/design-system.md` (for example `1.075:1` → `1.076:1`) **in the working
tree only**, then write the two cases and run:

```sh
nub run --filter @gpuixui/tokens test
```

Expected: FAIL in `docs.test.ts` on the derived sentence for the scrim figure.
Revert the temporary edit (the figure is correct) before continuing; the
failure proves the guard reads the page. Repeat for one wash figure
(`6.75:1` → `6.76:1`) if a second direction is wanted; both cases must fail on a
changed page and pass on the real one.

Step 1 — with the page restored:

```sh
nub run --filter @gpuixui/tokens test
```

Expected: PASS; the suite grows from 4383 to 4385 tests, all green.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: exit 0, no output.

Step 2 — the completion gate:

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. `check:tests` must accept the new cases (they assert
derived values, not literals compared with themselves).

Step 3 — commit and push:

```sh
git add .agents/slop/plans/377-design-system-figures.md \
        .agents/slop/plans/README.md TODO.md
git commit -m "docs(plans): plan 377 — the design-system's current figures"

git add packages/tokens/src/docs.test.ts
git commit -m "test(tokens): pin the design-system's scrim and wash-link figures"

git push origin agent/tokens-theme
```

## 6. Test plan (write these before claiming the guard works)

| Test | What it catches | Without the guard |
| ---- | --------------- | ----------------- |
| `quotes the tightest modal scrim pair` | a palette edit moving the minimum ratio, surface or set while every pair still passes | no case exists; a changed figure ships green |
| `quotes the AAA wash-link cost` | a palette edit moving `primaryText` through the AAA light wash | same |
| existing `overlay-scrim.test.ts` | the 099/359/375 scrim regressions | must keep passing |
| existing design-system guards | the page's other claims | must keep passing |

Both new cases must be proved in two directions: temporarily change the quoted
figure (or the palette value the figure derives from) and confirm the case
fails, then restore and confirm green. No token value, pair or floor changes.

## 7. STOP conditions

- The probe-derived values disagree with the page: stop and report the label,
  surface and both numbers. Do not change the page to match a probe without
  understanding which value is right; the pair list is the source of truth.
- A platform variant or recipe is missing from the derived list (the set count
  is not 24): stop and report. Do not reduce the set to identity.
- The new sentence does not match the page after deriving it: report the
  difference and correct the page (the page is the thing held), not the guard.
- Any colour, token, pair or floor would have to move: stop. This plan changes
  tests and bookkeeping only.

## 8. Acceptance

- The two figures are derived from the shipped themes, and changing either the
  palette's minimum scrim ratio or the AAA `primaryText` wash ratio fails the
  suite with the page sentence named.
- No token value, colour, pair, floor, metric, platform style or recipe changes;
  every shipped check still returns `[]`.
- `TODO.md` ticks the row and its bar is current; the plan index lists plan 377
  and summarises it; the work is committed on `agent/tokens-theme` and pushed.
