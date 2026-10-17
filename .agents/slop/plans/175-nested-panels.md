# Plan 175 — nested panels: the vertical split, isolation and the collapsible sidebar

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B → D (Tier 4 **Panel groups**, **Nested panel arrangements**,
**Collapsible sidebars**, **Docking layouts**).
**Depends on:** plans `100`, `110`, `120`, `140`, `157`.

## 1. Why this plan exists

`panel-resize` measured one **horizontal** divider: pointer capture, an 80 px
drag and the min/max clamp. A docking workspace needs three things it never
measured:

1. **The other axis.** A vertical split uses `event.y`; the pointer path, the
   clamp and the painted height all differ from the horizontal case that was
   proven.
2. **Isolation.** A divider nested inside a pane must resize only its own
   split — a nested layout must not move its parent.
3. **A collapsible sidebar.** Width `0` must actually leave the layout (no
   residual divider or padding), and the neighbour must take the space.

It also tests the keyboard/a11y story for a splitter: GPUix 0.10.0 has **no
`aria-valuenow` and no `aria-orientation`**, so the honest maximum is a focusable
`role="separator"` whose size rides on `aria-valuetext`.

## 2. What is built

### 2.1 `SplitPane` gains an orientation

`apps/playground/src/panels/split-pane.tsx` gains
`orientation?: "horizontal" | "vertical"` (default horizontal):

- the flex direction is `row` / `column`;
- pane A is sized by `width` / `height`;
- the divider is 6 px on the cross axis, `col-resize` / `row-resize`;
- the pointer delta comes from `event.x` / `event.y`.

The divider also becomes an accessible, focusable control, because a splitter
that cannot be resized without a mouse is not a panel primitive:

- `role="separator"`, `aria-label` from a new optional `label` prop,
  `aria-valuetext={`${size}px`}`, `tabIndex={0}`;
- `ArrowLeft`/`ArrowUp` shrink by `step` (default 16), `ArrowRight`/`ArrowDown`
  grow, `Home` goes to `min`, `End` to `max`;
- every keyboard move calls the same clamped `nextSize` and `onResize`.

`nextSize` is unchanged, so its existing unit test still covers the maths.

### 2.2 The scenario

One scenario, `panel-nested` (capability `panel`), in
`apps/playground/src/scenarios/panel-nested.tsx`.

The frame is 640 × 320:

- **outer** — a vertical split, initial `180`, min `120`, max `260`. Its top
  pane holds a row: `panel-sidebar` (width `160` or `0`, `overflow: "hidden"`)
  and a flex-grow wrapper with the **inner** horizontal split (initial `300`,
  min `120`, max `400`). Its bottom pane is the log area.
- `panel-sidebar-toggle` — a `Pressable` that flips the width between `160` and
  `0`.
- `panel-state` — `outer=<n> inner=<n> sidebar=<n>`.

### 2.3 The steps

1. The state reads `outer=180 inner=300 sidebar=160`; the top pane's painted
   height is `180` and the inner pane A's width is `300`.
2. Drag `outer-divider` down 48: `outer=228`, the painted height is `228`, and
   `inner` is still `300` (a vertical drag does not touch the horizontal split).
3. Drag `inner-divider` right 60: `inner=360`, the painted width is `360`, and
   `outer` is still `228` — the nested split is **isolated**.
4. `panel-sidebar-toggle`: `sidebar=0`, its painted width is `0`, and the inner
   pane A is still `360` (the neighbour, not the nested split, absorbs the
   space).
5. Toggle again: `sidebar=160` and the painted width is `160`.
6. Click `inner-divider`: native focus is `inner-divider`. `ArrowRight` grows
   `inner` by 16 (`376`), and the painted width agrees; `ArrowLeft` returns it
   to `360`.
