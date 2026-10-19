# Plan 582 — The find highlight on the painted code surface

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
569 (`nativeTextTheme`, `nativeTextSurfaces`), 573 (`nativeHighlight`,
`themeHighlightFailures`), 574 (the runtime's 3.5% ink wash, the light platform
text steps), 581 (the highlight step).

**Status:** done. Executed on `agent/tokens-theme`.

---

## 1. The measured gap

Plan 574 established that the pinned runtime does not paint a native `<code>`,
`<diff>` or `<markdown>` document directly on `bg`: a code block is painted on
`bg` **under a fixed 3.5% ink wash** (`ink()` in
`references/gpuix/packages/native/src/text/render.rs`). The suite now holds the
syntax palette through that composition on every shipped set
(`native-text.test.ts`, “the syntax palette on the painted code surface”).

Plan 573 added the find highlight: `nativeHighlight(theme)` returns the
`selection` role and one `nativeHighlightStep` stronger for the active match.
`themeHighlightFailures` holds every matchable text role at the secondary floor
on the four tones `nativeTextSurfaces` names — but it composites the wash over
the **plain** tone:

```ts
const painted = (paint, surface, theme) =>
  compositeOver(paint, theme.colors[surface]);
```

A find match inside a code block is painted behind the code block's ink wash, so
the real composition is `highlight over ink(bg)`, not `highlight over bg`. On
`Light · Windows 7` (Aero) the inherited `successText` and `destructiveText`
(identity light `#0E5739` / `#8F2126`; Aero never overrode them) measure:

| role | surface | wash | ratio | floor |
| ---- | ------- | ---- | ----- | ----- |
| `successText` | `background` | active | **4.445:1** | 4.5:1 |
| `successText` | `muted` | active | **4.429:1** | 4.5:1 |
| `destructiveText` | `background` | active | **4.496:1** | 4.5:1 |
| `destructiveText` | `muted` | active | **4.479:1** | 4.5:1 |

while `themeHighlightFailures`, `themeFailures` and every contrast check return
`[]`. The same roles clear the floor on the opaque tone (the shipped opaque
minimum is **4.714:1**), which is why plan 573's list looked complete.

The runtime's ink wash is not a theme token and a `ContrastPair` cannot express a
composite of a composite, so the public pair list cannot carry this row. The
check itself must composite it, exactly as it already does for the highlight
wash.

## 2. Decision

1. **Publish the painted code surface as one internal helper.** A new
   `packages/tokens/src/native-ink.ts` owns the runtime's fixed fraction and the
   black-or-white ink choice:
   - `nativeInkOpacity` — `0.035`, the fraction `ink()` fades by;
   - `nativeInk(theme, surface = "card")` — `surface` composited under one
     `alpha(ink, nativeInkOpacity)`, choosing `#FFFFFF` on a dark tone
     (`relativeLuminance < 0.5`) and `#000000` otherwise, the runtime's own
     rule.
   It is internal (not exported from `index.ts`): it is a runtime detail, not a
   token or a public API, and `public-types.test.ts` / the reference page stay
   unchanged. `highlight.ts`, `native-text.test.ts` and the new regression test
   import it directly. A separate module keeps `native-text.ts` free of the
   `native-text → contrast` cycle (`contrast.ts` already imports
   `native-text.ts` for `nativeSyntaxRoles`/`nativeTextSurfaces`).
2. **Measure the find highlight where the runtime paints it.**
   `themeHighlightFailures` composites both washes over
   `nativeInk(theme, surface)` for the text arm and the step arm. The failure's
   `surface` still names the theme role the document was given (`background`,
   `card`, `popover`, `muted`); the ink is the paint on it, not a fifth tone.
3. **Move the two Aero inks one designed step.** Aero light names the XP steps
   the sibling recipe already ships: `successText: "#0E5135"` (`palette.green[800]`)
   and `destructiveText: "#7E1D21"` (`palette.red[800]`). Every shipped set then
   clears the painted floor. `#0E5135`/`#7E1D21` are the exact values
   `getPlatformRecipeTheme("xp", "light")` carries, so the two Windows editions
   agree on their status inks.
