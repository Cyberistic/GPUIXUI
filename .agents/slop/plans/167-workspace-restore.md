# 167 — Plan: workspace state restore (panels, tabs, virtual-list anchor)

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §8) |
| Phase | B (feasibility) → feeds Tier 4 docking: persistent panel state and workspace restore |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `152` (virtual window), `164` (`getListScrollTop` in a virtual list), `166` (`scrollToItem` and its offset) |
| Feeds | `@gpuixui/docking` (persistent panel state) and every app that restores a workspace |

## 1. Goal

MISSION's testing list names **workspace restore** as a critical interaction and
nothing has measured it. `workspace-tab-drag` records that a remount loses the
workspace, and plan `166` §8 records two explicit gaps: *"restoring a saved
anchor after a remount"* and *"`scrollToItem`'s `offsetInItem`"*.

This probe answers, in the real runtime:

1. Does a remount reset the workspace (the honest baseline)?
2. Can app-owned serialised state — split width, tab order, active tab, and a
   virtual-list anchor — be restored **exactly** into a freshly mounted tree?
3. Does `scrollToItem(list, index, offsetInItem)` restore the anchor exactly,
   including a non-zero in-row offset?
4. What happens to native focus across a remount, and is the restored list live
   for input afterwards?

The probe models persistence the way the library will: **the app owns the
serialisation** (no renderer storage exists) and decodes it at the boundary with
`Schema`.

## 2. Scenario `workspace-restore` (capability `workspace`)

One view: a two-pane split (`SplitPane`), a tab strip per pane, a 200-row
`<virtual-list>` in pane B, and three pressable controls.

### State

`apps/playground/src/scenarios/workspace-state.ts` (no JSX, unit-testable)
defines the persisted shape and the pure helpers:

| Export | Contract |
| ------ | -------- |
| `WorkspaceState` | `Schema.Class`: `split: number`, `tabsA: string[]`, `tabsB: string[]`, `active: string`, `anchorIndex: number`, `anchorOffset: number` |
| `WorkspaceStateJson` | `Schema.fromJsonString(WorkspaceState)` — the persistence boundary |
| `DEFAULT_WORKSPACE` | `320`, `["one","two"]`, `[]`, `"one"`, `0`, `0` |
| `snapshotWorkspace(state, anchor)` | copy `state` and take `anchorIndex`/`anchorOffset` from the runtime anchor `[index, offset, height]` |
| `describeWorkspace(state)` | `split=320 tabsA=one,two tabsB=none active=one` (empty panes print `none`) |

### View

`apps/playground/src/scenarios/workspace-state.tsx`:

- live state is controlled: `split`, `tabsA`, `tabsB`, `active`;
- a `generation` counter keys the whole workspace subtree, so a bump is a real
  unmount + mount (the "app restart" the feature is for);
- `saved` is an `Option<WorkspaceState>`; `wr-live` prints
  `describeWorkspace(live)`; `wr-saved` prints `saved=false` before the first
  save and `saved <describe> anchor=<index>,<offset>` after it;
- `wr-save` captures the current split/tabs/active **plus** the native anchor
  read through `renderer.getListScrollTop(listId)` (the list's id comes from its
  ref callback) and stores a `WorkspaceState`;
- `wr-reset` sets every field back to `DEFAULT_WORKSPACE`, clears any pending
  restore anchor and bumps `generation` — the saved value is **not** cleared;
- `wr-restore` applies the saved value, sets the pending restore anchor to
  `(anchorIndex, anchorOffset)` and bumps `generation`;
- `RestorableList` receives the pending anchor and, in a `useLayoutEffect` that
  runs once on mount, calls `renderer.scrollToItem(id, index, offset)` when an
  anchor is present. A mount-only effect is deliberate: an inline ref callback
  re-runs on every render and would snap a restored list back after the user
  scrolls.
- rows: `wr-row-<n>`, 32 px tall, `role="option"`, `onClick` and `tabIndex={0}`
  so a click can prove the restored tree receives input;
- controls use `Pressable` from `../ui.js`.

`SplitPane` is **unchanged**: a keyed remount with `initial={live.split}` gives
it the restored width, and `onResize` keeps `live.split` current during a drag.
`testId`s stay `wr-pane-a`, `wr-divider`, `wr-pane-b`; the tab strip prefixes
`wr-tab-`.

