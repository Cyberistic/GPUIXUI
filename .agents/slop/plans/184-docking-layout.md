# 184 — Tier 4 feasibility: a docking layout with edge drop zones and restore

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | D (desktop workspace feasibility) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `155`, `162`, `165`, `167`, `173`, `175`, `177`, `182` |
| Closes | `COMPONENTS.md` → Tier 4: **Docking layouts**, **Panel groups**, **Nested panel arrangements** — the runtime facts behind `@gpuixui/docking` |

## 1. Question

The probes so far measured the pieces of a workspace one at a time: a split
(`panel-resize`, `panel-nested`), tabs in state and a tab dragged between two
panes (`workspace-tab-drag`), tabbed panes that stay mounted while hidden
(`workspace-panes`), and a two-pane layout restored from app owned JSON
(`workspace-restore`). A **docking layout** composes those pieces, and four
mechanics it needs have never been measured:

1. **Can component code read a pane's rectangle?** A drop zone must be
   hit-tested against real panel bounds. The only route is a `ref` (which gives a
   `PublicInstance.id`) plus `useGpuix().renderer.getElementBounds(id)`. That is
   proven for a *focus return existence check* (`modal-focus-trap`) but never as
   a **geometry source during a pointer gesture**.
2. **Does an absolutely positioned overlay inside a nested pane resolve to that
   pane?** `workspace-panes` used `position: "relative"` + absolute slots, but
   only asserted paint and clicks, never the overlay's box. A drop indicator's
   rectangle is the whole feature.
3. **Does a captured tab drag keep delivering moves after the drag target's
   React state changes on every move** (the indicator re-renders while the tab
   stays captured), and does the release still reach the pressed tab so the drop
   is applied exactly once? `drag-targets` proved the capture contract for a
   static tree; a docking grid re-renders every move.
4. **Can a split that was created mid-run be resized** (nested, keyboard and
   pointer), and can the resulting recursive tree be serialised and restored
   **including every nested divider size**? `SplitPane` holds its size in state,
   so a restore is a keyed remount — and a collapse that reparents a surviving
   split can make React reuse the **wrong** component instance unless every dock
   node is keyed.

Without these facts `packages/docking` would be written against assumptions.
This probe produces the contract instead.

**Do not import `@gpuixui/docking`** (it does not exist) and do not edit another
workstream's paths. The probe composes the app's own `SplitPane` plus a new pure
dock model, exactly as `workspace-panes` and `toast-lifecycle` did.

## 2. Design

### 2.1 Files

```
apps/playground/src/panels/dock.ts                  NEW  pure dock model, geometry, drop, encode/decode
apps/playground/src/panels/dock.test.ts             NEW  10 tests (see §2.3)
apps/playground/src/scenarios/docking.tsx           NEW  `docking-layout` scenario + view
apps/playground/src/scenarios/index.ts              EDIT import + register + `docking` in PROBE_CAPABILITIES
packages/testing/src/smoke.ts                       EDIT `"docking"` in CAPABILITIES
apps/playground/README.md                           EDIT a "Docking layout" section, the scenario list, the counts
COMPONENTS.md                                       EDIT the capability table row and the Tier 4 docking rows
TODO.md                                             EDIT tick this task
.agents/slop/plans/README.md                        EDIT index this plan
.agents/slop/plans/184-docking-layout.md            EDIT fill §7 after the run
```

No other file. The library packages are untouched.

### 2.2 The pure model (`dock.ts`)

Schema-first (EF-3/EF-13). A dock is a recursive tree of groups and splits:

