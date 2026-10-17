# 165 — Plan: a virtualized tree (file tree / hierarchical data)

| Field | Value |
| ----- | ------- |
| Status | landed (measured facts in §8) |
| Phase | B (feasibility) → feeds Tier 4 File tree, Tier 5 Virtualized hierarchical data |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `152` (virtual rows/lag), `153` (tree indentation/keys), `158` (roving focus in a virtual list) |
| Feeds | the Tier 4 File tree and Tier 5 Virtualized hierarchical data rows; any data-grid tree mode |

## 1. Goal

The three pieces exist separately: `tree-view` proves indentation, expand/
collapse and key delivery on a short flat `<div>` list (`153`); `virtual-list`
proves a window of rows and `virtualized-table` a fixed-width virtualized grid
(`152`); `roving-focus` proves programmatic focus and that focus survives the
window scrolling past it (`158`). No probe has combined them.

A file tree is exactly that combination, and two questions are new:

1. Does `paddingLeft` still indent exactly when the row is inside a
   `<virtual-list>` (no extra layout or clipping of the padding)?
2. Does **changing the row count** (expand 40 children, collapse them) leave the
   virtual list consistent — the flattened order, the painted window and the
   roving focus — or does the window go stale?

The honest limit this probe records: the accessibility tree follows the painted
window (`a11y-tree`), so an off-window tree row is invisible to assistive
technology; the probe asserts the keyboard path, not an a11y claim.

## 2. Scenario `virtualized-tree` (capability `tree`)

New view `apps/playground/src/scenarios/virtual-tree.tsx`. The data is **8
directories × 40 files** (`dir-0`…`dir-7`, `dir-N/file-M`), row height **32**,
list viewport **320×280** (≈ 8 painted rows). `dir-0` starts expanded.

