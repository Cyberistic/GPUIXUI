# 387 — Tier 3 feasibility: editable cells and row menus inside a virtualized grid

**Status:** landed 2026-10-18 · **Phase:** D · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `152`, `158`, `164`, `166`, `188`,
`190`, `198`, `338`, `345`, `348`, `349`, `384`.

**Number note:** the playground index says the next free number is **`387`**.
Take it, and move the index to `388` after this plan lands.

## 1. Why this plan exists

Three probes measure the pieces, and none measures the composition a real data
grid needs.

- `property-panel` (348) put a native editor in a virtual row: typing is a
  draft, Enter commits, Escape reverts, a scroll out of and back into the window
  rebuilds the row from the model. It did **not** assert where native focus is
  after the row leaves the window, and `COMPONENTS.md` says so: *"The probe does
  not claim that an off-window editor keeps native focus."*
- `data-grid-virtual` (338) measured hit-testing and focus on a cell in a panned
  virtual row. It never edited one.
- `context-menu-pointer` (164) measured a pointer-anchored layer inside a
  **plain** scrolled container (exact, unclipped). A **virtual** row is a
  different owner: the row can leave the built window while an anchored panel
  captured the window point it opened at.
- `live-key-routing` (345) proved a key bubbles through every ancestor to the
  window handler. A grid that navigates on `onKeyDown` therefore sees the keys
  typed into one of its own cell editors — unless it guards.

So four product questions are open:

1. **Does an editor keep native focus and receive keys after its row leaves the
   painted window?** If it does, the user types into an invisible field. A grid
   needs a measured policy (end editing on leave), not a guess.
2. **Does an ancestor grid key handler see the keystrokes typed into an editor,
   and does an editing guard actually stop grid navigation?**
3. **Does a row-anchored menu stay truthful when the list scrolls?** Its
   `<anchored position>` is window coordinates captured at open; if the row
   moves, the panel points at another row. Close-on-scroll, or re-anchor on
   every range event?
4. **What ends an edit when the row set changes** (sort/delete) — does the draft
   follow the row id, or must the component commit before the reorder?

This probe answers all four with **no package code**, one pure model + unit
tests, one consumer view, one headless scenario, one live twin, and a new
`cell-editing` capability.

## 2. What was already measured (do not re-measure)

| Fact | Source |
| ---- | ------ |
| An `<input>` in a virtual row: `onChange` per character, Enter as `onSubmit`, Escape as key down, a parent-owned draft survives a windowed rebuild | `property-panel` (348) |
| `autoFocus` focuses a conditionally mounted element natively, without dispatching React's `onFocus` | `command-palette` (176), `live-key-routing` (345) |
| A key reaches the focused element and bubbles through **every** ancestor, then the window handler | `live-key-routing` (345) |
| A focused row is not lost when the virtual window scrolls past it, and stays in `getPaintedText()` outside the window | `roving-focus` (158) |
| `scrollToItem(list, index)` is exact; read the anchor with `getListScrollTop`, never `getScrollOffset`; `onVisibleRange` payload lags one gesture | `scroll-into-view` (166), `message-scroller` (300), `data-grid-virtual` (338) |
| A programmatic `scrollToItem` has no range event, so an app mirrors its anchor optimistically | `data-grid-virtual` (338) §9 |
| An `<anchored position>` inside a **plain** scrolled container is exact, unclipped, and window-positioned | `context-menu-pointer` (164) |
| An anchored panel opened from app chrome takes `autoFocus`, Escape returns focus to its trigger, an outside press closes without returning focus | `column-config` (384) |
| `role="group"` + `aria-label` maps to an AccessKit `Group`; `role="button"` + `aria-label` maps to `Button` | `a11y-tree` (160), `column-config` (384) |
| The live host reads focus through `getFocusedElementId`, and a live step settles/`waitFor`s | `live-focus` (190), plans `344`–`347` |
| A live click focuses natively without running React's `onFocus` | `live-key-routing` (345) |

## 3. What will be proven

Capability: `cell-editing` (new). Scenario: `grid-cell-editing`; live twin:
`live-grid-cell-editing`.

### 3.1 The model (`grid-editor-model.ts`)

Reuse the shipped grid primitives rather than restating them: `GridRow`,
`Anchor`, `filterRows`, `sortRows`, `anchoredWindow`, `indices` and `rowTop`
already live in `scenarios/data-grid-model.ts` (plan 338). This model adds only
the **editing** state.

