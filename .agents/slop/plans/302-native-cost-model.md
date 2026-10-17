# Plan 302 — the native cost model: retained host nodes and the syntax cache

**Workstream:** playground (`apps/playground`, `packages/testing`).
**Phase:** F (performance), with evidence for Tier 3 virtualized data and Tier 5
syntax highlighting.
**Depends on:** `100`, `110`, `120`, `140`, `152`, `188`, `198`.
**Status when written:** measured spike done; implementation planned below.

---

## 1. Why this plan exists

Two of the pinned renderer's own counters have never been used by this
workstream:

- `TestGpuixRenderer.getRetainedElementCount()` — "how many elements the
  retained tree holds, reachable from the root or not".
- `TestGpuixRenderer.getSyntaxCacheStats()` — `[hits, misses, documents]` for
  the process-wide syntax cache that stops a `<code>` block from being reparsed
  at frame rate.

Both answer questions the component library will otherwise discover in
production:

1. **What does a virtualized list cost?** Every earlier probe measured that a
   `<virtual-list>` *paints* only a window. None measured whether it also
   *retains* only a window. A library that recommends 10,000-row tables needs
   the second number.
2. **When is a highlighted document reparsed?** A `<code>` block is rebuilt
   every frame; the cache is the only thing standing between a 200-line snippet
   and 60 parses per second. A component that changes its code string on every
   render (a common mistake — an inline template, a `useMemo` that misses)
   silently defeats it.

This plan adds the two host verbs, one probe scenario and the adapter tests. It
is a measurement, not a component: no API ships from it, but the numbers go into
`COMPONENTS.md` for `Virtualized lists`, `Virtualized tables` and `Syntax
highlighting`.

## 2. Measured facts (reconnaissance, this host, 0.10.0)

A throwaway scenario mounted a `<virtual-list>` and two identical `<code>`
blocks, then read both counters after each state change. Measured:

| Observation | Value |
| ----------- | ----- |
| retained nodes, 2,000 rows | `6,012` |
| retained nodes, 100 rows | `312` |
| retained nodes after `scrollToItem(1000)` | `6,012` (unchanged) |
| retained nodes after scrolling back and forth | unchanged |
| two identical `<code language="ts">` at mount | `hits=1 misses=1 documents=1` |
| click on the code that changes nothing | unchanged |
| change the code string (both blocks) | `hits=2 misses=2 documents=2` |
| switch the theme (nested `ThemeProvider`) | unchanged — no reparse |
| idle `advance(0)` | unchanged |
| change the code string again | `hits=3 misses=3 documents=3` |

Conclusions the probe must encode:

- **Retention is linear in rows** at the measured **3 host nodes per row**
  (div + text + the runtime's text node). The list windows *paint*; it does not
  window *retained host nodes*. `100 → 312` and `2,000 → 6,012` differ by exactly
  `3 × 1,900`.
- **Scrolling neither leaks nor recycles.** The count after a jump is the same
  as before it.
- **The syntax cache is keyed on the document, not the theme.** Two identical
  blocks share one entry (1 miss + 1 hit); a theme switch recolours with **no**
  cache activity; changing one document costs exactly one miss + one hit and
  keeps the old document.
- **An unchanged block is not even looked up** on a repaint (the per-element
  key short-circuits first), which is why idle frames show no hits either.
- The syntax counters are **process-wide and cumulative**, so a scenario must
  assert **deltas around a controlled change**, never an absolute count: other
  scenarios have already parsed documents by the time this one runs. The probe
  starts with no document and inserts one from a click for exactly this reason.

## 3. STOP conditions

Stop and report with the evidence if any of these happen:

1. `getRetainedElementCount` or `getSyntaxCacheStats` is missing or throws at
   runtime (`existing dist` may predate the plan — rebuild first).
2. The retained-count delta between a small and a large list is **not**
   proportional to the row delta. That is a finding, not a failure: record the
   measured numbers, do not force the assertion, and update this section.
3. A theme switch or an idle frame moves `misses`. That is a real defect in the
   runtime or in the view; stop and report rather than weakening the check.
4. The scenario cannot run under `--only scale-cost` on this host.
5. Any gate in §7 fails after two attempts.

Do **not**: mark the capability `verified` by hand, skip the probe on a host
without a binding, or assert a number the probe did not measure.

## 4. Design

### 4.1 `packages/testing/src/smoke.ts`

1. Add `"scale"` to `CAPABILITIES` (after `"scroller"`).
2. Add the schema-decoded snapshot next to the other runtime reports:

```ts
/** The process-wide syntax cache counters: `[hits, misses, documents]`. */
export class SyntaxCacheStats extends Schema.Class<SyntaxCacheStats>(
  "SyntaxCacheStats",
)({
  hits: Schema.Number,
  misses: Schema.Number,
  documents: Schema.Number,
}) {}
```

3. Extend `SmokeHost`:

```ts
  /** Host elements the retained tree holds, reachable from the root or not. */
  readonly retainedElements: () => number | null;
  /** The process-wide syntax cache counters, or `null` when the host has none. */
  readonly syntaxCache: () => SyntaxCacheStats | null;
```

`null` is correct at this boundary: `SmokeHost` already models every renderer
"not found" as `null` and scenarios convert with `Option.fromNullishOr`.

### 4.2 `packages/testing/src/native.ts`

1. Extend the structural port:

```ts
  getRetainedElementCount(): number;
  getSyntaxCacheStats(): ReadonlyArray<number>;
```

2. Decode the tuple at the boundary instead of trusting it:

```ts
const SyntaxCacheTuple = Schema.Tuple([
  Schema.Number,
  Schema.Number,
  Schema.Number,
]);

const syntaxCacheOf = (
  renderer: NativeRenderer,
): Option.Option<SyntaxCacheStats> =>
  Option.map(
    Schema.decodeUnknownOption(SyntaxCacheTuple)(
      renderer.getSyntaxCacheStats(),
    ),
    ([hits, misses, documents]) =>
      new SyntaxCacheStats({ hits, misses, documents }),
  );
```

3. Implement the verbs in `createHost` (after `fastForwardMotion`):

```ts
  retainedElements: () => renderer.getRetainedElementCount(),
  syntaxCache: () =>
    Option.getOrNull(syntaxCacheOf(renderer)),
```

Import `SyntaxCacheStats` from `./smoke.js`.

### 4.3 `apps/playground/src/scenarios/scale.tsx` (new)

A single view, `ScaleProbe`:

- **Rows**: a 300×300 `<virtual-list testId="sc-list" estimatedItemHeight={20}>`
  over `rows` rows (`sc-row-${index}`), `rows` state `2000` or `100`.
- **Code**: two `<code testId="sc-code-a" | "sc-code-b" code={code} language="ts" />`
  rendering the **same** string, so the cache's sharing is observable. Three
  distinct snippets (`snippets[0..2]`) unique to this scenario — the counter is
  process-wide, so no other scenario may reuse these strings.
- **Controls** (a `div role="button"` each, `onClick` only):
  - `sc-rows` toggles 2,000 ↔ 100;
  - `sc-code` advances the snippet;
  - `sc-theme` toggles a nested `ThemeProvider` between `palettes.dark` and
    `palettes.light`.
- **Readout** `sc-state` shows `rows`, `snippet` and the palette name. Every
  assertion still comes from the host counters, never from the readout.

Constants:

```ts
const ROWS_LARGE = 2000;
const ROWS_SMALL = 100;
/** Measured on 0.10.0: one row = a div, a text and the runtime's text node. */
const NODES_PER_ROW = 3;
const VIEWPORT = 300;
```

Scenario id `scale-cost`, capability `"scale"`, title
`"Scale: retained-tree host nodes and the syntax cache"`.

Steps, in order:

1. **The list paints a window, retains the rest.**
   - `large = expectSome("the host reports its retained tree", Option.fromNullishOr(host.retainedElements()))`.
   - `expectContains(paintedText, "row 0")`, `expectEqual(paintedText contains "row 1900", false)`.
2. **A jump does not leak or recycle.**
   - `scrollToItem("sc-list", 1000)`, `advance(0)`.
   - `expectEqual(retainedElements(), large)` (same number).
   - `expectContains(paintedText, "row 1000")`, `expectEqual(contains "row 0", false)`.
3. **Retention is linear: 3 host nodes per row.**
   - `scrollToItem("sc-list", 0)`, `advance(0)`, click `sc-rows`, `advance(0)`.
   - `small = expectSome(retainedElements)`.
   - `expectEqual("each virtual row retains three host nodes", large - small, NODES_PER_ROW * (ROWS_LARGE - ROWS_SMALL))`.
   - Click `sc-rows` again, `advance(0)`; `expectEqual(retainedElements(), large)` (rows are recreated, no residue).
4. **A controlled first document: both identical blocks share it.**
   - The view starts with **no document** (`step = -1` renders `code=""`), so
     every parse this probe measures is a delta. Read `base` first.
   - Click `sc-code` (sets the first snippet), `advance(0)`; `first = cacheOf`.
   - `expectEqual(first.misses, base.misses + 1)`,
     `expectEqual(first.hits, base.hits + 1)`,
     `expectEqual(first.documents, base.documents + 1)`.
   - `expectContains(paintedText joined, "firstDocument")`.
   - Guard comment: the counters are process-global, so only deltas are valid.
5. **A theme switch recolours without reparsing.**
   - Click `sc-theme`, `advance(0)`; `themed = cacheOf`.
   - All three counters equal `first`'s.
   - `expectContains(readout, "palette=light")` proves the switch happened.
6. **An idle frame reparses nothing.**
   - `advance(0)` twice; `idle`; all three counters equal `themed`'s.
7. **Editing the document costs exactly one parse and one cache hit.**
   - Click `sc-code`, `advance(0)`; `edited`.
   - `expectEqual(edited.misses, themed.misses + 1)`,
     `expectEqual(edited.hits, themed.hits + 1)`,
     `expectEqual(edited.documents, themed.documents + 1)`.
   - `expectContains(paintedText joined, "secondDocument")` (a marker inside
     `snippets[1]`).
8. **A second edit keeps the old documents.**
   - Click `sc-code`, `advance(0)`; `editedAgain`.
   - `expectEqual(editedAgain.misses, edited.misses + 1)`,
     `expectEqual(editedAgain.documents, edited.documents + 1)`.
   - `expectContains(paintedText joined, "thirdDocument")`.
9. Screenshot `apps/playground/.artifacts/screenshots/scale-cost.png`.

Files must contain no `any`, no `console.*`, no `Date`, no casts. `ThemeProvider`
from `@gpuixui/tokens/react` and `palettes` from `../palettes.js` are already
used by the runner; a nested provider is supported (`theme-color-roles`).

### 4.4 `apps/playground/src/scenarios/index.ts`

- Import `scaleCostScenario`.
- Add `"scale"` to `PROBE_CAPABILITIES` (the registry integrity test requires a
  scenario for every listed capability).
- Append the scenario to `scenarios` after `messageScrollerScenario`.

The shell therefore gains a 61st entry automatically: the registry is the single
source of truth for the sidebar and the smoke list.

### 4.5 `packages/testing/src/native.test.ts`

`FakeRenderer` implements the port, so it must gain the two methods:

```ts
  retained = 0;
  syntax: ReadonlyArray<number> = [0, 0, 0];
  getRetainedElementCount(): number {
    return this.retained;
  }
  getSyntaxCacheStats(): ReadonlyArray<number> {
    return this.syntax;
  }
```

One test in `describe("runtime reports")`:

```ts
  it("forwards the retained count and decodes the syntax counters", () => {
    const renderer = rendererOf();
    renderer.retained = 42;
    renderer.syntax = [3, 1, 2];
    const host = createHost(renderer);
    expect(host.retainedElements()).toBe(42);
    expect(host.syntaxCache()?.hits).toBe(3);
    expect(host.syntaxCache()?.misses).toBe(1);
    expect(host.syntaxCache()?.documents).toBe(2);
    renderer.syntax = [3, 1];
    expect(host.syntaxCache()).toBeNull();
  });
```

The malformed tuple is the boundary rule: a runtime that changed its report
shape must produce "no report", never a half-filled object.

## 5. Exact commands and expected results

Run from the worktree root.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/testing test` | all tests pass, including the new adapter test |
| 2 | `nub run --filter playground build` | exit `0` |
| 3 | `nub apps/playground/dist/smoke/run.js --only scale-cost` | `1/1 scenarios passed`, exit `0`; report line names `scale=verified` |
| 4 | `nub apps/playground/dist/smoke/run.js` | `61/61 scenarios passed`, exit `0`, capability list contains `scale=verified` |
| 5 | `nub run --filter playground test` | all tests pass |
| 6 | `nub run check` | exit `0` |
| 7 | `nub run lint` | exit `0` |
| 8 | `nub run test` | exit `0` |

`nub run --filter playground smoke` collapses a non-zero child exit to `1`; use
command 3/4 directly for the real exit code (documented in
`apps/playground/README.md`).

## 6. Test plan — and how to prove each check can fail

The scenario's checks are the test; the adapter test covers the boundary. Prove
both directions before calling the plan done:

**M1 — defeats the cache.** Change the view so the code string carries the
palette (`code={`${snippetAt(step)} // ${palette}`}`). Run command 3.

- Measured failure: `a theme switch does not reparse: expected 2, got 3`,
  exit `1`.
- Restore the view.

**M2 — breaks the cost model.** Change `NODES_PER_ROW` to `2`.

- Measured failure: `each virtual row retains three host nodes: expected 3800,
  got 5700`, exit `1`.
- Restore the constant.

**M3 — breaks the boundary decode.** Narrow `SyntaxCacheTuple` to two numbers
and run `nub run --filter @gpuixui/testing test`.

- Measured failure: `expect(host.syntaxCache()?.hits).toBe(3)` — expected `3`,
  received `undefined`, exit `1`.
- Restore the three-number tuple.

## 7. Acceptance

- `scale-cost` passes in the full suite (`61/61`), exit `0`, and the report lists
  `scale=verified`.
- Both mutation directions above fail with exit `1` and the quoted messages.
- The adapter test fails when the tuple decode is removed (verified by
  temporarily returning `payload` unchecked).
- `nub run check`, `nub run lint` and `nub run test` are green.
- `TODO.md` ticks the probe and records the measured numbers.
- A cross-team TODO asks the `components` owner to fold the numbers into
  `COMPONENTS.md` (`Virtualized lists`, `Virtualized tables`, `Syntax
  highlighting`); this workstream does not edit that file.
- The plan index row in `.agents/slop/plans/README.md` records the status and
  the two-direction proof.

## 8. What this does not claim

- No absolute frame time. `getRetainedElementCount` and the syntax counters are
  structural; they say nothing about milliseconds, and a timing assertion on
  this host would be brittle. Real-window frame statistics
  (`GpuixRenderer.getDebugFrameOverlayStats`) are a separate follow-up if the
  docs need a number.
- No colour. The cache report has no colour fields; the theme-switch check
  proves *no reparse*, not that the new palette painted. `theme-color-roles`
  already owns that.
- No pixel evidence. The screenshot is an artifact, never an assertion.