```ts
export const DIVIDER = 6;

export class DockTab extends Schema.Class<DockTab>("DockTab")({
  id: Schema.String,     // globally unique tab id
  title: Schema.String,
}) {}

export class DockGroup extends Schema.Class<DockGroup>("DockGroup")({
  kind: Schema.tag("group"),
  id: Schema.String,
  title: Schema.String,                       // accessible name: "<title> panel"
  tabs: Schema.Array(DockTab),
  active: Schema.String,                      // "" only when `tabs` is empty
}) {}

export class DockSplit extends Schema.Class<DockSplit>("DockSplit")({
  kind: Schema.tag("split"),
  id: Schema.String,
  orientation: Schema.Literals(["horizontal", "vertical"]),
  size: Schema.Number,                        // primary extent in px
  min: Schema.Number,
  max: Schema.Number,
  primary: Schema.suspend(() => DockNode),
  secondary: Schema.suspend(() => DockNode),
}) {}

export const DockNode = Schema.Union([DockGroup, DockSplit]).pipe(
  Schema.toTaggedUnion("kind"),
);
export type DockNode = typeof DockNode.Type;

export const DockNodeJson = Schema.fromJsonString(DockNode);
export const encodeDock = Schema.encodeSync(DockNodeJson);
export const decodeDock = (json: string): Option.Option<DockNode> =>
  Schema.decodeUnknownOption(DockNodeJson)(json);
```

`Schema.suspend` is the v4 recursion primitive (`Schema.suspend(() => DockNode)`)
and `DockNode` is referenced only inside the thunk.

Operations — every one is pure and returns a new tree:

```ts
export type DockEdge = "center" | "left" | "right" | "top" | "bottom";

export const groups: (node: DockNode) => ReadonlyArray<DockGroup>; // document order
export const findGroup: (node: DockNode, id: string) => Option.Option<DockGroup>;

/** One deterministic line; the readout and the assertions share it. */
export const describeDock: (node: DockNode) => string;
// groups in document order: `id=a,b@active` (empty: `id=@`)
// then splits in pre-order: `id=h240` / `id=v320`
// joined with single spaces: `left=explorer,search@explorer editor=main.ts@main.ts … main:h240 centre:v320`

export const activate: (node: DockNode, groupId: string, tabId: string) => DockNode;

/** Removes the tab. Empty groups are pruned; a split collapses to its survivor; the last group becomes an empty `dock-empty` group. */
export const removeTab: (node: DockNode, tabId: string) => DockNode;

/** Adds the tab at the end of the group and activates it. */
export const insertTab: (node: DockNode, groupId: string, tab: DockTab) => DockNode;

export const resize: (node: DockNode, splitId: string, size: number) => DockNode; // clamps [min, max]

export interface DropRequest {
  readonly tabId: string;
  readonly target: string;       // target group id
  readonly edge: DockEdge;
  readonly newGroup: string;     // id used when `edge !== "center"`
  readonly newSplit: string;     // id used when `edge !== "center"`
  readonly title: string;        // title for the new group
  readonly size: number;         // primary extent of the new split
  readonly min: number;
  readonly max: number;
}

export const dropTab: (node: DockNode, request: DropRequest) => DockNode;
```

Rules `dropTab` must implement:

- `center`: remove the tab, append it to the target group, activate it. No split.
- edge: remove the tab **except** when the source group is the target group (a
  self-drop must keep its target). Then wrap the target group:
  - horizontal split for `left`/`right`; vertical for `top`/`bottom`;
  - `left`/`top` put the **new** group in `primary`, `right`/`bottom` in
    `secondary`;
  - the new group holds exactly the dragged tab and is active;
  - the split uses the request's `size`/`min`/`max`.
- Moving the last tab out of a group prunes that group, so a split whose one side
  empties collapses to the survivor. This prune is what makes the composition a
  *layout* and not a fixed two-pane demo.

Geometry — the drop-zone and assertion contract:

```ts
export interface Rectangle { readonly x: number; readonly y: number; readonly width: number; readonly height: number; }

/** Every group's box, derived from the tree and the surface's own box. */
export const rects: (node: DockNode, box: Rectangle) => Readonly<Record<string, Rectangle>>;

/**
 * The 48 px edge band decides the zone; the nearest edge wins a corner,
 * otherwise `center`. `None` when the pointer is outside `box`.
 */
export const zoneAt: (
  pointer: { readonly x: number; readonly y: number },
  box: Rectangle,
  edge?: number,
) => Option.Option<DockEdge>;

/** The indicator bar's rectangle inside a group box. Pixel-exact; 4 px thick. */
export const indicatorRect: (edge: DockEdge, box: Rectangle) => Rectangle;
```

`rects` arithmetic: a horizontal split gives `primary` `size` px, then `DIVIDER`
px, then the rest to `secondary`; vertical splits do the same on `height`.

