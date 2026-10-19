# 607 — The find wash's corner is the theme's

**Workstream:** tokens-theme · **Phase:** F · **Depends on:** 573, 581, 582, 590
· **Status:** ready

## 1. The defect

The pinned runtime's `HighlightSpec` has one shape field:

```ts
/** Corner radius of the wash. Defaults to 2. */
radius?: number;
```

(`@gpuix/native@0.10.0`, `dist/host.d.ts`, `HighlightSpec`). `nativeHighlight(theme)`
returns `color` and `activeColor` and nothing else, so every find match in the
library paints with the runtime's **2px** literal. That literal is not a step in
the theme's radius scale (`0, 4, 6, 8, 12, full`), and it is the last painted
corner in the library the theme cannot own:

| Painted corner | Owner |
| -------------- | ----- |
| cards, controls, dialogs, toast | `theme.radius.*` through the component |
| inline code quad | `mdInlineCodeRadius` = `radius.sm` (plan 569) |
| fenced code block | `mdCodeRadius` = `radius.lg` |
| markdown table / inline chrome | the `NativeTextMetrics` bridge |
| **find match wash** | **the runtime's 2px literal** |

The consequence is concrete: a consumer who copies a platform style and sets
`radius.sm: 0` for square chrome still gets a 2px rounded match wash, and the
Windows variant — whose `sm` already is 2 — cannot be distinguished from a
brand that asked for another small step. The bridge is documented as the one
place a native document's shape comes from (`nativeTextTheme`), and the wash is
the one shape that ignores it.

`nativeHighlight` must return the wash's corner from the theme's inline-mark
step, `radius.sm` — the same step inline code already uses.

**This plan moves no colour, pair, floor, metric, contract count or check.** It
does change one shipped pixel: identity, macOS and Linux ship `radius.sm = 4`,
so their match wash becomes 4px; Windows and the XP/Aero recipes ship `sm = 2`,
so their wash keeps the runtime's current corner. This is the theming contract,
not a palette edit: the value is read from the theme, so a copied style owns it.

Evidence for the change (run from the worktree root):

```
grep -n "radius?:" -B2 -A1 \
  .agents/slop/scratch/gpuix-release/node_modules/@gpuix/native/dist/host.d.ts
# or the same file in any worktree that has @gpuix/native@0.10.0 installed:
#   "Corner radius of the wash. Defaults to 2."
grep -rn "radius" packages/tokens/src/highlight.ts
# → no match before this plan: the bridge never sets the field
```

## 2. Exact files and changes

### 2.1 `packages/tokens/src/highlight.ts`

In `interface NativeHighlight`, add after `activeColor`:

```ts
  /**
   * The wash's corner radius: the theme's inline-mark step, `radius.sm`, the
   * same step inline code uses. The runtime defaults to 2px, a literal no
   * radius scale owns, so a copied platform style could not square or round a
   * find match; `radius.sm` is 0 in a square theme and 2 in the Windows style.
   */
  readonly radius: number;
```

In `nativeHighlight`, return it beside the two colours:

```ts
  return {
    color,
    activeColor: alpha(
      color,
      Math.min(1, ownAlpha(color) + nativeHighlightStep),
    ),
    radius: theme.radius.sm,
  };
```

Extend the function's JSDoc paragraph, after the sentence that describes
`activeColor`, with one sentence:

> The wash's corner is `theme.radius.sm`, the inline-mark step inline code
> uses: the runtime's 2px default is a literal no theme owns, so a square
> copied style paints a square match and the Windows style keeps its 2px corner.

No new import: `Theme` already carries `radius`.

### 2.2 `packages/tokens/src/native-highlight.test.ts`

1. Update the existing opaque equality case (currently `toEqual({ color,
   activeColor })`) to include `radius: lightTheme.radius.sm`.
