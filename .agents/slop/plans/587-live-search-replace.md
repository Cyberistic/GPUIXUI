# 587 — Search and replace in a real window: the document half

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `171` (`search-highlights`), `188` (`text-entry`), `197`
(the live observation surface), `333` (`replace-contract`), `334`
(`search-replace`), `554`/`557` (recent live twins), `586` (the last plan).
**Phase:** F — the last interaction-bearing half of the find/replace contract
with only `TestRenderer` evidence.

## 1. Why

Plan `334` measured the document half of search and replace offscreen:

- a document mutation re-washes and recounts;
- a **count-preserving** replacement (`error` → `ERROR`) moves the washes
  **without** firing `onHighlight`;
- a length change shifts every downstream match by the exact delta;
- `<code>` re-highlights by prop; and
- an `<input>`/`<textarea>` value is painted but never washed, while a `<text>`
  sibling under the same query is.

Plan `333`'s editor half is already live (`live-replace`, plan `333` §8). The
document half is not: `search-replace` has no live twin, and the live renderer
*can* report painted highlights through `GpuixRenderer.getPaintedHighlights()`
(plan `197`). So every wash/count claim the Tier 4 **Search and replace** row
rests on is still offscreen-only, and the live half must be measured rather
than assumed. This plan adds one live twin over the existing view, with no
production or `packages/testing` change.

| Live id | View | Proves in the real `1100 × 720` window |
| ------- | ---- | ------------------------------------- |
| `live-search-replace` | `searchReplaceScenario.view` | real typing drives the query; the find cursor steps; one replace recounts and re-washes; replace-all empties the document; reset restores; a count-preserving replace moves the washes without a count event; a longer/shorter replacement shifts survivors exactly; a length-changing replace-all rewrites once; and `<code>` re-highlights by prop |

Only what a window can answer is asserted: `text()` readouts, `bounds()`,
`paintedText()`, `highlights()` and real clicks/keys. Colour stays headless
because the live tree has no `style` and no wash colour (plan `197`).

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/search-replace.tsx` | export the three pure helpers the live twin reuses (`inside`, `inLine`, `matched`) — one-word change each, no behaviour change. |
| `apps/playground/src/live/scenarios.tsx` | import `searchReplaceScenario` and those helpers; add `liveSearchReplace`; register it next to `live-highlights`/`live-replace` (`capability: "search"`). |
| `apps/playground/README.md` | a `### Search and replace in a real window (plan 587)` section; add the id to the live-evidence list. |
| `COMPONENTS.md` | the capability table's `search` row lists the new id; the inventory `Search and replace` row cites the live evidence. |
| `PLAN.md` | a D76 row with the measured result. |
| `TODO.md` | claim this task before implementing; tick it with the measured checks and exact focused ids. |
| `.agents/slop/plans/README.md` | index row and the playground narrative line. |

No `packages/testing` change: `bounds`, `text`, `paintedText`, `highlights`,
`click` and `key` already exist. **STOP** if a needed verb is missing; record it
and open a follow-up task rather than widening the async host here.

## 3. Implementation

### 3.1 `live-search-replace`

```ts
const liveSearchReplace: LiveScenario = {
  id: "live-search-replace",
  title: "Live search and replace: document mutation, washes and the cursor",
  capability: "search",
  view: searchReplaceScenario.view,
  ready: "sr-doc",
  steps: (ctx) => Effect.gen(function* () { /* steps below */ }),
};
```

The live helpers are tiny and local (the async `highlights()` returns an
`Effect`, unlike the headless call):

```ts
const washesIn = (ctx: LiveContext, box: Smoke.Bounds) =>
  Effect.map(ctx.host.highlights(), (matches) => inside(box, matches));

const lineWashes = (ctx: LiveContext) =>
  Effect.map(ctx.host.highlights(), (matches) => ({
    first: inLine(matches, "an fixed follows"),
    fourth: inLine(matches, "the last error"),
  }));
```