4. **Publish both surfaces in the contract.** `nativeHighlightPairs` remains the
   opaque role × tone cross-product (the runtime paints each of those pairs when
   a document has no code block). The checker holds every pair again on the
   painted code surface. The docs state both minima so a consumer knows the
   weaker number.
5. **No new pair count, floor or check kind.** `contrastPairs` stays 405,
   `nativeHighlightPairs` keeps its size, `themeChecks` stays eight, and the
   failure payload is unchanged (a `secondary` or `step` row with the same
   fields).

### Alternatives rejected

- **Add the inked pairs to `nativeHighlightPairs`.** `ContrastPair` is
  `[foreground, background, class]`; an inked background is not a role, and
  inventing a composite surface would break the contract's meaning and its
  uniqueness guard (plan 546).
- **Expose `nativeInk` publicly.** It would join the public surface, the type
  index and the value-coverage guard for a runtime implementation detail. The
  catalogue already documents the 3.5% fraction; the helper is test/check
  plumbing.
- **Move the whole Aero palette.** Only two roles fail, only through this one
  composition; moving tints that already pass would churn the documented
  figures for no guarantee.
- **Change the active step to `+0` and accept the failure.** The match wash
  passes; the defect is the text role under the active wash, and no step change
  makes the inherited ink readable on both tones without changing the role.

## 3. Files and exact changes

### 3.1 New `packages/tokens/src/native-ink.ts`

```ts
import { alpha } from "./color.js";
import { compositeOver, relativeLuminance } from "./contrast.js";
import type { ThemeColors } from "./color.js";
import type { Theme } from "./theme.js";

/**
 * The fraction the runtime fades a native document's `bg` by before painting a
 * code block on it — `ink()` in `render.rs`, fixed in the pinned runtime.
 */
export const nativeInkOpacity = 0.035;

/**
 * The surface a native code block actually paints on: `bg` under the runtime's
 * {@link nativeInkOpacity} black-or-white ink wash. A light tone is darkened and
 * a dark tone is lightened, exactly as the runtime chooses its ink.
 */
export function nativeInk(
  theme: Theme,
  surface: keyof ThemeColors = "card",
): string {
  const ink =
    relativeLuminance(theme.colors[surface]) < 0.5 ? "#FFFFFF" : "#000000";
  return compositeOver(alpha(ink, nativeInkOpacity), theme.colors[surface]);
}
```

Keep the imports ordered the way the package orders them; the `ThemeColors`
type import belongs with the other type import.

### 3.2 `packages/tokens/src/highlight.ts`

1. Import `nativeInk` from `./native-ink.js`.
2. Replace the `painted` helper:

```ts
const painted = (paint: string, surface: keyof ThemeColors, theme: Theme) =>
  compositeOver(paint, nativeInk(theme, surface));
```

3. JSDoc updates:
   - `HighlightFailure.surface` — “The document tone the highlighted text sits
     on; the check paints the code block's ink wash over it.”
   - `nativeHighlightPairs` — keep the opaque claim, and state that the checker
     measures each pair again on the ink-washed surface.
   - `themeHighlightFailures` — replace “Both are composited over every surface
     a document may name” with the two-step composition, and correct the stale
     figures: the opaque minima are **5.59:1** (match) and **4.80:1** (active);
     on the painted code surface they are **5.21:1** and **4.51:1**.
   - The module header's “5.34:1 (match) and 4.61:1 (active)” is stale (it
     predates plan 574's platform text steps); replace it with the derived
     painted minima above.
4. No change to the failure union or the returned shape.

### 3.3 `packages/tokens/src/platform-styles/recipes/aero.ts`

In `colors.light`, after `warningText`:

