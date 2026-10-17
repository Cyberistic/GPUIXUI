# Plan 171 — native search highlights: the find-bar contract

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B → D/E (Tier 4 feasibility: search and replace; Tier 3 log search).
**Depends on:** plans `100`, `110`, `120`, `140`, `150`, `154`, `160`, `166`.

## 1. Why this plan exists

`COMPONENTS.md` lists **Search and replace** (Tier 4) and **Search inputs**
(Tier 2) as unbuilt, with the same note: `useTextSearch` / `findRanges` exist,
but the find UI is ours. Nothing in the repo has ever measured whether the
runtime actually paints a highlight wash, whether `getPaintedHighlights()`
reports it, or how the match numbering behaves in a virtual list. Until that is
measured a search component would be built on documentation alone — the exact
mistake `MISSION.md` forbids.

GPUix 0.10.0 publishes the whole contract in `@gpuix/native/host`:

- `HostProps.highlight` — a query or explicit `[start, end)` ranges, scoped to
  the declaring subtree, with `activeIndex`, `matchIndexOffset`, `color`,
  `activeColor` and `radius`;
- `HostProps.onHighlight` — fires when the match count changes, carrying
  `matchCount`;
- `useTextSearch` — the React adapter that turns that pair into
  `{ total, active, next, previous, goTo }`;
- `TestRenderer.getPaintedHighlights()` — every wash painted in the last frame,
  with the run text, UTF-16 offsets, the active flag and its rectangles.

That last one is why this probe is possible without pixel readback: the
component's real output is a set of boxes behind text, and the renderer reports
exactly that. The honest gap is colour — `getPaintedHighlights()` does not
report the wash colour, so this plan does **not** assert it.

## 2. What is built

One scenario, `search-highlights` (capability `search`), in
`apps/playground/src/scenarios/search.tsx`.

### 2.1 The view

`SearchProbe` holds every document in one column, all inside the dark palette
the runner already provides:

- `search-doc` — the outer document. Its `{...search.props}` comes from the
  real `useTextSearch({ query: "error" })`. It contains
  - `search-line-1`: `The error handler logs an error.` (2 matches)
  - `search-line-2`: `An Error is not the same as errors.` (2 matches
    case-insensitively: `Error` and `errors`)
  - `search-line-3`: `No match here.` (0)
- `search-nested` — a child of `search-doc` that declares its own
  `highlight={{ query: "nested" }}`. Its text is `nested error`. The nearest
  declaration must win, so the outer `error` query must **not** wash the
  `error` inside this subtree.
- `search-counted` — a separate container with two lines and
  `highlight={{ query: "error" }}` plus `onHighlight` writing `matchCount` to
  `search-count-readout`. Text: `error one` / `error two error` = 3 matches.
  It proves the event route that `useTextSearch` depends on.
- `search-active` — one line, `alpha error beta error gamma`, with
  `highlight={{ query: "error", activeIndex: 1 }}`. Exactly the second wash is
  `active`.
- `search-whole` — `errors error error.` with
  `highlight={{ query: "error", wholeWord: true }}`: only the two
  punctuation/delimiter-adjacent matches, not `errors`.
- `search-case` — `Error error` with
  `highlight={{ query: "error", caseSensitive: true }}`: one wash.
- `search-ranges` — `ranges: [[0, 5], [6, 11]]` over `alpha beta gamma`
  paints `alpha` and `beta`; `ranges: [[0, 1]]` over `😀abc` (a surrogate-split
  pair) paints nothing, because the spec is refused rather than snapped.
- `search-code` — `<code code={"const error = 1;\nconsole.log(error);"}>` with
  `highlight={{ query: "error" }}`: native text is searched by `query`, and a
  `ranges` spec over it must paint nothing (native text is not part of range
  text).
- `search-clear` — a `Pressable` that sets the `useTextSearch` query to `""`;
  `search-restore` puts `error` back, and `search-next` / `search-previous`
  step the controller.
- `search-list` — a `<virtual-list>` of 120 rows. Row `i` renders
  `error at row ${i}` and declares
  `highlight={{ query: "error", matchIndexOffset: i, activeIndex: 90 }}`.
  The row at index 90 must be the only active wash, which is how a
  virtualized find numbers matches.
- `search-total` / `search-active-readout` — the `useTextSearch` snapshot
  (`total=… active=…`), so the hook's numbering is asserted, not inferred.

The first step calls `ctx.host.advance(0)`: `mount` renders and flushes but does
**not** dispatch native events, and `onHighlight` is a native event. This is the
same requirement `motion-collapse` measured for `onMotionComplete`.

