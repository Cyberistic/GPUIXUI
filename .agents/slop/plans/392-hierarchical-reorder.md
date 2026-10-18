# Plan 392 — hierarchical drag reorder: into a folder, between rows, and the cycle refusal

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** D/E (Tier 5 `Virtualized hierarchical data`; it closes the composition
the flat reorder left open).
**Depends on:** plans `100`, `110`, `120`, `140`, `152`, `158`, `162`, `165`,
`172`, `189`, `190`, `197`, `391`.

## 1. Why this plan exists

Plan `391` measured a **flat** reorder: a pointer names an insertion boundary,
the source's removal shifts later boundaries, the gesture-ending click must be
suppressed, keyboard lift/arrows/drop is parity, and a `<virtual-list>` reorders
keyed children in place. `virtualized-tree` (plan `165`) measured the other half:
a flattened pre-order tree, 16 px of indentation per depth inside a virtual row,
a changing row count, and a roving focus index.

Neither answers what a **file tree** needs:

1. **Into versus between.** A drop between two rows means "become the target's
   sibling"; a drop *on* a folder means "become its child". What in the pointer
   event separates them, and what does the indicator paint?
2. **The cycle.** Dropping a folder into its own descendant must be refused, not
   silently produce a corrupt tree or an unreachable subtree, and the refusal
   must be visible in the probe's readout.
3. **The derived flat index.** A tree is stored (and virtualized) as a
   **pre-order flat list**. Moving a folder moves its whole subtree and shifts
   every moved node's `depth`; the flattened index after the move is what the
   virtual list and the focus contract index into.
4. **Expand-on-hover.** A collapsed folder is not a legal visual target unless
   it opens while the pointer dwells on it; a drop into a collapsed folder must
   also open it, or the moved node disappears.
5. **The virtual list's anchor.** A tree reorder inside a `<virtual-list>` must
   not lose the reader's row, and opening the target changes the visible count.
6. **Keyboard parity for nesting.** Arrows choose the gap; a modifier chooses
   sibling-versus-child. The flat probe proved the gesture; this proves the
   hierarchical target.

The answer is one pure model, one headless scenario, one live twin, and a
recorded contract — not a component implementation. `COMPONENTS.md`'s
`File trees` and `Virtualized hierarchical data` rows cite the result.

## 2. What is built

### 2.1 New capability

`packages/testing/src/smoke.ts` — add `"tree-reorder"` to `CAPABILITIES`. It is a
distinct verdict from `reorder` (a flat list) and `tree` (flattening and focus).
Add the same literal to `PROBE_CAPABILITIES` in
`apps/playground/src/scenarios/index.ts`, so `scenarioProblems` requires a
scenario for it.

### 2.2 The model — `apps/playground/src/scenarios/tree-reorder-model.ts`

The tree is a **pre-order flat list** with an explicit `depth`, exactly the
shape the virtual list renders and the shape plan `165` flattens into. Inputs:

```ts
export interface TreeItem {
  readonly id: string;
  readonly kind: "dir" | "file";
  readonly depth: number; // 0 = root
}

export interface TreeRow extends TreeItem {
  readonly index: number; // index in the full list
  readonly parent: Option.Option<string>;
}
```

Exports, all pure:

