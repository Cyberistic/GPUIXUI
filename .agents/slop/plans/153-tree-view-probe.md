# Plan 153 — the tree-view probe (Tier 3 feasibility)

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B (feasibility) → feeds D (`packages/data-grid`, `packages/docking`).
**Depends on:** plans `130` (probe conventions), `140` (measured input facts),
`152` (painted-row selection).

## 1. Why this plan exists

`tree` is already a declared capability in `@gpuixui/testing`, but **no scenario
covers it**: the Tier 3 "Tree views" and Tier 4 "File trees" rows in
`COMPONENTS.md` carry `?` for GPUix support. A tree is the last Tier 3 primitive
that has had no native measurement at all.

The composition is pure React (indentation, expand/collapse state, keyboard
handling), so the risk is not "is there a tree element" — it is whether the
layout and input paths the data-grid/file-tree components will use actually
work: does per-depth indentation produce the expected x offsets, does toggling
a node paint and unpaint its subtree, and does a clicked row receive the
arrow-key events a tree keyboard contract needs.

## 2. What is built

One scenario, `tree-view` (capability `tree`):

- Six flat nodes with an explicit `depth`: `src` (0), `src/app.tsx` (1),
  `src/components` (1), `src/components/button.tsx` (2),
  `src/components/card.tsx` (2), `README.md` (0). `src` starts expanded,
  `src/components` starts collapsed.
- Visible nodes are a pure `visibleNodes(expanded)` function over the flat list:
  a node is visible when every ancestor is expanded. The readout
  `tree-readout` reports `selected=<id|none> visible=<count>`; the header note
  `tree-note` states the honest keyboard limitation (below).
- Each row is `testId={`tree-node-${id}`}`, `tabIndex={0}`, with
  `paddingLeft: depth * 16 + 4`, a chevron for directories, and its label in a
  `<text testId={`tree-label-${id}`}>`.
- Clicking a row selects it; clicking a directory also toggles it. `onKeyDown`
  on every row acts on the **selected** node: `down`/`up` move selection through
  the visible rows, `right` expands, `left` collapses, `enter`/`space` toggles.
- Steps:
  1. the initial visible set is `src`, `app.tsx`, `components`, `README.md`;
     `button.tsx` is not painted;
  2. indentation is real: the label x of `app.tsx` minus the label x of `src`
     is `16 ± 1` (a nested label for depth 2 is 32 ± 1 below the root);
  3. click `src/components` → `button.tsx`/`card.tsx` are painted and the
     readout's `visible` becomes `6`; click again → they are gone, `visible=4`;
  4. click `src/app.tsx` (selection), then `key("down")` and `key("up")` change
     the readout's selection through visible nodes only;
  5. click `src/components` again and `key("left")` collapses it, `key("right")`
     expands it; the painted labels follow.

## 3. Exact files

### 3.1 `apps/playground/src/scenarios/tree.tsx` (new)

The probe, its pure `visibleNodes` helper and its `PlaygroundScenario`. Pure
helpers use `Arr`/`Option`; no GPUix type is imported. The expansion state is
`ReadonlyArray<string>` compared with `Arr.contains`; selection is an `Option`.

### 3.2 `apps/playground/src/scenarios/index.ts` (change)

- Add `"tree"` to `PROBE_CAPABILITIES` (the Tier 3/4 coverage list), so a
  registry without a tree scenario is an integrity error.
- Import and append `treeScenario`.

### 3.3 Documentation and ledgers (change)

- `apps/playground/README.md`: scenario list and count (17), structure line,
  the measured facts (indentation, expand/collapse repaint, keyboard delivery).
- `COMPONENTS.md`: evidence table gains a `tree` row; the Tier 3 "Tree views"
  row's GPUix-support cell becomes the probe verdict; suite count 17.
- `TODO.md`: tick the item, update the progress bar.
- `.agents/slop/plans/README.md`: index this plan.
- Plan `130` §8: point the data-grid/docking plans at this probe.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground check-types` | no type error |
| `nub run --filter playground build` | `tsc` emits `dist/` |
| `nub apps/playground/dist/smoke/run.js --only tree-view` | passes, `tree=verified`, exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `17/17 scenarios passed`, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proof.** Temporarily make `visibleNodes` return only the roots
(or drop the directory toggle) and run `--only tree-view`: it must fail with a
named check and exit `1`. Restore: green again.

## 5. STOP conditions

Stop and report with evidence if:

- **Indentation is not honoured** (`paddingLeft` does not shift the label).
  Record the measured x values in plan `140` §4; the file-tree plan cannot use
  padding-based depth. Do not fake it with per-depth spacer divs before
  reporting the measurement.
- **A newly expanded subtree is not painted** after `advance`. Record it; do
  not poll or retry indefinitely — the data-grid plan must know.
- **Arrow keys do not reach a clicked row's `onKeyDown`.** The table probe
  measured that they do for its rows; if a tree row differs, record the exact
  gesture and stop rather than moving the handler to the window level.
- **A change outside this workstream is needed** (for example a new host
  method): add it to `TODO.md`, do not edit another package.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `tree-view` steps | native smoke | indentation that does not shift labels; expansion that does not repaint; arrow keys that do not reach the row |
| `scenarioProblems` | unit (exists) | the `tree` capability losing its only scenario |
| full suite | native smoke | a tree probe that disturbs another scenario |

The keyboard caveat is asserted honestly: GPUix cannot move native focus from
component code (`PublicInstance` has no `focus()`), so the probe proves
**key delivery and state**, not focus movement. The `tree-note` readout says so,
and the docs repeat it. A roving-tabindex contract still needs the app to
rebuild focus, which is a runtime limitation, not a component bug.

## 7. Acceptance criteria

- `tree-view` is registered, green, and `tree` is a required probe capability.
- The suite is **17/17 green on this host**, exit `0`.
- The verdict and the keyboard limitation are recorded in plan `140` §4,
  `COMPONENTS.md`, and the app README.
- The two-direction proof was run and recorded.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome (executed on this host, 2026-10-17)

**17/17 green**, exit `0`; `tree-view` records 18 checks and `tree=verified`.

Measured facts (also in plan `140` §4):

- `paddingLeft` is honoured: a depth-1 label sits exactly `16px` right of the
  root label and a depth-2 label `32px` right, within 1px.
- Expanding a directory paints its subtree and collapsing it unpaints it, with
  no extra gesture beyond the click; the readout's visible count is `4 → 6 → 4`.
- A clicked tree row **takes native focus** and receives `down`/`up`/`left`/
  `right` in its `onKeyDown`; selection and expansion follow.
- The keyboard limitation is real and documented: the probe cannot move focus
  to the newly selected row (GPUix exposes no programmatic focus), so a roving
  tabindex contract will need the runtime, not just the component.

Two-direction proof: returning early from the directory toggle produced
`expanding a directory shows its children: expected a string containing
"visible=6", got "selected=src/components visible=4"`, `tree=failed`, exit `1`.
Restored: green, exit `0`.