Tree contract implemented by the probe (the component's, not a host helper):

| Action | Result |
| ------ | ------ |
| click a row | selects it; native focus lands on it; a directory toggles |
| Down / Up | selection and **native focus** move to the previous/next visible row |
| Right | on a collapsed directory expands it; on an expanded directory moves to its first child |
| Left | on an expanded directory collapses it; on a file moves to its parent directory |
| Enter | toggles a directory |

Rows are `role="treeitem"`, `aria-level={depth + 1}`, `aria-expanded` on
directories, `tabIndex={selected ? 0 : -1}`, label text `testId`
`vtree-label-<id>` at `paddingLeft: 4 + depth * 16`. The label text is the full
id so painted entries are unambiguous.

Steps:

1. Initial readout `selected=dir-0 visible=48 open=1` (8 dirs + 40 children).
2. Indentation: `vtree-label-dir-0/file-0` x − `vtree-label-dir-0` x = **16**
   px (±1). (The file is at flattened index 9; step 3 brings it into the
   window.)
3. The window is a window: the painted labels starting with `dir-` are fewer
   than 48 and do not contain `dir-0/file-39` (the last child).
4. Click `dir-0` (visible row 0) → collapsed: `visible=8 open=0`; painted labels
   contain all eight directories and not `dir-0/file-0`.
5. Click `dir-3` → expanded: `visible=48 open=1`; a child paints after a scroll
   (step 6).
6. `host.wheel("vtree-list", 0, -800)` → the window shows `dir-3`'s children;
   `dir-3/file-24` is painted, `dir-0` is not.
7. Click `dir-3/file-25` → `selected=dir-3/file-25`, native focus on that row.
8. Down → `selected=dir-3/file-26` and focus `vtree-node-dir-3/file-26`.
   Up → back to `file-25` (both selection and focus).
9. Scroll the window back up (`wheel +320`): the window is
   `file-12 … file-20` (assert `file-12` paints, `file-24` no longer paints),
   and the **focused** `file-22` stays painted outside the window (the
   straggler `roving-focus` measured). Then Down moves the selection and focus
   to `file-23` — the roving index, not the paint window, drives movement.
10. Scroll back (`wheel +800`), click `dir-3`, `key("left")` → collapsed:
    `visible=8`, `open=0`, and `dir-3/file-0` is not painted.
11. Click `dir-3`, `key("right")` → expanded again: `visible=48 open=1`; then
    `key("right")` again → selection moves to `dir-3/file-0` and focus follows.
12. On `dir-3/file-0`, `key("left")` → selection and focus return to `dir-3`.

## 3. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/165-virtualized-tree.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `165` |
| `apps/playground/src/scenarios/virtual-tree.tsx` | the view + the scenario |
| `apps/playground/src/scenarios/index.ts` | register it (capability `tree`, already required) |
| `apps/playground/src/smoke/run.test.ts` | registry expectation gains the id |
| `apps/playground/README.md` | scenario count `30 → 31`; a fact row and a short section |
| `COMPONENTS.md` | File tree / Virtualized hierarchical data rows cite the probe; capability table stays `tree` |
| `TODO.md` | tick the task; suite count updated |

No change outside `apps/playground`, `packages/testing` and the ledgers. No new
capability string and no `SmokeHost` member.

## 4. Commands and expected results

1. `nub run --filter playground check-types` → exit `0`.
2. `nub run --filter playground build` → exit `0`.
3. `nub apps/playground/dist/smoke/run.js --only virtualized-tree` → `1/1`,
   exit `0`, `tree=verified`.
4. `nub apps/playground/dist/smoke/run.js` → **31/31**, exit `0`.
5. `nub run check`, `nub run lint`, `nub run test` → exit `0`.

## 5. STOP conditions

- **STOP** if `paddingLeft` does not indent inside a virtual row. Record the two
  label bounds; a file tree must indent with an explicit spacer or nested box.
- **STOP** if changing the flattened row count leaves stale rows painted or
  drops the new children. Record `visible`, the painted labels and the first
  wrong id; the list needs a remount key or an explicit row count.
- **STOP** if `focusElement` cannot focus a row whose index moved after an
  expand/collapse. Record the focused id and the registry state; the component
  must re-register rows after a count change.
- **STOP** if a keyboard move requires the target row to be painted. Record the
  focus sequence; the roving index must be independent of the window.
- **DO NOT** scroll with `scrollTo` to fake the roving move. The wheel and the
  key are the gestures under test.

## 6. Test plan (two directions)

- The scenario fails if indentation is lost, if the painted window does not
  follow a count change, if a key does not move native focus, or if collapsing
  leaves children painted.
- Two-direction proof, recorded in §8:
  1. hard-code `paddingLeft` to `4` → the indentation check fails. Restore.
  2. drop the `focusIndex` call from the Down branch → the focus checks fail
     with the old focused id. Restore.
  3. skip the `visible` recomputation on expand (keep the initial flat list) →
     the `visible=48` and painted-child checks fail. Restore.
- `scenarioProblems` (unit, exists) stays green: the capability is already
  required and the id is new.

## 7. Acceptance criteria

- `virtualized-tree` is registered, green, and the suite is **31/31**.
- The three two-direction proofs are recorded in §8.
- `COMPONENTS.md`, the app README and `TODO.md` cite the measurement.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Measured facts

**Suite: 31/31 green on this host, exit `0`**, `tree=verified` (now two
scenarios), with the 30 prior scenarios unchanged. `virtualized-tree` records
**27 checks**.

| Question | Measured |
| -------- | -------- |
| Does `paddingLeft` indent inside a virtual row? | **yes** — the child label is exactly **16 px** right of the directory label, ±1 |
| Does expanding change the flattened count? | **yes** — `visible` 8 → 48 on `dir-0`, back to 8 on collapse, and 48 again on `dir-3` |
| Does the window follow the count change? | **yes** — the collapsed child is not painted; after expanding 40 rows and scrolling, `dir-3/file-24` paints and `dir-0` does not |
| Does a click focus a child? | **yes** — `vtree-node-dir-3/file-22` |
| Do arrows move selection **and native focus**? | **yes** — Down → `file-23`, Up → `file-22`, in a row whose index shifted by an expansion |
| Does focus survive outside the window? | **yes** — at scroll `-512` the window painted `file-12 … file-20` **plus the focused `file-22`** (the straggler), and Down still moved focus to `file-23` |
| Does Right from an open directory move to its first child? | **yes** — `dir-3` → `dir-3/file-0` |
| Does Left on a file move to its parent? | **yes** — `dir-3/file-0` → `dir-3` |

The one limit, unchanged from `a11y-tree` and `roving-focus`: an off-window row
is not in the accessibility tree, and the focused straggler is painted but not
part of the visible window — a virtualized file tree must treat "painted" as
"window **plus** the focused row", exactly as `COMPONENTS.md` records.

**Two-direction proofs** (all run, outputs quoted):

1. hard-coding `paddingLeft` to `4`: **exit `1`**, `a virtual row still indents
   its child by one step: expected 16 ± 1, got 0`. Restored.
2. removing `focusNode` from `select`: **exit `1`**, `Down moves native focus to
   the next child: expected "vtree-node-dir-3/file-23", got
   "vtree-node-dir-3/file-22"` — the state moved, the native focus did not.
   Restored.
3. freezing the flattened list (`visibleTreeNodes(NODES, [])`): **exit `1`**,
   `expanding a directory adds its children: expected a string containing
   "visible=48 open=1", got "selected=dir-0 visible=8 open=1"`. Restored.

**Not measured:** drag-and-drop reordering inside the tree, multi-select, and
lazy child loading — each is the component's own contract.