Steps, with `settle`/`waitForText` after every click or key (the protocol has
no frame boundary, plan `189`):

1. `waitForText(ctx, "sr-total", "total=5")`; read `sr-total` and assert
   `active=0`; assert `sr-doc-text` paints the five fixture lines; read
   `sr-doc`'s box and assert **5** washes inside it, each matching `error`.
2. Real typing: `click("sr-query")`; `key("end")`; `key("x")`;
   `waitForText(ctx, "sr-total", "total=0")`; `key("backspace")`;
   `waitForText(ctx, "sr-total", "total=5")`. This proves the query field is
   the native editor, not component-only state.
3. `click("sr-next")` twice; `waitForText(ctx, "sr-total", "active=2")`;
   assert `inLine(..., "an error follows")` has one active wash.
4. `click("sr-replace-one")`; `waitForText(ctx, "sr-total", "total=4")`;
   assert `sr-doc-text` contains `an fixed follows`, that line paints **no**
   wash, and the active wash is now on `the last error` (the cursor stayed at
   index 2).
5. `click("sr-replace-all")`; `waitForText(ctx, "sr-total", "total=0")`;
   assert `sr-doc-text` contains no `error` and the document box has **0**
   washes; `sr-next`/`sr-previous` are inert (`total=0 active=0`).
6. `click("sr-reset")`; `waitForText(ctx, "sr-total", "total=5")`; assert
   `sr-events` reads `fired=1`; record it.
7. `click("sr-uppercase")`; `waitForText(ctx, "sr-total", "total=5")`; assert
   `sr-events` is unchanged (the count-preserving rule) and the first line
   paints two washes whose matched substrings are `ERROR,error`.
8. Reset; `click("sr-longer")`; `waitForText(ctx, "sr-total", "total=5")`;
   assert `errors error here` paints two washes and the second starts at **7**
   (the `+1` delta).
9. Reset; `click("sr-shorter")`; `waitForText(ctx, "sr-total", "total=4")`;
   assert the first survivor on `err error here` starts at **4** (the `-2`
   delta).
10. Reset; `click("sr-replace-all-short")`; assert the exact `sr-doc-text`
    value (`err err here|an err follows|no match|the last err|another err
    closes`) and `total=0` (the right-to-left fold proof).
11. Reset; assert the code block paints **2** washes; `click("sr-code-replace")`;
    assert `sr-code-text` is `const value = 1;|console.log(value);` and no code
    wash survives.
12. `click("sr-reset")`; screenshot to `${LIVE_ARTIFACTS}/${liveSearchReplace.id}.png`.

Expected: **35–45 checks** (each `expect*` is one check). Record the measured
count.

## 4. STOP conditions

- **STOP** if `ctx.host.highlights()` live does not report document washes.
  Record the empty list; the plan's premise (plan `197`) is wrong and the
  live-evidence claim must be withdrawn, not faked.
- **STOP** if a click on `sr-query` does not focus the native editor (typing
  leaves `total=5`). Record the focused id; do not substitute component state
  for the typing check.
- **STOP** if the measured washes/offsets differ from plan `334` (`5`, `+1`
  start `7`, `-2` start `4`). Record the numbers; do not widen an assertion
  without a measured reason.
- **STOP** if the code block reports a different wash count. The live
  highlighter may scope `<code>` differently; record the measured list.
- **STOP** if a needed host verb is missing (see §2).

## 5. Test plan

The scenario **is** the test; every check can fail. Required mutation proofs,
run one at a time, observe the failure, revert:

- **M1** remove the two `sr-next` clicks → the cursor check fails with the
  measured `active=0`.
- **M2** make `replaceOne` a no-op → the replace check fails with `total=5`.
- **M3** drop `search.props.onHighlight?.(event)` from `counted` → `fired=0`
  after reset, so the count-event check fails.
- **M4** (reverse) expect the longer replacement's second wash start to be `8`
  → fails with the measured `7`.
