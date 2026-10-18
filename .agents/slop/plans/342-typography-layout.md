# Plan 342 — The typography layout contract

**Workstream:** playground (`apps/playground`, `packages/testing`).
**Phase:** B → C (the text/typography primitive).
**Depends on:** `100`, `110`, `120`, `140` (harness + binding), `171`
(`getPaintedHighlights`), `335` (`textOverflow`/`lineClamp`).
**Owner path boundary:** only `apps/playground` and `packages/testing`. The
`packages/primitives` consequence is a cross-team TODO.

---

## 1. Why this exists

The type scale sets `fontSize`, `fontFamily`, `fontWeight`, `lineHeight` and —
through `Text`'s `align` prop — `textAlign`
(`packages/primitives/src/core/style.ts:250`). Runtime evidence covers only
`fontSize` and `fontFamily` (the `theme-type-and-shadow` style report). Nothing
in the repo measures:

- whether `lineHeight` is exact and how a wrapped run uses it;
- whether `fontWeight` reaches the text layout or is only an authored value;
- whether `textAlign` moves glyphs at all (and, if not, what a component must do
  instead);
- how wide a `<text>` block is by default, which is what decides whether
  alignment could work.

`Text`'s documented `align` prop (`packages/primitives/docs/text.mdx:57`) is
therefore shipping unverified. Centred headings, right-aligned numbers in a
stat card and a right-aligned price column all depend on this contract.

## 2. Measured facts (this host, `TestRenderer` 1280×800, 0.10.0)

Measured with the locally built `darwin-x64` binding (ADR 0003). Glyph positions
come from `getPaintedHighlights()` (window coordinates, as in plan `171`).

| Fixture | Style | Measured |
| ------- | ----- | -------- |
| explicit line height, one line | `fontSize: 14, lineHeight: 30` | block height **30** |
| explicit line height, two wrapped lines | same, `width: 100`, `hello there world` | height **60** |
| default line box, 12 px | `fontSize: 12` | height **19.5** |
| default line box, 16 px | `fontSize: 16` | height **26** |
| default line box, 24 px | `fontSize: 24` | height **39** |
| weight, regular | `fontSize: 16, fontWeight: "400"`, run `hello weight` | word `weight` is **48.27** wide |
| weight, bold | `fontSize: 16, fontWeight: "700"` | word `weight` is **52.57** wide |
| a text block in a 200 px column | no `width` | block width **200** (fills the parent) |
| `textAlign: "center"` on the `<text>` | `width: 200` | glyph run x = **0** |
| `textAlign: "right"` on the `<text>` | `width: 200` | glyph run x = **0** |
| `textAlign: "center"` on the parent `<div>` | 200 px | glyph run x = **0** |
| `alignSelf: "center"` in a 200 px column | text, no width | block width 35 at x **82.5** (centred) |
| `alignSelf: "flex-end"` in a 200 px column | text, no width | block x **165** (right edge 200) |
| explicit `width: 60`, parent `justifyContent: "center"` | 200 px row | block x **70** |

Two rules fall out, and both need documenting:

1. **`textAlign` is a no-op in 0.10.0.** The value is accepted and authored, but
   the glyph run stays at the block's left edge, on the `<text>` and on its
   parent. Horizontal alignment must be expressed by moving the **block**:
   `alignSelf: "center"`/`"flex-end"` in a column flex, or a narrower explicit
   width inside a `justifyContent` row. `Text`'s `align` prop currently promises
   something the runtime ignores.
2. **`lineHeight` is exact and `fontWeight` reaches the layout**, so a type
   scale can rely on both; the default line box is ~1.6× the font size and is
   the only part that is font-dependent.

## 3. Files

Create:

- `apps/playground/src/scenarios/typography.tsx` — the `typography-layout`
  scenario.

Change:

- `packages/testing/src/smoke.ts` — add `"typography"` to `CAPABILITIES`.
- `apps/playground/src/scenarios/index.ts` — import, register and add
  `"typography"` to `PROBE_CAPABILITIES`.
- `COMPONENTS.md` — the `typography` capability row and the Text / typography
  inventory row (§5).
- `apps/playground/README.md` — evidence row, suite/capability counts,
  structure list.
- `TODO.md` — the new task (ticked) and the cross-team `Text align` defect.
- `.agents/slop/plans/README.md` — index row.

No change to `packages/primitives` or `packages/tokens`.

## 4. The scenario

### 4.1 View

One column, 200 px wide fixtures, theme colours:

| testId | Content |
| ------ | ------- |
| `type-line-1` | `fontSize: 14, lineHeight: 30`, run `line one` |
| `type-line-2` | same, `width: 100`, run `hello there world` |
| `type-default-12` / `-16` / `-24` | `fontSize` 12 / 16 / 24, run `size` |
| `type-weight` | a box with `highlight={{ query: "weight" }}` and two `<text>` runs: `fontWeight: "400"` and `"700"`, both `hello weight` |
| `type-align` | a 200 px box with `highlight={{ query: "hello" }}` and three `<text>` runs, all exactly `hello`, with `width: 200` and `textAlign: left` / `center` / `right` |
| `type-stretch` | a 200 px column; a `<text>` with no width, run `stretched label` |
| `type-align-self` | a 200 px column with `alignSelf: "center"` (run `centred`) and `"flex-end"` (run `right edge`) |
| `type-justify` | a 200 px row with `justifyContent: "center"` and a `<text width: 60>` |

The alignment runs use exactly `hello` so their washes can be selected by
`text === "hello"` and read in paint order; no other fixture uses that exact
string (the line-height fixtures use different text).

### 4.2 Steps

Checks (1 px tolerance unless stated):