### 2.3 Pure tests (`dock.test.ts`)

Plain vitest (pure functions). Header comment states the bug each group guards:
a drop that ignores the edge, a prune that leaves an empty pane, a restore that
loses a nested size, a geometry rule that does not reserve the divider.

Twelve tests: document order; the describe line; activation; a centre merge; a
right drop (order); a top drop (order); prune + collapse; the self-drop refusal;
`dropSize` arithmetic; `resize` clamping; a nested encode/decode round trip;
corrupt input rejected; `rects` reserving the divider; `zoneAt` mapping
edge/centre/outside; `indicatorRect` for an edge and the centre.

### 2.4 The view (`docking.tsx`)

Fixed geometry so every assertion is exact: the dock surface is **900 × 480**
inside a 900 × 560 root.

```
dock-root (900×560, flex column)
  dock-signature   Readout: describeDock(tree)
  dock-drag        Readout: `none` or `<tab>@<from>><group>:<edge>`
  dock-saved       Readout: `saved=yes|no notice=saved|reset|restored|invalid|none`
  toolbar: dock-save / dock-restore / dock-reset  (Pressable)
  dock-surface (900×480) — ref → id → renderer.getElementBounds(id)
    <DockTree key={docVersion} node={tree} />
```

Initial tree (the literal the tests and the probe share):

```
S(main, horizontal, 240, min 160, max 360)
  G(left, "Left panel", [explorer, search, notes], active explorer)
  S(centre, vertical, 320, min 200, max 400)
    G(editor, "Editor panel", [main.ts], active main.ts)
    G(terminal, "Terminal panel", [shell], active shell)
```

Tab titles: `explorer` → "Explorer", `search` → "Search", `notes` → "Notes",
`main.ts` → "main.ts", `shell` → "Terminal". Drops create `panel-N` groups and
`split-N` splits, numbered by a per-view sequence.

`DockTree` recursion (the renderer rule this probe must not get wrong):

- `DockSplit` renders `<SplitPane key={node.id} id={node.id} orientation={…}
  initial={node.size} min max onResize={size => setTree(tree => resize(tree, node.id, size))} …>`;
  the `key` is load bearing (§4 proof).
- `DockGroup` renders a `position: "relative"` column:
  - the wrapper: `role="region"` + `aria-label={group.title}` + `aria-id`;
  - the tab strip: `role="tablist"` + label; each tab is a `div` with
    `testId="dock-tab-<tabId>"`, `role="tab"`, `aria-selected`, `tabIndex={0}`,
    the press/move/release handlers, and a click that activates;
  - the body: `role="tabpanel"` + label, `testId="dock-body-<groupId>"` with text
    `<groupId>:<active|none>`;
  - the drop indicator, **last child**, `pointerEvents: "none"`,
    `backgroundColor: theme.colors.primary`, `testId="dock-indicator-<groupId>"`.
    Rendered only for the current target group, from `indicatorRect`.

Drag state (in the probe, one state machine):

```ts
interface Drag {
  readonly tabId: string;
  readonly from: string;
  readonly target: Option.Option<{
    readonly group: string;
    readonly edge: DockEdge;
    readonly box: Rectangle;
  }>;
}
```

- `onMouseDown` on a tab records the drag and its source group.
- `onMouseMove` (delivered to the pressed tab by pointer capture) reads the
  **surface** bounds with
  `Option.flatMap(surfaceId, id => Option.fromNullishOr(renderer?.getElementBounds?.(id)))`,
  computes `rects(tree, box)`, and finds the group whose `zoneAt` is `Some`.
  Re-rendering on every move is intentional — the indicator follows.
- `onMouseUp` on the tab applies `dropTab` when a target exists, then clears the
  drag. The drop size comes from the **target group's** box:
  `dropSize(extent)` → a half extent, `min: 96`, `max: extent − DIVIDER − 96`.
- `dock-save` stores `encodeDock(tree)` in state and clears any drag.
- `dock-reset` applies the initial tree **and** bumps `docVersion` (a real
  restart: split state must come from the model again).