```ts
      // A find match paints over the code block's 3.5% ink wash. The inherited
      // success and destructive inks measured 4.429–4.496:1 through the active
      // wash on the canvas and quiet panel, under the 4.5:1 secondary floor, so
      // both take the XP recipe's step (plan 582).
      successText: "#0E5135",
      destructiveText: "#7E1D21",
```

Update the file header to name the find-highlight composition in addition to
plan 574's code-surface step.

### 3.4 `packages/tokens/src/native-text.test.ts`

Replace the local `runtimeFades.codeBlockInkWashOpacity` + `inkWash` with
`nativeInkOpacity` + `nativeInk` imported from `./native-ink.js`:

```ts
import { nativeInk, nativeInkOpacity } from "./native-ink.js";
```

Keep the other runtime fractions local (they are not the highlight's concern).
`inkFailures` then calls `nativeInk(theme, surface)`. No assertion changes: the
helper is the same arithmetic, so all figures stay identical.

### 3.5 New `packages/tokens/src/native-highlight-code-surface.test.ts`

Header comment states the plan-582 bug: the find highlight was checked on the
plain tone, while the runtime paints a code block on the 3.5% ink wash; Aero
light's inherited `successText`/`destructiveText` measured 4.429–4.496:1 through
the active match, under 4.5:1, while every check returned `[]`.

Imports: `getPlatformRecipeTheme`, `extendTheme`, `nativeHighlight`,
`nativeHighlightPairs`, `nativeTextSurfaces`, `contrastFloors`,
`contrastRatio`, `compositeOver`, `themeHighlightFailures`, `themeFailures`,
`shippedThemes`, `nativeInk`, and the runtime helper types.

Cases:

1. **“reports the four Aero pairs the opaque check missed”** — rebuild the
   pre-fix theme:

   ```ts
   const preFixAero = extendTheme(getPlatformRecipeTheme("aero", "light"), {
     colors: { successText: "#0E5739", destructiveText: "#8F2126" },
   });
   const failures = themeHighlightFailures(preFixAero);
   ```

   Assert there are exactly four, all `pairClass === "secondary"` and
   `wash === "active"`, with the role/surface set:
   `successText/background`, `successText/muted`, `destructiveText/background`,
   `destructiveText/muted`; each `floor` is `contrastFloors.default.secondary`
   and each `ratio` is `< floor` and close to `4.445`, `4.429`, `4.496`, `4.479`
   respectively (three decimals). Also assert `themeFailures(preFixAero)` has
   exactly those four `kind: "highlight"` failures (no colour, metric or other
   failure), proving the fix is not hiding a second defect.
   *Fails before §3.2* (returns `[]`) and *fails before §3.3* (the shipped Aero
   value is not the planted one, so the count is not four).

2. **“Aero light ships the XP status inks”** — assert
   `getPlatformRecipeTheme("aero", "light").colors.successText` equals the XP
   recipe's `successText`, and the same for `destructiveText`; assert
   `themeFailures(getPlatformRecipeTheme("aero", "light"))` is `[]`.

3. **“holds every highlight pair on the painted code surface”** — for every
   `shippedThemes` entry and every `nativeTextSurfaces` tone, for both washes,
   recompute the ratio with `nativeInk` and assert it is at least
   `contrastFloors[theme.contrast].secondary`. This is the independent guard
   that fails on the pre-fix Aero values even if the checker were reverted.

4. **“holds the active step on the painted code surface”** — for every shipped
   theme and tone, the two washes over `nativeInk` are at least
   `contrastFloors[theme.contrast].step` apart (the tightest is **1.062:1**,
   high-contrast dark on `muted`). This guards the step arm of §3.2.

### 3.6 `packages/tokens/src/native-highlight.test.ts`

Extend “derives every figure the reference quotes” with the painted figures so
the docs cannot drift:

- add `paintedMatch` / `paintedActive` = the `nativeHighlightPairs` minima with
  the wash composited over `nativeInk` on each tone;
- add `paintedStep` / `paintedFromSurface` from the same composition;
- assert the docs contain each figure to two decimals.

Keep the existing opaque figures (`match`, `active`, `body`, `step`,
`fromSurface`) — they remain true and the page states them. The expected values
after §3.3 are **5.59 / 4.80** opaque and **5.21 / 4.51** painted, with the step
**1.08** opaque and **1.06** painted.

### 3.7 `packages/tokens/src/selection-status.test.ts`

Plan 366's pinned tightest moves because Aero `successText` changes:
`Light · Windows 7 successText on selected` at **4.827:1** becomes
`Light · Windows warningText on selected` at **4.858:1** (the AAA figure stays
7.370:1). Update the label and the number; no pair list size changes.

### 3.8 `packages/tokens/src/docs.test.ts`

1. “quotes the row-text and status ratios the shipped themes produce” — the
   `successText` on `muted` tuple moves from `Aero light, 7.68` to
   `Windows light, 8.03`.
2. “quotes the status-selection text ratio the shipped themes produce” — the
   default tuple becomes `Windows light warningText on selected`, `4.858`; the
   prose assertion becomes
   `"**4.858:1** (Windows light \`warningText\` on \`selected\`)"`.
3. Any other literal `4.827`/`7.68` in this file that refers to those two
   sentences (the `selectionFillPairs` 4.827 at macOS dark is a different
   composition and stays).

### 3.9 `docs/tokens.md`

1. **Platform recipes** — the Aero paragraph gains: Aero also names
   `successText` `#0E5135` and `destructiveText` `#7E1D21`, the XP steps, so a
   find match inside a code block keeps the secondary floor through the active
   wash on the painted code surface.
2. **Native text documents** — the sentence that lists the light platform steps
   (“XP adds … and Aero adds `warningText` `#4B3100`”) now names Aero's
   `successText` and `destructiveText` too. The following paragraph keeps the
   opaque **7.562:1** figure and the inked **7.008:1** figure unchanged.
3. **Find highlighting** — replace the four-surface-only promise with both
   surfaces:
   - `nativeHighlightPairs` holds the opaque role × tone pairs; the tightest
     are **5.59:1** (match) and **4.80:1** (active), body text **9.65:1** and
     **8.03:1**;
   - the runtime paints a code block on the 3.5% ink wash, so the check
     measures every pair again there; the tightest painted pairs are **5.21:1**
     and **4.51:1**, body text **8.93:1** and **7.31:1**;
   - the active step is **1.08:1** from the match and **1.28:1** from the tone,
     or **1.06:1** and **1.25:1** on the painted code surface;
   - state the defect: Aero light's inherited `successText` and
     `destructiveText` measured **4.445:1** on the canvas and **4.429:1** on the
     quiet panel through the active match on the painted surface, under 4.5:1,
     while every check returned `[]`; both take the XP step and no other value
     moves.
4. **Status text on the quiet panel** — “`successText` on `muted` at
   **8.03:1** (Windows light)”.
5. **Status selection** — both occurrences of
   “**4.827:1** (Aero light `successText` on `selected`)” become
   “**4.858:1** (Windows light `warningText` on `selected`)”.
6. **Verification** — the “sixteen entries” and the `figures.ts`/`docs.test.ts`
   ownership sentence do not change; the find-highlight figures are still owned
   by `native-highlight.test.ts`, now with both surfaces.

### 3.10 `docs/design-system.md`

In the “Find highlighting” paragraph after the floor table, state that the check
holds every matchable role on the document tone **and again through the code
block's 3.5% ink wash**, so a find inside fenced code is measured on the surface
the runtime actually paints. No new figure and no floor change.

### 3.11 `packages/tokens/README.md`

In *Native text documents*, the find-highlight paragraph gains one clause: the
check measures the wash on the document tone and on the code block's painted
3.5% ink surface; the light platform styles name the status inks that surface
needs. No new figure.

### 3.12 `COMPONENTS.md`

- **Theme contrast check** row: append one sentence after the plan-581 clause:
  plan 582 measures the find highlight on the code block's painted 3.5% ink
  surface, after Aero light's inherited `successText`/`destructiveText` measured
  4.429–4.496:1 through the active match while the plain-tone check returned
  `[]`; both take the XP step, every shipped set passes (4.509:1 painted at the
  tightest), and `contrastPairs` stays 405.
- **Design tokens** row: the `nativeHighlight` sentence gains “on the document
  tone and on the code block's ink-painted surface”.
- No pair count changes.

### 3.13 `TODO.md` and the plan index

- Add a completed row under *Design tokens and theming* after the plan-581 row:

  `[x]` Hold the find highlight on the code block's painted surface — … (plan 582)

  with the measured defect, the two Aero steps and the new minima.
- The section header moves from `235/301` to `236/302` (one completed task; the
  denominator counts pending + done, as the existing header does).
- `.agents/slop/plans/README.md`: add the row after 581 and one sentence to the
  block's closing paragraph. The status is `done` in the same commit as the
  implementation.

## 4. Commands and expected results

Run from the worktree root:

```sh
cd packages/tokens && nub run test -- native-highlight-code-surface
# expect: the four cases pass. Before §3.2 case 1 fails (no failures); before
# §3.3 case 3 fails on Aero light.

cd packages/tokens && nub run test -- native-highlight
# expect: green, including the extended figure derivation.

cd packages/tokens && nub run test -- native-text
# expect: green with the shared `nativeInk` helper (same figures).

cd packages/tokens && nub run test
# expect: every file passes, `themeFailures` is `[]` for every shipped set.

cd packages/tokens && nub run check-types
# expect: done, no diagnostics.

cd ../.. && nub run check
# expect: check-tests, lint, format and type-check pass.

nub run test
# expect: the workspace suite passes.
```

### Two-direction proof (AGENTS §3)

`scripts/verify-two-directions.sh` is written against `jj` (TODO harness row),
so record the manual run in the commit message:

1. With the fix: the new suite is green and
   `themeHighlightFailures(preFixAero)` reports four failures at the ratios
   above.
2. Revert only `painted` in `highlight.ts` to `compositeOver(paint,
   theme.colors[surface])`; re-run. Expect case 1 to fail (returns `[]`) and
   case 3 to keep failing until the Aero edit is also reverted.
3. Revert the Aero values too; expect case 3 to fail with the four pairs.
4. Restore both; expect green.

## 5. STOP conditions

- **STOP** if any shipped set still fails on the painted surface after the Aero
  step. Report the theme, role, tone and ratio; do not widen the floor and do
  not move a role outside its own family.
- **STOP** if the Aero step changes an opaque pair below its floor or changes
  the tightest opaque figures in a way §3.7–3.8 do not cover.
- **STOP** if the active step on the painted surface falls under
  `contrastFloors[level].step` for any shipped set. The measured minimum is
  **1.062:1** at high-contrast dark on `muted`; a lower value is a design
  decision for a different plan.
- **STOP** if `themeHighlightFailures` no longer reports the plan-581 planted
  near-opaque selection (`#C9D6EAFC`) as a `step` failure. The step arm must
  keep working on the painted surface.
- **STOP** if the ink helper needs to be public to be imported by the check or
  the tests. It is a module under `src/`, not an entry export; a cycle with
  `contrast.ts` is the signal to move the helper, not to export it.

## 6. Acceptance

- `themeHighlightFailures` measures both washes on the surface a native code
  block paints on, and the four Aero light pairs above are reported on the
  pre-fix theme while every shipped set returns `[]` after the fix.
- Aero light ships `successText: "#0E5135"` and `destructiveText: "#7E1D21"`,
  the XP steps; no other colour moves.
- `nativeInk`/`nativeInkOpacity` are one implementation used by the checker,
  both suites and the docs derivation; no duplicated 0.035 or ink choice.
- The catalogue, design system, README and inventory state the same two-surface
  contract and the derived minima.
- `nub run check`, `nub run lint` and `nub run test` pass.