```ts
/** Pre-order rows, with the parent derived from the nearest earlier row at depth − 1. */
export const allRows: (items: ReadonlyArray<TreeItem>) => ReadonlyArray<TreeRow>;

/** The rows that paint: every ancestor of a row is in `expanded`. */
export const visibleRows: (
  items: ReadonlyArray<TreeItem>,
  expanded: ReadonlyArray<string>,
) => ReadonlyArray<TreeRow>;

/** `dir-0,dir-1,dir-1/a` — the order readout the steps assert. */
export const describeRows: (rows: ReadonlyArray<TreeRow>) => string;

/** The index after the last descendant of the row at `index` (exclusive). */
export const subtreeEnd: (items: ReadonlyArray<TreeItem>, index: number) => number;

/** The id of every node in the subtree rooted at `id`, root first. */
export const subtreeIds: (items: ReadonlyArray<TreeItem>, id: string) => ReadonlyArray<string>;

/** Where a drop lands: a row and an edge relative to it. */
export interface DropTarget {
  readonly id: string;
  readonly edge: "before" | "after" | "into";
}

export type MoveRefusal =
  | "missing"
  | "self"
  | "descendant"
  | "not-a-directory"
  | "illegal-depth";

export type MoveResult =
  | { readonly _tag: "moved"; readonly items: ReadonlyArray<TreeItem> }
  | { readonly _tag: "refused"; readonly reason: MoveRefusal };

/** Moves a whole subtree under `target`; the only operation that changes order. */
export const moveSubtree: (
  items: ReadonlyArray<TreeItem>,
  id: string,
  target: DropTarget,
) => MoveResult;

/** The pointer → target rule (3-zone y, indent-step x for `into`). */
export const targetAt: (
  pointer: { readonly x: number; readonly y: number },
  frame: {
    readonly left: number;
    readonly top: number;
    readonly offset: number; // positive pixels scrolled above the viewport
    readonly rowHeight: number;
    readonly indentStep: number;
  },
  rows: ReadonlyArray<TreeRow>,
) => Option.Option<DropTarget>;

/** Where the drop indicator paints, in rows and indent levels. */
export const indicatorAt: (
  rows: ReadonlyArray<TreeRow>,
  target: DropTarget,
) => Option.Option<{ readonly boundary: number; readonly depth: number }>;

/** The flattened visible index of `id`, or `None` when it does not paint. */
export const visibleIndexOf: (
  rows: ReadonlyArray<TreeRow>,
  id: string,
) => Option.Option<number>;
```

**The move rule.** `moveSubtree` finds the source (`from`) and the target row
(`at`), refuses when `at` is inside the source's subtree (`self` when
`at === from`, else `descendant`), and refuses `into` a file
(`not-a-directory`). The insertion point in the full pre-order list is:

| edge | insert before | new depth |
| ---- | ------------- | --------- |
| `before` | the target row | target depth |
| `after` | after the target's whole subtree (`subtreeEnd`) | target depth |
| `into` | immediately after the target row | target depth + 1 |

It removes the source's slice (`from … subtreeEnd`), adjusts the insertion when
it was after the slice, and shifts **every** moved node by
`newDepth − sourceDepth` so the subtree keeps its shape. It then validates the
pre-order invariant (`depth[0] === 0`, `0 ≤ depth[i] ≤ depth[i−1] + 1`) and
returns `refused("illegal-depth")` rather than a corrupt tree. Every target the
pointer/keyboard rules build from a valid row is structurally legal, so this is a
**boundary guard** for a hand-built target or a persisted drag — not a user
mistake. A cycle is caught by the explicit `descendant` branch first (measured:
removing that branch surfaces the corrupt result as `illegal-depth`).

**The pointer rule.** `targetAt` clamps the row index from
`(pointer.y − top + offset) / rowHeight` and computes the fraction inside the
row:

- **`into`** when the row is a directory, the pointer is in the middle 50 % of
  the row (`0.25 ≤ fraction < 0.75`), **and** `pointer.x − left` is at least
  `(depth + 1) * indentStep` — i.e. the pointer is one indent step past the
  row's own label, the same gesture a user makes to drop "inside".
- otherwise `before` in the upper half, `after` in the lower half.

A file never accepts `into`; its middle band falls through to the half rule.
That is the whole rule — no depth guessing from x for a between drop.

**The indicator.** `indicatorAt` places the 2 px line at `boundary * rowHeight`
and indents it by `depth * indentStep`:

- `before row` → the row's visible index, the row's depth;
- `after row` → the visible index one past the row's **visible** descendants,
  the row's depth;
- `into row` → the visible index one past the row, depth + 1.

So "sibling after the folder" and "first child of the folder" paint in different
places, and the readout (`boundary=… depth=…`) makes the difference assertable
without pixels.

