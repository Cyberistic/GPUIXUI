# 649 — The find highlight on the native diff's row tint

**Phase:** F (the native-document half of the theme contract) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 569 (the native text theme), 573 (the find highlight), 574 (the
syntax palette on every document surface), 581 (the active-match step), 582
(the find highlight on the painted code surface), 591 (the native diff row
tint), 602 (the diagnostic order) ·
**Number block:** 500–699 (`tokens-theme` overflow; `647` is owned by
`components` and `648` by `playground`, so `649` is the next free) ·
**Status:** done

## 1. The defect

Plan 582 moved `themeHighlightFailures` from the plain document tone onto the
code block's fixed 3.5% ink wash:

```ts
const painted = (paint, surface, theme) =>
  compositeOver(paint, nativeInk(theme, surface));
```

That is the right surface for fenced code. It is **not** the surface of a
changed diff line: `<diff>` paints its rows directly on `bg` and tints a whole
changed row with 5.5% of `diffAdd` (`successText`) or `diffDel`
(`destructiveText`) — `nativeSyntaxTints`, which plan 591 made first-class for
the syntax palette. A find match on a changed diff line is therefore behind the
selection wash **and** that row tint, a composition neither check measures:

- `themeHighlightFailures` measures the wash over `nativeInk` only;
- `nativeSyntaxTints` measures the syntax roles over the tint **without** the
  highlight wash;
- `nativeHighlightPairs` in `contrastPairs` measures the opaque role on the
  tone, without either wash.

A probe over the twenty-four shipped sets (2026-10-19) found seven pairs under
the 4.5:1 secondary floor through the **active** match on Aero light, while
`themeHighlightFailures` and `themeFailures` both returned `[]`:

| foreground | tint | surface | ratio |
| ---------- | ---- | ------- | ----- |
| `mutedForeground` | `diffDel` | `muted` | **4.437:1** |
| `mutedForeground` | `diffAdd` | `muted` | **4.440:1** |
| `mutedForeground` | `diffDel` | `background` | **4.454:1** |
| `primaryText` | `diffDel` | `muted` | **4.481:1** |
| `primaryText` | `diffAdd` | `muted` | **4.484:1** |
| `mutedForeground` | `diffAdd` | `background` | **4.491:1** |
| `primaryText` | `diffDel` | `background` | **4.498:1** |

The match wash passes every tint pair; the defect is the **active** wash, which
is one `nativeHighlightStep` stronger. A reader searching a diff sees the
current match's comment or keyword fall under the floor exactly on the changed
line the match sits on.

The same `mutedForeground` and `primaryText` values pass the plain-tone and
code-ink arms, which is why every existing check is green.

## 2. Decision

Measure the find highlight on the remaining runtime surface: each of the two
diff row tints from `nativeSyntaxTints`, at its own fraction, over each of the
four `nativeTextSurfaces` tones. The tint is painted **instead of** the code
ink — `<diff>` has no ink wash — so the base is
`compositeOver(alpha(tintRole, 0.055), tone)`, not `nativeInk` plus a tint.

### 2.1 `packages/tokens/src/highlight.ts`

Imports:

```ts
import { nativeInk, nativeInkOpacity } from "./native-ink.js";
import { nativeSyntaxTints } from "./native-text-check.js";
```

`nativeTextRoles` is already imported. Define one internal paint list beside
`painted`:

