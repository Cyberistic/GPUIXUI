# 611 — A ring that stays visible on arbitrary content

**Workstream:** tokens-theme · **Phase:** F (contract closure) · **Depends on:**
017, 069, 071, 332, 383, 391, 398, 399, 609, 610 · **Status:** planned

## 1. The gap

The package can ring **theme surfaces** and **filled controls**:

- `focusRing(theme)` draws the keyboard ring on the surface behind a control.
- `insetFocusRing(theme, family)` draws the on-fill indicator inside a filled
  control.

Neither can ring **content whose colour the theme does not own** — a colour
swatch, a user-supplied preview, a custom theme tile. The selection ring must be
visible against *every possible* content colour, and no single palette role can
promise that: a mid-grey swatch erases both a near-white and a near-black ring.

This is a real consumer defect, already recorded in `TODO.md`:

> `components` gives the ColorPicker's selected swatch a visible ring —
> `color-picker.tsx:161` paints the selection ring in `theme.colors.foreground`
> on the swatch's own fill, and the six default swatches are `primary`,
> `secondary`, `accent`, `muted`, `destructive` and `foreground`, so the ring
> measures **1.000:1** on the `foreground` swatch in every theme and 1.56–2.98:1
> on `primary`/`destructive` in most sets … A ring that must contrast with
> arbitrary content needs two tones — e.g. a `background` inner ring plus a
> `borderStrong`/`foreground` outer ring — or a `primaryForeground` check glyph
> on the swatch; no single palette role can guarantee contrast with a
> user-supplied colour (plan 389 audit).

The token package owns the designed answer: a **two-tone ring** built from the
theme's extreme neutral pair, `background` and `foreground`. For any content
colour `C`:

```
contrast(C, inner) = (max(C, Lbg) + 0.05) / (min(C, Lbg) + 0.05)
contrast(C, outer) = (max(C, Lfg) + 0.05) / (min(C, Lfg) + 0.05)
```

Their product is constant — `contrast(outer, inner)` — for every `C` between the
two tones, so the **worst case over all colours** is the geometric mean:

```
min over C of max(contrast(C, inner), contrast(C, outer))
  = sqrt(contrast(outer, inner))
```

The identity light pair measures 15.86:1 → **3.98:1** worst case; the AAA pairs
measure 21:1 → **4.58:1**. Every shipped set therefore already supports the
`mark` floor (3:1 default, 4.5:1 high) for a two-tone ring. The `outer` tone is
also the role every surface already carries at the body floor
(`bodyTextPairs`: `foreground` on `background`, `card`, `muted`, `popover`,
`hover`, `active`, and `rowTextPairs`/`softBodyPairs` on the washes and soft
fills), so the surface side of the ring is measured today.

What is **not** measured today is the derived guarantee. A theme can pass every
pair with a 7:1 ink/canvas pair whose ring guarantee is only `sqrt(7) = 2.65:1`
— under the mark floor — while `themeFailures` returns `[]`. The `mark` floor of
one painted role says nothing about the worst case over an arbitrary third
colour. This plan ships the helper and makes the guarantee part of the total
check as its tenth kind, `ring`.

**No colour moves.** The helper reads existing roles; every shipped set already
clears the floor (3.702:1 at the tightest, `Dark · Linux`; 4.583:1 at AAA). The
only edits outside the new module are the total check's kind index, its prose,
and the documentation that must name every public value and type.

## 2. Exact files and changes

### 2.1 `packages/tokens/src/ring.ts` (new)

A data module, like `highlight.ts`, so `styles.ts` (which already owns focus and
selection styles) does not grow. It exports:

```ts
import type { ThemeColors } from "./color.js";
import {
  contrastFloors,
  contrastRatio,
  type ContrastPairClass,
} from "./contrast.js";
import type { Theme, ThemeContrast } from "./theme.js";

/** The two tones and thickness of a ring that survives any content colour. */
export interface ContrastRing {
  /** The tone next to the content: the theme's `background`. */
  readonly inner: string;
  /** The tone outside it: the theme's `foreground`. */
  readonly outer: string;
  /** Thickness of each tone: `borderWidth.strong`. */
  readonly width: number;
}

/** A two-tone ring whose worst case misses the mark floor. */
export interface RingFailure {
  /** The tone next to the content. */
  readonly inner: keyof ThemeColors;
  /** The tone outside it. */
  readonly outer: keyof ThemeColors;
  /** The floor the worst case missed. */
  readonly pairClass: ContrastPairClass;
  /** The floor value at the theme's declared contrast level. */
  readonly floor: number;
  /** The worst-case ratio, `sqrt(contrast(outer, inner))`. */
  readonly ratio: number;
}

export function contrastRing(theme: Theme): ContrastRing;

export function themeRingFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<RingFailure>;
```

`contrastRing` returns `{ inner: theme.colors.background, outer:
theme.colors.foreground, width: theme.borderWidth.strong }`.

`themeRingFailures` computes `Math.sqrt(contrastRatio(outer, inner))` and reports
one `RingFailure` when it is below `contrastFloors[contrast].mark`, with
`pairClass: "mark"` and `inner`/`outer` named as `"background"`/`"foreground"`.

JSDoc must:

- state the proof and the exact worst-case formula in one short paragraph (the
  ratios' product is the tone-pair ratio, so their crossing is the minimum of
  the maximum);
- state the shipped bounds (3.702:1 default tightest, `Dark · Linux`; 4.583:1 at
  AAA) and that 15.86:1 light / 21:1 AAA produce them;
- show the **one-element composition** — `borderColor: inner`,
  `borderWidth: width`, and a zero-offset/zero-blur box shadow in `outer` spread
  by `width` — and the cost: it consumes the runtime's single shadow slot, so a
  swatch cannot also carry an elevation shadow (a wrapper element is the
  alternative);
- say the surface side is already held by `bodyTextPairs` on the four surfaces a
  swatch sits on;
- carry an `@example` fenced `ts` block importing both names it uses.

`RingFailure.pairClass` is typed `ContrastPairClass` (the type is public), not
the literal, so a report can group it like every other check.

### 2.2 `packages/tokens/src/index.ts`

Add `export * from "./ring.js";` after `./platforms.js` (alphabetical-ish with
the existing list: after `./platforms.js` is fine; the order is not enforced).

### 2.3 `packages/tokens/src/theme-check.ts`

- Import `themeRingFailures`, `type RingFailure`.
- Add `"ring"` to `themeChecks` **after `"contrast"`** (it is a derived contrast
  guarantee; the format checks must still come first so an unparseable role is
  named once).
- Add `readonly ring: RingFailure;` to `FailurePayload`.
- Compose `themeRingFailures(theme, contrast)` after the contrast block, with
  `kind: "ring"`.
- Extend the `ThemeFailure` JSDoc sentence to name the ring; extend the
  `themeFailures` JSDoc list and order sentence (… `contrast`, then `ring`, then
  `highlight` …) and the sentence that says which halves take the requested
  level (contrast, ring, highlight, native-text and hierarchy).

### 2.4 `packages/tokens/src/ring.test.ts` (new)

Header states the bug being guarded: a ring painted with one role disappears on
content of the same colour, and the body floor does not imply a two-tone ring's
worst case, so an edited theme could pass every check while a selected swatch has
no visible marker.

Cases:

1. **Resolves the two extremes and the designed thickness** — for the light,
   dark and high-contrast dark themes: `inner` is `colors.background`, `outer` is
   `colors.foreground`, `width` is `borderWidth.strong`.
2. **Guarantees the mark floor in every shipped set** — for each
   `shippedThemes` entry, `sqrt(contrastRatio(outer, inner))` is at least
   `contrastFloors[theme.contrast].mark`; label failures with `theme.name`.
   Track the minimum and assert it is **above 3.7** (the shipped tightest,
   `Dark · Linux`, is 3.702:1) so the unit states its headroom without a
   per-set table.
