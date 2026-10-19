# 620 — The cost model in a real window: retained nodes vs painted rows

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native evidence) |
| Owner | playground |
| Depends on | `302` (`scale-cost`, the headless cost model), `189`/`197` (the live host), `301` (retained-but-unpainted nodes are in the live tree) |
| Amends | `302` §2/§8 (the live half), `COMPONENTS.md` Virtualized lists |

## 1. Goal

`scale-cost` is the only capability in the registry with **no live twin whose
half is measurable**. Its two halves are:

1. **Retention is linear in rows** — a `<virtual-list>` windows *paint*, not
   retained host nodes: 2,000 rows retain 6,012 nodes, 100 retain 312, and the
   delta is exactly `3 × 1,900` (plan `302` §2).
2. **The syntax cache is stable across theme switches** — 1 miss + 1 hit for
   two identical `<code>` blocks, no parse on a theme change.

Half (2) has **no live API**: the automation protocol has no syntax-cache verb
and `GpuixRenderer` exposes no cache counter. Half (1) **is** measurable live,
because the protocol's `getTree` returns the retained tree — plan `301`/D45
measured that a retained-but-unpainted node is locatable while its bounds
answer `NotFound`. So this plan proves the cost model's retention half in a
real window and records the cache half as headless-only with the measured
reason.

The claim being closed: *virtualization windows paint, not memory.* A huge
model is not free, and the component contract must say so.

## 2. What is already known

- The headless view `apps/playground/src/scenarios/scale.tsx` (`scale-cost`)
  renders a 900 × 620 fixture: a 2,000-row `<virtual-list>` (`sc-list`,
  320 × 300, 20 px rows), a `rows` toggle (`sc-rows`, 2,000 ↔ 100), a code
  toggle (`sc-code`), a theme toggle (`sc-theme`) and a readout (`sc-state`).
  It fits the live 1100 × 720 window.
- Headless measures `renderer.getRetainedElementCount()`: **3 host nodes per
  row**; a jump keeps the count; regrowing leaves no residue.
- The live protocol's `TreeNode` is `{ id, type, text?, testId?, style?,
  events?, customProps?, bounds?, children? }`; `getTree` returns the whole
  retained tree, not only the painted window (plan `301`). The live tree has
  **no `style`** and no a11y (plan `197`), but it has every node id and child.
- The live host already calls `getTree` in `focused()` and walks it in
  `apps/playground/src/live/focus.ts`; a count is a second walk.
- The window's tree may count a row as **2 or 3** nodes (row `div` + `<text>`
  [+ the runtime's text node]); the headless "3 host nodes" is the renderer's
  counter, not the protocol tree's shape. Measure the live delta and record the
  difference; do not assume the number carries over.

## 3. Files to create or change

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | Add `retainedNodes: () => Effect.Effect<number, SmokeHostError>` to `AsyncSmokeHost`, with JSDoc: it counts the nodes the protocol tree reports, i.e. retained, not painted; a host without a tree answers `0`. |
| `apps/playground/src/live/tree.ts` | **New.** `countNodes(tree: TreeNode \| null): number` — recursive over `children`, `0` for `null`. `// TODO:` none; it is complete. |
| `apps/playground/src/live/tree.test.ts` | **New.** Four tests: a nested tree counts every node; a leaf is `1`; `null` is `0`; a node without `children` is `1`. The nested case fails if the walk only counts the root. |
| `apps/playground/src/live/host.ts` | Implement `retainedNodes` with `verb("retainedNodes", () => app.call("getTree", {}).then((result) => countNodes(result.tree)))`. Import `countNodes` from `./tree.js`. |
| `apps/playground/src/live/scenarios.tsx` | Import `scaleCostScenario` from `../scenarios/scale.js`; add `liveScale`; register it in `liveScenarios`. |
| `apps/playground/README.md` | Add the live `scale` evidence next to the virtual-list section: retention is linear in a window, paint is windowed, the syntax cache stays headless. |
| `COMPONENTS.md` | **Virtualized lists** row: cite `live-scale` and the measured live per-row delta. **Virtualized tables**: the same retention rule (it composes the same list). |
| `PLAN.md` | New decision row: the live tree is the retention metric; paint is the painted-text/bounds set; the syntax cache has no live API. |
| `TODO.md` | Add the task and tick it; keep the playground progress bar at 104/104. |
| `.agents/slop/plans/README.md` | Index this plan; note that `616`–`619` were claimed first, so this takes `620`. |

