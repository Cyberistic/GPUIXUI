# 819 — Two catalogue passages state figures beside a derived claim

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `344`, `382`,
`504`, `513`, `620`, `624`, `627`, `645`, `667`, `818`.

## 1. The defect

Both passages are *half* derived, so the page looks owned while the numbers a
reader compares are prose.

**A. §*Text selection*, the accent wash on a filled surface.** The line the
`selectionOnFill` family exists for:

> The accent-tinted wash *is* the accent, so on a `primary` fill it composites to
> **1.000:1** — an invisible highlight … It is just as lost on a solid status
> chip: identity light `success` measures **1.046:1**, macOS light 1.026:1, Linux
> light 1.027:1, Windows light `info` 1.011:1 and Windows 7 light 1.011:1 …

`selection-on-fill.test.ts` (plan `504`) holds the *set* — the exact list of
shipped fills whose accent wash measures under the `1.05:1` surface floor — and
that list is the right guard for "which compositions are affected". It says
nothing about the six figures the sentence prints. A palette edit that keeps a
composition in the list but moves its ratio (1.046 → 1.049) leaves the page
quoting a number the palette no longer produces, and nothing fails.

**B. §*Numeric metrics*, the chip's own clearance.**

> At the shipped metrics the query row needs 80px, the chip 102px, and the
> shipped 200px field clears the larger, while the chip's own 44px bound passes
> at 1.82 times …

`docs.test.ts` derives the first half and stops at "clears the larger". The
clause after the semicolon — the chip's `44px` bound and the `1.82×` a theme
compares its `chipMinWidth` against — is unowned. `chip-chrome-fit.test.ts`
proves the *rule* reads the theme's metrics and that the shipped bound is 44, but
it never reads the page, so a caption size, a spacing step or a `chipMinWidth`
edit can leave the page's `44px` and `1.82×` stale while every gate passes.

Measured on this tree, before the fix: replacing `1.046`/`1.026`/`1.027`/`1.011`
(twice) and `1.000` in passage A, and `44px`/`1.82` in passage B, left **220
files / 7130 tests** green.

No colour, pair, floor, metric, role or shipped theme moves: every figure is
correct today.

## 2. What the package produces today

```
identity dark `primary`                 accent wash 1.000:1   surface floor 1.05
identity light `success`                           1.046:1
Light · macOS `success`                            1.026:1
Light · Linux `success`                            1.027:1
Light · Windows `info`                             1.011:1
Light · Windows 7 (aero) `info`                    1.011:1

chip bound 2 × spacing.sm + spacing.xs + caption.fontSize + fieldAdornmentSize
          = 44px at the shipped metrics;  chipMinWidth 80 / 44 = 1.82
```

The wash figure is `contrastRatio(compositeOver(selection, fill), fill)` — the
same composition `selection-on-fill.test.ts` filters on.

## 3. Decision

1. Add `packages/tokens/src/beside-derived-figures.test.ts`, which derives all
   eight figures from the shipped themes and holds both sentences with the
   derived values.
2. State the owner in the catalogue's §*Verification* paragraph list.
3. Change no prose value.
4. Do not duplicate the *set* assertions `selection-on-fill.test.ts` owns: this
   suite reads the figures the list is summarised as, and the premise
   (`figure < surface floor`).

## 4. Files to change

1. **create** `packages/tokens/src/beside-derived-figures.test.ts`.
2. `docs/tokens.md` — one sentence in §*Verification* naming the new owner; no
   figure changes.
3. `TODO.md` — a ticked row and the section counter.
4. `.agents/slop/plans/README.md` — the plan row and the closing paragraph.

No token value, pair, floor, metric, role or shipped theme changes.

## 5. Step 1 — `packages/tokens/src/beside-derived-figures.test.ts`

Header states the bug: both passages are half derived, so the list membership and
the first half of the fixed-surface sentence are held while the eight figures
beside them are prose; mutating all eight leaves the suite green.

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from
`vitest`; `alpha` from `./color.js`; `compositeOver`, `contrastFloors`,
`contrastRatio` from `./contrast.js`; `getPlatformRecipeTheme` from
`./platform-recipes.js`; `getPlatformTheme`, `getTheme`, `type Theme` from
`./theme.js`.

Helpers:

```ts
const markdown = (): string =>
  readFileSync(new URL("../../../docs/tokens.md", import.meta.url), "utf8")
    .replace(/\s+/g, " ");

/** The accent wash composited over a fill, held to the fill it erases. */
const wash = (theme: Theme, fill: "primary" | "info" | "success"): string =>
  contrastRatio(
    compositeOver(theme.colors.selection, theme.colors[fill]),
    theme.colors[fill],
  ).toFixed(3);

/** The chip's own bound: two insets, a caption glyph, the gap, the remove control. */
const chipBound = (theme: Theme): number =>
  2 * theme.spacing.sm +
  theme.spacing.xs +
  theme.typography.caption.fontSize +
  theme.dimensions.fieldAdornmentSize;
```