### Tab strip extraction

`workspace-tab-drag` and this probe both need the pointer-captured tab strip.
Hoist it once (AGENTS §1: never copy between consumers):

- new `apps/playground/src/panels/tab-strip.tsx` with the existing component,
  adding a `testIdPrefix` prop (`workspace-tab-drag` passes `"tab-"`, this probe
  `"wr-tab-"`);
- `apps/playground/src/scenarios/workspace.tsx` imports it and deletes its local
  copy. Its testIds and behaviour must not change.

### Steps

1. **Baseline.** `wr-live` is `split=320 tabsA=one,two tabsB=none active=one`;
   `wr-saved` is `saved=false`; the list anchor is `[0,0,280]`; `row 0` is
   painted and `row 120` is not.
2. **Make a workspace.** Drag `wr-divider` +80 → `split=400`; drag `wr-tab-one`
   +200 into pane B → `tabsA=two tabsB=one active=one`; `scrollToItem("wr-list",
   120, 16)` → anchor exactly `[120,16,280]` and `row 120` painted.
3. **Save.** Click `wr-save`; `wr-saved` contains `split=400`,
   `tabsA=two tabsB=one active=one` and `anchor=120,16`.
4. **Reset = restart.** Click `wr-reset`; `wr-live` is the default state, the
   anchor is `[0,0,280]`, `row 0` is painted — the workspace is genuinely lost —
   and `wr-saved` still holds the saved value.
5. **Restore.** Click `wr-restore`; after `advance(0)` the live state is
   `split=400 tabsA=two tabsB=one active=one`, the anchor is **exactly**
   `[120,16,280]`, `row 120` is painted and `row 0` is not.
6. **Focus is not restored.** The row focused before the save is not focused
   after the remount (focus lands on the `wr-restore` control the user clicked);
   clicking `wr-row-120` focuses `wr-row-120` — the restored list is live.
7. **Second restore is idempotent.** Click `wr-restore` again; the same live
   state and anchor hold, proving the saved value was not consumed.

## 3. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/167-workspace-restore.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `167` |
| `packages/testing/src/smoke.ts` | `SmokeHost.scrollToItem` gains optional `offsetInItem` |
| `packages/testing/src/test-support.ts` | inert member keeps its two-arg shape (optional third) |
| `apps/playground/src/smoke/host.ts` | forwards `offsetInItem` when present |
| `apps/playground/src/panels/tab-strip.tsx` | new: the extracted tab strip + `testIdPrefix` |
| `apps/playground/src/scenarios/workspace.tsx` | import the extracted strip; delete the local copy |
| `apps/playground/src/scenarios/workspace-state.ts` | new: `WorkspaceState`, JSON codec, defaults, pure helpers |
| `apps/playground/src/scenarios/workspace-restore.tsx` | new: the view + the `workspace-restore` scenario |
| `apps/playground/src/scenarios/workspace-state.test.ts` | new: pure-helper tests |
| `apps/playground/src/scenarios/index.ts` | register `workspaceStateScenario` |
| `apps/playground/src/smoke/run.test.ts` | registry expectation gains `workspace-restore` |
| `apps/playground/README.md` | scenario count `32 → 33`; a "Workspace restore" section |
| `COMPONENTS.md` | "Persistent panel state" and "Workspace layouts" rows cite the measured contract |
| `TODO.md` | the task, ticked on completion |

## 4. Commands and expected results

1. `nub run --filter @gpuixui/testing test` → exit `0`.
2. `nub run --filter playground test` → exit `0` (includes the new pure test).
3. `nub run --filter playground check-types` → exit `0`.
4. `nub run --filter playground build` → exit `0`.
5. `nub apps/playground/dist/smoke/run.js --only workspace-restore` → `1/1`,
   exit `0`, `workspace=verified`.
6. `nub apps/playground/dist/smoke/run.js` → **33/33**, exit `0` (the existing
   `workspace-tab-drag` must stay green after the tab-strip extraction).
7. `nub run check`, `nub run lint`, `nub run test` → exit `0`.

## 5. STOP conditions

- **STOP** if `scrollToItem(id, index, offsetInItem)` does not produce the
  requested anchor on a freshly mounted list. Record the measured anchor and
  whether a second `advance`/render is needed; the docking contract then gains an
  explicit "apply after first paint" step.