Do **not** touch `packages/primitives`, `packages/components` or the bindings.
This probe needs no production code.

## 4. Implementation

### 4.1 The counter

```ts
// apps/playground/src/live/tree.ts
import type { TreeNode } from "@gpuix/native/automation";
import * as Arr from "effect/Array";

/** Every node the protocol tree reports, root included. */
export const countNodes = (tree: TreeNode | null): number =>
  tree === null
    ? 0
    : 1 + Arr.reduce(tree.children ?? [], 0, (sum, child) => sum + countNodes(child));
```

No native `for`, no mutation; `Arr.reduce` matches the repo rule.

### 4.2 The host verb

In `host.ts`, next to `focused`:

```ts
retainedNodes: () =>
  verb("retainedNodes", () =>
    app.call("getTree", {}).then((result) => countNodes(result.tree)),
  ),
```

### 4.3 The scenario

`liveScale` reuses `scaleCostScenario.view`, `capability: "scale"`,
`ready: "sc-row-0"`, and asserts only what the window exposes:

1. The list anchors at `[0, 0, 300]` (`listScrollTop("sc-list")`).
2. `paintedText()` holds `row 0` and **not** `row 1900`.
3. `retainedNodes()` is **greater than 2,000** — the tree carries a node per
   row — and finite (`< 20,000` guards a protocol that serializes something
   unexpected).
4. `scrollToItem("sc-list", 1000)`, `settle`, then: the anchor index is `1000`,
   `row 1000` paints, `row 0` does not, and the node count is **unchanged**.
   This is the load-bearing pair: paint moved, retention did not.
5. `click("sc-rows")`, settle, `sc-state` contains `rows=100`, and the delta
   `large - small` equals `NODES_PER_ROW * 1900` **exactly**, where
   `NODES_PER_ROW` is the live constant measured on the first run.
6. `click("sc-rows")` again; the count returns to `large` exactly.
7. Screenshot to `apps/playground/.artifacts/live/live-scale.png`.

Declare measured constants at the top of the scenario, like
`apps/playground/src/scenarios/scale.tsx` does:

```ts
const ROWS_LARGE = 2000;
const ROWS_SMALL = 100;
/** The live tree's nodes per virtual row; measured by the first run. */
const NODES_PER_ROW = /* measured */;
```

**Do not** assert `3`. The headless renderer counter and the protocol tree are
different views; record both. **Do not** assert anything about the syntax
cache, colour or style — none is exposed live.

## 5. Commands and expected results

Run from the repo root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground build` | exit `0`, `dist/live/run.js` rebuilt |
| `nub apps/playground/dist/smoke/run.js --only scale-cost` | `1/1`, exit `0`; the headless control is unchanged |
| `nub apps/playground/dist/live/run.js --only live-scale` | **first run**: `1/1`, exit `0`, and the readout prints the measured node counts. Record `NODES_PER_ROW`; if the constants do not line up, STOP (§7) |
| `nub apps/playground/dist/live/run.js --only live-scale` (again) | `1/1`, exit `0` — the measured constant is stable |
| `nub run --filter playground test` | all tests pass, including the four new `tree.test.ts` cases |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` |
| `nub apps/playground/dist/smoke/run.js` | the full headless suite (a bare command; the headless CLI has no `--all`), exit `0`; registry `104/104` |
| `nub apps/playground/dist/live/run.js --all` | the **promotion gate**: the whole live registry `88/88`, exit `0` (the branch is prepared for a fast-forward, so its gate record must include the new scenario) |

While iterating, run only the two focused ids above. `--all` is the end-of-task
check; the live `--all` is required because this plan changes the live registry
total that the promotion record cites.

## 6. Test plan and two directions

**Unit (can fail).** `tree.test.ts` builds a three-level tree; the nested case
expects the total count. Changing `countNodes` to `1` (root only) fails it;
omitting `?? []` fails on a leaf. These are the floor, not the point.

