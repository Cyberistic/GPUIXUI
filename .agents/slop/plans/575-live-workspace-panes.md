# 575 — Tabbed panes in a real window: hidden state, the wheel guard and a live resize

**Owner:** playground workstream (`apps/playground`, `packages/testing`).
**Depends on:** `177` (the tabbed-panes probe), `162`/`172` (nested scrollers and
the wheel), `175` (nested panels), `189`/`190` (the live window), `197` (the live
observation surface), `339` (live workspace restore), `556`/`559` (recent live
virtual-list twins), `571` (the most recent live evidence).
**Phase:** F — the last Tier 4 pane contract with headless-only evidence.

## 1. Why

`workspace-panes` (plan `177`) measured three things in the offscreen
`TestRenderer` that a tabbed workspace depends on:

- `display: "none"` is a **no-op** in 0.10.0, so a hidden pane is an absolute
  slot with `visibility: "hidden"` and `pointerEvents: "none"`; its local state,
  its virtual-list anchor and its draft survive the tab switch, and it leaves
  the paint and the tab order;
- a resized pane re-windows its `<virtual-list>` and keeps its anchor;
- a nested scroller **chains** its wheel to the ancestor unless the inner
  scroller sets `pointerEvents: "auto"`.

Two gaps remain:

1. **The guard itself was never exercised.** The headless scenario says so
   inline: after an ancestor scroll the published bounds tracker keeps the
   inner's pre-scroll box, so a pointer wheel aimed at the inner lands
   elsewhere. The scenario toggles the guard and asserts only the readout. The
   claim "`pointerEvents: "auto"` keeps the wheel in the nested scroller" is
   therefore **unproven in both harnesses**. It can be proven by exercising the
   guard *before* any ancestor scroll.
2. **The whole composition is headless-only.** A real window has differed on
   exactly this kind of behaviour: a body-cell `deltaX` wheel is swallowed by a
   `<virtual-list>` (plan `338`), a scroller's own box moves with its scroll
   (plan `556`), and a live window has no `style` (plan `197`). The live suite
   has never mounted the tabbed-panes view.

This plan closes both with the shared view already in the registry:

1. the headless `workspace-panes` proves the guard **first** (guard on, wheel the
   inner, the outer must not move), then proves chaining with the guard off;
2. a live twin, `live-workspace-panes`, repeats the guard, the hidden-pane
   state, the tab order and a paced live resize in a real `1100 × 720` window.

