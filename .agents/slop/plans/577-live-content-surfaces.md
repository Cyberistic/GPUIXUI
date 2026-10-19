# 577 — The content surfaces in a real window: svg, img, diff, canvas and markdown

**Owner:** playground workstream (`apps/playground`, `packages/testing`).
**Depends on:** `161` (`native-surfaces`), `181` (`markdown-surface`), `189`/`190`
(the live window), `191` (live selection), `197` (the live observation surface),
`522`/`532`/`535` (recent live twins and their measured box rules).
**Phase:** F — the last **core** capability (`content`) whose only evidence is
the offscreen `TestRenderer`.

## 1. Why

`content` is one of the Phase B core capabilities in
`apps/playground/src/scenarios/index.ts`, and it is the only core capability
with **no live twin**. `native-surfaces` (plan `161`) and `markdown-surface`
(plan `181`) are the two scenarios behind it, and every claim they make was
measured in the offscreen `TestRenderer`:

- a sourced `<svg>` paints, an `<img>` paints a fallback when a source is
  missing or undecodable, a valid data URL and a ref-uploaded bitmap lay out;
- `<diff>` paints its patch text;
- `<canvas>` is retained but renders `gpui::Empty` — no bounds, and its
  children are dropped from the paint log;
- `<markdown>` renders GFM blocks as addressable text, a coordinate click on a
  link fires `onLinkClick`, a drag across the document selects text, and React
  children are retained but unpainted.

A real window has differed from the `TestRenderer` on exactly this kind of
claim before: a `<virtual-list>` has no painted bounds live (plans `532`, `559`),
a scroller's own box moves with its scroll (`556`), and the live tree has no
`style` (`197`). The docs site is also about to publish native screenshots of
image, diff and markdown surfaces; without a live twin those screens would rest
on an offscreen verdict.

This plan adds two live twins that reuse the existing views unchanged:

| Live id | View | Proves in the real `1100 × 720` window |
| ------- | ---- | ------------------------------------- |
| `live-content` | `nativeSurfacesScenario.view` | the icon's painted box, the `<img>` fallback text for a missing/invalid source, a valid data URL and a ref-uploaded bitmap, the diff's width and painted patch lines, and `<canvas>`'s retained-but-unpainted state |
| `live-markdown` | `markdownScenario.view` | GFM blocks paint, a real coordinate click fires `onLinkClick`, prose does not, a drag across the document selects its text, and React children stay out of the paint |

Only what a window can answer is asserted live: painted boxes, `paintedText`,
`text()` for retained content, `selectText` and `click`. Colour, the style
report and the accessibility dump stay headless for the measured reason in plan
`197` (`GpuixRenderer` has neither a style nor an a11y method).

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `nativeSurfacesScenario` and `markdownScenario`; add `liveContent` and `liveMarkdown`; register both after `liveLayers` (both are `capability: "content"`). No view change. |
| `apps/playground/README.md` | a `### The content surfaces in a real window (plan 577)` section with a two-row table, and the two ids in the live-evidence list. |
| `COMPONENTS.md` | the `Text / typography`, `Icons`, `Markdown / rich text rendering` and `Diff viewer` rows cite the new live ids where they assert bounds/paint; record the live `<canvas>` result in the **Not provided** note. Do not invent a colour claim. |
| `TODO.md` | claim this task before implementing; tick it with the measured counts, the focused ids run, and the live-registry note. |
| `.agents/slop/plans/README.md` | index row for this plan and one sentence in the playground narrative. |

No `packages/testing` change is expected: `text`, `paintedText`, `bounds`,
`click`, `selectText` and `waitFor` already exist. **If** a needed verb is
missing, STOP — do not widen the async host in this plan; record the gap in
§8 and open a follow-up task.

No production component change: every surface is a host element.

## 3. Implementation

### 3.1 `live-content`

Add to `apps/playground/src/live/scenarios.tsx`, near the other host-element
twins:

```ts
const liveContent: LiveScenario = {
  id: "live-content",
  title: "Live content surfaces: svg, img, diff and the canvas trap",
  capability: "content",
  view: nativeSurfacesScenario.view,
  ready: "surface-svg",
  steps: (ctx) => Effect.gen(function* () { /* §3.1 steps */ }),
};
```

Steps, each with `settle` where a read follows a paint:

1. `boxOf(ctx, "surface-svg")`; expect `width ≈ 48` and `height ≈ 48` (±1 —
   the live box excludes borders only; this element declares none).
2. `boxOf(ctx, "surface-img-empty")`; expect the no-source fallback to be
   **painted** and its text to include `img: no src`. The live box is
   expected to be `96 × 64` or the headless `94 × 62`; see the STOP rule in
   §4 rather than guessing. Assert `paintedText()` contains `img: no src`
   exactly once.
3. `boxOf(ctx, "surface-img-invalid")`; expect `paintedText()` to contain
   `img: load failed` exactly once.
4. `boxOf(ctx, "surface-img-data")`; expect `64 × 64` (±1) and that
   `img: load failed` is **still** exactly once (the valid data URL adds no
   fallback).