- `dock-restore` decodes the saved string; on success it applies it and bumps
  `docVersion`; on `None` it keeps the tree and sets `notice=invalid` — a corrupt
  snapshot is reported, never silently ignored.

`INITIAL_DOCK` lives in `dock.ts`, so the test, the view and this plan share one
source.

### 2.5 Scenario `docking-layout`, capability `docking`

The surface box is read from the runtime; every expected rectangle is derived
from it. Each `expectSome` bounds lookup records its own check.

| # | Check | Why |
| - | ----- | --- |
| 1 | initial `dock-signature` | the model renders |
| 2 | `dock-group-left` = surface origin, 240 × 480 | the model's rect matches the runtime |
| 3 | `dock-group-editor` x = left.right + 6, 654 × 320 | divider reserved |
| 4 | `dock-group-terminal` y = editor.bottom + 6, 654 × 154 | vertical split |
| 5 | press `dock-tab-search`, move to editor's right band → `search@left>editor:right` | **pane bounds measured from component code** |
| 6 | `dock-indicator-editor` = x `editor.right − 4`, y `editor.y`, 4 × 320 | **absolute overlay resolves to the nested pane** |
| 7 | indicator `paintedStyle.backgroundColor` = the dark palette's `primary` | the token reached the paint |
| 8 | release → signature `left=explorer,notes@explorer editor=main.ts@main.ts panel-1=search@search terminal=shell@shell main=h240 centre=v320 split-1=h324` | edge drop splits |
| 9 | `editor` 324 wide; `panel-1` x = editor.right + 6, 324 × 320 | primary/secondary order |
| 10 | `dock-indicator-editor` gone (`bounds` null) | the overlay leaves |
| 11 | press `dock-tab-shell`, move to `panel-1`'s top band → `shell@terminal>panel-1:top` | a second, nested target |
| 12 | `dock-indicator-panel-1` = its origin, 324 × 4 | top band geometry |
| 13 | release → signature `left=explorer,notes@explorer editor=main.ts@main.ts panel-2=shell@shell panel-1=search@search main=h240 split-1=h324 split-2=v157` | top drop puts the new group first |
| 14 | `dock-group-terminal` gone | **the emptied source is pruned and `centre` collapsed** |
| 15 | the collapsed split is 480 tall; `panel-2` 157; `panel-1` 317, y = panel-2.bottom + 6 | nested split math |
| 16 | drag `split-2-divider` +40 → `split-2=v197`; 197 / 277 tall | **a mid-run split resizes** |
| 17 | drag `main-divider` +40 → `main=h280`; left 280, editor x = surface.x + 286 | pointer resize |
| 18 | `editor` still 324 wide, `panel-1` 284 wide | the nested split takes the shrink |
| 19 | click `dock-save` → `saved=yes` | the snapshot exists |
| 20 | click `dock-reset` → the initial signature; `saved=yes` | a reset is a real restart |
| 21 | click `dock-restore` → signature `… main=h280 split-1=h324 split-2=v197` | **nested sizes restore** |
| 22 | left 280 wide | the outer size restored |
| 23 | `panel-2` 197 / `panel-1` 277 tall (and 284 wide) | the inner sizes restored |
| 24 | `dock-group-terminal` still absent | the pruned group is not resurrected |
| 25 | click `dock-tab-notes` → `left=explorer,notes@notes` | the restored tree is live |
| 26 | a11y: a `Region` labelled `Left panel`, a `Tab` with `selected=true` | see the measured role names below |
| 27 | press `dock-tab-explorer`, move to `editor` centre → `explorer@left>editor:center` | the centre zone |
| 28 | `dock-indicator-editor` = editor origin, 324 × 480 | centre covers the pane |
| 29 | release → `editor=main.ts,explorer@explorer left=notes@notes` | **centre merges, no split** |
| 30 | press `dock-tab-notes`, drop on the editor centre → left pruned, `main` collapses | the top-level prune |
| 31 | `dock-group-left` and `dock-main-divider` gone; `editor` = surface origin, 324 wide | the survivor takes the parent's box |
| 32 | `dock-body-editor` `editor:notes` | the last move is active |

`expectNear(…, 1)` is used for runtime boxes (subpixel tolerance); every readout
and signature is an exact string. A drop applied on the *group's* `onMouseUp`
instead of the tab's cannot work: the capture keeps the gesture on the pressed
tab.