Cases:

1. **the accent wash's six figures** — each named set derives its documented
   figure (identity dark `primary` `1.000`, identity light `success` `1.046`,
   macOS light `success` `1.026`, Linux light `success` `1.027`, Windows light
   `info` `1.011`, Aero light `info` `1.011`), and every one is below
   `contrastFloors[level].surface` — the premise the sentence states.
2. **the catalogue states them** — `markdown()` contains the chip sentence built
   from the five derived figures, and the `primary` clause built from the
   identity dark figure.
3. **the chip's clearance** — `chipBound(getTheme("light"))` is `44`, the page's
   `44px` and `1.82` are derived (`(chipMinWidth / bound).toFixed(2)`), and the
   shipped `chipMinWidth` is at or above the bound.
4. **the readers can fail** — a theme whose `chipMinWidth` is halved derives a
   different multiple, and a theme whose `selection` is opaque derives `1.000`
   on the `success` fill (so the figure is a measurement, not a constant).

Deliberately not asserted: which fills are affected (`selection-on-fill.test.ts`,
plan `504`), the first half of the fixed-surface sentence (`docs.test.ts`, plan
`620`), and the chip rule's own cases (`chip-chrome-fit.test.ts`, plan `667`).

## 6. Test plan

```sh
nub run --filter @gpuixui/tokens test src/beside-derived-figures.test.ts
```

Expected after: one file, four cases green.

**Prove every case in both directions** (apply, run the file, revert — one at a
time):

1. The eight-figure mutation from §1: case 2 fails on both sentences.
2. `selection` on macOS light at `#0071E351` (one byte stronger): case 1 fails on
   the derived figure and case 2 on its sentence.
3. `chipMinWidth` at `160`: case 3 fails on the derived multiple.
4. `typography.caption.fontSize` at `13`: case 3 fails on the derived bound.
5. Reflow either passage: still passes — `markdown()` normalises whitespace.

Then the gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

Expected: **222** test files and **7138** tests green (221 / 7134 before).

## 7. STOP conditions

- Stop if a colour, role, pair, floor, metric or shipped theme has to move.
- Stop if a sentence must be reworded to be assertable: add the assertion the
  wording supports, or record the gap in `TODO.md`.
- Do not re-derive the set of affected fills: `selection-on-fill.test.ts` owns it.
- Do not touch `docs.test.ts`, `figures.ts`, `selection-on-fill.test.ts` or
  `chip-chrome-fit.test.ts`.
- Do not replace a derived figure with a literal, and no `any` or cast.

## 8. Acceptance

- `beside-derived-figures.test.ts` derives all eight figures and holds both
  passages.
- Each §6 mutation fails the file, and the tree is restored afterwards.
- `nub run --filter @gpuixui/tokens test` is green (222 files, 7138 tests),
  `nub run check`, `nub run lint` and `nub run test` clean.
- `TODO.md` ticks the row and keeps the section counter current; the plan index
  lists `819`; the catalogue names the new owner.

## 9. Execution record

Executed on 2026-10-21 on `agent/tokens-theme`.

- The defect reproduced as §1 states before the suite existed: the eight figures
  mutated (`1.001`, `1.047`, `1.027`, `1.028`, `1.012`, `1.012`, `45px`, `1.83`)
  left the package suite green at **221 files / 7134 tests**.
- `beside-derived-figures.test.ts` adds four cases. The wash figures are measured
  through `compositeOver`/`contrastRatio`; the chip clearance derives from the
  theme's own spacing, caption and adornment metrics; both sentences are read
  through a `holds` helper that prints the sentence rather than the whole page on
  failure.
- Every §6 mutation was applied alone, the file run and the tree restored: the
  two sentence mutations failed case 2 and case 3; `chipMinWidth` at `160` failed
  case 3; `caption` at 13/18 failed cases 3 and 4; a macOS light `selection` one
  byte stronger failed cases 1 and 2; the restored tree passed.
- `nub run --filter @gpuixui/tokens test` → **222 files / 7138 tests** green;
  `nub run check`, `nub run lint` and `nub run test` clean.
- No prose figure changed, because every figure was already correct. **No native
  scenario was run**: no runtime code or token value moves, and this worktree has
  no `apps/playground/dist` build (`apps/playground/dist/smoke/run.js` is absent —
  the playground build is blocked by `BLOCKERS.md` B1, another workstream's task).