Only what a window can answer is asserted live: painted text, `text()` for a
retained-but-unpainted pane, `listScrollTop`, `scrollOffset`, native focus and
the wheel. Colour and accessibility stay headless.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/workspace-panes.tsx` | move the guard toggle to the **start** of the steps; add the guard-on wheel and its two assertions; move the chaining wheel after it; keep the later stale-bounds check and the resize checks. Update the composition comment to record that the guard is proven before any ancestor scroll. |
| `apps/playground/src/live/scenarios.tsx` | import `workspacePanesScenario`; add `live-workspace-panes` (`capability: "workspace"`, `ready: "ws-readout"`, `view: workspacePanesScenario.view`); register it after `restore`. |
| `apps/playground/README.md` | one live-evidence table row naming `live-workspace-panes` and what it proves. |
| `COMPONENTS.md` | the **Workspace layouts** row cites `live-workspace-panes`, the guard proof and the live resize. |
| `TODO.md` | claim the task before implementing; tick it with the measured counts and the live-registry note. |
| `.agents/slop/plans/README.md` | index row for this plan. |

No `packages/testing` change: every verb exists (`text`, `paintedText`,
`scrollOffset`, `listScrollTop`, `scrollToItem`, `click`, `key`, `wheel`,
`drag`, `focusNext`, `focused`, `screenshot`, `waitFor`). No production
component change: the view is app-owned chrome.

## 3. Implementation

### 3.1 Headless: prove the guard before the chain

`workspace-panes.tsx` currently starts the scroll section with a guard-off
wheel, which leaves the inner's recorded box stale and makes the guard
untestable. The shipped order is: **chain first at a fresh origin, return the
outer, then aim the guard at a painted inner row**. Do not try to toggle the
guard and re-wheel the container — a second container wheel after the container
has scrolled is not aimed at the paint (measured, §8). Replace the block from
`const scrollY = ...` through the old `ws-log-guard` click with this order (keep
`scrollY` and the later resize steps):

1. `ctx.host.wheel("ws-log-inner", 0, -240)`; expect `inner -240`, `outer -240`
   (the unguarded chain).
2. `ctx.host.wheel("ws-log-row-10", 0, 240)`; expect `outer 0`, `inner -240`.
3. Keep the existing stale-bounds block and its comment.
4. `ctx.host.click("ws-log-guard")`; expect `guard=on`.
5. `ctx.host.wheel("ws-inner-row-14", 0, -120)` (a row visible at the inner's
   `-240` offset).
   - `the guarded inner scroller takes the wheel` — inner is `-360`.
   - `the guard stops the wheel at the inner scroller` — outer is `0`.

Expected new headless total: 27 checks (was 25). Record the measured count.

If step 2 does **not** keep the outer at `0`, stop: render the guard's effect
on the outer anyway (`pointerEvents` on the inner) instead of claiming it, and
record the measured limitation in §8 and `COMPONENTS.md`. Never assert a
readout as a substitute for the behaviour.

### 3.2 `live-workspace-panes`

Add to `apps/playground/src/live/scenarios.tsx`, near the other Tier 4 twins,
using the existing helpers (`textOf`, `offsetOf`, `waitForText`,
`waitForAnchor`, `settle`, `focusedOf`, `LiveContext`, `LIVE_ARTIFACTS`). The
scenario reuses `workspacePanesScenario.view`; `ready: "ws-readout"`.

Steps, each followed by `settle` (and a bounded `waitFor*` where noted):

1. **Mount.** `waitForText(ctx, "ws-readout", "active=tree top=240 guard=off")`.
   Assert the readout exactly (`textOf`), so a changed initial size fails.
2. **Paint vs mount.** `paintedText()` contains `tree row 0`; it does **not**
   contain `Editor pane`; `textOf(ctx, "ws-editor-marker")` is `Editor pane`
   (a retained hidden pane still answers `text`). This is the live form of
   "hidden leaves the paint but stays mounted".
3. **A real row click inside the virtual list.** click `ws-tree-row-2`,
   `waitForText(ctx, "ws-tree-pick", "pick=2")`, assert it exactly.
4. **A real wheel chains at a fresh origin.** `wheel("ws-log-inner", 0, -240)`;
   `waitForOffset` the inner to `-240` and the outer to `-240`.
   - `the live nested scroller takes the wheel` — inner `-240`.
   - `the unguarded live nested scroller chains` — outer `-240`.
5. **Return the outer scroller.** `wheel("ws-log-row-10", 0, 240)`; poll the
   outer offset to `0`; assert the inner keeps `-240`.
6. **The guard keeps a real wheel in the inner scroller.** `click("ws-log-guard")`;
   wait `guard=on`; `wheel("ws-inner-row-14", 0, -120)` (a row visible at the
   inner's `-240` offset).
   - `the guarded live inner scroller takes the wheel` — inner `-360`.
   - `the live guard stops the ancestor wheel` — outer `0`.
7. **The hidden pane keeps its state.** `click("ws-tab-editor")`;
   `waitForText(ctx, "ws-readout", "active=editor")`; assert
   `paintedText()` no longer contains `tree row `; `textOf("ws-editor-marker")`
   still answers. Click `ws-editor`, send `n`, `o`, `t` with `settle` between
   each (two keys in one batch can coalesce), `waitForText(ctx, "ws-draft",
   "draft=not")`.
8. **Tab back, then the anchor.** `click("ws-tab-tree")`;
   `waitForText(ctx, "ws-readout", "active=tree")`; assert `pick=2`,
   `paintedText()` contains a tree row, and `listScrollTop("ws-tree")` is
   `[0,0,194]` (the opening anchor; **measure it** — the pane's content height
   is `240 − 46`). Then `scrollToItem("ws-tree", 20)` and poll to `[20,…]`;
   assert the index is `20`.
9. **The tab order in a window.** `click("ws-tab-editor")`, settle;
   `focusNext()`, settle; `focusedOf` is `ws-editor` (the hidden tree pane is
   skipped). Then `click("ws-tab-tree")`, settle; `focusNext()` twice, settle
   after each; `focusedOf` is `ws-tree-action`.
   - If a click does not focus the tab in the window (plan `390`'s variance),
     focus the tab explicitly through `ctx.host.focusNext` only if that is a
     true traversal of the visible order; otherwise record the measurement and
     keep only the assertion that the hidden pane's control is never focused by
     the traversal. Do not add a coordinate click to mask a focus failure.
10. **A paced live resize.** With the tree visible, `scrollToItem("ws-tree", 30)`
    and poll to index `30`; count painted `tree row ` lines (`paintedBefore`);
    `drag("workspace-divider", 0, 60)`; `waitForText(ctx, "ws-readout",
    "top=300")`; count again (`paintedAfter > paintedBefore`); assert the anchor
    index is still `30`.
11. `screenshot(`${LIVE_ARTIFACTS}/live-workspace-panes.png`)`.

Register the scenario in `liveScenarios` after `restore`, so the list reads
`... restore, workspacePanes, tier2Dialog ...`.

Do not add a capability to `PROBE_CAPABILITIES`: `workspace` already exists and
the live list is not a capability source. The headless registry stays 101.

### 3.3 Docs truth

- `COMPONENTS.md` **Workspace layouts**: add `live-workspace-panes` and the
  measured facts (guard on/off offsets, hidden-pane retention, tab order, live
  resize) to the composition sentence.
- `apps/playground/README.md` live table: add a row after `live-restore`.
- `TODO.md`: tick the task with the check counts, the focused ids run and the
  live-registry count; note the full live suite was not run (merge gate).
- Plan index: row `575` with the status line.

## 4. Commands and expected results

```sh
nub run --filter playground build
# exit 0