## 3. Commands and expected results

```sh
nub run --filter playground test
# -> dock.test.ts included, 12 new tests green (the package had 29 tests, 41 now)

nub run --filter playground build
# -> tsc exits 0

nub apps/playground/dist/smoke/run.js --only docking-layout
# -> "1/1 scenarios passed", docking=verified, exit 0

nub apps/playground/dist/smoke/run.js
# -> 52/52 scenarios passed (51 before), exit 0

nub run --filter @gpuixui/testing test
# -> 4 files green (the capability union gained "docking")

nub run check && nub run lint && nub run test
```

`nub run --filter playground smoke` collapses a non-zero child exit, so observe
the built CLI's own code (documented in `apps/playground/README.md`).

## 4. Two-direction proofs

Run each mutation, keep the failing output, restore the file:

| Mutation | Must fail |
| -------- | --------- |
| `SplitPane` loses its `key={node.id}` | a reparented split keeps the wrong size |
| `dropTab` used `insertTab` for every edge | the edge drop never creates the split |
| `splitTarget` inverted `primary`/`secondary` | the right drop's group order |
| `removeTabKeeping` skips pruning | the emptied terminal group survives |
| `dock-restore` applies the tree without bumping `docVersion` | the outer size is not restored |

If a mutation fails a *different* check than the one named, record the actual
check in §7 instead of editing the table to fit.

## 5. STOP conditions

- **`ref` + `getElementBounds` cannot be used from component code** (bounds are
  `null` during the drag): STOP the drop-zone claim. Record what the renderer
  returned, keep the tree/restore half of the probe, and document that a docking
  component must be given an explicit size model (the surface's `useWindowSize`
  plus its own split tree) instead of measuring panes. Do not fabricate a
  geometry source.
- **An absolute child of a `position: "relative"` pane does not resolve to that
  pane** (indicator at the window origin or clipped): record the measured box,
  re-anchor the indicator to the surface and document the finding — a docking
  indicator must be drawn in a surface-level overlay layer.
- **A held move stops arriving after the indicator's state update** (the capture
  is lost on re-render): record it. Fall back to a **pointer-position** drop on
  `onMouseUp` only (no live indicator), and mark live drop previews unsupported.
- **The gesture-ending click moves or activates a tab** after a drop: record the
  event order; suppress it with a `moved` ref and assert the suppression. A
  click after a drag is a measured `drag-targets` fact.
- **The keyed remount does not reproduce a nested divider size**: record which
  size survived. If React reuses a split even with the key, restore through a
  one-shot layout effect (`SplitPane` gains an `apply` prop) and document the
  contract; never weaken the assertion to "close enough".
- If `Schema.suspend` cannot express the recursive class union under the pinned
  effect version, stop and write the exact compiler error in §7 rather than
  falling back to hand-written casts.

## 6. Acceptance criteria

- `docking-layout` is registered and the suite is **52/52** with exit `0`.
- The capability union contains `docking` and the report prints
  `docking=verified`.