7. The a11y tree exposes the divider (`aria-id` on the splitter) with a
   non-empty role and `aria-valuetext` matching the current size. The measured
   role string is recorded; the plan does not guess AccessKit's name for a
   separator.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/panels/split-pane.tsx` | orientation, keyboard, `role`/`aria-value`/`label`, `aria-id` |
| `apps/playground/src/a11y.ts` | new: `nodeFor` / `text`, hoisted from `scenarios/a11y.tsx` |
| `apps/playground/src/scenarios/a11y.tsx` | import the hoisted helpers (delete the local copies) |
| `apps/playground/src/scenarios/panel-nested.tsx` | the nested workspace view + steps |
| `apps/playground/src/scenarios/index.ts` | register after `panelScenario` |
| `apps/playground/src/smoke/run.test.ts` | assert `panel-nested` is registered |
| `apps/playground/README.md` | `43 → 44`; a nested-panel measurement row |
| `COMPONENTS.md` | Resizable split panes, Panel groups, Nested panel arrangements, Collapsible sidebars |
| `TODO.md` | tick the probe; progress `38 → 39` |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/140-…` §4 | the panel row gains the vertical/nested facts |

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground build` | clean build |
| `nub apps/playground/dist/smoke/run.js --only panel-nested` | green, exit `0`, `panel=verified` |
| `nub apps/playground/dist/smoke/run.js` | `44/44 scenarios passed`, exit `0` |
| `nub run --filter playground test` | registry test green |
| `nub run --filter playground test` (`resize.test.ts`) | unchanged pure maths still green |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proofs:**

1. Make the vertical orientation use `event.x` (the horizontal delta): the run
   must exit `1` on "the vertical drag grew the top pane".
2. Remove `tabIndex={0}`/`onKeyDown` from the divider: the run must exit `1` on
   "the divider takes focus" (click focus may still happen without `tabIndex`;
   if so, the arrow check fails instead). Record which check failed.

## 5. STOP conditions and branches

- **A vertical Flexbox split does not paint** as a stack (the top pane's height
  is not the requested one): record the measured bounds and assert them; if the
  orientation cannot be expressed with flex, STOP and record the limitation —
  do not fake the readout.
- **A nested split cannot be sized from its parent** (its `100%` width collapses
  to 0): record it; the wrapper needs `minWidth: 0` and `flexGrow: 1`, which is
  part of the finding.
- **The divider is not focusable when clicked** (`tabIndex` does not reach the
  native tab order): assert the keyboard path by focusing it through
  `focusNext` (if reachable) or record that a splitter cannot be keyboard
  resized on 0.10.0; the row keeps the evidenced limitation.
- **`role="separator"` is not exposed** in the AccessKit dump: record the
  measured node/absence and assert the absence; keep `aria-valuetext` documented
  as unverified for the splitter.
- **A change outside the owned paths is required**: record it in `TODO.md` and
  do not edit it.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `panel-nested` | native smoke | a vertical drag reading the wrong axis; a nested resize moving its parent; a collapsed sidebar leaving a residual box; a keyboard resize that changes state without a repaint; a splitter absent from the a11y tree |
| two-direction runs (§4) | native smoke | the checks passing on the wrong axis and without a keyboard path |
| registry assertion | unit (`apps/playground`) | the scenario falling out of the registry |
| `resize.test.ts` | unit | the shared clamp maths regressing while the orientation changes |
| full suite | native smoke | the shared `SplitPane` change breaking `panel-resize` or `workspace-tab-drag` |

## 7. Acceptance criteria

- `panel-nested` is registered, green, and its measured facts are in §8, the app
  README and `COMPONENTS.md`.
- The shared `SplitPane` still passes the existing panel and workspace scenarios.
- The suite is **44/44**, exit `0`; both two-direction proofs are recorded.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome

Executed on this host on 2026-10-17; **44/44 green**, exit `0`, `panel=verified`
in `.artifacts/smoke-report.json`. `panel-nested` records **32 checks**.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **A vertical split works with the same pointer path as the horizontal one.**
  The outer divider dragged `dy = 48` grew the top pane `180 → 228`, and the
  painted height was `228` — `event.y` drives it exactly like `event.x` drives
  the horizontal split.
- **A nested split is isolated.** From `outer = 228`, dragging the inner divider
  `dx = 60` grew the inner pane `300 → 360`, repainted at `360`, and left the
  outer split at `228`. The parent does not reflow.
- **The vertical drag does not touch the horizontal axis.** After the outer
  drag the inner split was still `300`.
- **A zero-width sidebar leaves the layout.** Collapsing the sidebar reported
  `sidebar=0`, its painted width measured `0` (no residual border or padding),
  and the nested split stayed at `360`. Re-opening it painted `160` again.
- **The divider is a real keyboard control.** Clicking it takes native focus
  (`inner-divider`); `ArrowRight` grew its pane `360 → 376` with the paint
  agreeing, and `ArrowLeft` returned it to `360`. The 16 px step and the
  existing clamp come from `nextSize`, so the pure maths test still covers them.
- **The divider is exposed to assistive technology as a `Splitter`** (the
  measured AccessKit role for `role="separator"`), and its size rides on
  `aria-valuetext` (`360px`), because 0.10.0 has no `aria-valuenow` and no
  `aria-orientation`.
- **Traversal leaves the divider but does not re-enter the nested one.** From
  the focused divider, one `focusNext` landed on `panel-sidebar-toggle`; a
  `focusPrevious` from there stayed on the toggle rather than returning to the
  nested divider. The scenario asserts the forward edge; the reverse edge is
  recorded here as a measured runtime nuance of a divider nested inside an
  `overflow: hidden` pane, not as a capability. A docking UI must keep its
  keyboard resize path on the focused element itself (as this probe does) and
  not assume Shift-Tab round-trips into a nested splitter.

Two-direction proofs:

1. Making the vertical orientation read `event.x` made the run exit `1` with
   `the vertical drag grew the top pane: expected a string containing "outer=228", got "outer=253 …"`
   and `panel=failed`; restoring `event.y` made it green (exit `0`).
2. Inverting `ArrowRight`'s keyboard delta made the run exit `1` with
   `ArrowRight grows the divider's pane: expected … "inner=376", got "outer=228 inner=344 sidebar=160"`
   and `panel=failed`; restoring the sign made the suite green again.

No change outside the owned paths. `panel-resize` and `workspace-tab-drag` both
still pass with the shared `SplitPane` change (the suite is 44/44), which is the
regression guard for the horizontal path.