```ts
import type { Anchor, GridRow } from "./data-grid-model.js";

export const ROW_COUNT = 60;
export const ROW_HEIGHT = 32;
export const LIST_HEIGHT = 320;

/** `item-00` … `item-59`; zero-padded so the name order is the id order. */
export const makeRows: () => ReadonlyArray<GridRow>;

export interface EditorState {
  readonly rows: ReadonlyArray<GridRow>;
  readonly editing: Option.Option<number>; // row id
  readonly draft: string;
  readonly selected: Option.Option<number>;
  readonly panel: Option.Option<number>; // row id whose actions are open
  readonly commits: number;
  readonly keys: number;
  readonly last: string;
}

export const initial: (rows: ReadonlyArray<GridRow>) => EditorState;

/** Opens `id` for editing with its committed name as the draft. */
export const beginEdit: (
  state: EditorState,
  id: number,
  reason?: string,
) => EditorState;

export const editDraft: (state: EditorState, value: string) => EditorState;

/** Writes the draft to its row, clears editing, `commits + 1`, `last="commit"`. */
export const commit: (state: EditorState) => EditorState;

/** Discards the draft, `last="cancel"`. */
export const cancel: (state: EditorState) => EditorState;

/** Commits when the editing row is not in `visible`; `last="leave"`. */
export const endEditingOutside: (
  state: EditorState,
  visible: ReadonlyArray<number>,
) => EditorState;

export const select: (state: EditorState, id: number) => EditorState;

/** Moves `selected` by `step` in `rows`; `None` starts at the first row. */
export const moveSelection: (
  state: EditorState,
  rows: ReadonlyArray<GridRow>,
  step: number,
) => EditorState;

export const openPanel: (state: EditorState, id: number) => EditorState;

/** Closes the panel and records `reason` (`escape`, `outside`, `scroll`, `delete`). */
export const closePanel: (state: EditorState, reason: string) => EditorState;

/** Removes the row; clears `editing`/`selected`/`panel` when they named it. */
export const deleteRow: (state: EditorState, id: number) => EditorState;

/** One key reached the grid container (the bubbling proof). */
export const noteKey: (state: EditorState) => EditorState;

/** The exact viewport rows, without overdraw: `ceil((viewport + offset) / rowHeight)`. */
export const visibleIds: (
  rows: ReadonlyArray<GridRow>,
  anchor: Anchor,
  viewport: number,
  rowHeight: number,
) => ReadonlyArray<number>;

/** `editing=none draft=- commits=0 rows=60 sel=none panel=none keys=0 last=start` */
export const describe: (state: EditorState) => string;
```

Rules:

- `Option` for every absence; no `null`, no `undefined`, no numeric sentinels.
- `beginEdit` on a row already being edited re-seeds the draft from the
  committed value; it never edits two rows at once.
- `editDraft` is a no-op when nothing is being edited.
- `commit`/`cancel` with nothing being edited return the **same state object**
  (so an effect cannot loop).
- `moveSelection` clamps at both ends and returns the same state at an edge.
- Every helper returns a new object only when something changed.
- `describe` uses `-` for an empty draft and joins nothing: every field is one
  token. Row names are hyphenated (`item-00`) so a typed draft never contains a
  space.
- No React, no GPUix, no `Date`/`Math.random`; `effect/Array`/`effect/Option`
  only.

### 3.2 The view (`grid-editor.tsx`)

A `ge-frame` (720 px wide, column, 8 px gap, 12 px padding):

- **Toolbar** — `ge-sort` (a `Pressable` showing `sort: asc`), `ge-jump`
  (`scrollToItem(ge-list, 45)`), `ge-top` (`scrollToItem(ge-list, 0)`), and
  `ge-outside` (a plain 120 × 32 box used as an outside-press target).
- **`ge-state`** — a `Readout` of `describe(state)` plus ` keys=${keys}` is
  already in the model; the readout is the single assertion surface.
- **`ge-grid`** — `role="grid"`, `aria-label="Editable rows"`, and an
  `onKeyDown`: `noteKey`; when `state.editing` is `Some` **return** (the
  measured guard); otherwise `down`/`up` call `moveSelection` with the current
  ordered rows.