### 2.3 The view — `apps/playground/src/scenarios/tree-reorder.tsx`

Export `TreeReorderProbe` so the live twin mounts the same tree.

**Shared state machine.** One hook, two instances (plain and virtual):

```ts
interface Gesture {
  readonly id: string;
  readonly mode: "pointer" | "keyboard";
  readonly target: Option.Option<DropTarget>;
}
```

- `onDown`/`onMove`/`onUp`/`onClick` live on the **handle** (`tree-handle-<id>`),
  because plan `172` measured that a captured move reaches only the pressed
  element.
- A pointer move computes `targetAt(...)` from the list's painted box
  (`ref` + `renderer.getElementBounds`) and the live scroll offset
  (`renderer.getScrollOffset` → negated to positive).
- `onUp` commits `moveSubtree` when the pointer travelled more than 2 px (a
  click is not a drag, plan `391`); it records `moved` or `refused:<reason>` and
  suppresses the gesture-ending click exactly as plan `391` does.
- `Escape` through `useWindowKey` clears the gesture (no move, no indicator).
- **Expand on hover:** a `useEffect` armed by `target.edge === "into"` on a
  collapsed directory opens it after **500 ms**; it is cleared when the target
  changes, the gesture ends, or the row is already open. A drop into a collapsed
  directory opens it immediately in the commit (hover is a convenience, the drop
  is the contract).
- **Keyboard:** `Enter`/Space lifts at the row's subtree end; `Up`/`Down` choose
  the previous/next visible row as a `before` target (or `after` the last row);
  `Right` turns the target into `into` when that row is a directory; `Left`
  turns it back into `after`; `Enter` drops; `Escape` cancels. The handle is the
  tab stop and keeps native focus across the keyed move (plan `391` measured
  that focus follows a keyed reorder without an explicit refocus).
- `tree-reset` restores the initial items, `expanded = []`, and every readout,
  so the sections are independent (the live twin uses it too).

**Section A — a plain tree.** 15 items, `ROW_HEIGHT = 32`, `INDENT_STEP = 16`:

```
dir-0 (dir)      dir-1 (dir)        dir-2 (dir)      dir-3 (dir)
  dir-0/a (file)   dir-1/a (file)     dir-2/a (file)   dir-3/a (file)
  dir-0/b (file)   dir-1/b (file)     dir-2/b (file)   dir-3/b (file)
                   dir-1/sub (dir)
                     dir-1/sub/a (file)
                     dir-1/sub/b (file)
```

- `tree-list` — `position: "relative"` column, width 340.
- `tree-node-<id>` — 32 px row, `key={id}`, `role="treeitem"`,
  `aria-level={depth + 1}`, `aria-expanded` for directories.
- `tree-toggle-<id>` — a 16 px `+`/`−` control on directories only, so a click
  never doubles as a drag.
- `tree-handle-<id>` — 20 × 24 grip, `tabIndex={0}`, `role="button"`,
  `aria-label={`Reorder ${id}`}`; owns every pointer and key handler.
- `tree-label-<id>` — the text, `paddingLeft: 4 + depth * 16`.
- `tree-indicator` — the 2 px absolute line from `indicatorAt`, rendered only
  while a gesture has a target.
- Readouts:
  - `tree-state` — `drag=<id|none> target=<edge>:<id|none> boundary=<n|none>
    depth=<n|none> refused=<reason|none> selected=<id> open=<n> visible=<n>
    size=<n> activations=<n>`
  - `tree-order` — `describeRows(visibleRows(...))`
  - `tree-last` — `id=<id> at=<visible index> depth=<n>
    parent=<id|root>` after the last commit (or `id=none`).
  - `tree-log` — append-only `>`-joined events (`lift:<id>`, `step:<id>`,
    `drop:<edge>:<id>`, `refused:<reason>`, `suppress:<id>`, `expand:<id>`,
    `cancel`).

