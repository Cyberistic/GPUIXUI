# 559 — The virtualized tree in a real window

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (live evidence) |
| Owner | playground |
| Depends on | `153` (tree view), `165` (virtualized tree), `158`/`190` (native focus), `189`/`197` (the live host), `532`/`534` (the wrapper rule for a live wheel), `529` (the pinned binding) |
| Paths | `apps/playground/src/scenarios/virtual-tree.tsx`, `apps/playground/src/live/scenarios.tsx`, `apps/playground/README.md`, `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md` |

## 1. Why

`tree-view` (plan `153`) and `virtualized-tree` (plan `165`) are the **last
Tier 3 interaction probes whose evidence is headless only**. Every sibling has a
live twin: lists, tables, the grid, the editor, the terminal, reorder, the
inspector, notifications and the workspace all run in the real `1100×720`
window. `live-tree-reorder` covers the reorder gesture on a tree, not the
roving tree itself.

The tree is also where a headless result is least trustworthy:

- Plan `345` measured that a live click focuses a row natively, while React's
  `onFocus` does not run; a roving index built on `focusElement` must be
  re-measured in a window.
- Plan `158` measured that a focused off-window row stays painted and still
  receives the next key headless; the live delivery path is the one plan `345`
  proved.
- A `<virtual-list>` is not a live wheel target (plans `350`, `532`), so a tree
  that changes its row count from 8 to 48 needs a live wheel/box wrapper, not
  just a list id.
- A count change (8 ↔ 48 rows) re-windows a real renderer; headless proves the
  geometry, live proves the painted window and the anchor.

## 2. The contract after this plan

One new live scenario, `live-tree`, reusing `virtualized-tree`'s view exactly
(no second implementation). It asserts, in the real window:

| # | Check | Expected |
| - | ----- | -------- |
| 1 | the tree starts collapsed | readout `selected=dir-0 visible=8 open=0` |
| 2 | a real click expands a directory | `visible=48 open=1` |
| 3 | the click keeps the directory selected | readout `selected=dir-0` |
| 4 | a child label still indents inside a virtual row | `file label.x − dir label.x = 16` (±1) |
| 5 | the painted window is smaller than the flattened tree | fewer than 48 painted `dir-` labels |
| 6 | the last child is below the window | `dir-0/file-39` is not painted |
| 7 | a second real click collapses it | `visible=8 open=0` |
| 8 | the collapsed child is no longer painted | `dir-0/file-0` is not painted |
| 9 | a second directory expands | `visible=48 open=1`, `selected=dir-3` |
| 10 | a real wheel moves the virtual list | `listScrollTop[0] > 0` after a `-800` wheel on `vtree-viewport` |
| 11 | the wheel unpaints the rows above the window | `dir-0` is not painted |
| 12 | an exact jump anchors the list | `scrollToItem("vtree-list", 25)` → anchor `[25, 0, 280]` |
| 13 | the jumped row is painted | `dir-3/file-24` is painted |
| 14 | a real click on a child focuses it | `focused() = vtree-node-dir-3/file-24` |
| 15 | the child is the selection | readout `selected=dir-3/file-24` |
| 16 | Down moves native focus to the next child | `vtree-node-dir-3/file-25` |
| 17 | Down moves the selection with it | `selected=dir-3/file-25` |
| 18 | Up moves native focus back | `vtree-node-dir-3/file-24` |
| 19 | a jump to the head anchors at 0 | `scrollToItem("vtree-list", 0)` → anchor index `0` |
| 20 | a real click collapses the open directory | `visible=8 open=0` |
| 21 | Right on a collapsed directory expands it | `visible=48 open=1` |
| 22 | Right on an open directory focuses its first child | `vtree-node-dir-3/file-0`, `selected=dir-3/file-0` |
| 23 | Left on a file moves to its parent directory | `vtree-node-dir-3` |
| 24 | Left on an open directory collapses it | `visible=8 open=0` |
| 25 | the collapsed children are unpainted | `dir-3/file-0` is not painted |

**Not asserted live (measured reason, plan `197`):** row background colour and
`aria-expanded`. The live renderer exposes no style and no accessibility dump;
those stay in `virtualized-tree`.

## 3. Changes, file by file

### 3.1 `apps/playground/src/scenarios/virtual-tree.tsx`