- **`ge-list`** — a `<virtual-list>` `estimatedItemHeight={32}`,
  `style={{ height: 320 }}`, `onVisibleRange={syncAnchor}`. Every row of the
  ordered set is a child, keyed by `row.id`.

Each row (`ge-row-<id>`, 32 px, flex row, 6 px gap):

| Element | Contract |
| ------- | -------- |
| `ge-cell-<id>` | 180 px, `tabIndex={0}`, `onClick` → `select(state, id)`. Renders the editor or the value. |
| `ge-editor-<id>` | an `<input>` **only while `editing === Some(id)`**, `autoFocus`, `aria-id`, `value={draft}`, `onChange` → `editDraft`, `onSubmit` → `commit`, `onKeyDown` Escape → `cancel`. |
| `ge-value-<id>` | a `<text>` with the committed name when not editing. |
| `ge-size-<id>` | a `<text>` with `size B`. |
| `ge-menu-<id>` | the row action: `role="button"`, `aria-label="Row actions"`, 28 × 24, a ref stored in a `Map<number, PublicInstance>`, `onClick` → `openMenu(id)`. |

`openMenu(id)` reads the action's own box
(`renderer.getElementBounds(instance.id)`), records the point in React state and
opens the panel **for that row**:

- The panel is a child of the row (the risky placement this plan measures),
  wrapped in `<anchored position={point} deferred priority={1} occlude
  style={{ position: "absolute" }}>`:
  - `ge-menu-panel`, `role="group"`, `aria-id`, `aria-label="Row actions"`,
    `tabIndex={-1}`, `autoFocus`, `onMouseDownOutside` → `close("outside")`,
    `onKeyDown` Escape → `close("escape")`.
  - `ge-menu-rename` (`role="button"`, `aria-label="Rename row"`) →
    `beginEdit(state, id, "rename")` then close.
  - `ge-menu-delete` (`role="button"`, `aria-label="Delete row"`) →
    `deleteRow` then close.

`close(reason)` clears the panel and, **only on `escape`**, focuses the row's
action through `renderer.focusElement`.

`syncAnchor()` runs in `onVisibleRange`:

1. read `getListScrollTop`; keep an `anchorRef` so a repeated event with an
   unchanged range is not a scroll;
2. on a **changed** anchor: update `anchorRef`, mirror it into state, close an
   open panel with `last="scroll"`, and apply `endEditingOutside` with
   `visibleIds(ordered, anchor, 320, 32)`;
3. apply `endEditingOutside` on every event too (a row-set change can move the
   editing row out of the window without moving the anchor).