**Section B — the virtualized tree.** 38 items: `dir-0` with eight files,
`dir-1 … dir-29` empty directories. `V_ROW_HEIGHT = 24`, viewport 240 px,
`dir-0` expanded (`visible=38`).

- `tree-v-list` — `<virtual-list estimatedItemHeight={24}>`; the same row,
  handle, label and toggle testIds prefixed `tree-v-`.
- `tree-v-state`, `tree-v-last`, `tree-v-order`, `tree-v-indicator`.
- The same hook and the same rules; only the frame's geometry and the fixed
  `V_ROW_HEIGHT` differ. The virtual instance is **not** independently
  scroll-targeted in the headless test beyond `scrollToItem`/`wheel`.

### 2.4 The headless scenario

`tree-reorder`, capability `tree-reorder`, title
`"Hierarchical reorder: into a folder, between rows, cycles and the flat index"`.
Steps in order (all read readouts, painted text or `bounds`; no screenshot is an
assertion):

1. **Initial.** `tree-order` is `dir-0,dir-1,dir-2,dir-3`;
   `tree-state` reads `open=0 visible=4 size=15`; no `tree-indicator` bounds.
2. **Open a folder.** Click `tree-toggle-dir-1` → order
   `dir-0,dir-1,dir-1/a,dir-1/b,dir-1/sub,dir-2,dir-3`, `open=1 visible=7`;
   `dir-1/a` paints 16 px right of `dir-1`.
3. **Between rows at depth 0.** Drag `tree-handle-dir-2` to the **upper quarter**
   of `tree-node-dir-1`, x = the list's left + 4. `tree-state` names
   `target=before:dir-1`; the indicator paints at `dir-1`'s top, depth 0. Release:
   order starts `dir-0,dir-2,dir-1,dir-1/a,…`; `tree-last` is
   `id=dir-2 at=1 depth=0 parent=root`; `dir-2` paints one row below `dir-0` at
   indent 0. The gesture-ending click does not activate (`activations` unchanged)
   and `tree-log` contains `suppress:`.