nub apps/playground/dist/smoke/run.js --only workspace-panes
# 1/1 scenarios passed, exit 0; workspace=verified; record the new check count

nub apps/playground/dist/live/run.js --only live-workspace-panes
# 1/1 scenarios passed, exit 0; one screenshot in .artifacts/live

nub apps/playground/dist/live/run.js --list | wc -l
# 69 (was 68)

nub apps/playground/dist/smoke/run.js
# 101/101, exit 0 (end-of-task check; the change is additive)

nub run check
nub run lint
nub run test
# exit 0
```

The full live suite is the merge/release gate: do **not** run `--all` here.
Record the registry count from `--list`.

## 5. Test plan and mutation proofs

The scenarios are the tests. Every new check must be able to fail; observe each
mutation, record the exact failure, and revert it:

- **M1 (guard)** — force the inner's `pointerEvents` to `"none"` regardless of
  `guarded`: `the guard stops the wheel at the inner scroller` (headless,
  `outer -120 ≠ 0`) and the live twin's `the live guard stops the ancestor
  wheel` fail.
- **M2 (chain)** — force `pointerEvents: "auto"` always: the unguarded chaining
  check fails (`outer 0 ≠ -240`) in both harnesses.
- **M3 (hidden state)** — replace the editor slot's `visibility` toggle with a
  conditional mount: `a hidden pane keeps its draft` (headless) and the live
  `draft=not` check fail.
- **M4 (resize)** — make the live drag a no-op (`drag` delta `0`): `top=300`
  never arrives, so the painted-row increase check fails.
- **M5 (tab order)** — force the hidden pane's `pointerEvents` to `"auto"` and
  drop its `visibility: "hidden"` (keep state): the hidden pane paints and the
  "hidden tree leaves the paint" checks fail; record whether it also re-enters
  the traversal.

If a mutation does not fail, the check proves nothing: strengthen or delete it.

## 6. STOP conditions

- **The guard does not stop the wheel.** Record the measured inner/outer
  offsets, stop, and mark the guard as an unproven claim on the **Workspace
  layouts** row with the evidence. Do not replace it with a readout assertion.
- **`text()` cannot answer for a `visibility: "hidden"` pane live.** Use
  `bounds === null` for "not painted" and record that `text()` retains or drops
  the hidden subtree; keep the headless retention check as the contract.
- **The live wheel cannot be aimed at `ws-log-inner`.** If the locator's centre
  lands on a stale box, aim at a visible inner row (`ws-inner-row-14`) and
  record the route; if neither works, stop and record a live-only limitation.
  Never synthesize a scroll in component code to make the check pass.
- **The tab-order check is window-state dependent** (a click does not focus the
  tab, or the traversal includes the hidden pane). Record the measurement in §8
  and assert the measured contract; the headless check remains the authority.
- **The live drag does not resize.** Try the paced drag once at `+60`; if it
  still reports `top=240`, stop and record it (plan `189` measured that a
  back-to-back drag is ignored; the host already paces it).
- **A check needs a tolerance.** Only geometry may carry one, justified by a
  measured live difference.

## 7. Acceptance

- `workspace-panes` and `live-workspace-panes` are green with `--only`, exit
  `0`; the headless count is recorded and the live count is recorded.
- One screenshot exists under `apps/playground/.artifacts/live/`.
- Headless stays `101/101`; `check`/`lint`/`test` pass.
- Mutation proofs M1–M5 observed and reverted, with the failure text in §8.
- `README.md`, `COMPONENTS.md`, `TODO.md` and the plan index name
  `live-workspace-panes` and the measured guard offsets.
- The live registry count comes from `--list` (expected 69), not from a full
  live run.

## 8. Result (measured 2026-10-19)

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js --only workspace-panes` | **1/1**, exit `0`; **27** checks (was 25) |
| `nub apps/playground/dist/live/run.js --only live-workspace-panes` | **1/1**, exit `0`; **39** checks; three consecutive runs; one screenshot |
| `nub apps/playground/dist/live/run.js --list \| wc -l` | **69** (was 68) |
| `nub apps/playground/dist/smoke/run.js` | **101/101** (**3554** checks, 64 capabilities), exit `0` |
| `nub run check` / `lint` / `test` | exit `0`; playground 417 tests, `@gpuix/testing` 61, primitives 282 |