One measured amendment expected (confirm on the first run before adding it):
give the 280 px wrapper that holds `vtree-list` `testId="vtree-viewport"`.
A `<virtual-list>` has no painted bounds in the live automation tree (plans
`350`, `532`, `534`), so the live wheel needs a painted box over the list. The
wrapper is already the list's flex parent; the testId adds no headless
assertion and changes no geometry.

If the first live run shows the wheel reaches the list through a painted row,
leave the view untouched and record that in §6 instead.

### 3.2 `apps/playground/src/live/scenarios.tsx`

1. Import `virtualizedTreeScenario` from `../scenarios/virtual-tree.js` beside
   the other scenario imports.
2. Add one `const liveTree: LiveScenario` after `treeReorder`:
   - `id: "live-tree"`, `capability: "tree"`,
     `title: "Live virtualized tree: expansion, a real wheel and roving focus"`;
   - `view: virtualizedTreeScenario.view`, `ready: "vtree-node-dir-0"`;
   - `steps` exactly the §2 table, using the existing helpers (`settle`,
     `boxOf`, `textOf`, `focusedOf`, `waitForAnchor`, `LIVE_ARTIFACTS`);
   - one screenshot: `${LIVE_ARTIFACTS}/${liveTree.id}.png`.
3. Append `liveTree` to `liveScenarios` after `treeReorder`.
4. Add plan `559` to the header comment's list of what a live window asserts.

Use literals for every expected number (`16`, `48`, `25`, `280`), never the view's
constants: plan `526` measured that asserting a painted metric against the model
constant it came from can let a mutation pass.

### 3.3 `apps/playground/README.md`

Add a short "Live virtualized tree" subsection near the other Tier 3 probes: the
headless `virtualized-tree` result, then the live twin's checks. Update the
live-suite paragraph: the registry now lists **61** scenarios, the last full
live run stays **60/60** until a merge gate runs the new one, and this task runs
`--only live-tree`.

### 3.4 `COMPONENTS.md`

- Capability table: `| tree | `tree-view`, `virtualized-tree`, `live-tree` | verified |`.
- Tree views row: append the live sentence — a real click expands and collapses,
  a real wheel re-windows the flattened 48-row tree and moves its anchor, and
  clicks plus arrows move native focus row by row.
- File trees and Virtualized hierarchical data rows: cite `live-tree` for the
  live half of the roving index.

### 3.5 `TODO.md`

Add under the playground workstream and tick it in the same commit:

```
`[x]` Prove the **virtualized tree in a real window** per plan `559`:
      `live-tree` ... <measured checks>, live registry `60 → 61`; <mutation proofs>
      Focused id: `live-tree`.
```

### 3.6 `.agents/slop/plans/README.md`

Add the plan row after `558`, extend the playground number paragraph with
`555`–`559`, and mark this plan **landed** with its measured totals when done.

## 4. Commands and expected results

From the worktree root, while iterating:

```sh
nub run --filter playground build
# expect: exit 0 (testing build, vendor, binding pin, tsc).

nub apps/playground/dist/live/run.js --list | wc -l
# expect: 61 (was 60).

nub apps/playground/dist/live/run.js --only live-tree
# expect: 1/1 scenarios passed · capabilities: tree=verified, exit 0,
#         one screenshot at apps/playground/.artifacts/live/live-tree.png.
```

Baseline + reused-view guard:

```sh
nub apps/playground/dist/live/run.js --only live-input
# expect: 1/1, exit 0 (the window and the pinned binding are healthy).

nub apps/playground/dist/smoke/run.js --only virtualized-tree
# expect: 1/1 scenarios passed · tree=verified, exit 0.
```

End of task:

```sh
nub apps/playground/dist/smoke/run.js        # full headless: 101/101
nub run check
nub run lint
nub run test
# expect: exit 0 each; record the playground test count.
```

Do **not** run the full live suite (merge/release gate): this task adds one live
scenario, not a harness contract.

## 5. Test plan

The scenario **is** the test: `live-tree` fails the run (`exit 1`, the check
label in the report) when a mechanism breaks. Two-direction proofs, each run
with `--only live-tree` and reverted:

| Mutation | Must fail with |
| -------- | -------------- |
| M1 — remove the `toggle(node)` call from the directory row's `onClick` | `a real click expands a directory` (`visible=8` stays) |
| M2 — remove `focusNode(node.id)` from `select` | `a real click on a child focuses it` (`focused=none` or the previous row) |
| M3 — change the child indent from `16` to `8` | `a child label still indents inside a virtual row` (`expected 16 ± 1, got 8`) |