4. **Into a collapsed folder.** Drag `tree-handle-dir-3` to the **middle** of
   `tree-node-dir-0`, x = `dir-0`'s left + 20 (one indent step past its label).
   `tree-state` names `target=into:dir-0`, `boundary=1 depth=1`; the indicator
   paints one row below `dir-0` at indent 16. Release: `dir-0` opens, `dir-3` is
   its first child — order `dir-0,dir-3,dir-0/a,dir-0/b,dir-2,dir-1,…`,
   `tree-last` `id=dir-3 at=1 depth=1 parent=dir-0`, painted at
   `dir-0.y + 32` and `dir-0.x + 16`; `visible` grew by 2 (the target's own
   hidden children plus the moved row's place).
5. **Cycle refusal.** Drag `tree-handle-dir-1` onto the middle of
   `tree-node-dir-1/sub` (a descendant, indented x). Release: `tree-state` reads
   `refused=descendant`, `drag=none`, the order is unchanged and the indicator
   has no bounds. Repeat onto `tree-node-dir-1` itself → `refused=self`.
6. **Expand on hover.** Drag `tree-handle-dir-2` and hold the pointer over the
   middle of the collapsed `tree-node-dir-1/sub` (indented x). Without
   releasing, a bounded wait sees the probe's `open` count grow and `dir-1/sub/a`
   paint (`tree-log` contains `expand:dir-1/sub`). Press `Escape`: the order is
   unchanged, `drag=none`, and the indicator leaves. Release the pointer
   afterwards.
7. **A subtree keeps its shape.** Drag `tree-handle-dir-1` into `tree-node-dir-2`
   (middle + indented x). Assert `tree-last` is
   `id=dir-1 at=2 depth=1 parent=dir-2`; after opening `dir-1/sub`, the moved
   root's label paints at `dir-2`'s label + 16, `dir-1/sub` at +32 and
   `dir-1/sub/a` at +48 (depth 3); the moved row paints one row below `dir-2`.
8. **Reset, then keyboard.** Click `tree-reset` (order back to the four roots),
   open `dir-1`, click `tree-handle-dir-2`, `keyDown("enter")` to lift,
   `keyDown("up")` (gap before `dir-1/sub`), `keyDown("right")` →
   `target=into:dir-1/sub`, `keyDown("enter")` → `dir-2` is the first child of
   `dir-1/sub`: `tree-last` `depth=2 parent=dir-1/sub`, painted at
   `dir-1/sub.x + 16`; `sub` opened; native focus is still
   `tree-handle-dir-2`.
9. **Screenshot** (`ctx.host.screenshot`, artifacts only).

**Section B steps** (continued in the same scenario):

10. `tree-v-state` reads `visible=38 size=38 open=1`. `scrollToItem("tree-v-list",
    20)` + `advance(0)`; `listScrollTop` is `[20, 0, 240]`.
11. Drag `tree-v-handle-dir-19` into the middle of `tree-v-node-dir-17`
    (indented x). Both rows are painted at anchor 20. Release:
    `tree-v-last` is `id=dir-19 at=26 depth=1 parent=dir-17`;
    `tree-v-node-dir-19` paints at `dir-17.y + 24` and `dir-17.x + 16`;
    `dir-18` paints one row lower than before (the order shifted by one);
    `visible` is still 38; **the anchor is still `[20, 0, 240]`**.
12. Screenshot.

Target: 45–60 headless checks.

### 2.5 The live twin — `live-tree-reorder`

Mount `TreeReorderProbe` in the real 1100 × 720 window (plan `189`). Import the
scenario's view, set `ready: "tree-state"`.

1. Click `tree-toggle-dir-1`, `settle`, wait for `tree-order` to contain
   `dir-1/sub`; assert `open=1 visible=7`.
2. **Into a folder with a paced drag.** Read `tree-handle-dir-3`'s centre and
   `tree-node-dir-0`'s box; `drag("tree-handle-dir-3", dx, dy, 6)` where the end
   point is `(dir-0.x + 20, dir-0.y + 16)`. `settle`; `tree-last` is
   `depth=1 parent=dir-0`; `tree-node-dir-3` paints at `dir-0.y + 32` and
   `dir-0.x + 16` (±2 px live).
3. **Cycle refusal live.** Drag `tree-handle-dir-0` onto
   `tree-node-dir-3` (now its descendant) at `(dir-3.x + 20, dir-3.y + 16)`.
   `settle`; `tree-state` reads `refused=descendant`; the order is unchanged.
4. **Keyboard nesting live.** Click `tree-handle-dir-2`, `settle`,
   `waitForFocus`; `key("enter")`, `key("up")`, `key("right")`, `key("enter")`,
   each followed by `settle`; assert `tree-last` `parent=dir-1` and depth 1, and
   native focus is still `tree-handle-dir-2`.
5. `screenshot(`${LIVE_ARTIFACTS}/live-tree-reorder.png`)`.

Live count: aim for 12–18 checks. A live `drag` is paced by the host (40 ms per
step); no coordinate is guessed — every one is read from `bounds`.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | add `"tree-reorder"` to `CAPABILITIES` |
| `apps/playground/src/scenarios/tree-reorder-model.ts` | **new** — the pure tree rules |
| `apps/playground/src/scenarios/tree-reorder-model.test.ts` | **new** — unit tests |
| `apps/playground/src/scenarios/tree-reorder.tsx` | **new** — `TreeReorderProbe`, `tree-reorder` |
| `apps/playground/src/scenarios/index.ts` | import + register + `"tree-reorder"` in `PROBE_CAPABILITIES` |
| `apps/playground/src/live/scenarios.tsx` | import the scenario's view and add `live-tree-reorder` |
| `apps/playground/src/smoke/run.test.ts` | assert the registry contains `tree-reorder` |
| `apps/playground/README.md` | 91 → 92 headless, 42 → 43 live, `tree-reorder=verified`, a Hierarchical reorder section and the structure lines |
| `COMPONENTS.md` | capability row; `File trees` and `Virtualized hierarchical data` rows gain the contract |
| `PLAN.md` | D60 decision row |
| `TODO.md` | tick the hierarchical-reorder item; next free plan number |
| `.agents/slop/plans/README.md` | index this plan and its status |
| `.agents/slop/plans/140-gpuix-native-darwin-x64-build.md` §4 | the measured tree-reorder row |

No other path is touched. A required change elsewhere is recorded in `TODO.md`.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground test` | model tests + registry test green |
| `nub run --filter playground build` | clean build, exit `0` |
| `nub apps/playground/dist/smoke/run.js --only tree-reorder` | green, exit `0`, `tree-reorder=verified`, 45–60 checks |
| `nub apps/playground/dist/smoke/run.js` | `92/92 scenarios passed`, exit `0`, every prior capability still verified |
| `nub apps/playground/dist/live/run.js` | `43/43`, exit `0`; two consecutive green runs (a live run races timers) |
| `nub run check` | clean |
| `nub run lint` | clean |
| `nub run test` | clean |

Baseline before this plan: headless `91/91` (3124 checks), live `42/42`
(858 checks), both exit `0`.

**Two-direction proofs** (record each observed output in §9):

- **M1 — the subtree slice.** Use `from + 1` instead of `subtreeEnd` when
  removing the source; the unit test that moves a directory with children fails
  (the children are orphaned) and `tree-reorder` fails on the depth-shift step.
- **M2 — the descendant refusal.** Delete the `descendant` branch; the
  cycle step fails with an order change or a corrupt readout.
- **M3 — `into` requires a directory.** Let a file accept `into`; the unit test
  and the target/pointer step fail (`not-a-directory`).
- **M4 — the pointer's y zone.** Ignore the fraction and always emit `after`;
  the between/into steps fail on the target readout.
- **M5 — expand on hover.** Remove the 500 ms effect; the hover step never reads
  `expand:dir-3` and `dir-3/a` never paints.
- **M6 — the depth shift.** Keep every moved node's old depth; the flattened
  invariant fails (`illegal-depth`) or the moved children paint at the old
  indent.
- **M7 — the anchor.** Reset the virtual list with `scrollToItem(0)` after the
  move; the anchor assertion fails (`[0,0,240]`).

## 5. STOP conditions and branches

- **A virtual drop target outside the painted window.** Do not guess. Scroll
  with `scrollToItem` so both source and target paint, then compute from
  `bounds`. If a row still reports no bounds, pick a nearer target and record
  why.
- **The hover timer does not run headlessly.** Re-read plan `196`: a JS timer is
  real time, and `awaitReadout` (50 ms retries, 2 s cap) is the measured
  pattern. If the timer still never fires, record it as an app-boundary
  limitation rather than faking the expand.
- **The drop into a collapsed folder hides the moved node.** The commit must
  expand the target; if it does not, the scenario's painted assertion is the
  proof the contract is wrong. Fix the component logic, not the check.
- **Focus leaves the handle after a keyed reorder.** Call
  `renderer.focusElement` after the commit and record that the runtime required
  an explicit refocus. Keep the assertion that focus ends on the moved handle.
- **`Arr` lacks a helper the model needs.** STOP and record it; do not reach for
  a native loop in the domain module. A local `Option`-returning helper is fine.
- **A new host verb is required.** STOP and record it: the host contract is
  shared with every suite and a new verb needs its own plan. `press`, `movePointer`,
  `releasePointer`, `click`, `keyDown`, `key`, `scrollToItem`, `listScrollTop`,
  `bounds`, `screenshot` and `awaitReadout` already exist.
- **The live window does not open.** That is exit `2` (no evidence); report it
  and keep the headless result. Never report a live pass that did not run.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `allRows` parents and indices | unit | a parent derived from the wrong depth |
| `visibleRows` (collapsed, open, nested) | unit | a hidden child painted, an open grandchild missing |
| `subtreeEnd` / `subtreeIds` | unit | a slice that stops at the wrong row (M1) |
| `moveSubtree` before / after / into | unit | the three insertion points |
| `moveSubtree` subtree depth shift | unit | children keeping their old depth (M6) |
| `moveSubtree` self / descendant / file `into` / illegal depth | unit | a cycle or an orphan produced silently (M2, M3) |
| `targetAt` upper/lower half, middle + indent, file middle, clamped ends | unit | a pointer rule that cannot separate into from between (M4) |
| `indicatorAt` for the three edges | unit | the line not matching the insertion |
| `visibleIndexOf` | unit | the flattened index the readout reports |
| `tree-reorder` steps 1–12 | native smoke | any rule above regressing in the runtime |
| `scenarioProblems` registration | unit | the scenario or capability falling out of the registry |
| `live-tree-reorder` | live smoke | the drag, refusal or keyboard path not surviving a window |
| full headless + live suites | native smoke | the new gesture leaking state into later scenarios |

The model tests are a deliberate pair: `moveSubtree(dir-1, into dir-2)` must
shift the subtree's depths, and `moveSubtree(dir-1, into dir-1/sub)` must refuse.
A test that only moves a leaf lets M1 and M6 pass.

## 7. Acceptance criteria

- `tree-reorder` is registered, green, and reports capability `tree-reorder`.
- `live-tree-reorder` is green in a real window.
- The seven mutation proofs are recorded in §9 with the observed output.
- `COMPONENTS.md`'s `File trees` and `Virtualized hierarchical data` rows cite
  the measured contract (or a precisely measured limitation).
- `apps/playground/README.md` counts and capability line are current.
- `nub run check`, `nub run lint` and `nub run test` pass; the full headless and
  live suites are green.
- `TODO.md` no longer lists the hierarchical-reorder probe as pending, and names
  the next free plan number.

## 8. Executor checklist

1. Add the plan row to `.agents/slop/plans/README.md` before coding.
2. Write `tree-reorder-model.ts` and its tests first; run
   `nub run --filter playground test` and see the tests fail against a stub,
   then pass.
3. Build the view; iterate against `--only tree-reorder`, reading `bounds`,
   `tree-order` and `tree-last` — never guessed pixels.
4. Add the live twin only after the headless scenario is green.
5. Run the full suites, then the mutation proofs, restoring each mutation.
6. Update the docs and inventory, tick `TODO.md`, commit and push.

## 9. Outcome

Executed on this host on 2026-10-18. **Headless `92/92` green (3198 checks),
exit `0`, `tree-reorder=verified`; live `43/43` (881 checks), exit `0` in two
full runs.** `tree-reorder` records **74 checks**, `live-tree-reorder` **23**,
and the pure model **21 tests**. `nub run check`, `nub run lint` and
`nub run test` pass.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **`into` is a gesture, not a depth guess.** A directory accepts `into` only
  when the pointer is in the middle 50 % of the row **and** one indent step
  (16 px) past its own depth. `tree-state` reads `target=before:dir-1` in the
  upper quarter and `target=into:dir-0` at the row's middle + 20 px; a file's
  middle is `after`. The indicator paints on the gap for a sibling and one row
  down / one level in for a child.
- **A move takes the whole subtree.** `dir-1` (root) moved into `dir-2` puts
  `dir-1` at depth 1 and `dir-1/sub/a` at depth 3, with labels at +16/+32/+48
  px and the root one row below its new parent. `tree-last` reports
  `at=2 depth=1 parent=dir-2`.
- **Cycles are refused before anything moves.** A drop into
  `dir-1/sub` reads `refused=descendant`; a drop on itself reads `refused=self`;
  the order and the indicator are unchanged. **Removing the explicit branch
  still refuses the move — as `illegal-depth`**, the post-move pre-order parse.
  So the invariant guard works, but the explicit branch is what names the user's
  mistake, and the scenario asserts the reason.
- **A drop into a collapsed folder opens it.** `dir-3` becomes `dir-0`'s first
  child, `dir-0` opens, and `visible` goes 7 → 9 (the target's two hidden
  children). Hovering a collapsed `dir-1/sub` for 500 ms opens it **without** a
  drop; Escape clears the pending gesture and leaves the order.
- **The virtual anchor survives.** At `[20,0,240]`, dropping `dir-19` into
  `dir-17` gives `at=26 depth=1 parent=dir-17`, the row paints at
  `dir-17.y + 24` and one step in, `dir-18` shifts down one row, `visible` stays
  38, and `listScrollTop` is still `[20,0,240]`.
- **Keyboard nesting.** Enter lifts, Up moves the gap **past the source row**
  (the first Up from a lifted row is a no-op, so the step skips it), Right turns
  the gap into `into` for a directory, Enter drops, and native focus stays on
  the moved handle.

Three harness facts changed the probe:

- **A readout that changes height moves the measured list.** `tree-state` grew
  a line when a gesture started, which shifted the list 16 px between the box
  read and the pointer move and made a self-drop land one row below. The
  readouts now sit in a fixed-height block; the list top is stable for every
  gesture.
- **`useWindowKey` stores exactly one handler.** Registering it inside each tree
  instance meant the second (virtual) tree replaced the first, so Escape only
  cancelled the virtual gesture. The probe registers **one** handler and cancels
  both; a focused handle also cancels in its own `onKeyDown`.
- **`getElementBounds` on a `<virtual-list>` is not the viewport top.** Using
  the list's own box for the pointer mapping landed six rows below the target.
  The frame wrapper (a `ref` on the `div` around the list) is the geometry
  source; `getListScrollTop` on the list is the content offset.
- **A live paced drag dwells long enough for the hover expansion.** The refused
  cycle drag held over `dir-3` for >500 ms, so the hover opened it mid-gesture.
  The live check therefore asserts the moved row (`tree-last`) is unchanged, not
  the visible row list. The headless drag is instantaneous and does not.

Live-run variance, recorded honestly: after the first green run, two further
full runs each failed a **different, pre-existing** live scenario while
`live-tree-reorder` stayed green — `live-column-config` (`Escape` left focus
`none`), `live-crop-area` (the SE handle read `93` instead of `309`), then
`live-float` (a title drag read `421` instead of `200`). These are the documented
window-state and load-sensitive drag/focus behaviours (plans `390`, `391`), not
this probe; the final run is `43/43` and `live-tree-reorder` has passed in all
four full runs.

Mutation proofs (each restored after the run):

| Mutation | Command | Observed || -------- | ------- | -------- |
| M1 — remove only one node instead of the subtree | `nub run --filter playground test`; `… smoke/run.js --only tree-reorder` | 5 unit failures; smoke exit `1`, `the between drop moves the row before its target: … got "dir-0,dir-2,dir-1,dir-1/a,dir-1/b,dir-1/sub,dir-2/a,dir-2/b,dir-3"` |
| M2 — remove the descendant refusal | tests; `--only tree-reorder` | 1 unit failure; smoke exit `1`, `expected "refused=descendant", got "refused=illegal-depth"` |
| M3 — let a file accept `into` | `nub run --filter playground test` | 1 failure: `refuses into a file` |
| M4 — ignore the y zone and always emit `after` | tests; `--only tree-reorder` | 5 unit failures; smoke exit `1`, `the pointer names a before target: … got "target=after:dir-1"` |
| M5 — a 5 s hover delay | `--only tree-reorder` | exit `1`, `the dwell opens the target: expected "expand:dir-1/sub", got "…target:into:dir-1/sub"` (no expansion inside the 2 s wait) |
| M6 — keep every moved node's old depth | tests; `--only tree-reorder` | 2 unit failures; smoke exit `1` on `the into drop makes the source the first child` with the subtree's children left behind |
| M7 — reset the virtual list to row 0 after a drop | `--only tree-reorder` | exit `1`, `tree-v-node-dir-19 is painted: expected a value, got none` |

No file outside `apps/playground`, `packages/testing`, the docs/inventory and
this plan set was changed.