3. **The closed form is the worst case over every luminance** — for each shipped
   set, generate all 256 grey hex values (`#00…` to `#FF…`), compute
   `max(contrast(grey, inner), contrast(grey, outer))` and assert it never falls
   below the reported bound (minus `1e-9`), and that the minimum over the greys
   is within **0.05** of the bound (the 8-bit grid straddles the crossing). This
   proves the check's number is achievable, not a loose lower bound.
4. **Reports a collapsed ring** — `extendTheme(getTheme("light"), { colors: {
   foreground: "#777777" } })` returns one failure from `themeRingFailures`,
   with `pairClass: "mark"`, `floor: contrastFloors.default.mark`, `inner:
   "background"`, `outer: "foreground"` and `ratio` equal to
   `Math.sqrt(contrastRatio(theme.colors.foreground, theme.colors.background))`;
   `themeFailures` contains it with `kind: "ring"`.
5. **The surface side is already measured** — `contrastPairs` contains
   `["foreground", surface, "body"]` for `background`, `card`, `popover` and
   `muted`, the four surfaces a swatch sits on. (Guards the docs claim; fails if
   a future refactor drops the body list.)
6. **The executed composition is the one documented** — import
   `contrastRingStyle` from `contrast-ring.example.ts`; assert its
   `borderColor`/`borderWidth` are the ring's inner tone and width, its
   `boxShadow.color` is the outer tone, and the shadow has zero offsets, zero
   blur and a spread equal to the width.

Do not add `check-tests-ok`.

### 2.5 `packages/tokens/src/contrast-ring.example.ts` (new)

The one-element composition from the JSDoc, compiled and run:

```ts
import type { BoxShadow } from "./elevation.js";
import { contrastRing } from "./ring.js";
import { lightTheme, type Theme } from "./theme.js";

/** The runtime shape of a two-tone ring on one element. */
export interface ContrastRingStyle {
  readonly borderColor: string;
  readonly borderWidth: number;
  readonly boxShadow: BoxShadow;
}

/** The inner tone as the border and the outer tone as the spread shadow. */
export const contrastRingStyle = (theme: Theme = lightTheme): ContrastRingStyle => {
  const ring = contrastRing(theme);
  return {
    borderColor: ring.inner,
    borderWidth: ring.width,
    boxShadow: {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: ring.width,
      color: ring.outer,
    },
  };
};
```

### 2.6 `packages/tokens/src/theme-check.example.ts`

Add `foreground: "#777777"` to `brokenTheme.colors` (the ring's worst case is
`2.08:1`, under the mark floor) and extend its JSDoc list with the collapsed
ring. The other failures are unchanged.

### 2.7 `packages/tokens/src/theme-check.test.ts`

- Import `themeRingFailures`.
- Add `themeRingFailures(brokenTheme).length` to the exact-total sum.
- Insert the order assertion: `lastContrast < firstRing` and `firstRing <=
  lastRing < firstHighlight`.
- No other case changes; `new Set(kinds(...))` now covers ten kinds through
  `themeChecks`.

### 2.8 `packages/tokens/src/docs.test.ts`

- `checkWords` gains `ring: "content ring"` in index order (after `contrast`).
- `checkFunctions` gains `ring: "themeRingFailures"` in index order.
- The local `countWords` list in the typeface case ends at `"nine"`; append
  `"ten"` so the guarantee sentence's new count resolves.
- Add a `describe("docs/tokens.md content ring", …)` case that:
  - asserts both documents name `contrastRing`, `themeRingFailures`,
    `ContrastRing` and `RingFailure` (the value/type walks cover the reference;
    this holds the design-system mention too);
  - derives the worst-case sentence from the checker: for the light theme, the
    document contains `**3.98:1**`/`3.98:1`? — **do not** pin the ratio as a
    literal; instead assert the document contains the word `square root` and the
    role pair, and that the helper's own bound equals
    `Math.sqrt(contrastRatio(foreground, background))`. A pinned figure is the
    figures suite's job; this case holds the *rule*.
  - asserts the reference says the composition consumes the single shadow slot.