### 2.2 The steps (what must hold)

1. After `advance(0)`, `search-total` reads `total=4 active=0` — two matches in
   line 1, two in line 2; the nested subtree is excluded and line 3 has none.
2. `host.highlights()` has exactly 4 washes inside `search-doc` plus the nested
   query's 1 — and every `text.slice(start, end)` is `error` / `Error` /
   `errors` as the query found it.
3. Geometry: every wash rect for `search-line-1` lies inside that line's
   reported bounds (±1 px), and its height is positive. A match on a
   soft-wrapped phrase (a 48 px-wide line, query `alpha beta`, with the text
   `alpha beta`) reports **more than one** rect — one per visual row.
4. Case sensitivity: `search-case` has 1 wash; the default `search-doc` query
   matched `Error` too.
5. Whole word: `search-whole` has 2 washes, and no wash's match text is
   `errors`.
6. Active index: `search-active` has 3 washes and exactly one `active: true`;
   its rect starts to the right of the first inactive wash.
7. Explicit ranges: `search-ranges` paints exactly 2 washes whose ranges are the
   declared ones; the surrogate-split pair paints 0.
8. Code: `search-code` paints 2 washes from `query`; a `ranges` highlight on a
   `<code>` paints 0.
9. `onHighlight` delivered `matchCount=3` to `search-count-readout`.
10. Nested scope: the only wash whose run text is `nested error` has
    `text.slice(start, end) === "nested"` (the outer `error` did not paint).
11. Clearing the query removes every wash; restoring it brings 4 back; `next`
    moves the active index and the active rect moves to the next match.
12. Virtual list: after `scrollToItem("search-list", 90)`, exactly one active
    wash exists in the painted set and its run text is `error at row 90`.
13. The scenario ends with `search` reported `verified` in
    `.artifacts/smoke-report.json`.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | add `"search"` to `CAPABILITIES`; `HighlightRect` + `HighlightMatch` schema classes; `SmokeHost.highlights()` |