5. `boxOf(ctx, "surface-img-live")`; expect `32 × 32` (±1); the ref upload adds
   no fallback (still exactly one `img: load failed`).
6. `boxOf(ctx, "surface-diff")`; expect `width ≈ 640` (±1) and a painted height
   `> 0`; `paintedText()` contains `example.ts`, `@@ -1,2 +1,2 @@`,
   `const added = 1` and `const removed = 1`.
7. `<canvas>`: `ctx.host.bounds("surface-canvas")` is `null` (the live host maps
   the protocol's `NotFound` "no painted bounds" answer to `null` — plan `301`);
   `paintedText()` does **not** contain `canvas-child`.
8. `textOf(ctx, "surface-canvas")` **if it is non-null**: expect it to contain
   `canvas-child` (the retained subtree). If the live `text` verb returns
   `null` for a retained-but-unpainted node, skip this one check and record the
   measured difference in §8 — the offscreen retained-tree claim stays headless
   and no live claim is invented.

Expected: **13–14 checks** (13 without step 8). Record the measured number.

### 3.2 `live-markdown`

```ts
const liveMarkdown: LiveScenario = {
  id: "live-markdown",
  title: "Live markdown: blocks paint, links click, text selects",
  capability: "content",
  view: markdownScenario.view,
  ready: "md-doc",
  steps: (ctx) => Effect.gen(function* () { /* §3.2 steps */ }),
};
```

Steps:

1. `boxOf(ctx, "md-doc")`; expect `width ≈ 544` (`560 − 2 × 8` padding; ±1) and
   a painted height `> 0`.
2. `paintedText()` contains `Release notes`, `first item`, `Metric`, `500` and
   `const total = rows * 2;`.
3. `selectText(ctx, "md-before", "md-after")`; expect the selection to contain
   `Release notes` and `const total`. Then `clearSelection()`.
4. `click("md-link-doc")`; `waitForText(ctx, "md-link", "url=https://example.test/docs")`;
   assert the readout exactly.
5. `click("md-doc")`; `waitForTextNot(ctx, "md-link", "url=none")` is not
   appropriate (the readout keeps the last URL) — instead assert the readout
   **still** equals the URL, i.e. prose fires no second event (the headless
   assertion).
6. `paintedText()` does **not** contain `md-child-text`; `paintedText()`
   contains `Child` (the markdown source's own heading). If
   `textOf(ctx, "md-child")` is non-null, expect it to contain
   `md-child-text`; otherwise record the same retained-subtree limit as §3.1
   step 8.

Expected: **9–10 checks**. Record the measured number.

## 4. STOP conditions

- **STOP** if `live-content` or `live-markdown` needs a host verb that
  `AsyncSmokeHost` does not have. Record which verb and open a follow-up task;
  do not add a protocol call without its own plan.
- **STOP** if a `<svg>`/`<img>`/`<diff>` reports **no** painted bounds live. That
  is a real capability result: record it in §8 and `COMPONENTS.md`, mark the
  affected row honest, and do **not** substitute a `text`/`paintedText` check
  for the box.
- **STOP** if the live box differs from the headless box by more than 2 px on
  any edge. Record the measured values; do not widen a tolerance to make the
  check pass without an explanation.
- **STOP** if `click("md-link-doc")` does not fire `onLinkClick`. Record the
  readout and the element box; do not move the click until it passes without
  evidence (one probe of the doc's left half is allowed, and the point used
  must be written into §8).
- **STOP** if the live selection across the markdown boundary is empty. Record
  it; the offscreen selection claim then remains headless-only and the check is
  removed, not weakened.

## 5. Commands and expected results

Run from the repo root of `workspaces/playground`:

```sh
nub run --filter playground build
```

Expected: exit `0`, no TypeScript errors.

```sh
nub apps/playground/dist/live/run.js --list | grep -E '^live-(content|markdown)$'
```

Expected: both ids print, exit `0`, no window.

```sh
nub apps/playground/dist/live/run.js --only live-content --only live-markdown
```

Expected: `2/2 scenarios passed`, exit `0`, one real-window screenshot per
scenario under `apps/playground/.artifacts/live/`, and every check green.
Repeat the run twice (the concurrency rule in `README.md` §"Measured facts" is
that new live scenarios get two consecutive green runs).

Then the focused headless controls (they must not move):

```sh
nub apps/playground/dist/smoke/run.js --only native-surfaces --only markdown-surface
```

Expected: `2/2`, exit `0`, the existing check counts unchanged.

End-of-task gates:

```sh
nub run check
nub run lint
nub run test
```

Expected: all exit `0`; `nub run test` reports the playground tests green. The
**full live suite is a merge gate** and is not run for this task; record the
registry count as `69 → 71` from `--list`.

## 6. Test plan and two-direction proofs

The scenarios are the tests. Because this adds coverage rather than fixing a
bug, the proof is **mutation**: each lever must be observed failing, then
reverted and observed green.

| # | Lever | Expected failure |
| - | ----- | ---------------- |
| M1 | replace `<canvas testId="surface-canvas">` with a `div` of the same size | `canvas paints nothing, so it has no bounds: expected null, got {…}` |
| M2 | point `surface-img-data`'s `src` at `INVALID_IMAGE` | `a valid data URL adds no fallback: expected 1, got 2` |
| M3 | change `md-link-doc`'s `onLinkClick` to a no-op | `a coordinate click on the link fires onLinkClick: expected url=…, got url=none` |
| M4 | remove the `md-child` markdown child / replace it with a plain `<text>` | the `text("md-child")` retained check (if it ran) or the "children are dropped from the paint" check — record which one failed |
| M5 | change the sourced `<svg>`'s declared `width` 48 → 24 | `the icon keeps its declared width: expected 48 ± 1, got 24` |

Run each mutation with `--only <current scenario>`; record the exact message
and exit code in §8, then revert and re-run green. If a mutation does not fail,
the check is not asserting what it claims — fix the check, do not delete the
mutation.

## 7. Acceptance criteria

- `live-content` and `live-markdown` exist, registered, and pass focused with
  exit `0` twice in a row.
- Every check in §3 that the window can answer is asserted; any check the
  window cannot answer is removed and its measured reason recorded in §8 and
  `COMPONENTS.md` — never replaced by a weaker proxy.
- `native-surfaces` and `markdown-surface` still pass focused, unchanged.
- `apps/playground/README.md`, `COMPONENTS.md`, `TODO.md` and the plan index
  are updated with the measured check counts and the focused ids run.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.
- No full live-suite total is claimed (merge gate only).

## 8. Measured results (2026-10-19)

Both scenarios pass focused in the real `1100 × 720` window, twice in a row:

```
nub apps/playground/dist/live/run.js --only live-content --only live-markdown
2/2 scenarios passed · capabilities: content=verified   (exit 0)
```

| Scenario | Checks | Notes |
| -------- | ------ | ----- |
| `live-content` | **28** | the live box, fallbacks, diff text and canvas trap |
| `live-markdown` | **19** | paint, selection, link click and children |
| `native-surfaces` (control) | 40 | unchanged, focused headless run |
| `markdown-surface` (control) | 21 | unchanged, focused headless run |

The live registry goes **69 → 71** (`--list`). Headless stays **101/101**; the
full headless suite was not re-run for this focused addition, and the full live
suite is a merge gate and was **not** run — no total is claimed.

### 8.1 The measured live contract

- **`<img>` loses 1 px per axis live too.** A declared `96 × 64` reports
  `94 × 62`, exactly as the `TestRenderer` does (plan `529` §6.3). The plan's
  estimate of `96 × 64` was wrong; the check now asserts `94 × 62 ± 0.5` with a
  comment naming the rule. This was the first run's only failure.
- **`<canvas>` keeps its retained subtree addressable.** `bounds` is `null`
  (the host maps the protocol's "no painted bounds" `NotFound` to `null`) and
  its child never enters the paint log, but `text("surface-canvas")` returns
  `canvas-child` — so the retained-tree half of plan `161` transfers live, not
  only the paint half.
- **The markdown view transfers unchanged.** Its `544` px box, all five painted
  blocks, a real drag across the boundary, the coordinate link click and the
  untouched prose readout all hold without a fixture change.
- A valid data URL reports its declared `64 × 64` box (±1); the invalid source
  mutation measured `62` — the same tracker loss — which is why the box check
  caught the swap before the fallback count did.

### 8.2 Mutation proofs

Each lever was observed failing (exit `1`), then reverted and re-run green.

| # | Lever | Observed failure |
| - | ----- | ---------------- |
| M1 | `<canvas>` → a same-size `div` | `canvas paints nothing, so it has no bounds: expected true, got false` |
| M2 | swap the valid data URL's `src` for the invalid one | `the live data-URL box width: expected 64 ± 1, got 62` |
| M3 | make `onLinkClick` set `url=none` | `a live coordinate click on the link fires onLinkClick: expected "url=https://example.test/docs", got "url=none"` |
| M4 | render `md-child` as a plain `div` instead of `<markdown>` | `the live markdown source still paints its own content: expected a string containing "Child", got …md-child-text` (the same run shows the child text entering the paint, which the next check also rejects) |
| M5 | shrink the sourced `<svg>` to 24 px | `the live icon keeps its declared width: expected 48 ± 1, got 24` |

All five levers were reverted; `git diff` over the two probe files is empty, and
the final focused runs are green.

### 8.3 Deliberately not claimed

- Colour, the authored style report and the markdown `Article` role stay
  headless: the live tree has no `style` and `GpuixRenderer` has no a11y method
  (plan `197`).
- Pixel content is not asserted (no readback): a decoded valid image and a
  corrupt-but-accepted one are distinguished only by the runtime's fallback
  text, which is what the checks use.
- The chart and QR paths were not part of this plan. Their `<svg>`-mask and
  `<img>` routes now have the live box/paint evidence this plan establishes, but
  their own geometry and hit-testing still rest on plans `180` and `518`.