### 2.9 `packages/tokens/src/inventory.test.ts`

Add `ring: "themeRingFailures"` to its `checkFunctions` map (it satisfies
`Record<ThemeFailureKind, string>`, so the build fails until it is added).

### 2.10 `docs/tokens.md`

- **Types table**: add, in alphabetical order,
  `| ContrastRing | The two tones and thickness of a ring that stays visible on arbitrary content. |`
  after `ContrastPairClass`, and
  `| RingFailure | A two-tone ring whose worst case over an arbitrary colour misses the mark floor. |`
  before `SelectionStyle`. Update the `ThemeFailure` row's kind list to include
  `ring` after `contrast`.
- **`## Focus`**: add a closing `### A ring over arbitrary content` subsection
  before `## Text selection` with:
  - the consumer problem (a swatch of the theme's own `foreground` erases a
    ring painted in `foreground`);
  - the two tones (`background` inner, `foreground` outer) and
    `borderWidth.strong`;
  - the derivation in two lines (the ratios' product is the tone-pair ratio;
    the crossing is the worst case, `sqrt(contrast(outer, inner))`), the shipped
    bounds (3.702:1 default, 4.583:1 AAA), and the mark floors it must clear;
  - the one-element composition (border + spread shadow) and the shadow-slot
    cost;
  - the note that the outer tone's surface side is already measured by the body
    pairs, and that the ring is **not** the focus indicator;
  - a fenced `tsx` snippet importing `contrastRing` and
    `contrastRingStyle`? — `contrastRingStyle` lives in an `.example.ts` and is
    **not** a package export, so the snippet must not import it. Show
    `contrastRing(theme)` and the three properties inline.
  - links to `src/contrast-ring.example.ts` and the new test.
- **`### Checking a theme`**: the count sentence becomes **ten checks** with
  `content ring` after `contrast`; the list of sections follows the index.
- **`#### One check`**: add the collapsed ring to the "returns `[]` from
  `themeContrastFailures`" list; update the order sentence to `… then
  `contrast`, then `ring`, then `highlight` …`; add `RingFailure` to the union
  list; say the ring half also takes the requested level.
- **`#### Every shipped theme`**: add the `ring` count if it enumerates the
  checks (derive, do not type).

### 2.11 `docs/design-system.md`

- §11 (the checking paragraph): add `themeRingFailures` to the "each part is
  available on its own" list in index order, and a sentence naming the collapsed
  two-tone ring as a defect no pair check sees.
- Add the ring to the accessibility/selection discussion (near the focus or
  selection paragraph): a marker on content the theme does not own is a two-tone
  ring, because one role cannot contrast with every colour.
- Do not retype the guarantee's count; the docs guard derives it.

### 2.12 `packages/tokens/README.md`

Add one paragraph beside the focus helpers: the two-tone ring, the two roles,
the worst-case rule, and `themeRingFailures`. If the README states the composed
check order, insert `ring` after `contrast`.

### 2.13 `COMPONENTS.md`

- Add a design-system row after **Focus state**:

  `| Content ring | done | yes (values in a Theme) | ... |`

  naming `contrastRing`, `themeRingFailures`, the two roles, the worst-case rule
  and its shipped tightest, and the single-shadow cost; note the ColorPicker
  interlock is the first consumer.
- **Total theme check** row: add `themeRingFailures` to the composed functions
  and `ring` to the order and to the ten kinds; the sentence that lists which
  halves take the requested level gains the ring.

### 2.14 `TODO.md`

Add one ticked row at the end of the tokens-theme list (see the plan's
acceptance text) and update the two ColorPicker-adjacent cross-team rows to name
`contrastRing(theme)` as the designed replacement (the ColorPicker row itself
and no other owner changes).