The full live suite was **not** run: it is the merge/release gate and this change
is additive. The registry count comes from `--list`.

**A measured route correction.** The plan's first attempt exercised the guard
on the inner *container* before any scroll and then toggled it off. The guard-on
wheel worked (`inner -120`, `outer 0`), but the following guard-off wheel
delivered **nothing** (`inner -120`, `outer 0`): a second container wheel after
the container had scrolled is not aimed at the paint. The working order is the
one shipped: prove chaining first (the container wheel at a fresh origin), return
the outer to `0` over a visible outer row, then aim the guard-on wheel at a
**painted inner row** (`ws-inner-row-14`). That is also why the live twin wheels
the row, not the container, for the guard.

Measured offsets (`ws-log-inner` / `ws-log-outer`):

| Moment | inner | outer |
| ------ | ----- | ----- |
| guard off, wheel container `-240` | `-240` | `-240` (chains) |
| wheel `ws-log-row-10` `+240` | `-240` | `0` |
| guard on, wheel `ws-inner-row-14` `-120` | `-360` | `0` (stays) |

Mutation proofs, each observed and reverted:

- **M1** — forced the inner's `pointerEvents` to `"none"`: headless
  `the guard stops the wheel at the inner scroller: expected 0, got -120`;
  live `the live guard stops the ancestor wheel: expected 0, got -120` (both
  exit `1`).
- **M2** — forced `pointerEvents: "auto"`: headless
  `an unguarded nested scroller chains to its ancestor: expected -240, got 0`;
  live `the unguarded live nested scroller chains: expected -240, got 0` (both
  exit `1`).
- **M3** — mounted the editor pane conditionally instead of hiding it: headless
  `the inactive editor pane stays mounted: expected true, got false`; live
  errored with `AutomationError: Locator did not match any element` for
  `ws-editor-marker` (both exit `1`).
- **M4** — made the live drag a no-op (`0` px): live
  `the live drag resized the workspace: expected "active=tree top=300 guard=on", got "active=tree top=240 guard=on"`, exit `1`.
- **M5** — removed the tree slot's `visibility` toggle: headless
  `the hidden tree pane leaves the paint: expected 0, got 2`; live
  `the hidden live tree leaves the paint: expected 0, got 4` (both exit `1`).