`jump(index)` calls `renderer.scrollToItem`, mirrors `{ index, offset: 0 }` into
`anchorRef`/state (plan 338's rule: a programmatic scroll has no range event),
closes an open panel (`scroll`) and applies `endEditingOutside`.

Sorting (`ge-sort`) **commits an open edit first** (`commit`), then flips the
direction, closes the panel (`scroll`) and resets the anchor to the top with
`scrollToItem(0)` + the mirrored anchor, because the row set changed (plan 338).

`ge-cell-<id>` is a plain `tabIndex={0}` div: a click focuses it natively and
runs `select`, so the probe can navigate with arrows while **not** editing.
While editing, the same arrows must move the caret and leave `selected` alone —
that is the guard proof. All colours/typography come from `useTheme()`; the only
literals are geometry (720, 320, 180, 32, 28, 24, 6, 8).

### 3.3 Checks

| Area | Check |
| ---- | ----- |
| baseline | `ge-frame` paints; `ge-row-0` paints 32 px tall; `ge-state` reads `editing=none draft=- commits=0 rows=60 sel=none panel=none keys=0 last=start`; row 0 paints `item-00`; a row past the window (`ge-row-40`) has no bounds |
| begin edit | click `ge-cell-0`: `editing=0 draft=item-00 last=edit`; the editor is painted; **native focus is `ge-editor-0`**; the input's a11y node is a `TextInput` with the committed value |
| typing is a draft | `cmd-a` + `beta`: `draft=beta`, `commits=0`; the row still paints `item-00` (and no `beta` anywhere); `keys` grew |
| commit | Enter: `editing=none draft=- commits=1 last=commit`; the row paints `beta`; the a11y value is `beta` |
| grid guard | with the editor focused and editing, press `down`: `sel=none` and `keys` grew; focus is still `ge-editor-0` |
| grid navigation | click `ge-cell-1`: `sel=1 last=select`; press `down`: `sel=2`; `up`: `sel=1` |
| editing ends on leave | click `ge-cell-0`, type `x` (`draft=betax`), `scrollToItem(ge-list, 40)` + `advance(50)`: the anchor is 40, `ge-row-0` is unpainted, `editing=none`, `commits=2`, `last=leave`; scroll back to 0: the row paints `betax` |
| row menu geometry | click `ge-menu-2`: `panel=2`; `ge-menu-panel` paints at the action's left edge and below it within 1 px; the panel takes native focus; it is a `Group` named `Row actions` |
| menu Escape | `escape`: `panel=none last=escape`; the panel unpaints; focus is `ge-menu-2` |
| menu action | reopen on row 2, click `ge-menu-rename`: `editing=2 last=rename panel=none`; focus is `ge-editor-2` |
| menu delete | type nothing, `escape` (cancel) → `editing=none last=cancel`; reopen on row 3, click `ge-menu-delete`: `rows=59 panel=none last=delete`; row 3 unpaints; the following row still paints |
| menu scrolls | reopen on row 4, `scrollToItem(ge-list, 40)` + `advance(50)`: `panel=none last=scroll`; the panel has no bounds |
| outside press | reopen on row 4, click `ge-outside`: `panel=none last=outside`; the panel unpaints; focus is **not** returned |
| sort ends an edit | click `ge-cell-1`, type `z`, click `ge-sort`: `commits` incremented, `editing=none`, `last=sort`; the descending order paints `item-59` first and the edited row paints `item-01z` |
| row identity | the committed edit follows its row id after the sort (`ge-row-1` paints `item-01z`, not another row) |
| live | a real window repeats: click the editor, type, Enter commits; begin another edit, scroll away and read the end-of-edit; open the row menu, Escape returns focus, rename starts an edit. Paced by `settle`/`waitFor`/`waitForFocus`; no style or a11y read |

The probe does **not** re-measure text entry, focus traversal, `scrollToItem`,
`onVisibleRange` payload lag, the anchored placement inside a plain scroller, or
the plan-384 panel dismissal. It does not claim: a column-virtualized grid, a
context menu (right click), multi-cell ranges, undo, validation, or a persisted
edit.

## 4. Files

Create:

- `apps/playground/src/scenarios/grid-editor-model.ts` — §3.1.
- `apps/playground/src/scenarios/grid-editor-model.test.ts` — §7.1.
- `apps/playground/src/scenarios/grid-editor.tsx` — the view, scenario and the
  exported probe component for the live twin.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register
  `gridCellEditingScenario`, add `"cell-editing"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"cell-editing"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, append
  `live-grid-cell-editing` to `liveScenarios`.
- `apps/playground/README.md` — a `## Editable grid cells and row menus
  (plan 387)` section with the measured facts and the corrected counts.
- `COMPONENTS.md` — the capability table row; the **Tables**, **Virtualized
  tables** and **Property editors** rows get the measured contract (the
  Property editors row's "does not claim off-window focus" sentence is replaced
  by what was measured).
- `TODO.md` — tick the new playground task with the measured counts.
- `.agents/slop/plans/README.md` — add the `387` row; move the next free number
  to `388`.

Do **not** change any package source, `apps/docs`, the shell or the theme. Any
defect found is a `TODO.md` task with its own plan number.

## 5. Why the policy is "commit on leave"

The alternative policies are worse on the measured runtime:

- **Keep editing off-window.** `roving-focus` proved the focused row is retained
  and stays in the painted text outside the window, and `live-key-routing`
  proved keys keep arriving. The user would type into a field they cannot see,
  with no affordance to get back. (The probe's mutation M3 measures exactly
  this: with the leave rule removed, `draft` keeps changing after the scroll.)
- **Discard on leave.** A spreadsheet-style grid is expected to keep what was
  typed; Escape is the explicit discard. Committing is the least surprising and
  matches the Enter path.
- **Reveal the row instead of ending the edit.** The runtime already keeps the
  focused row painted outside the window (clipped); there is no API to scroll
  "just enough" except `scrollIntoView`, which would fight the user's scroll.
  Out of scope.

A row menu is different: its `<anchored position>` is a **window point**
captured at open, so when the list scrolls the row moves but the panel does not.
There is no scroll event to re-measure from (only `onVisibleRange`), and a menu
that follows a recycled row could act on the wrong row. Closing on any anchor
change is the honest contract; the probe asserts it.

## 6. Steps for the executor

1. Read this plan, then `property-panel.tsx` (the editor row and functional
   updates), `data-grid.tsx` + `data-grid-model.ts` (the anchor and sort),
   `column-config.tsx` (the anchored panel, `autoFocus`, focus return),
   `roving-focus.tsx` (the ref registry) and `probes.ts`.
2. Write `grid-editor-model.ts` + its test. Run:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; the playground unit tests are **231** at plan `386` and
   grow by this file's tests.
3. Write `grid-editor.tsx`, register it and add the capability literals. Run the
   same command. Expected: exit `0`; `scenarioProblems` reports nothing.
4. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only grid-cell-editing
   ```

   Expected: `1/1 scenarios passed`, exit `0`. A miss reports the readout, the
   focused id or a bound — fix the implementation, or, when the runtime really
   behaves differently, assert the measured fact with a label that says so
   (§9).
5. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected baseline before this plan: `88/88`, `2990` checks, exit `0`. After:
   `89/89`, `2990 + <new>` checks, exit `0`, `cell-editing=verified`.
6. Add `live-grid-cell-editing` and run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected baseline: `39/39` live, `726` checks, exit `0`. After: `40/40`,
   `726 + <new>`, exit `0`, one screenshot.
7. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`.
8. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md`, this plan's
   §9 and the plan index with the measured counts and every fact that changed
   the design. Commit the plan first, then the probe.

## 7. Test plan

### 7.1 Unit tests (`grid-editor-model.test.ts`)

Each must be able to fail:

| Test | Guards |
| ---- | ------ |
| `makeRows` | 60 rows, ids `0…59`, names `item-00…item-59`, alternating `file`/`dir`, `size = id * 4` |
| `visibleIds` | 320/32 at anchor 0 → ten ids; a 16 px offset shows the eleventh; clamped at the last row; empty rows → empty |
| `beginEdit` | sets `editing` + the committed name as the draft, `last=edit`; a second call on another row replaces the first |
| `editDraft` | changes the draft while editing, is a no-op with nothing being edited, and never mutates `rows` |
| `commit` | writes the draft to the **row id**, increments `commits`, clears `editing`/`draft`, `last=commit`; a no-op returns the same object |
| `cancel` | clears the edit, `last=cancel`, and leaves the committed row untouched |
| `endEditingOutside` | returns the same object when the id is visible; commits with `last=leave` when it is not |
| `moveSelection` | `None` → first id; `down` from the middle → the next; clamps at both ends; a filtered row list is walked in its own order |
| `select` | records the id, `last=select` |
| `openPanel`/`closePanel` | panel id and `last`; closing records its reason |
| `deleteRow` | removes exactly one row; clears `editing`/`selected`/`panel` when they named it and leaves them when they did not |
| `noteKey` | increments `keys` only |
| `describe` | the exact baseline string; `draft=-` for empty; the panel and selection as `none`/id |
| immutability | every helper leaves its input arrays and objects untouched |

### 7.2 The scenario

The scenario is the runtime test: typed checks over readout text, bounds, the
a11y dump, native focus and painted text. Record six mutation proofs and one
reverse proof in §9.3 (temporary edit → `--only grid-cell-editing` → revert):

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | the grid's `onKeyDown` drops the `editing` guard | "an editing cell keeps grid selection still" (`sel=1`) |
| M2 | `activate` opens the editor on the first press | "a first press selects the row" (`last=edit`) |
| M3 | `endEditingOutside` always returns its input | "leaving the window ends the edit" (`editing=0`, `commits` unchanged) |
| M4 | `openMenu` positions from the row instead of the action | "the panel opens below its action" (the y offset is off by the row height) |
| M5 | a scroll does not close an open panel | "a scroll closes the row menu" (`panel` still set) |
| M6 | `deleteRow` removes the last row instead of `id` | "delete removes its row" (`rows=59` but row 3 still paints) |

Reverse proof (consumer wiring): `ge-sort` flips the direction **without**
committing the open edit → "a sort ends an edit" fails with `editing=1, last=sort`
and the committed text missing.

### 7.3 Two-direction checks by hand

- `--only grid-cell-editing` exits `1` after each mutation and names the check
  label.
- Full headless `89/89` and live `40/40`, both exit `0`.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.

## 8. STOP conditions

- **`autoFocus` does not focus the conditionally mounted editor inside a virtual
  row.** Record what `focused()` reports. Fall back to a `useLayoutEffect` keyed
  on the editing id that calls `renderer.focusElement` through a ref registry
  (the plan-378 recipe) and record the measured requirement. Do not weaken the
  focus check to "none".
- **The editor loses native focus when its row leaves the window.** That is the
  opposite of `roving-focus`'s div result. Keep `endEditingOutside` (the policy
  still holds) and record the measured focus; remove the "keys still arrive"
  claim if it does not hold.
