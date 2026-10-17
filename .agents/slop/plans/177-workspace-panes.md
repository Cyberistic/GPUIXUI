# Plan 177 — tabbed panes: hide vs unmount, focus across panes, nested scrolling and a resized list

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B → D (Tier 4 **Tabbed panels**, **Workspace layouts**, **Docking
layouts**; Tier 3 **Virtualized lists**).
**Depends on:** plans `100`, `110`, `120`, `140`, `152`, `158`, `166`, `167`, `175`.

## 1. Why this plan exists

Every mechanism a tabbed workspace needs has been measured **in isolation**:
splits resize (`panel-nested`), tabs are tab stops and the roving strip reveals
the active one (`tab-strip-focus`), a virtual list re-windows on scroll
(`virtual-list-window`), a remount restores state from JSON
(`workspace-restore`). Nothing has measured what happens when those pieces are
composed, and three composition facts decide the component API:

1. **Hide vs unmount.** A tabbed panel that unmounts an inactive pane loses its
   scroll anchor, its draft text and its selection — `workspace-restore` proves
   a remount loses state. If `display: "none"` works, the pane keeps its state
   and the tab switch is a re-display; if it does not, the component must hoist
   per-pane state itself. This is a **pivotal** API decision for `docking`.
2. **A hidden pane must leave the tab order.** If a `display: "none"` subtree
   still exposes tab stops, Tab walks into an invisible pane. `focusNext`
   measured across visible rows only.
3. **Scroll chaining.** A log or inspector pane is a scroll container inside a
   workspace. If a wheel at its boundary chains into the ancestor scroller, a
   nested pane cannot own its edge, and the component needs a wheel guard
   (`pointerEvents`).
4. **A resized pane re-windows its virtual list.** `virtual-list-window` used a
   fixed viewport; a split drag changes a pane's height. If the painted window
   does not update, a resizable data pane paints stale or clipped rows.

It also settles whether a hidden pane keeps a `<virtual-list>` anchor, because a
tab switch is the common case in a workspace and the answer is not derivable
from the remount result.

## 2. What is built

One scenario, `workspace-panes` (capability `workspace`), in
`apps/playground/src/scenarios/workspace-panes.tsx`.

### 2.1 The view

The frame is the real test window; the shell is 640 × 420.

- **A vertical `SplitPane`** (`orientation="vertical"`, initial `240`, min
  `160`, max `320`, `label="workspace"`) with:
  - **top**: a tab strip (`ws-tab-tree`, `ws-tab-editor`) plus a pane area.
  - **bottom**: `ws-log-outer` — `overflowY: "scroll"`, 320 px tall, containing
    `ws-log-inner` — 160 px tall, `overflowY: "scroll"`, 60 rows
    (`ws-log-row-<i>`).
- **The tab strip** is two `Pressable`s. The readout `ws-readout` is
  `active=<id> top=<px> guard=<on|off>` and `ws-log-guard` toggles the wheel
  guard that step 7 measures.
- **The two panes overlap absolutely** in a positioned body box. The inactive
  slot is `visibility: "hidden"` with `pointerEvents: "none"`; the active one is
  `visible`/`auto`. **The plan first tried `display: "none"` — the runtime
  ignores it (§8), so the slots use visibility, which is the measured
  mechanism.**
- **Tree pane** (`ws-pane-tree`): `ws-tree-action` (a focusable `Pressable`), a
  `<virtual-list testId="ws-tree" estimatedItemHeight={24}>` of
  `ws-tree-row-<i>` rows (plain `div`s), and `ws-tree-pick` state set by a row
  click. Its state lives **inside** the pane, so an unmounting switch loses it.
- **Editor pane** (`ws-pane-editor`): `<input testId="ws-editor">` (controlled
  `draft`, state inside the pane) and a `ws-draft` readout.
- **The tab switch is a display change, not a keyed remount** — the point of the
  probe. Heights are explicit (`top − 46`, `394 − top`), because a
  `height: "100%"` chain through the split, the strip and two flex levels does
  not give the list a viewport (§8).

### 2.2 The steps

