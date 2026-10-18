# 539 — Submenu hover: a disabled row never opens, a leave closes one level

| Field | Value |
| ----- | ----- |
| Phase | F (interaction completeness) |
| Owner | components workstream (`packages/components`) |
| Depends on | `114`, `131`, `135`, `325`, `382`, `389`, `393`, `394` |
| Status | done |
| Evidence | §1 — measured on this host, 2026-10-18, binding `c0e554b…` |

This plan is self-contained. Run every command; do not claim a test passed
unless it ran.

---

## 1. Why — two hover defects in the shared submenu parts

Both defects are in `src/menu/sub.tsx`, which `DropdownMenu` and `ContextMenu`
share, so one fix covers both families.

A temporary probe (`src/behaviour/zz-submenu-probe.test.tsx`, deleted after the
measurement) rendered a menu with a disabled Share submenu row and measured:

1. **A disabled submenu row opens on hover.** `hoverCentreOf(menu, "share")`
   with `disabled` left `findByTestId("submenu")` defined. Plan `393` established
   the contract "a disabled trigger never opens anything" for the Preview Card,
   Dropdown and Navigation menus; this row was missed because
   `MenuSubTrigger.onMouseEnter` calls `setOpen(true)` unconditionally. A press
   is already safe (`MenuItem.onClick` returns early when disabled) and the arrow
   keys cannot reach the row (the collection skips disabled rows), so **hover is
   the only leak**.
2. **Leaving the submenu never closes it.** After hover-opening Share, moving
   the pointer to an outside target left the submenu open until Escape, an
   outside press or another row. Measured focus before/after: the menu surface
   (`"menu"`) had focus, then hovering the submenu row moved focus to
   `"copy-link"`; the panel then stayed painted with the pointer elsewhere.
   The docs promise "moving onto another row closes it", which works because
   `MenuItem.onMouseEnter` calls `closeSubmenu()` — but the pointer can leave the
   row/panel without landing on a row (the surface's padding, or outside the
   menu), and that path has no close.

The second defect matters more because hover **takes** focus into the first
submenu row. Leaving the panel then leaves focus on a control the user is no
longer pointing at, inside a level that should be gone.

`internal/hover.ts` already implements the rule for `NavigationMenu` and
`PreviewCard`: a pointer may cross the gap between a trigger and its panel, the
incoming surface's `mouseEnter` is delivered before the outgoing `mouseLeave`,
and a close waits `closeDelay` after both surfaces are out. Plan `325` proves it
in this runtime. Submenus are the one hoverable surface that does not use it.

## 2. What changes

### 2.1 `src/menu/sub.tsx` — the policy

`MenuSub` owns the open state, so it owns the policy:

- Add `closeDelay?: number` (default `150`, the Navigation menu's default) to
  `MenuSubProps`.
- Create one `useHoverTravel`:

```ts
const hover = useHoverTravel({
  isOpen: () => open,
  close: () => hoverClose.current?.() ?? setOpen(false),
  openDelay: 0,          // hover opens at once; only the close is delayed
  closeDelay,
});
```

- `hoverClose` is a ref in `MenuSub`, published through the sub context. The
  content registers its own `close("dismiss")` there:

```ts
const hoverClose = useRef<(() => void) | null>(null);
```

- `SubContextValue` gains `readonly hover: HoverTravel` and
  `readonly hoverClose: RefObject<(() => void) | null>`.
- When `open` turns false for any reason, reset the policy so the next open does
  not inherit a stale "inside" surface:

```ts
useLayoutEffect(() => {
  if (!open) hover.reset();
}, [hover, open]);
```

`useHoverTravel` cancels its timers on unmount, so a nested submenu that
unmounts with its parent does not fire a close into a dead tree.

### 2.2 `src/menu/sub.tsx` — the trigger

- Destructure `disabled = false` and `onMouseLeave` from the props (they
  currently fall into `...rest`).
- `onMouseEnter`: open only when enabled, through the policy:

```tsx
onMouseEnter={(event) => {
  if (!disabled) hover.enter("trigger", () => setOpen(true));
  onMouseEnter?.(event);
}}
onMouseLeave={(event) => {
  hover.leave("trigger");
  onMouseLeave?.(event);
}}
```

- Guard the key path too, and still run the caller's handler:

```tsx
onKeyDown={(event) => {
  if (!disabled) {
    // existing ArrowRight / ArrowDown / ArrowUp / ArrowLeft logic, unchanged
  }
  onKeyDown?.(event);
}}
```

- Pass `disabled` explicitly to `MenuItem` (it is no longer inside `...rest`).

### 2.3 `src/menu/sub.tsx` — the surface

- Register the hover close while the content is mounted:

```ts
useLayoutEffect(() => {
  hoverClose.current = () => close("dismiss");
  return () => {
    hoverClose.current = null;
  };
}, [close]);
```

`close("dismiss")` is the existing Escape path: it closes **one** level, sets
`restoreFocus`, and does not close the parent menu. Hover close therefore
behaves like `Escape`, which the docs already describe.

- Compose pointer travel on the surface (destructure the caller's handlers so
  they are not lost):

```tsx
onMouseEnter={(event) => {
  hover.enter("content");
  onMouseEnter?.(event);
}}
onMouseLeave={(event) => {
  hover.leave("content");
  onMouseLeave?.(event);
}}
```

### 2.4 No open delay, no focus change

Hover still opens immediately and still focuses the first row, as
`docs/dropdown-menu.mdx` and `docs/context-menu.mdx` state. This plan changes
only what happens on a leave and what a disabled row may do.

## 3. Docs, inventory and example

### 3.1 `packages/components/docs/dropdown-menu.mdx`

- In the submenu prose, after "Only one submenu per menu is open at a time;
  moving onto another row closes it", add: leaving the row **and** its panel
  closes that level after 150 ms, focus returns to the row, and the parent menu
  stays open. A `disabled` submenu row opens nothing, by hover or by key.
- API table: `DropdownMenuSub` gains `closeDelay?: number` (default `150`).
- `## Verification`: 47 → **50**; add "a disabled row that never opens, a leave
  that closes one level after the delay, and travel into the panel keeping it
  open" to the submenu list.

### 3.2 `packages/components/docs/context-menu.mdx`

- The same three sentences in `## Submenus`; `ContextMenuSub` gains
  `closeDelay?: number` (default `150`).
- The verification count stays **21** (the behaviour is shared and proven by
  the Dropdown suite); say so in one sentence so the count is not read as a
  claim that the Context menu suite tests hover.

### 3.3 `COMPONENTS.md`

- Dropdown menus row: 47 → **50**; add the hover-leave and disabled-row rules.
- Context menus row: mention hover open/leave in the submenu sentence; the count
  stays 21.

### 3.4 `docs/component-api.md`

No change: its §8 table records part **names**, not per-part props. The
`closeDelay` prop is documented in the two component pages and their API tables
above.

### 3.5 Example

No new example: `examples/dropdown-menu.example.tsx` already demonstrates nested
submenus and is mounted by `src/behaviour/examples.test.tsx`. Do not add a
disabled submenu row to it; the regression is proven by the suite.

## 4. Commands and expected results

```sh
cd packages/components
./node_modules/.bin/vitest run --config vitest.behaviour.config.ts \
  src/behaviour/dropdown-menu.test.tsx -t "DropdownMenu submenus"
# 20 cases: 19 passed, 1 failed. The failure is the pre-existing
# "opens to the left when the right side cannot hold it" case, off by 1 px under
# the rebuilt binding's content-box measurement (plan 536 §8); it fails with this
# plan's source change stashed, and is not to be "fixed" here. The 3 new cases
# pass.

./node_modules/.bin/vitest run --config vitest.behaviour.config.ts \
  src/behaviour/context-menu.test.tsx
# 20 passed, 1 failed — the same pre-existing 1 px left-placement case.
# The shared parts must not regress the Context menu.

nub run --filter @gpuixui/components check-types   # exit 0
nub run --filter @gpuixui/components test          # 411 passed (unit + inventory)
nub run --filter @gpuixui/components test:behaviour
# 715 total, 656 passed, 59 failed — the same 59 catalogued in plan 536 §8, no
# new failure. Do not adapt this plan's cases to that binding.

cd ../..
nub run check && nub run lint && nub run test
```

## 5. STOP conditions

- The disabled case still opens the submenu after the guard: stop and report —
  the hover path is not the one being measured.
- The leave case does not close within the harness budget (2 s): stop; do not
  lengthen `closeDelay` or delete the delay assertion.
- Moving the pointer into the panel closes it: stop — `hover.enter("content")`
  is mis-wired or the runtime is not delivering the panel's enter; report the
  measured event log instead of adding a synthetic click.
- `Escape` no longer closes one level, or the parent menu closes on hover-leave:
  stop — `close("dismiss")` was replaced by a parent close.
- A focus assertion fails because the runtime does not restore focus: stop and
  report; the restore is the existing Escape contract and is not this plan's to
  change.
- `nub run check` rejects a test as vacuous: stop and fix the test; do not add
  `check-tests-ok`.

## 6. Test plan

Add to `describe("DropdownMenu submenus")` in
`src/behaviour/dropdown-menu.test.tsx`, with a new fixture
`WithDisabledSubmenu` (one enabled row, one disabled Share submenu row). Import
`isShown` and `until` from `../internal/interaction.js`.

1. **`never opens a disabled submenu row`** — open the menu, `hoverCentreOf`
   the disabled row, assert `submenu` is not shown; press it and assert the same.
   *Fails today* (the probe measured it open after hover).
2. **`closes one level after the pointer leaves the row and its panel`** — open
   Share by hover; assert shown. Hover the outside target; assert **still shown
   immediately** (the delay), then `await until(() => !isShown(...))`; assert the
   parent menu is still shown and focus is back on `share`.
   *Fails today* (it stays shown forever).
3. **`keeps the submenu open while the pointer is inside its panel`** — open
   Share by hover, hover the panel's centre, wait past `closeDelay` (250 ms),
   assert shown. Then leave to the outside target and assert it closes.
   *Guards a fix that closes on the row's leave without cancelling on the panel's
   enter.*

Update the suite header comment to name both regressions.

### Both-direction proof

1. `disabled` guard removed from `MenuSubTrigger.onMouseEnter` → case 1 fails
   (submenu defined).
2. `hover.leave("trigger")` removed (or `onMouseLeave` not wired) → case 2 fails
   (never closes).
3. `hover.enter("content")` removed from the surface → case 3's first half fails
   (panel closes with the pointer inside).
4. Re-run case 2 after replacing `close("dismiss")` with `setOpen(false)` →
   the focus assertion fails; restore.
5. Re-run the whole filtered suite (19 of 20; the one failure is the
   pre-existing 1 px left-placement case) and the Context menu suite (21 green).

## 7. Acceptance

- A disabled submenu row opens nothing, by hover or by key, and still runs the
  caller's `onKeyDown`.
- Hover-open → leave the row and panel → that level closes after `closeDelay`,
  focus returns to the row, the parent menu stays open.
- Pointer travel into the panel keeps it open.
- `Escape`/`ArrowLeft`, another row, an outside press, submenu selection and
  nested levels are unchanged.
- Docs, `docs/component-api.md`, `COMPONENTS.md` and the suite counts agree;
  `nub run check`, `nub run lint` and `nub run test` exit 0.

## 8. Results

**Measured** (2026-10-18, binding `c0e554b…`, temporary probe, deleted)

- `hoverCentreOf` a `disabled` Share row left `submenu` defined — hover is the
  only disabled leak (the press already returns early; the collection skips a
  disabled row for the keys).
- After hover-opening Share, focus was `menu` → `copy-link`; moving the pointer to
  an outside target left `submenu` defined indefinitely.

**What landed**

- `MenuSub` owns one `useHoverTravel` (`openDelay: 0`, `closeDelay` default 150)
  and exposes it, plus a `hoverClose` ref, through the sub context. The content
  registers `close("dismiss")`, so a leave closes one level, restores focus to
  the row and leaves the parent open.
- `MenuSubTrigger` guards `disabled` on hover and keys (the caller's `onKeyDown`
  still runs), forwards `onMouseLeave`, and still opens on hover without a delay.
- `MenuSubContent` composes `onMouseEnter`/`onMouseLeave` on the surface, so the
  pointer may cross the gap into the panel.
- `MenuSubProps.closeDelay` is the only public API addition; docs, API tables,
  `COMPONENTS.md` and the inventory counts (Dropdown 50, Context 21) agree.
- The suite header names both regressions.

**Verified**

- `dropdown-menu.test.tsx -t "DropdownMenu submenus"`: **19/20** — the three new
  cases pass; the one failure is the pre-existing 1 px left-placement case under
  the rebuilt binding (it fails with this source change stashed; plan 536 §8).
- `context-menu.test.tsx`: **20/21** — the same pre-existing left-placement
  failure.
- Unit/inventory: **411/411**; `check-types` green.

**Mutations**

1. `disabled` guard removed → "never opens a disabled submenu row" fails.
2. Trigger `hover.leave` removed → "closes one level when the pointer leaves the
   row and its panel" fails.
3. Surface `hover.enter("content")` removed → "keeps the submenu open while the
   pointer is inside its panel" fails.
4. `close("dismiss")` replaced by `setOpen(false)` → the same leave case fails on
   `focusedTestId` (`share` not restored).

**Known, not this plan:** the 59 binding-measurement failures in plan 536 §8 are
unchanged; do not adapt these cases to that binding.