1. `an explicit line height is exact` — `type-line-1` height 30.
2. `a wrapped run uses the line height per line` — `type-line-2` height 60.
3. `a bigger font size grows the default line box` — `type-default-24` height is
   greater than `type-default-16`, which is greater than `type-default-12`.
4. `the default line box is about 1.6x the font size` — 12 → 19.5 ± 2, 16 → 26
   ± 2, 24 → 39 ± 2 (values recorded; the tolerance keeps the check meaningful
   across a font-metric change without pretending it is exact).
5. `fontWeight reaches the text layout` — the `700` word's wash width is at
   least 2 px wider than the `400` word's, and both washes exist. Select them
   from `ctx.host.highlights()` by `text === "hello weight"` in paint order.
6. `a text block fills its parent by default` — `type-stretch` width 200.
7. `textAlign does not move the glyph run` — the three `hello` washes (paint
   order) have the same x (± 0.5). This asserts the **measured limitation**; it
   is the signal that would flip when the runtime implements alignment.
8. `alignSelf centres a text block` — the centred block's midpoint is 100 ± 1
   within its 200 px column.
9. `alignSelf flex-end puts the block at the right edge` — block right edge is
   200 ± 1.
10. `an explicit width with justifyContent centre is the other route` — block x
    = 70 ± 1.

### 4.3 Registration

`index.ts`: import next to `textScenario`, place after `textScenario`, append
`"typography"` to `PROBE_CAPABILITIES` (comment's plan list extended by `342`).
`smoke.ts`: `"typography"` at the end of `CAPABILITIES`.

## 5. Documentation

- `COMPONENTS.md` capability table: `| typography | typography-layout | verified |`.
- `COMPONENTS.md` **Text / typography** row: append the measured line-height,
  weight and alignment facts; state the `align` defect and the two working
  routes.
- `apps/playground/README.md`: evidence row + capability line + structure list;
  counts `70 → 71` scenarios, `1923 → …` checks (fill from the run).
- `TODO.md`: tick the task; add the cross-team row
  `primitives` → `Text.align` must not promise `textAlign`; implement it with
  `alignSelf`/a centring row (or document it as unsupported) and add a runtime
  test. Evidence: this plan §2.

## 6. Commands and expected results

From the worktree root:

```sh
nub run --filter playground build          # exit 0
nub apps/playground/dist/smoke/run.js --only typography-layout   # exit 0
nub apps/playground/dist/smoke/run.js      # exit 0; 71/71, `typography=verified`
nub run check                              # exit 0
nub run test                               # exit 0
nub apps/playground/dist/live/run.js       # exit 0; live stays 22/22
```

## 7. Test plan and the two-direction proof

The scenario is the test; every check reads a runtime bound or a painted wash.

- **M1 — line height ignored.** Remove `lineHeight: 30` from `type-line-1/2`.
  Expect exit `1` with `an explicit line height is exact` reporting ~22.5, and
  the wrapped height failing too.
- **M2 — weight dropped.** Change the bold run to `fontWeight: "400"`. Expect
  exit `1` with `fontWeight reaches the text layout` reporting equal widths.
- **M3 — alignment "fixed".** Swap `type-align`'s runs to `alignSelf` blocks is
  not a mutation; instead move the three `<text>` runs into a plain box and add
  a fourth fixture if needed. The concrete mutation: give the centre run
  `alignSelf: "center"` **and** keep `textAlign: "center"` — the glyphs still do
  not move, so this proves check 7 is about `textAlign`, not about the block.
  Simpler and sufficient: add `width: 60` to the centre run (block narrower) —
  check 7 still expects equal glyph x, and the mutation that *would* fail is
  `alignSelf: "center"` (M4 below).
- **M4 — glyph run moved by a block rule.** Add `alignSelf: "center"` to the
  centre alignment run. Expect exit `1` with `textAlign does not move the glyph
  run` reporting centre x ≠ left x — proving the check observes position and
  would notice the block moving.

Record the exact failing strings in §8, restore, and re-run to green.

## 8. Result (measured 2026-10-18)

`--only typography-layout`: **28 checks, exit `0`**. Full suite: **71/71
scenarios, 1951 checks**, exit `0`; `typography=verified`. Three mutation
proofs, each run separately and restored afterwards:

| Mutation | Measured failure | Exit |
| -------- | ---------------- | ---- |
| M1: drop `lineHeight: 30` | `one line uses the declared height: expected 30 ± 1, got 22.5` | 1 |
| M2: bold run → `fontWeight: "400"` | `bold is wider than regular: expected true, got false` | 1 |
| M4: centre run gains `alignSelf: "center"` | `textAlign centre does not move the glyphs: expected 0 ± 0.5, got 82.5` | 1 |

No correction to §2 was needed — the recorded numbers reproduced exactly. The
live suite is unchanged at 22/22 (geometry-only, no live scenario).

The `Text.align` defect is recorded in `TODO.md` for the `primitives`
workstream with the two working block-alignment routes.

## 9. STOP conditions

Stop and report if:

- `getPaintedHighlights()` returns no wash for a plain `<text>` under a query
  (the measurement route is broken; do not fall back to a screenshot);
- the alignment checks show **different** x per `textAlign` on the first run
  (the runtime implements alignment after all — record the new contract and
  stop before writing limitation wording);
- the measured line heights differ from §2 by more than 2 px on a second run;
- a fix requires editing `packages/primitives` or `packages/tokens` — record a
  cross-team TODO instead.

## 10. Acceptance

- `typography-layout` green; full suite `71/71`, exit `0`;
  `typography=verified`.
- The M-mutations each exit `1` as documented, and the restored tree is green.
- `nub run check`, `nub run lint`, `nub run test` pass; live stays `22/22`.
- Docs, inventory, TODO and the plan index updated; committed and pushed.