**Native (can fail).** `live-scale` is the evidence. The two directions:

- **Direction one (the claim holds):** the focused run is green; the delta at
  100 rows equals the measured per-row constant times `1,900`; a jump paints
  row 1000 while the node count is unchanged.
- **Direction two (the claim is load-bearing):** replace the host's
  `retainedNodes` body with `paintedText().length` (paint, not retention) and
  re-run `--only live-scale`. The large/small delta must now be **0** (the
  window paints the same number of rows at both model sizes), so the
  `NODES_PER_ROW * 1900` check fails with exit `1`. Restore, re-run green.

A second mutation: change `NODES_PER_ROW` by `+1`; the delta check fails at
`expected <n>, got <n-1900>`. Restore. Record both in §9.

**No-op guard.** If the click on `sc-rows` does not reach the toggle in the
window (the locator's centre lands on the `<text>` child), assert the readout
and fix the click target — do **not** weaken the delta check.

## 7. STOP conditions

- **`getTree` does not include retained-but-unpainted rows** — `retainedNodes`
  at 2,000 rows is no larger than the painted window (about a dozen). STOP:
  the live tree is painted-only, the retention half cannot be measured live,
  and that becomes a documented limitation with this measurement. Do not
  substitute `paintedText().length` and call it retention.
- The per-row delta is not exactly linear (e.g. `large - small` is not
  `k * 1,900` for a single integer `k`), or `k` is outside `2…4`. STOP and
  report the numbers; the headless 3-per-row fact does not transfer.
- `getTree` at 2,000 rows times out or the protocol rejects the payload. STOP
  and report; do not shrink the model to make the claim, because linearity at
  a smaller scale is a different claim.
- The live view does not fit the 1100 × 720 window or `ready` never commits.
  STOP; the view is plan `302`'s and changing it would change the headless
  evidence.
- Any step would require editing `packages/**` production code. STOP; this
  probe needs none.

## 8. Acceptance

- `live-scale` is registered with capability `scale`; the live registry is
  `87 → 88`.
- The measured live per-row node count and the 2,000/100 totals are recorded
  in §9, `COMPONENTS.md` and the playground README; any difference from the
  headless "3 host nodes" is stated as a view difference, not a defect.
- The syntax-cache half is explicitly marked headless-only with the reason
  (no live verb, no renderer counter).
- `nub run check`, `nub run lint`, `nub run test` pass; focused and full
  headless runs exit `0`; the full live gate exits `0`.
- `TODO.md`, the plan index and `PLAN.md` carry the task, the plan and the
  decision.

## 9. Measured (2026-10-19, `darwin-x64` release-tag binding + zIndex patch)

**The live tree is the retained tree.** `retainedNodes()` counted **6,019**
nodes with the 2,000-row model and **319** with the 100-row model. The delta is
**5,700 = 3 × 1,900**, i.e. the protocol tree reports the same **3 nodes per
virtual row** as the headless host-node counter (`scale-cost`: 6,012 / 312). The
two views differ by a constant **7 chrome nodes** (6,019 − 6,012 and 319 − 312),
so the delta — not the total — is the portable assertion.

**Paint moves, retention does not.** `scrollToItem("sc-list", 1000)` anchored
row 1000, painted `row 1000`, unpainted `row 0`, and left the count at
**6,019**. Shrinking to 100 rows removed exactly 5,700 nodes; regrowing restored
6,019 exactly.

**The syntax-cache half stays headless.** The automation protocol has no
cache verb and `GpuixRenderer` exposes no syntax counter, so `live-scale` asserts
no cache claim. This is a harness limit, recorded in D89.

**Mutation proofs (observed failing, then reverted).**

| Mutation | Result |
| -------- | ------ |
| `retainedNodes` answers `paintedText().length` (paint, not retention) | `the live tree retains a node per row: expected true, got false` |
| `SCALE_NODES_PER_ROW` `3 → 4` | `each removed virtual row removes its live nodes: expected 7600, got 5700` |
| `countNodes` counts the root only | the unit test fails: `expected 1 to be 5` |

**Focused runs.** `live-scale` (**17 checks**) green twice after the reverts;
`scale-cost` control green at 36. Full headless and live gates are recorded in
`TODO.md`.