2. Add one case, "owns the wash's corner through the theme's inline radius"
   (place it after the "returns the selection wash…" case):
   - every `shippedThemes` entry: `nativeHighlight(theme).radius` equals
     `theme.radius.sm` (label with `theme.name`);
   - `getTheme("light")` measures 4 and `getTheme("dark")` measures 4 — the
     shipped identity step, and **not** the runtime's 2;
   - `extendTheme(lightTheme, { radius: { sm: 0 } })` returns `0`, so a square
     theme paints a square wash;
   - `extendTheme(lightTheme, { radius: { sm: 12 } })` returns `12`, so the
     field is not a second literal;
   - `platformStyles.win32`'s resolved theme (`getPlatformTheme("win32",
     "light")`) returns `2`, which is the shipped Windows step and the
     runtime's old default — the value follows the style, not the plan.
3. Extend the "runs the example" case with
   `expect(findBar.highlight.radius).toBe(lightTheme.radius.sm)`.
4. Add one docs case, "names the wash's corner in both documents":
   - read `docs/tokens.md` and `docs/design-system.md` (the file already imports
     `readFileSync` and reads `docs/tokens.md` in another case);
   - require the phrase `inline-mark radius` in `docs/tokens.md` and the phrase
     `radius.sm` in both files inside their find-highlight paragraphs — assert
     the exact sentence fragment the plan adds, so a rewrite that drops the
     ownership fails;
   - no figure is asserted: this is a shape, not a measured pair.

The imports the new cases need (`extendTheme`, `getTheme`, `lightTheme`) are
already present at the top of the file; add `getPlatformTheme` and
`platformStyles` only if the Windows case is kept (they are both public).

### 2.3 `docs/tokens.md`

- **Types table**: replace the `NativeHighlight` row's description with
  “The `highlight` prop a native find bar paints: the match and active-match
  washes and the theme's inline-mark corner (`radius.sm`).”
- **Find highlighting** section, after the paragraph that describes the two
  washes: add one sentence — “The wash's corner is the theme's inline-mark
  radius, `radius.sm` (`nativeHighlight` returns it as `radius`), so a square
  copied style paints a square match and the Windows variant keeps its 2px
  corner; the runtime's own 2px default is a literal no radius scale owns.”
  Do not change any ratio, count or plan reference in that section.

### 2.4 `docs/design-system.md`

In the find-highlighting paragraph (§9, after the sentence that names
`nativeHighlight(theme)`), add: “Its corner is the theme's inline-mark step,
`radius.sm`, so a square theme paints a square match.” No figure moves.

### 2.5 `packages/tokens/README.md`

In the find-bar paragraph (the one starting “A find bar passes
`nativeHighlight(theme)`”), add after the washes sentence: “the returned
`radius` is the theme's inline-mark corner (`radius.sm`).”

### 2.6 `COMPONENTS.md`

In the **Design tokens** row, append one clause after the `radius`/shape
sentence: “a find match's corner is the theme's inline-mark step
(`nativeHighlight(theme).radius`, plan 607).” Touch no other row.

### 2.7 `TODO.md`

Add a ticked row to the tokens-theme section, after the plan-605 row:

> `[x]` Own the find wash's corner — GPUix 0.10.0's `HighlightSpec` defaults
> `radius` to 2px and `nativeHighlight` never set it, so a square copied style
> still painted a rounded match while every check returned `[]`;
> `nativeHighlight(theme).radius` is the theme's inline-mark step (`radius.sm`,
> the same step inline code uses), the docs and README name it, and no colour,
> pair, floor or metric moves (plan 607)

### 2.8 `.agents/slop/plans/README.md`

Add the plan row after 605:

```
| [607](./607-highlight-radius.md) | The find wash's corner is the theme's | F | 573, 581, 582, 590 | done |
```

Do not renumber any existing row.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. `nub run --filter @gpuixui/tokens test`
   → 157 files and every test green. Expected failure before the implementation:
   the new case reads `nativeHighlight(theme).radius`, which does not exist, so
   the suite does not compile; after adding the interface field but before the
   return, the equality and derivation cases fail.
2. `nub run check`
   → `check:tests`, lint, format and type-check green. The docs value coverage,
   public-type index, snippet and example guards are part of this run.
3. `nub run lint`
4. `nub run test` (the workspace gate for the commit).

## 4. STOP conditions

- **STOP** if a shipped theme has no `radius.sm` or it is not a finite number.
  That means the radius group moved; report the set — do not invent a value.
- **STOP** if any contrast, colour, opacity, typeface, highlight, native-text,
  hierarchy, direction or metric check starts returning a failure. This plan
  changes one shape field; a check failure means something else drifted.
- **STOP** if `check:tests` rejects a new case as unable to fail. The equality
  and derivation cases compare the helper with the theme's own `radius.sm`;
  they fail when the field is a literal. Do not add `check-tests-ok`.
- **STOP** if the docs guard would need a figure, a count or a floor to be
  edited. Nothing numeric moves here.
- **DO NOT** claim the 4px identity corner was seen in the native runtime. The
  value is covered by the suite; a native visual check is the playground's
  cross-team row (the theme gallery has no find bar today). If the commit body
  mentions native verification, it must say it was not run.

## 5. Test plan — both directions

The new cases must fail when the field is wrong:

1. Return `radius: 2` from `nativeHighlight` → the shipped-theme derivation
   case fails on the identity/macOS/Linux sets (4), and the equality case fails.
2. Omit `radius` from the return → the equality case fails and the new field is
   `undefined`.
3. Return `radius: theme.radius.md` → the derivation case fails (6 vs 4).
4. Remove the “inline-mark radius” sentence from `docs/tokens.md` → the docs
   case fails.
5. Remove the `radius.sm` clause from the design system → the docs case fails.
6. Remove `radius` from the README → the docs case fails (if the case reads the
   README; otherwise the README is a prose surface held only by review — state
   in the commit which documents are covered).

Manual both-directions check (the repo's `verify-two-directions.sh` is still
jj-based, see the harness TODO): make change 1, run
`nub run --filter @gpuixui/tokens test`, observe the derivation case failure,
restore; make change 4, run the same suite, observe the docs case failure,
restore. State both runs in the commit body or the audit note.

## 6. Acceptance

- `NativeHighlight` has a documented `radius`; `nativeHighlight(theme)` returns
  `theme.radius.sm`.
- The suite derives the field from every shipped theme and proves it follows a
  square and a widened copied step; the opaque equality case includes it.
- `docs/tokens.md` (type row + Find highlighting), `docs/design-system.md` and
  the package README name the corner; `COMPONENTS.md` and `TODO.md` record it.
- No colour, pair, floor, contract count, metric or check changes; the only
  shipped paint change is the identity/macOS/Linux match corner (2px → 4px),
  and the plan says so.
- `nub run check`, `nub run lint` and `nub run test` pass.