| `packages/testing/src/smoke.test.ts` | decode tests: offsets/rects survive, a malformed rect fails the decode |
| `apps/playground/src/smoke/host.ts` | `highlights: () => renderer.getPaintedHighlights()` decoded at the boundary with `Schema.decodeUnknownOption` |
| `apps/playground/src/scenarios/search.tsx` | the `SearchProbe` view and `searchScenario` |
| `apps/playground/src/scenarios/index.ts` | import/append the scenario; add `"search"` to `PROBE_CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | assert `search-highlights` is registered and the capability is covered |
| `apps/playground/README.md` | suite count `39 → 40`; a search-highlights section with the measured facts |
| `COMPONENTS.md` | add a `search` capability row; record the measured contract on the Search and replace / Log viewers rows |
| `TODO.md` | tick the search probe; add any follow-up this exposes in the right owner's section |
| `.agents/slop/plans/README.md` | index plan `171` |
| `.agents/slop/plans/171-…` §8 | the measured outcome |

No change outside the owned paths. `@gpuix/*` is consumed, never edited.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter @gpuixui/testing test` | the schema tests pass |
| `nub run --filter playground build` | clean build |
| `nub apps/playground/dist/smoke/run.js --only search-highlights` | green, exit `0`, report shows `search=verified` |
| `nub apps/playground/dist/smoke/run.js` | `40/40 scenarios passed`, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proof:** change the expected `matchCount=3` to `4` (or delete
the `highlight` prop from `search-counted`) and the run must exit `1` naming the
readout; restore and it passes again. Record both outputs in §8.

## 5. STOP conditions

Stop and report with evidence if:

- **`getPaintedHighlights()` is empty even though `highlight` is set.** The
  probe's whole basis is gone. Record the exact props, the painted text and
  the empty array; the honest outcome is a `blocked`/`unsupported` row in
  `COMPONENTS.md` with this plan's evidence, not a fabricated scenario.
- **The rectangles are not in window coordinates** (they land at 0,0 or use
  text-local coordinates). Record the measured rects and the line's bounds;
  the contract for component authors is then "rects are frame-local", and the
  checks must be rewritten to assert that instead.
- **`onHighlight` is not delivered after `advance(0)`.** Try a click first (a
  click path flushes and dispatches). If it still does not arrive, the hook's
  `total` cannot be counted in this runtime: record it, assert the painted
  washes instead, and add a cross-team `TODO.md` item for `@gpuixui/components`.
- **A declared behaviour differs from the published documentation**
  (case-insensitive default, whole word, nearest-declaration-wins,
  surrogate rejection, `matchIndexOffset`). Do not fail the suite for a
  measured difference. Rewrite the affected check to assert the measured
  behaviour, and record the difference in §8, `COMPONENTS.md` and the app
  README.
- **A change outside the owned paths is required**: record it in `TODO.md` and
  do not edit it.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `HighlightMatch` decode | unit (`packages/testing`) | the adapter passing an untyped rect through; a runtime that retypes `rects` |
| malformed highlight decode | unit | a scenario asserting on a snapshotted shape the runtime no longer produces |
| `search-highlights` | native smoke | a highlight that never paints; a query that matches the wrong runs; a wrong active index; ranges that snap instead of refusing; a nested declaration that leaks; a virtual list that numbers matches from the window instead of the document |
| `scenarioProblems` / registration | unit (`apps/playground`) | the scenario falling out of the registry or the capability list |
| two-direction run (§4) | native smoke | the checks passing when the match count is wrong |
| full suite | native smoke | the new document disturbing later scenarios (all mounts share one root) |

## 7. Acceptance criteria

- `search-highlights` is registered, green on this host, and its measured facts
  are recorded in §8, the app README and `COMPONENTS.md`.
- The suite is **40/40**, exit `0`; the two-direction proof is recorded.
- `nub run check`, `nub run lint`, `nub run test` pass.
- Any divergence from the published highlight docs is recorded as a measured
  fact with the affected components named.

## 8. Outcome

Executed on this host on 2026-10-17; **40/40 green**, exit `0`,
`search=verified` in `.artifacts/smoke-report.json`. `search-highlights` records
**40 checks**.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **A highlight reaches the paint.** `getPaintedHighlights()` reports every wash
  with the run text, UTF-16 `[start, end)` offsets and boxes. The four
  `search-doc` matches paint four washes; `useTextSearch` reads
  `total=4 active=0`.
- **Rects are window coordinates**, the same space as `getElementBounds`.
  Moving the document by `marginLeft: 40, marginTop: 30` moved the first wash to
  `x=68.44, y=30` (line at `x=40, y=30`, first glyph at `+28.44`). The geometry
  check asserts containment inside the line's own box.
- **`onHighlight` is a native event and needs `dispatchNativeEvents`.** With
  `ctx.host.advance(0)` after mount, `search-counted` read `matchCount=3`; the
  same requirement `motion-collapse` measured for `onMotionComplete`.
- **A nested declaration replaces the ancestor's for its subtree.** The outer
  `error` query did not wash the `error` in the `search-nested` subtree; the
  only wash there was the nested query's `nested`.
- **Matching semantics hold as documented**: case-insensitive by default,
  `caseSensitive` skips `Error`, `wholeWord` skips `errors`, explicit ranges
  paint `alpha` and `beta` exactly.
- **A soft-wrapped match paints more than one box** — one per visual row.
- **A surrogate-splitting range is refused without snapping**: `[[0, 1]]` over
  `😀abc` painted nothing, while `[[2, 5]]` over `😀xyz` painted `xyz`.
- **`<code>` is query-only.** `query: "error"` painted both code lines; a
  `ranges` spec over a code block painted nothing (the control code text was
  made distinct — `let error = 2;` — so the check cannot be satisfied by the
  query probe's wash).
- **A virtual list numbers matches document-wide.** With each row declaring
  `matchIndexOffset: row` and `activeIndex: 90`, after
  `scrollToItem("search-list", 90)` exactly one row wash was active and its run
  text was `error at row 90`.
- **`next` moves the find cursor** from match 0 to match 1, and clearing the
  query removed every wash and reset the count to `total=0`.
- **The honest gap:** the report carries no wash colour, so `color` and
  `activeColor` were not asserted. A screenshot is visual evidence, never an
  assertion.

Two-direction proof: changing the expected `matchCount=3` to `matchCount=4`
made the run exit `1` with
`onHighlight reports the match count: expected a string containing "matchCount=4", got "matchCount=3"`
and `search=failed`; restoring the expectation made it green again (exit `0`).

One implementation correction during the run: the first version of the
`<code>` ranges check used the same code text as the query probe, so its wash
could have come from either element. The control block now uses distinct text
(`let error = 2;`), which makes the zero meaningful.

No change outside the owned paths. The published docs' `ranges` statement
(native text is not indexed) matches the measurement for `<code>`: a range spec
paints nothing there, while `query` works.