- **A key typed into the editor does not reach the grid container's
  `onKeyDown`.** Then there is no guard to prove: drop M1, assert the measured
  non-bubbling, and record it as the safer model. Do not invent a counter.
- **The anchored panel inside a virtual row has no painted bounds** (the list
  clips it). Mount the panel as a **sibling of the virtual list** at the same
  measured window point, keep every check, and record the measured reason.
- **Scrolling with the panel open leaves the panel painted and unchanged.** That
  is the expected trap; still close it on scroll and record the measured stale
  point in §9 (`panel`, its bounds, the row's new bounds).
- **`scrollToItem` inside the scenario fires no visible-range event.** Mirror the
  anchor in `jump` (already planned) and, in the scenario, use
  `ctx.host.scrollToItem` + `advance(50)` as `property-panel` does; if the event
  still does not fire, call a probe control that scrolls **and** applies the
  policy explicitly, and record the difference.
- **A row-set sort reorders the DOM so the focused editor moves to another
  row.** The policy commits before the sort, so this should not be observable;
  if it is, assert the committed value by id and record the focus.
- **The readout grows a space** (a typed draft with a space). The probe types
  `beta`/`x`/`z` only; if a check needs a space, add a `draftLength` field
  instead of changing the parser.
- **A file outside §4 must change.** Stop and write the task in `TODO.md`.
- The suites are not `89/89` headless and `40/40` live with exit `0`. Stop and
  report the failing scenario; do not mark the plan done.

## 9. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003).

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `grid-cell-editing` (headless) | 57 | pass — suite `88 → 89`, `2990 → 3047`, exit `0`, `cell-editing=verified` |
| `live-grid-cell-editing` | 36 | pass — live `39 → 40`, `726 → 762`, exit `0`, one screenshot |

Unit tests: `grid-editor-model.test.ts` adds 33; the playground suite is
231 → **264** tests in 22 files.

### 9.1 Facts that changed the plan

- **`autoFocus` focuses the conditionally mounted editor inside a virtual row**,
  headless and live. The planned `useLayoutEffect` + `focusElement` fallback was
  not needed.
- **A second press starts the edit.** The first press only selects (`last=select`);
  0.10.0 delivers no double click, so the probe's affordance is "press the
  selected row again", and the model exposes it as `activate`.
- **Editor keystrokes bubble to the grid container**: the `keys` counter grows
  while the caret stays in the editor. The guard must be a state check
  (`editing`), not an event stop.
- **The still-editing row stays painted after the window moves past it.** With
  the leave rule disabled (M3), the first failing check was *"the edited row left
  the window"* — `ge-row-0` still had bounds because it held focus, matching
  plan `158`. The editor also kept focus and keys; committing on leave is what
  makes "left the window" observable at all.
- **A programmatic `scrollToItem` fires no range event live.** The headless list
  reported the new anchor, so the headless steps can scroll the host directly;
  the live twin has to click the app-owned `jump`, which mirrors the anchor and
  applies the leave/close rules (plan `338`'s rule, re-measured).
- **The anchored menu is not clipped by the list.** It painted at the action's
  bottom-left within 1 px from a child of the virtual row and took focus; the
  planned sibling-of-the-list fallback was not needed.
- **The menu's captured point does not follow a scroll.** The panel is a child
  of the row but its `position` is a window point, so a scroll leaves it at the
  stale place. Closing on any anchor change is the measured contract; M5 proves
  the check.
- **A commit writes by row id, not by index.** After the descending sort the
  edited row's text follows its id (`ge-value-1` reads `item-01z`) even though
  its index changed; the model's `finish` writes by id.
- The input's painted text is the **draft**, so "the committed value is
  unchanged" is asserted through a preview outside the list, not the row (the
  row's value text unmounts while editing).

### 9.2 The measured contract

| Fact | Value |
| ---- | ----- |
| baseline | `editing=none draft=- commits=0 rows=60 sel=none panel=none keys=0 last=start anchor=0 sort=asc` |
| first press / second press | `sel=0 last=select`, then `editing=0 draft=item-00 last=edit`; focus `ge-editor-0`; the editor is `TextInput` with the committed value |
| typing | `draft=beta commits=0`; the preview stays `item-00`; the editor paints `beta` |
| guard | keys counted at the grid container; `sel` stays `0`; focus stays `ge-editor-0` |
| Enter | `editing=none commits=1 last=commit`; the row and preview read `beta` |
| grid keys | with no editor, `down`/`up` move `sel` (`1 → 2 → 1`) |
| leave | `scrollToItem(40)`: anchor `40`, row 0 unpainted, `editing=none commits=2 last=leave`; scrolling back paints `betax` |
| menu | `panel=2`; box at the action's left edge and bottom within 1 px; focus `ge-menu-panel`; `Group:Row actions` |
| dismissal | Escape → `panel=none last=escape`, unpainted, focus `ge-menu-2`; outside press → `last=outside`, unpainted, no focus return |
| menu actions | Rename → `editing=2 panel=none last=rename`, focus `ge-editor-2`; Escape → `last=cancel`; Delete → `rows=59 last=delete`, row 3 unpainted, row 2 painted |
| scroll with a menu | `panel=none last=scroll`, unpainted |
| sort | `editing=none commits=3 last=sort`, `sort=desc`, row 59 paints first, and `ge-value-1` reads `item-01z` after a jump |
| live | the typed draft, Enter commit, jump-leave commit, menu placement/focus/Escape, rename focus and Escape cancel all hold |

### 9.3 Mutation proofs

Each mutation was applied, built, run with `--only grid-cell-editing`, and
reverted:

| # | Mutation | Measured failure |
| - | -------- | ---------------- |
| M1 | the grid's `onKeyDown` drops the `editing` guard | `an editing cell keeps grid selection still` — `sel=1` |
| M2 | `activate` opens the editor on the first press | `a first press selects the row` — `last=edit` |
| M3 | `endEditingOutside` always returns its input | `the edited row left the window` — the focused row kept painted bounds |
| M4 | `openMenu` positions at the action's top instead of its bottom | `the menu opens below its action` — 24 px short |
| M5 | `closePanel` ignores the `scroll` reason | `a scroll closes the row menu` — `panel=4` |
| M6 | `deleteRow` removes row 59 instead of `id` | `the deleted row unpaints` — row 3 still painted |
| R | `sorting` closes the menu and flips the order without committing | `a sort ends the edit and commits it` — `editing=1 commits=2` |

### 9.4 Limits recorded

- No double click (0.10.0 has none), no multi-cell range selection, no
  per-cell validation, no undo and no persisted edit.
- The probe edits the **name** cell only; a numeric cell would need its own
  parse/clamp rules, which the shipped `NumberField` already covers.
- A right-click context menu and column virtualization stay with plans `164`
  and `185`; this probe uses a left-click row action.
- The live twin cannot read the a11y dump or styles, so the `Group`/`TextInput`
  and painted-draft checks are headless-only.
- The list's overdraw is not used as the visible window: `visibleIds` counts the
  exact viewport, because "is the editing row visible" is a different question
  from "is it close to the window".

## 10. Acceptance

- `grid-editor-model.ts` + its test, `grid-editor.tsx`, the registry entry, the
  capability literal, the live twin, and the docs/inventory/plan-index updates.
- Headless `89/89`, live `40/40`, exit `0`; `nub run check`, `nub run lint`,
  `nub run test` all exit `0`.
- `COMPONENTS.md`'s **Tables**, **Virtualized tables** and **Property editors**
  rows carry the measured contract; `TODO.md` ticks this task with the counts.
- Every mutation in §7.2 was run and produced the named failure (§9.3).
- No component package changed. Any defect found is a measured `TODO.md` task
  with its own plan number, not an edit from this workstream.