- **M5** fold ranges left-to-right in `replaceRanges` → the exact
  `sr-doc-text` check fails (the same corruption plan `334`'s unit tests catch).
- **M6** remove `key={generation}` from `ReplaceSurface` → reset stops
  remounting, so the restored-document check fails.

After reverting, the focused run must be green twice in a row.

## 6. Verification commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --list | grep live-search-replace
nub apps/playground/dist/live/run.js --only live-search-replace
```

Expected: `1/1` scenario passed, exit `0`, one screenshot under
`apps/playground/.artifacts/live/`. Record the check total.

End-of-task gate (the registry changed):

```sh
nub run check
nub run lint
nub run test
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --all
```

Expected: all green; the headless suite stays **103/103** with the same check
count (the headless registry is untouched). The full **live** suite is a
merge/release gate and is **not** run for this task.

## 7. Acceptance

- `live-search-replace` exists, is listed by `--list`, and is green twice.
- Every asserted number is measured; the plan records the check count and the
  measured wash geometry.
- The mutation proofs were observed failing and reverted.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` (D76) and the playground README carry
  the result; no colour or a11y claim is invented.
- `check`, `lint`, `test` and the full headless suite are green.

## 8. Measured record (2026-10-19)

**Result:** `1/1` focused scenario, exit `0`, **48 checks**, eight green
focused runs (four before the final formatter pass, four after) plus the six
mutation runs below. Live registry `75 → 76` (derived:
`--list | wc -l`). Screenshot:
`.artifacts/live/live-search-replace.png`.

| Measurement | Value |
| ----------- | ----- |
| baseline document | `total=5 active=0`, **5** washes inside `sr-doc`, each matching `error` |
| real typing in the query | `error` + `x` → `total=0`; Backspace → `total=5` |
| one replace from cursor 2 | `total=4`; `an fixed follows` paints no wash; the active wash is on `the last error` and `active=2` |
| replace-all | `total=0`, 0 document washes, no `error` left; stepping is inert |
| reset | `total=5`, `fired=1` |
| count-preserving replace | first line `ERROR error here`, washes `ERROR,error`, `sr-events` unchanged |
| longer replacement | `errors error here`, two washes, the second starts at **7** |
| shorter replacement | `err error here`, first survivor starts at **4**, count `4` |
| length-changing replace-all | the exact five-line result, `total=0` |
| code block | **2** washes before, 0 after the prop rewrite; `sr-code-text` is `const value = 1;\|console.log(value);` |

**Harness lesson:** after `sr-reset` the match **count** is already `5` in the
pre-reset render, so waiting only for `total=5` returns before the remount
commits and the next click lands on the old tree. The live twin waits for the
document text (`error error here`) after every reset; without that wait the
longer/shorter checks read zero washes.

**Mutation proofs, each observed and reverted:**

| # | Mutation | Observed |
| - | -------- | -------- |
| M1 | removed the two `sr-next` clicks | failed "the live cursor reaches the third match": `total=5 active=0` |
| M2 | `sr-replace-one` became a no-op | failed "one live replace decrements the count": `total=5 active=2` |
| M3 | dropped the forwarded `onHighlight` | failed earlier at "the live find bar counts every document match": `total=0 active=0` (the hook derives its total from that event) |
| M4 | expected the longer wash start to be `8` | failed with the measured `7` |
| M5 | folded replace ranges left-to-right | failed with the corrupted document `err ererrere\|an erroerrlows\|no match\|the last error\|errer error clerr` |
| M6 | removed `key={generation}` from the reset surface | failed "live reset restores every match": `total=0 active=0` |

**Focused ids run:** `live-search-replace` (eight green runs and six
mutation/red runs); `nub apps/playground/dist/smoke/run.js --only
search-replace` for the headless control. The full live suite was **not** run
(merge/release gate). Full headless **103/103** (`3653` checks, 64
capabilities), exit `0`; `nub run check`, `nub run lint` and `nub run test`
green (playground 417 tests, primitives 282).