- **STOP** if the mount-only effect runs before the list has a native id or
  before its rows are laid out and the scroll is dropped. Record the order; do
  not switch to a timer without measuring how many frames are needed.
- **STOP** if the keyed remount keeps the old native list id alive (the list is
  not really remounted). Record it; the probe would no longer measure restore.
- **STOP** if the restored `SplitPane` paints its old width rather than
  `initial` (internal state surviving the remount). Record it; `SplitPane` then
  needs a controlled `size`.
- **DO NOT** fake the restart by clearing state without remounting, and **DO
  NOT** persist by reading React state alone — the anchor must come from
  `getListScrollTop`.

## 6. Test plan (two directions)

- The scenario fails if the reset does not lose the workspace, if restore does
  not reproduce split/tabs/active, if the anchor is not exact, or if the
  restored list does not accept a click.
- Two-direction proof, recorded in §8:
  1. remove the `scrollToItem` call from `RestorableList` → the restored-anchor
     and painted-row checks fail (exit `1`).
  2. make `wr-reset` keep the live state instead of applying
     `DEFAULT_WORKSPACE` → the "reset lost the workspace" checks fail.
- The pure test fails if `snapshotWorkspace` drops the anchor, if
  `describeWorkspace` formats an empty pane as an empty string, or if the JSON
  round-trip changes a field.
- `scenarioProblems` (unit, exists) stays green: `workspace` is already
  required.

## 7. Acceptance criteria

- `workspace-restore` is registered, green, and the suite is **33/33**.
- The tab strip exists once; both workspace scenarios use it and stay green.
- The two two-direction proofs are recorded in §8.
- `COMPONENTS.md`, the app README and `TODO.md` cite the measured contract.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Measured facts

**Suite: 33/33 green on this host, exit `0`**, `workspace=verified` with two
scenarios (`workspace-tab-drag` unchanged after the tab-strip extraction).
`workspace-restore` records **28 checks**.

| Fact | Measured |
| ---- | -------- |
| a keyed remount is a real restart | `wr-reset` returns the live workspace to `split=320` and anchor index `0`, while the saved JSON is untouched |
| the split restores | the remounted `SplitPane` lays out at the saved `initial=400` with no controlled mode; `onResize` keeps the value current during a drag |
| tabs restore | `tabsA=two tabsB=one active=one` after restore, exactly the saved layout |
| the anchor restores | `scrollToItem(list, 120, 16)` on the freshly mounted list reports anchor index **120** and in-row offset **16**; row 120 is painted and row 0 is not |
| a second restore | idempotent — the saved JSON is not consumed |
| native focus | **not restored**: the row focused before the save is not focused after the remount (focus lands on the clicked `wr-restore` control), and clicking the restored row 120 focuses `wr-row-120` |
| tab strip extraction | `workspace-tab-drag` still moves a tab and resizes the split, so the hoisted `TabStrip` is behaviour-identical |

`offsetInItem` is therefore **supported and exact** on a remount, closing plan
`166`'s second open gap. The persistence contract for `@gpuixui/docking`:

- serialise `split`, tab lists, active tab, `anchorIndex` and `anchorOffset`
  (not the raw `getScrollOffset`, which saturates);
- rebuild the tree with the saved numbers, then apply the anchor with
  `scrollToItem(listId, index, offset)` once the remounted list has an id — a
  mount-only layout effect works; an inline ref callback re-runs every render and
  would undo the user's next scroll;
- do **not** claim focus restore: it is app state, and the runtime does not keep
  it across a remount.

**Two-direction proofs** (both run, outputs quoted):

1. removing the `scrollToItem` call from `RestorableList`: **exit `1`**,
   `the restored index is exact: expected 120, got 0`. Restored.
2. making `wr-reset` keep the live state: **exit `1`**, `a reset loses the
   workspace: expected a string containing "split=320 tabsA=one,two tabsB=none
   active=one", got "split=400 tabsA=two tabsB=one active=one"`. Restored.

**Not measured:** restoring focus, restoring a non-virtual scroll container
(`scrollTo` with a saved offset), and restoring a workspace in a second window
(0.10.0 has no multi-window API).