### 2.15 `.agents/slop/plans/README.md`

Add after the 610 row:

```
| [611](./611-content-ring.md) | A ring that stays visible on arbitrary content | F | 017, 069, 071, 332, 383, 391, 398, 399, 609, 610 | done |
```

Do not renumber existing rows.

### 2.16 `.agents/slop/rd/2026-10-19-tokens-next-611.md`

Audit note: what landed, the proof, the measurements, verification commands and
both-directions results, and the queue state after the unit.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. `nub run --filter @gpuixui/tokens test`
   → 160 files and every test green. **Before** the implementation the new suite
   does not exist; after 2.1–2.9, all green. To prove the suite can fail, see §5.
2. `nub run check`
   → `check:tests`, lint, format and type-check green. The docs value/type
   coverage, snippet, example, JSDoc, inventory and count guards run here.
3. `nub run lint`
4. `nub run test` (the workspace gate for the commit).

## 4. STOP conditions

- **STOP** if any shipped set's `sqrt(contrastRatio(foreground, background))` is
  below its declared `mark` floor. Report the set and the ratio; do not move a
  colour without a separate plan. (Measured before planning: tightest is
  `Dark · Linux` at 3.702:1 default; every AAA set is 4.583:1.)
- **STOP** if `themeChecks` order anywhere else in the tree assumes nine kinds
  and the update is not a mechanical insert after `contrast`. Search with
  `rg "themeChecks" packages/tokens/src` and fix every record.
- **STOP** if the docs count guard rejects a sentence you did not update; the
  count is owned by `themeChecks.length`, so update the sentence, not the guard.
- **STOP** if the ring's worst-case proof does not reproduce numerically on the
  grey grid (case 3). Do not weaken the case; report the measured value.
- **DO NOT** add a colour, role, pair class or floor. This plan ships a derived
  guarantee and a helper only.
- **DO NOT** claim the ring was seen in the native runtime. It is a data helper;
  the native proof belongs to the playground gallery and the ColorPicker
  consumer.

## 5. Test plan — both directions

1. Remove `themeRingFailures(...)` from `themeFailures` → the new suite's case 4
   and `theme-check.test.ts`'s kind set fail.
2. Change `themeRingFailures` to return `[]` unconditionally → case 4 fails.
3. Change `contrastRing`'s `outer` to `theme.colors.borderStrong` → case 1 fails
   and, in a copied theme, the AAA guarantee drops below 4.5 (case 2 shows it on
   the shipped sets only if a shipped set fails; it does not). State case 3's
   bound follows the returned tones, so the composition test is the guard.
4. Remove `foreground` from `bodyTextPairs` → case 5 fails.
5. Remove `background` from the docs ring paragraph → the new docs case fails.
6. Remove `ring` from `themeChecks` → `docs.test.ts`, `inventory.test.ts` and
   `theme-check.test.ts` fail on their compile-checked records.
7. Restore each change → green.

The repo's `scripts/verify-two-directions.sh` is still jj-based (see the harness
TODO); run the two `nub run --filter @gpuixui/tokens test` invocations by hand and
record both results in the audit note and the commit body.

## 6. Acceptance

- `contrastRing(theme)` returns the inner `background`, outer `foreground` and
  `borderWidth.strong`; `contrastRingStyle` is the executed one-element
  composition.
- `themeRingFailures(theme, contrast?)` reports a theme whose worst case over an
  arbitrary colour is below the `mark` floor, with the bound derived from the
  returned tones.
- `themeFailures` composes it as the tenth kind, `ring`, after `contrast`; the
  kind index, both docs, the ledger and the inventory records agree, and every
  count in the prose derives from the index.
- Every shipped set clears the ring floor (3.702:1 default, 4.583:1 AAA) and no
  colour, pair, floor, metric, platform style or shipped theme moves.
- The reference, README, design system and inventory document the helper, the
  proof, the cost and the ColorPicker consumer.
- `nub run check`, `nub run lint` and `nub run test` pass.