```ts
type SurfacePaint =
  | { readonly kind: "code"; readonly ink: number }
  | { readonly kind: "tint"; readonly tint: keyof ThemeColors; readonly opacity: number };

/**
 * The three ways the runtime paints a document tone under a find wash: the code
 * block's 3.5% ink, and the two 5.5% diff row tints. A diff row is painted on
 * `bg` directly (`diff.rs`: `.bg(theme.bg)`), so its tint is composited over the
 * tone, not over the code block's ink.
 */
const surfacePaints: ReadonlyArray<SurfacePaint> = [
  { kind: "code", ink: nativeInkOpacity },
  ...nativeSyntaxTints.map(
    (tint): SurfacePaint => ({
      kind: "tint",
      tint: nativeTextRoles[tint.wash],
      opacity: tint.opacity,
    }),
  ),
];

const paintSurface = (
  surface: keyof ThemeColors,
  theme: Theme,
  paint: SurfacePaint,
): string =>
  paint.kind === "code"
    ? nativeInk(theme, surface, paint.ink)
    : compositeOver(alpha(theme.colors[paint.tint], paint.opacity), theme.colors[surface]);
```

The failure payload gains the paint it measured:

```ts
/** The code block's fixed ink fraction, when the wash sat on its painted surface. */
readonly ink?: number;
/** The diff row tint's role, when the wash sat on a changed diff line. */
readonly tint?: keyof ThemeColors;
/** The diff row tint's fraction, when `tint` is present. */
readonly tintOpacity?: number;
```

`HighlightFailure` becomes a union of two members that both carry those optional
fields; the existing `pairClass`, `wash`, `surface`, `foreground`, `floor` and
`ratio` fields do not change.

`themeHighlightFailures` walks `surfacePaints` instead of the single `painted`
surface:

- the text arm: for each paint, each wash (`match` / `active`), each
  `nativeHighlightPairs` entry, composite the wash over `paintSurface(...)` and
  report a `secondary` failure below the floor, adding `ink` or
  `tint`/`tintOpacity` from the paint;
- the step arm: for each paint and each surface, compare the active wash against
  the match wash over the same painted surface, and report a `step` failure
  below `contrastFloors[level].step` with the same paint fields.

The existing code-ink rows gain `ink: nativeInkOpacity`; the plain-tone arm is
not re-added because for text the ink is the harder of the two (it moves the
tone toward the text role), and the step is measured on the same painted
surfaces as before. State that reason in the JSDoc rather than leaving the false
"the document tone, and the code block's ink" sentence.

The JSDoc's composition paragraph gains the two tints and names `nativeSyntaxTints`
as their owner. No new export, pair list, check kind or floor.

### 2.2 `packages/tokens/src/platform-styles/recipes/aero.ts`

Aero light's two failing inks take one designed step darker, in place:

```ts
mutedForeground: "#36455A", // was #3D4C5F
primaryText: "#0A417A",     // was #0C4A8C
```

Add a comment beside them recording why: the active find match over the two
diff row tints measured 4.437–4.498:1, under the 4.5:1 secondary floor, while
the code-ink and plain arms passed. These are the only shipped values that
move. Every other set already passes the new walk.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/649-native-highlight-diff-tint.md` | this plan |
| `packages/tokens/src/highlight.ts` | `surfacePaints`, `paintSurface`, optional `ink`/`tint`/`tintOpacity` on `HighlightFailure`, walk the three paints in both arms, extend the JSDoc |
| `packages/tokens/src/platform-styles/recipes/aero.ts` | move `mutedForeground` and `primaryText` one step; add the rationale comment |
| `packages/tokens/src/native-highlight-diff-tint.test.ts` | new regression suite |
| `packages/tokens/src/native-highlight-code-surface.test.ts` | filter its two "4 failures" assertions to the code-ink arm (`ink !== undefined`) now that the tint arm also reports on the planted pre-582 theme; the 582 regression itself is unchanged |
| `docs/tokens.md` | *Find highlighting*: name the two diff row tints and the Aero fix |
| `docs/design-system.md` | the find paragraph: the same composition |
| `packages/tokens/README.md` | the find paragraph: the same composition |
| `COMPONENTS.md` | append the plan to the **Total theme check** row |
| `TODO.md` | add and tick the row; bump the section counter and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary paragraph |
| `.agents/slop/rd/2026-10-19-tokens-next-649.md` | the audit note and probe table |

No other file. **Do not** edit `packages/components`, `packages/primitives`,
`apps/docs` or a shipped value outside the two Aero light roles.

## 4. `packages/tokens/src/native-highlight-diff-tint.test.ts`

Header:

```ts
/**
 * Guards the defect plan 649 fixes: `themeHighlightFailures` measured the find
 * wash over the code block's 3.5% ink, but the pinned runtime paints a changed
 * diff row directly on `bg` under a 5.5% tint of `diffAdd`/`diffDel`
 * (`nativeSyntaxTints`). On Aero light the active match over those tints put
 * `mutedForeground` at 4.437:1 and `primaryText` at 4.481:1 on the quiet panel,
 * under the 4.5:1 secondary floor, while `themeHighlightFailures` and
 * `themeFailures` returned `[]`. The check now walks both tints for both washes
 * and the step, and Aero light's two inks take one designed step.
 */