No unit test is added: the scenario is pure orchestration over the host verbs,
and every pure rule already lives in the view it reuses.

## 6. Results

All §4 commands matched (2026-10-19):

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | exit `0` (testing build, vendor, binding pin current, `tsc`) |
| `nub apps/playground/dist/live/run.js --list \| wc -l` | **61** (was 60) |
| `nub apps/playground/dist/live/run.js --only live-tree` | **1/1**, `tree=verified`, **44 checks**, ~2.0 s, exit `0`, twice consecutively; screenshot at `.artifacts/live/live-tree.png` |
| `nub apps/playground/dist/live/run.js --only live-input` | **1/1**, `input=verified`, exit `0` (the window and pinned binding are healthy) |
| `nub apps/playground/dist/smoke/run.js --only virtualized-tree` | **1/1**, `tree=verified`, exit `0` |
| `nub apps/playground/dist/smoke/run.js` | **101/101**, **3536 checks**, exit `0` (the `vtree-viewport` testId adds no assertion) |
| `nub run check` / `lint` / `test` | exit `0` each; playground **32 files / 408 tests**, components 308, primitives 282 |

Three mutation proofs, each observed with `--only live-tree` and reverted:

- **M1** — `toggle(node)` removed from the directory row's `onClick` → `a real
  click expands a directory: expected a string containing "visible=48 open=1",
  got "selected=dir-0 visible=8 open=0"`, exit `1`.
- **M2** — `move`'s `onSome: select` replaced with a no-op → `Down moves native
  focus to the next child: expected "vtree-node-dir-3/file-25", got
  "vtree-node-dir-3/file-24"`, exit `1`. (The click's own focus is native, so
  removing `focusNode` from `select` alone would **not** fail the click check;
  the roving move is the load-bearing path, and this is the mutation that
  proves it. Note: deleting the `focusNode` call made `tsc` fail on the unused
  helper before the run, which is why the mutation targets `move`.)
- **M3** — the child indent changed from `16` to `8` → `a live virtual row still
  indents its child: expected 16 ± 1, got 8`, exit `1`.

**Measured amendment:** the list anchor reports a **260 px** viewport, not the
wrapper's declared `280`. The 280 px wrapper is a flex child in a 340 px column
with two readouts and gaps, so it shrinks; `scrollToItem(25)` therefore reads
`[25, 0, 260]`. The check now asserts the measured value and its label says
"flex-resolved". The 280 in §2/§4 was the declaration, not the measurement.

The view gained `testId="vtree-viewport"` on the wrapper that already held
`vtree-list` — the plan-`350`/`532`/`534` rule for a live wheel and a painted
box. It adds no headless assertion and changes no geometry (the headless
`virtualized-tree` stays 31/31). The first live run needed no other change.

## 7. STOP conditions

- The live runner exits `2` (no window) or the binding provenance check fails.
  STOP: no evidence was produced; do not claim the checks passed.
- A real click on a tree row focuses nothing. Record the measured target. The
  plan then authorises **one** view change: the row's `onClick` calls
  `renderer.focusElement` (the view already does this in `select` for keyboard
  moves), and the check still asserts the row id — never "some element".
- A real wheel cannot move the list even with the `vtree-viewport` wrapper.
  STOP and record it; the composition change (a dedicated scroller) is a
  separate plan.
- The fixed-size wrapper cannot paint 48 rows consistently. Record the measured
  painted count; do not replace the virtual list with a plain list.
- A §2 literal is wrong (indent, anchor, row height). Record the measured value,
  amend §2 and §6, and say so — a measurement is not a defect, but an
  unrecorded one is.
- Any change is needed outside the §3 paths. STOP; add a cross-team task to
  `TODO.md` instead of editing another workstream's files.

## 8. Acceptance

- `--only live-tree` is `1/1`, `tree=verified`, exit `0`, with the measured
  check count recorded in §6, `TODO.md` and `COMPONENTS.md`.
- Three mutation proofs fail in the stated direction and the restored code is
  green.
- `--only virtualized-tree` and the full headless suite stay green;
  `nub run check`, `nub run lint` and `nub run test` pass.
- No full live total is claimed; the registry count and the last full-run total
  are both stated.
