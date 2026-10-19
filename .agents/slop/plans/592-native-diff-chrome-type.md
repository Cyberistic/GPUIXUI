# 592 — The native diff chrome must fit the type the runtime paints

**Phase:** F (contract completeness)
**Depends on:** 569 (the native text bridge), 572 (the native text metrics),
585 (the two runtime-only metrics), 588 (the chrome washes), 591 (the row tint)
**Owner:** `tokens-theme`
**Paths:** `packages/tokens/src/native-text.ts`,
`packages/tokens/src/native-text-chrome.test.ts` (new), `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`,
`.agents/slop/plans/README.md`

## Why

The pinned runtime lays out a diff's own chrome at **fixed font sizes** that the
theme cannot change, and the heights `nativeTextTheme` derives can be smaller
than those sizes:

- `packages/native/src/custom_elements/diff.rs:731-732` paints the meta line at
  **10.5px**;
- `:776` and `:548` paint the gutter numbers and the hunk header at **11px**;
- `:527` paints the notice at **11px**;
- `:673` and `:684` paint the file path at **12px** and the two counts at
  **11px**;
- none of those elements sets a line height, so GPUI applies its default
  golden-ratio line box (`TextStyle::default`, `gpui-ce` `style.rs:719`, and
  `line_height_in_pixels` rounds): **17px** for 10.5, **18px** for 11 and
  **19px** for 12.

`nativeTextTheme` derives four boxes from theme roles:

- `diffLineHeight` from the `codeBlock` line;
- `diffFileHeaderHeight` from the `label` line plus two `spacing.md`;
- `diffHunkHeaderHeight` and `diffNoticeHeight` from the `caption` line plus
  two `spacing.xs` / `spacing["2xs"]`;
- `diffMarkerWidth` from `spacing["2xl"]`.

A compact theme that passes all nine checks clips every one of those paints. A
probe on the identity light theme with `caption`/`label`/`codeBlock` at 8/8, the
whole `spacing` scale at `0` and `iconSize.xs/sm` at 6/8 returns `[]` from
`themeFailures` while `nativeTextTheme` resolves:

| Metric | Current | Runtime needs |
| ------ | ------- | ------------- |
| `diffLineHeight` | **8** | 18 (11px gutter) |
| `diffFileHeaderHeight` | **8** | 19 (12px path) |
| `diffHunkHeaderHeight` | **8** | 18 (11px header) |
| `diffNoticeHeight` | **8** | 18 (11px notice) |
| `diffMarkerWidth` | **0** | one em (8px `diffTextSize`) |

The numbers are the runtime's; the theme is a valid compact style, not a
mistake. The bridge must floor each box at the paint it holds.

## What to change

### 1. `packages/tokens/src/native-text.ts`

Add two public constants beside `nativeTextSurfaces`:

```ts
/**
 * The font sizes the pinned runtime paints its own diff chrome at, in pixels.
 * The theme cannot change them, so the derived boxes in {@link NativeTextMetrics}
 * must hold at least their line boxes. Evidence: `diff.rs` lines 527, 548, 673,
 * 684, 731 and 776.
 */
export const nativeTextChrome = {
  /** The diff meta line. */
  metaText: 10.5,
  /** The gutter numbers, a hunk header, a notice and the file-header counts. */
  chromeText: 11,
  /** The diff file path. */
  filePathText: 12,
} as const;

/** The shape of {@link nativeTextChrome}. */
export type NativeTextChrome = typeof nativeTextChrome;

/**
 * The line-box ratio GPUI gives text with no explicit line height — its
 * default `phi()`, the golden ratio. `line_height_in_pixels` rounds the product
 * to whole pixels.
 */
export const nativeTextLineRatio = 1.618034;
```

Add a module-local helper beside `scaledMetric`:

```ts
/** The rounded line box GPUI gives a fixed chrome size. */
const chromeLine = (size: number): number =>
  Math.round(size * nativeTextLineRatio);
```

Change `metricsOf`'s four boxes and the marker column:

```ts
diffLineHeight: Math.max(codeBlock.lineHeight, chromeLine(nativeTextChrome.chromeText)),
diffFileHeaderHeight: Math.max(
  label.lineHeight + 2 * theme.spacing.md,
  chromeLine(nativeTextChrome.filePathText),
),
diffHunkHeaderHeight: Math.max(
  caption.lineHeight + 2 * theme.spacing.xs,
  chromeLine(nativeTextChrome.chromeText),
),
diffNoticeHeight: Math.max(
  caption.lineHeight + 2 * theme.spacing["2xs"],
  chromeLine(nativeTextChrome.chromeText),
),
...
diffMarkerWidth: Math.max(theme.spacing["2xl"], codeBlock.fontSize),
```

Keep every other metric unchanged. `diffLineHeight` also holds the 10.5px meta
line, whose 17px box is below the 18px gutter floor. The marker is one glyph of
the code role, so one em always holds it.

Update the `NativeTextMetrics` JSDoc: the four diff boxes and the marker column
are **floored** at the runtime's chrome line boxes and one code em, so a compact
theme cannot clip a number, a path, a hunk header, a notice or a marker.

### 2. `packages/tokens/src/native-text-chrome.test.ts` (new)

State the bug in the header: the runtime paints fixed 10.5/11/12px diff chrome,
the derived heights followed the theme's own roles, and a compact theme that
passes every check resolved 8px/0px boxes.

Build the compact theme once:

```ts
const tinySpacing = Object.fromEntries(
  Object.keys(spacing).map((step) => [step, 0]),
) as typeof spacing;

const compact = extendTheme(getTheme("light"), {
  typography: {
    caption: { fontSize: 8, lineHeight: 8 },
    label: { fontSize: 8, lineHeight: 8 },
    codeBlock: { fontSize: 8, lineHeight: 8 },
  },
  spacing: tinySpacing,
  iconSize: { xs: 6, sm: 8 },
});
```

Cases:

1. **The compact theme is valid.** `themeFailures(compact)` is `[]`, and the
   authored formulas it would have shipped (`label.lineHeight + 2 * spacing.md`,
   …) are all `8`, while `nativeTextChrome` resolves 19/18/18/18 and the marker
   is `0`. This is the defect, stated in the test's own terms.
2. **The bridge holds the paint.** `nativeTextTheme(compact).metrics` has
   `diffFileHeaderHeight === 19`, `diffLineHeight === 18`,
   `diffHunkHeaderHeight === 18`, `diffNoticeHeight === 18` and
   `diffMarkerWidth === 8`. Each is derived here from `nativeTextChrome` and
   `nativeTextLineRatio`, not retyped.
3. **Every shipped set keeps its authored box.** For every `shippedThemes`
   entry, assert each of the four heights equals `Math.max(authored, floor)` and
   the marker equals `Math.max(spacing["2xl"], codeBlock.fontSize)`; also assert
   the authored box is what ships today (no shipped set is floored) — the
   shipped minimums are line 18, file 34, hunk 24, notice 20 and marker 24, all
   at or above their floors, so no pixel moves.
4. **The marker column holds one glyph.** For the compact theme, assert
   `diffMarkerWidth >= nativeTextTheme(compact).metrics.diffTextSize`.
5. **The documents name the owner.** `docs/tokens.md` contains
   `nativeTextChrome`, `nativeTextLineRatio` and the three fixed sizes; the
   README names the floor rule. Read the files with `node:fs`, as `docs.test.ts`
   does (documentation readers, not runtime code).

### 3. `docs/tokens.md`