```

Imports from `./index.js`: `compositeOver`, `contrastFloors`, `contrastRatio`,
`extendTheme`, `getPlatformRecipeTheme`, `nativeHighlight`,
`nativeHighlightPairs`, `nativeSyntaxTints`, `nativeTextRoles`,
`nativeTextSurfaces`, `shippedThemes`, `themeFailures`,
`themeHighlightFailures`, `type Theme`, `type ThemeColors`; and
`nativeInkOpacity` from `./native-ink.js`.

Constants:

```ts
/** Aero light before plan 649: the values the old check accepted. */
const preFixAero = extendTheme(getPlatformRecipeTheme("aero", "light"), {
  colors: { mutedForeground: "#3D4C5F", primaryText: "#0C4A8C" },
});

const tinted = (
  theme: Theme,
  tint: keyof ThemeColors,
  surface: keyof ThemeColors,
  opacity = 0.055,
): string =>
  compositeOver(alpha(theme.colors[tint], opacity), theme.colors[surface]);
```

Cases:

1. **The planted pre-fix Aero theme reports the tints** — `themeHighlightFailures(preFixAero)`
   contains the seven `secondary` failures in §1, each with `tint` (the tint
   role: `successText` or `destructiveText`) and `tintOpacity === 0.055`, and every ratio is below
   `contrastFloors.default.secondary`. On the pre-fix tree the array is empty.
2. **The total check tags them `highlight`** — `themeFailures(preFixAero)` has
   seven entries with `kind: "highlight"` and `tint` present (plus the code-ink
   entries the planted values already produced, if any), and no other kind is
   introduced by the change.
3. **Every shipped set passes** — iterate `shippedThemes`; `themeHighlightFailures(theme)`
   and `themeFailures(theme)` are `[]`.
4. **Aero light ships the steps** — `getPlatformRecipeTheme("aero", "light").colors`
   has `mutedForeground === "#36455A"` and `primaryText === "#0A417A"`; the
   theme still passes all checks.
5. **The checker is total over the painted surfaces** — for every shipped set,
   every `nativeHighlightPairs` role, every surface, both washes and both tints,
   the direct composition equals or clears the floor. This is the walk the
   checker performs, written without the checker, so a future edit to either
   side fails.
6. **The code-ink payload still names its fraction** — plant the pre-582 Aero
   status inks (`successText: "#0E5739"`, `destructiveText: "#8F2126"`) and
   assert every `secondary` code-ink failure has `ink === nativeInkOpacity`.
7. **The step is reported on a tint** — a theme with
   `selection: "#C9D6EAFC"` returns `step` failures with `tint` present on the
   diff tints, and no step failure on the plain tone appears without a paint
   field when the tint collapse is the cause. (The near-opaque wash collapses
   both washes on every painted surface; the assertion proves the tint arm of
   the step walk exists.)

Every expectation derives its roles and surfaces from the exported lists; only
the two planted pre-fix inks and the two new Aero values are literals.

## 5. `native-highlight-code-surface.test.ts`

The planted pre-582 theme now also trips the tint arm (its old status inks are
also diff tint roles). Keep the 582 regression exact by filtering both
assertions to code-ink rows:

- `const text = failures.filter((failure) => failure.pairClass === "secondary" && failure.ink !== undefined);`
- the `themeFailures` count at line 92 filters the same way.

Do not delete the tint failures from that theme: they are the new plan's
evidence and are covered in the new suite.

## 6. Documents

- `docs/tokens.md` *Find highlighting*, after the code-surface paragraph: a
  sentence stating that a changed diff row is painted on `bg` under a 5.5%
  add/delete tint (`nativeSyntaxTints`), so the check holds the match, the
  active match and the step on both tints as well; the Aero light evidence and
  the two moved inks. Correct the sentence that currently says the check
  measures "the document tone, and the code block's ink" — it measures the ink
  (the harder of the two for text) and both tints.
- `docs/design-system.md` find paragraph: add "and the two 5.5% diff row tints
  `nativeSyntaxTints` owns".
- `packages/tokens/README.md` find paragraph: the same sentence.
- `COMPONENTS.md` **Total theme check** row: append "Plan 649 holds the find
  highlight on the native diff's 5.5% add/delete row tint — the active match
  over those tints put Aero light `mutedForeground` at 4.437:1 and
  `primaryText` at 4.481:1 while the code-ink-only check returned `[]`; both
  inks take one designed step, every shipped set passes, and the failure names
  the tint and its fraction."
- `TODO.md`: add and tick the row under *Design tokens and theming*; change the
  section counter from `281/355` to `282/356` and keep the bar at eight filled
  cells.
- `.agents/slop/plans/README.md`: add the table row after `646` and a summary
  paragraph after `646`'s.
- `.agents/slop/rd/2026-10-19-tokens-next-649.md`: the probe, the runtime
  evidence (`diff.rs` row tint), what was not changed.

## 7. Commands and expected results

Run in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

```sh
nub exec vitest run src/native-highlight-diff-tint.test.ts src/native-highlight-code-surface.test.ts
```

Run from `packages/tokens`; expect both files green **after** the fix. Before
the fix, case 1 of the new file fails (the pre-fix theme returns `[]`) and the
582 suite still passes; record that as the both-directions proof.

```sh
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check:tests
nub run check
nub run lint
nub run test
```

Expected: clean. If another workstream's package fails for its own reason,
record the exact failure and do not claim this plan's workspace gate passed.

## 8. STOP conditions

Stop and report with evidence if:

- a shipped set other than Aero light fails the new tint walk — only the two
  named Aero light roles may move; do not move a tint or a wash to hide a
  second failure;
- importing `nativeSyntaxTints` from `native-text-check.ts` creates a runtime
  cycle (check the module graph before implementing; if it does, move the two
  tint entries and their type to `native-ink.ts` and re-export them from
  `native-text-check.ts` so the public name is unchanged);
- the two Aero values fail another check or change a documented figure the
  test derives — update the figure only through its guard, never by hand;
- adding optional fields to `HighlightFailure` breaks the public type index or
  an exact-shape assertion outside the two test files listed;
- the runtime does not paint a find highlight on a diff row (re-check
  `diff.rs` `RowContext::text` passes `highlight_set` before implementing).

## 9. Acceptance

- [x] `themeHighlightFailures` measures both washes and the step over the code
      ink and both diff row tints, with the paint named in the payload.
- [x] The planted pre-fix Aero theme reports the seven tint pairs; every shipped
      set returns `[]`.
- [x] Aero light's `mutedForeground` and `primaryText` take one designed step
      and no other shipped value moves.
- [x] The 582 code-surface suite still proves its four ink failures.
- [x] `native-highlight-diff-tint.test.ts` fails on the pre-fix tree and passes
      after it.
- [x] The documents, README, ledger row, plan index and TODO row describe the
      rule the checker enforces; the commands in §7 were run and their results
      recorded in the commit message.