- `dock.test.ts` has the 12 rules above and each can fail (three are proven by
  §4's mutation list).
- At least three two-direction proofs are recorded in §7 with the exact failing
  check and exit code.
- `COMPONENTS.md` records the measured docking facts and keeps the Tier 4 rows
  honest (`verified` only for what ran).
- `TODO.md` ticks this task; the plan index row is updated to `landed`.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 7. Measured result

Run 2026-10-17 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter playground test` | 6 files / **41 tests** (12 dock rules), pass |
| `nub run --filter @gpuixui/testing test` | 4 files / **40 tests**, pass |
| `nub run --filter playground build` | pass |
| `--only docking-layout` | 1/1, **80 checks**, `docking=verified`, exit `0` |
| full suite | **52/52**, exit `0` (`51 → 52`) |
| `nub run check`, `nub run lint`, `nub run test` | pass |

What the probe established:

- **Pane geometry is readable from component code.** A `ref` on the dock surface
  yields a `PublicInstance.id`; `useGpuix().renderer.getElementBounds(id)` returns
  the surface's window box, and every group's box the pure `rects` model predicts
  from it matched the runtime within 1 px — including a split created mid-run and
  a nested one. That is the drop-zone source: the component never needs a renderer
  test helper, only the surface ref and its own layout tree.
- **An absolute overlay resolves to its nested pane.** The drop indicator is a
  last child of a `position: "relative"` group; the right bar measured at
  `editor.right − 4`, 4 × 320, and the top bar on the target pane's own top edge.
  `paintedStyle.backgroundColor` was the dark palette's `primary`, so the token
  reached the paint. `pointerEvents: "none"` keeps it out of the hit path.
- **A captured tab drag survives the indicator re-rendering on every move.** The
  pressed tab received every held move while the tree re-rendered, and the `up`
  applied the drop exactly once — no lost capture, no duplicate split. The
  gesture also stays on the tab, which is why the drop handler belongs there and
  not on the group.
- **Drops compose and prune.** A right drop made the target primary and the new
  group secondary at half the extent; a top drop put the new group primary in a
  vertical split; dropping the only tab out of the terminal pruned the group and
  **collapsed `centre` to its survivor**, which then took the full 480 px height.
  A centre drop merged into the strip with no new split; the second centre drop
  emptied the left pane, pruned it, and collapsed the outer `main` split so the
  survivor started at the surface origin.
- **Every split must be keyed by its node id.** Removing `key={node.id}` made the
  nested split keep `320` instead of its `324` while the outer resize moved on —
  React reused the parent's state when the collapse reparented the survivor. The
  key is the measured rule, not a style choice.
- **A recursive layout restores exactly through a keyed remount.** Saving the
  tree as JSON, resetting, then restoring reproduced the outer `280`, the nested
  `324` and `197` and the pruned-group absence; the restored tree answered a tab
  click. The model owns the sizes; each `SplitPane` receives `initial` from it on
  the remount.
- **Accessibility.** The dump exposes the dock as `Region`, `TabList`,
  `TabPanel`, `Tab` and `Splitter` nodes; `aria-label` reaches the Region, and
  `aria-selected` reaches its Tabs. The role names are AccessKit's capitalised
  names, not the authored ARIA tokens — a first check compared `"region"` and
  failed until it compared `"Region"`. Probes must compare the dump, not the
  token.
- **Constraint model.** `dropSize(extent)` is `floor((extent − DIVIDER) / 2)`,
  `min: 96`, `max: extent − DIVIDER − 96`. The max is the extent at **creation**;
  a later collapse can make the split's own extent larger while its stored max
  stays smaller. That is the component's constraint policy and the probe never
  resized past it.

Two-direction proofs (mutation → the named check failed at exit `1` → file
restored):

| Mutation | Failing check |
| -------- | ------------- |
| `SplitPane` lost `key={node.id}` | `the nested split kept its primary size: expected 324 ± 1, got 320` |
| `splitTarget` inverted `first` (new group on the right/bottom edge placed first) | `the right drop split the editor: expected "… editor=… panel-1=…", got "… panel-1=… editor=…"` |
| `removeTabKeeping` skipped `prune` | `the top drop nested a split` — the emptied `terminal=@` remained in the signature |
| `dock-restore` did not bump `docVersion` | `the outer divider size was restored: expected 280 ± 1, got 240` |

Limitations this probe does not remove:

- There is no `@gpuixui/docking` package yet; this is the measured contract for
  it, built from the app's own `SplitPane` and the pure model.
- The indicator's **paint order** is not asserted (there is no pixel readback).
  Its box and style are; the last-child rule is inherited from
  `toast-lifecycle`'s measured stacking model.
- The **gesture-ending click** after a drop is not asserted. `drag-targets`
  measured it; here it lands on the source tab, and `activate` ignores a
  non-member tab, so the probe is inert to it. A shipped component must suppress
  it explicitly.
- Detachable tabs stay **in-window**: 0.10.0 exposes one app window, so the drop
  moves the tab between groups in the same surface.
- The probe reads the **surface** rectangle from the renderer and derives pane
  rectangles from the model. Per-pane `getElementBounds` is available (the same
  `NativeRenderer` method) but would duplicate the model and is not what the
  component uses.