1. Initial: `active=tree`, `text("ws-pane-tree")` non-empty, the editor is not
   painted (`paintedText` lacks the editor's own marker text), painted tree rows
   > 0. Record the painted row count as `N0`.
2. Click `ws-tree-row-5` → `pick=5`. Drag `workspace-divider` by `dy = -60`
   (top `240 → 180`). The painted tree row count drops (a shorter viewport) and
   the tree's anchor is still row `0` at the same in-row offset. Record `N1`.
3. `scrollToItem("ws-tree", 20)`; record `listScrollTop` (expect index `20`).
4. Click `ws-tab-editor`: `active=editor`, the tree pane is not painted
   (`paintedText` lacks the tree marker), the editor pane is painted. Type
   `notes` into `ws-editor` → `draft=notes`.
5. Click `ws-tab-tree`, then `ws-tab-editor` again: the draft still reads
   `draft=notes` (state preserved across the switch). `pick` is still `5` and
   the tree anchor is still row `20` — a hidden pane keeps its list state.
6. Tab order skips the hidden pane: with the editor active, click
   `ws-tab-editor` and `focusNext` → `ws-editor`, **not** `ws-tree-action`.
   With the tree active, a walk from the strip reaches `ws-tree-action`.
7. Nested scrolling: `wheel("ws-log-inner", 0, -240)` scrolls the inner list to
   `-240` **and** the outer to `-240` (chaining). A wheel on a visible outer row
   (`ws-log-row-10`, `+240`) returns the outer to `0` while the inner keeps its
   offset; a wheel on the inner returns it to `0`. Then `ws-log-guard` turns on
   `pointerEvents: "auto"` on the inner: the same wheel scrolls the inner and
   leaves the outer at `0`, the inner clamps at `-480`, and a further wheel does
   not chain.
8. A second `scrollToItem("ws-tree", 30)` after switching back, then a resize
   back to `240` (`dy = +60`): the painted row count grows again and the anchor
   survives the resize.

### 2.3 The host calls

The steps need one existing method the shared harness already exposes:
`scrollOffset` (for both scrollers). No new host method is expected; if one is,
§5 applies.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/workspace-panes.tsx` | new view + `workspace-panes` steps |
| `apps/playground/src/scenarios/index.ts` | register the scenario |
| `apps/playground/src/smoke/run.test.ts` | assert `workspace-panes` is registered |
| `apps/playground/README.md` | scenario list, `45 → 46`, a tabbed-panes row |
| `COMPONENTS.md` | the `workspace` capability row, Tier 3 virtualized lists, Tier 4 tabbed panels / workspace layouts |
| `TODO.md` | add and tick the task; progress `40/47 → 41/48` |
| `.agents/slop/plans/README.md` | index this plan |

No change outside the owned paths. `panels/split-pane.tsx` is reused unchanged.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground build` | clean build |
| `nub apps/playground/dist/smoke/run.js --only workspace-panes` | green, exit `0`, `workspace=verified` |
| `nub apps/playground/dist/smoke/run.js` | `46/46 scenarios passed`, exit `0` |
| `nub run --filter playground test` | registry test green |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proofs** (record the failing label and exit code):

1. Make the inactive pane unmount (`active === "tree" ? … : null` instead of
   `display: "none"`): the run must exit `1` on the draft-preservation check.
2. Give the hidden pane a focusable element that is **not** gated by the display
   rule (e.g. always render `ws-tree-action` outside the hidden subtree) — or
   remove the display from the tree pane — so `focusNext` reaches
   `ws-tree-action`: the run must exit `1` on the tab-order check.
3. Make the resize a no-op (`SplitPane` `onResize` ignored): the run must exit
   `1` on the painted-row-count check.

## 5. STOP conditions and branches

- **`display: "none"` does not hide the subtree** (its text still paints): STOP
  the hide/unmount contract, record it, and implement the honest alternative —
  the component owns per-pane state (the `workspace-restore` route). The
  scenario keeps the state-preservation checks only if they hold.
- **A hidden subtree still exposes tab stops**: record it and keep the measured
  behaviour in §8; the component must add `tabIndex={-1}`/omit controls when
  hidden. Do not assert a tab order that did not happen.
- **The wheel chains into the outer scroller**: assert the measured destination
  and record the rule — a nested pane must guard its edge (`pointerEvents:
  "auto"` blocks the wheel; the type documents that). The check becomes the
  measured fact, not the wish.
- **A resized pane does not re-window its list** (painted rows unchanged or
  painted outside the pane): record the measured bounds/count; a virtualized
  pane then needs an explicit remount key or a scroll call, which is a component
  finding.
- **`drag` on the divider needs a different delta path** (the split is
  vertical): the existing `panel-nested` measurement says `dy` works; if it does
  not, STOP and record.
- **A change outside the owned paths is required**: record it in `TODO.md`; do
  not edit it.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `workspace-panes` | native smoke | an unmounting tab switch that loses state; a hidden pane that still paints or keeps tab stops; a resize that does not re-window the list; a nested scroller whose wheel escapes to its ancestor; a list anchor lost across a switch or a resize |
| two-direction runs (§4) | native smoke | the checks passing when the pane unmounts, the hidden pane stays focusable, or the resize is ignored |
| registry assertion | unit (`apps/playground`) | the scenario falling out of the registry |
| full suite | native smoke | the composed view breaking the existing workspace/tab/panel scenarios |

## 7. Acceptance criteria

- `workspace-panes` is registered, green, and its measured facts are in §8, the
  app README and `COMPONENTS.md`.
- The suite is **46/46**, exit `0`; `workspace=verified`.
- All three two-direction proofs are recorded with the failing label and exit
  code.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome

Executed on this host on 2026-10-17; **46/46 green**, exit `0`,
`workspace=verified` in `.artifacts/smoke-report.json`. `workspace-panes`
records **29 checks**.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **`display: "none"` is a no-op in GPUix 0.10.0.** The pinned source
  (`packages/native/src/renderer.rs`, `apply_styles`) maps `display` only for
  `"flex"` and `"grid"`; anything else falls through. Rendered with
  `display: "none"`, the inactive editor pane still laid out
  (`y = 205.5`, `height = 78`) and painted its text, and it **stole the click**
  meant for the tree row underneath it. A tabbed panel must not hide panes this
  way. This is the reason the plan's first draft failed and why the scenario now
  measures visibility instead.
- **The honest mechanism is absolute slots + `visibility: "hidden"`.** Panes
  overlap in a positioned body box; the inactive slot is `visibility: "hidden"`
  (`el.invisible()` in the binding) with `pointerEvents: "none"`. The hidden
  pane leaves the paint (`Editor pane` absent from `getPaintedText`) and keeps
  its state, because the element is never unmounted.
- **A hidden pane keeps everything local to it.** Its draft (`draft=notes`), its
  pick (`pick=2`) and its `<virtual-list>` anchor (index `20`) all survive a
  switch away and back. An unmounting switch loses the pane (two-direction
  proof 1).
- **`visibility: "hidden"` also removes the tab stop.** With the editor active,
  `focusNext` from `ws-tab-editor` reaches `ws-editor`; with the tree active the
  walk reaches `ws-tree-action`. An attempt to force the point by giving the
  hidden slot `tabIndex={0}` did **not** create a stop, so the runtime's
  invisible subtree is skipped by traversal as well as by paint — the tab-order
  check is a guard for a different hiding mechanism, and the runtime offers no
  invisible-yet-focusable pane. Proof 2 below therefore records the inverse
  direction (an input that leaves the order).
- **A nested scroller does not own the wheel by default: it chains.**
  `wheel(inner, −240)` moved **both** the inner and the outer to `−240`. That is
  the fact a workspace must design around: a log pane inside a scrolling shell
  would scroll its page.
- **`pointerEvents: "auto"` is the wheel guard.** With it on the inner scroller,
  the same wheel scrolled only the inner (outer stayed `0`), the inner clamped at
  `−480` (30 rows × 20 px in a 120 px viewport) and a further wheel did not
  chain. The type's documentation for `pointerEvents` is therefore correct on
  this host.
- **A resized pane re-windows its list.** The top pane `240 → 180` reduced the
  painted tree rows `5 → 2`; the list anchor survived (row `0`, then `30` after
  `scrollToItem`), and the second resize back to `240` grew the window again.
  The painted window follows the **clipped intersection**, not only the list's
  own height: with the list fixed at `120` the count still dropped with the
  pane, which is why proof 3 must freeze the pane height too.
- **Explicit heights are required through a tab strip.** A `height: "100%"` /
  `flexGrow` chain through the split's pane, the strip and two nested flex levels
  gave the virtual list no viewport (one row painted); deriving the content
  height from the split size (`top − 46`, and `394 − top` for the log) made the
  layout exact. A real tabbed panel should pass a measured height down, not rely
  on percentage resolution.

Two-direction proofs:

1. Unmounting the inactive editor pane (`active === "editor" ? <EditorPane/> :
   null`) made the run exit `1` with
   `the inactive editor pane stays mounted: expected true, got false`; the draft
   check would fail next. Restoring the always-mounted slot made it green.
2. Removing the editor input from the tab order (`tabIndex={-1}`) made the run
   exit `1` with
   `a hidden pane leaves the tab order: expected "ws-editor", got "ws-log-guard"`.
   The hidden-slot `tabIndex={0}` experiment is recorded above as a measured
   negative (it did not become a stop).
3. Freezing the tree pane's height (`<TreePane height={194} />`) so a split drag
   cannot re-window it made the run exit `1` with
   `a shorter pane paints fewer virtual rows: expected true, got false`;
   restoring the derived height made it green.

No change outside the owned paths.