In the native-text metrics paragraph (the one starting "The metrics come from
the theme's own scales"):

- state that the runtime fixes its diff chrome at 10.5px (meta), 11px (gutter,
  hunk header, notice, file-header counts) and 12px (file path), each on GPUI's
  default **golden-ratio** line box;
- publish `nativeTextChrome` (the three sizes) and `nativeTextLineRatio`, and
  say the four derived boxes are floored at those line boxes (19/18/18/18) and
  the marker column at one code em, because a compact theme otherwise clips
  them;
- quote the probe: the compact theme above passes `themeFailures` and resolved
  **8px** for all four boxes and **0px** for the marker before the floor.

Add `NativeTextChrome` to the alphabetical `## Types` index and make sure the
two value names appear (the namespace-wide value guard reads the page).

### 4. `docs/design-system.md`

In the native-text paragraph (after the two runtime-only metrics sentence), say
the runtime's diff chrome is fixed type, not theme type, so the derived boxes
are floored at its golden-ratio line boxes and the marker at one em; a compact
theme changes the body and the padding, never the size of a line number or a
file path.

### 5. `packages/tokens/README.md`

Add one sentence beside the `NativeTextMetrics` paragraph: the runtime's diff
chrome is fixed at 10.5/11/12px, so the four boxes are floored at its line boxes
(`nativeTextChrome`, `nativeTextLineRatio`) and the marker at one code em; the
compact probe measured 8px/0px before the floor.

### 6. `COMPONENTS.md`, `TODO.md`, plan index

- Append one sentence to the **Design tokens** row: plan 592 floors the native
  diff boxes at the runtime's fixed chrome type and the marker at one em.
- Add one ticked TODO row with the compact probe's 8px/0px figures and the five
  resolved values; keep the progress bar current.
- Add plan 592 to `.agents/slop/plans/README.md` after 591 with status `done`,
  and a narrative paragraph after 591's.

## Commands and expected results

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `nub run --filter @gpuixui/tokens test` → green (5,809 + the new cases).
3. `nub run check` → exit 0.
4. `nub run lint` → exit 0.
5. `nub run test` → exit 0.

Both directions: with the `chromeLine` floors removed, case 1 and case 2 fail
(the compact theme returns 8/0); with them restored, every case passes and no
shipped box moves.

## STOP conditions

- `themeFailures(compact)` is non-empty — the probe theme is not a valid style;
  adjust it (the icon/line bounds are the only tight ones) or report rather than
  weakening a check.
- Any shipped box changes — the floors are meant to be below every shipped
  value; re-measure and do not move a shipped metric.
- A docs guard cannot derive a figure from `nativeTextChrome`,
  `nativeTextLineRatio` and the shipped themes.
- The runtime evidence does not match 10.5/11/12 or the golden-ratio default —
  stop and re-read the pinned source before changing a number.

## Acceptance

- `nativeTextChrome` and `nativeTextLineRatio` publish the runtime's fixed diff
  chrome type and line ratio.
- `nativeTextTheme` floors `diffLineHeight`, `diffFileHeaderHeight`,
  `diffHunkHeaderHeight`, `diffNoticeHeight` at the runtime's line boxes and
  `diffMarkerWidth` at one code em.
- The compact theme that passes `themeFailures` resolves 19/18/18/18/8 instead
  of 8/8/8/8/0, and every shipped box is unchanged.
- The reference, design system, README and ledger name the floor and the
  evidence.
- `nub run check`, `nub run lint` and `nub run test` pass.

## Outcome

Landed on `agent/tokens-theme`. `nativeTextChrome` publishes the runtime's fixed
diff type sizes (10.5px meta, 11px gutter/hunk/notice/counts, 12px path) and
`nativeTextLineRatio` its golden-ratio line box; `nativeTextTheme` floors the
four diff boxes at those lines and the marker column at one code em. The compact
theme — `caption`/`label`/`codeBlock` at 8/8, the spacing scale at `0`,
`iconSize.xs/sm` at 6/8 — still returns `[]` from `themeFailures` and now
resolves **19 / 18 / 18 / 18** and an **8px** marker instead of
**8 / 8 / 8 / 8** and **0**. No shipped metric moves: the shipped minimums are
line 18, file 34, hunk 24, notice 20 and marker 24, all above their floors. The
reference, design system, README and ledger name the rule. The suite grows by
four cases (5,812 tests). Both directions were verified: removing the floors
fails the compact-box case, and the document case failed before the pages were
updated. `nub run check`, `nub run lint` and `nub run test` pass.
