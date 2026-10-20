# 722 — Tab leaves an open menu by continuing in app order, not by landing on its trigger

**Owner:** components workstream · **Phase:** F (menu keyboard) ·
**Depends on:** 110, 114, 117, 200, 201, 326, 327, 366, 389, 393, 514, 583,
587, 669, 696, 704, 718, 719, 721

**Numbering:** `722` is the first number free across `main` and every worktree
on 2026-10-20 (`721` is this branch's last plan). Recorded in `PLAN.md` D30.

## 1. What is measured today

`menuKeyHandler` closes a menu on `Tab` with `close("leave")`, which sets
`restoreFocus = false`, and nothing moves focus. The row that held focus is
unmounted with the surface, so focus is left to whatever the runtime does
afterwards. Measured on this host from `packages/components` (scratch probe,
since deleted — the fixture is the same tree the new cases use):

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/zz-probe.test.tsx
# dropdown, inside a dialog:   menu gone, dialog open, focus = "menu-trigger"
#   (a second Tab then reaches "dialog-close", so the first press went nowhere)
# dropdown submenu, in dialog: menu gone, submenu gone, focus = None
# context menu, inside dialog: menu gone, dialog open, focus = "area" (trigger)
```

So one `Tab` closes the menu and leaves focus **behind** the trigger — one
press backwards — and from a submenu it can leave focus on no host at all. The
`None` is the worst case: the dialog's `focusNextWithin` was asked to resolve a
row that had just been unmounted, and the submenu's `anchored` surface is not
inside the dialog's content subtree.

The pages promise today (`docs/dropdown-menu.mdx:81`, `docs/context-menu.mdx:87`):
"closes and lets focus move on" / "closes and moves on". The first half is true,
the second is not: no component moved focus, and the enclosing surface resolved
the disappearance instead.

## 2. The decision

**A `Tab` close owns its hand-off**, exactly as it does for a popover (plan 521)
and a combobox (plan 721):

- close the menu through the existing state, claiming the key so an enclosing
  dialog's trap does not also act (plan 719's rule);
- once the close is observed, focus the menu's trigger and move one native step
  (`focusNext`/`focusPrevious`), so focus continues **after/before** the menu in
  app order;
- a controlled close the caller refuses leaves the surface painted and moves no
  focus (the plan-704 rule the package already holds everywhere else).

`Tab` inside a submenu leaves the whole menu, not just one level: a submenu is a
detail of one widget, and closing one level would strand focus on the row that
opened it. The submenu therefore forwards the direction to its root, which is
the only part that owns a trigger.

Modelling: `leave` becomes a menu *gesture* with a direction, separate from the
close reasons, because a direction is not a reason.

```ts
export type MenuCloseReason = "activate" | "dismiss" | "outside";
export type LeaveDirection = "next" | "previous";
```

`close(reason)` keeps its restore rule (`activate`/`dismiss` → trigger,
`outside` → wherever focus went); `leave(direction)` is the hand-off. The
submenu's now-unreachable `"leave"` branch is deleted rather than kept.

## 3. Exact changes

### 3.1 `packages/components/src/menu/state.ts`

1. Replace the reason union (line 37) and add the direction above it:

   ```ts
   /** Why a menu closed, which decides where focus goes afterwards. */
   export type MenuCloseReason = "activate" | "dismiss" | "outside";

   /** Where a `Tab` that left a menu continues from its trigger. */
   export type LeaveDirection = "next" | "previous";
   ```

2. In `MenuContextValue`, keep `close` (dropping `leave` from its JSDoc reasons)
   and add beside it:

   ```ts
   /**
    * `Tab` left the menu: close every level and continue in app order from the
    * trigger, so focus never stays on a row that is being unmounted.
    */
   readonly leave: (direction: LeaveDirection) => void;
   ```

3. `useMenuState` takes the two root actions and publishes both:

   ```ts
   export const useMenuState = (
     close: (reason: MenuCloseReason) => void,
     leave: (direction: LeaveDirection) => void,
   ): MenuContextValue => { ... }
   ```

   Return `leave` in the memo object and add it to the dependency array.

### 3.2 `packages/components/src/menu/surface.tsx`

In `menuKeyHandler`'s `isTab` branch replace the close:

```ts
// A menu is not modal: Tab closes it and continues from the trigger, because
// no enclosing surface can resolve a row that the close unmounts (plan 722).
Match.when(isTab, (value) => {
  claimEvent(value);
  menu.leave(value.modifiers?.shift === true ? "previous" : "next");
}),
```

Import `claimEvent` from `../internal/event-claim.js` beside `isEventClaimed`
(line 22) and `isTab` is already imported (line 30).

### 3.3 `packages/components/src/dropdown-menu.tsx`

Beside `restoreFocus` (line 116):

```ts
/** Where a `Tab` that closed the menu continues from the trigger. */
const leaveFocus = useRef<LeaveDirection | null>(null);
```

`close` clears a stale intent (a refused `Tab` then an outside press must not
step) and the new `leave` records it:

```ts
const close = useCallback((reason: MenuCloseReason) => {
  restoreFocus.current = reason === "activate" || reason === "dismiss";
  leaveFocus.current = null;
  setOpenRef.current(false);
}, []);

const leave = useCallback((direction: LeaveDirection) => {
  leaveFocus.current = direction;
  setOpenRef.current(false);
}, []);

const menu = useMenuState(close, leave);
```

Extend the observed-close effect (line 151) so the accepted close is the only
thing that moves focus:

```ts
useLayoutEffect(() => {
  if (open) {
    wasOpen.current = true;
    return;
  }
  if (!wasOpen.current) return;
  wasOpen.current = false;
  const target = trigger.current;
  const direction = leaveFocus.current;
  leaveFocus.current = null;
  if (target === null) return;
  if (direction !== null) {
    renderer?.focusElement?.(target.id);
    if (direction === "next") renderer?.focusNext?.();
    else renderer?.focusPrevious?.();
    return;
  }
  if (restoreFocus.current) renderer?.focusElement?.(target.id);
}, [open, renderer]);
```

Import `LeaveDirection` with the existing `MenuCloseReason` type import.

### 3.4 `packages/components/src/context-menu.tsx`

The context menu already closes through `useCloseFocus`, which is generic over
the surface's own focus token — so the token grows the two directions instead
of a second effect:

```ts
/** Where an accepted close leaves focus. */
type ContextCloseFocus = "trigger" | "none" | LeaveDirection;
```

`requestClose`'s restore body:

```ts
const requestClose = useCloseFocus<ContextCloseFocus>(
  open,
  () => setOpenRef.current(false),
  (focus) => {
    if (focus === "none") return;
    const target = triggerId.current;
    if (target === undefined) return;
    renderer?.focusElement?.(target);
    if (focus === "next") renderer?.focusNext?.();
    else if (focus === "previous") renderer?.focusPrevious?.();
  },
);
```

and beside `close` (line 135):

```ts
const leave = useCallback(
  (direction: LeaveDirection) => requestClose(direction),
  [requestClose],
);

const menu = useMenuState(close, leave);
```

`close`'s own `restoreFocus` rule is unchanged; `leave` always hands off (a
pointer-opened context menu also has a trigger to continue from).

### 3.5 `packages/components/src/menu/sub.tsx`

`close` loses its `"leave"` branch (three reasons left, `Match.exhaustive`
still checks them), and a forwarding `leave` is added beside it:

```ts
const parentLeave = parent.leave;
const close = useCallback(
  (reason: MenuCloseReason) => {
    restoreFocus.current = reason === "dismiss";
    setOpen(false);
    Match.value(reason).pipe(
      Match.when("activate", () => parentClose("activate")),
      Match.when("outside", () => parentClose("outside")),
      Match.when("dismiss", () => undefined),
      Match.exhaustive,
    );
  },
  [parentClose, setOpen],
);
const leave = useCallback(
  (direction: LeaveDirection) => {
    setOpen(false);
    parentLeave(direction);
  },
  [parentLeave, setOpen],
);
const menu = useMenuState(close, leave);
```

Its `onKeyDown` claim stays as it is: claiming **every** key is what keeps the
parent menu's highlight from also moving on a `Tab`.

### 3.6 `packages/components/src/behaviour/dropdown-menu.test.tsx`

Add a framed fixture rather than touching the `FileActions` one (its bounds are
asserted by the placement cases):

```tsx
/** A menu with app controls on both sides, bare or inside a dialog. */
const Framed = ({
  inDialog = false,
  open,
  onOpenChange,
  withSubmenu = false,
}: {
  readonly inDialog?: boolean;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly withSubmenu?: boolean;
}) => {
  const body = (
    <>
      <Button testId="before">Before</Button>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent testId="menu" label="File actions">
          <DropdownMenuItem testId="rename" onSelect={() => undefined}>
            Rename
          </DropdownMenuItem>
          {withSubmenu ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger testId="share">Share</DropdownMenuSubTrigger>
              <DropdownMenuSubContent testId="submenu" label="Share">
                <DropdownMenuItem testId="copy-link" onSelect={() => undefined}>
                  Copy link
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button testId="after">After</Button>
    </>
  );
  ...
};
```

Five cases:

1. **"closes on Tab and continues with the control after the trigger"** — open
   with `ArrowDown` from the trigger, `Tab`: `menu` gone, focus `after`.
   (Fails at `HEAD`: focus `trigger`.)
2. **"closes on Shift+Tab and continues with the control before the trigger"** —
   `Shift+Tab`: `menu` gone, focus `before`. (Fails at `HEAD`: focus `trigger`.)
3. **"closes on Tab inside a dialog and moves focus once"** — `inDialog`, open,
   `Tab`: `menu` gone, `dialog` still defined, focus `after` (the control after
   the trigger **inside** the dialog's content). (Fails at `HEAD`: focus
   `trigger`.)
4. **"closes every level on Tab from a submenu"** — `withSubmenu`, open, `Down`,
   `Down`, `Right`, `Tab`: `menu` and `submenu` gone, focus `after`. (Fails at
   `HEAD`: focus `None`.)
5. **"a refused Tab close keeps the menu and the user's focus"** — controlled
   `open` with an `onOpenChange` that ignores `false`: `Tab` leaves `menu`
   defined and focus on the row (not the trigger), and a second `Tab` still does
   not close it. (Pins the plan-704 rule for the new intent.)

Update the file header's guarded-bug list with the stranded-focus defect.

### 3.7 `packages/components/src/behaviour/context-menu.test.tsx`

One case with app controls around the right-click area (a local fixture; the
existing `Area` fixture is asserted by other cases):

**"closes on Tab and continues with the control after the trigger"** — keyboard
open (`shift-f10`), `Down`, `Tab`: `context-menu` gone, focus `after`. (Fails at
`HEAD`: focus `area`.)

### 3.8 Docs, inventory and counts

- `packages/components/docs/dropdown-menu.mdx`: the `Tab` row says it closes and
  continues with the next control after the trigger (`Shift+Tab` the previous
  one), inside a dialog too; the verification line `57 tests` → `62 tests`.
- `packages/components/docs/context-menu.mdx`: the same row for `Tab`; `23 tests`
  → `24 tests`.
- `COMPONENTS.md`: the Dropdown menus and Context menus rows take the new
  counts and one clause each.
- `TODO.md`: tick the "menu that closes on Tab inside a dialog" row under the
  Tier 2 hardening list, with the measurement and counts.
- `.agents/slop/plans/README.md`: index this plan in the components table.
- `PLAN.md` D30: record `722` as claimed.

## 4. Test plan

- **Can the tests fail?** Every new case fails at `HEAD` for the reason recorded
  in §1 (dropdown 1/2/3 → `trigger`; 4 → `None`; context → `area`). Case 5 is a
  pin: without the "clear a stale intent on `close`" line it still passes, but
  with the hand-off applied on the close *request* it fails (focus `trigger`
  while the menu is painted).
- **Both-direction proof:**
  (a) drop the `claimEvent` from the `isTab` branch: case 3 fails because the
  dialog's trap steps a second time (focus skips `after`);
  (b) drop the step (`focusNext`/`focusPrevious`) and only focus the trigger:
  cases 1–4 land on `trigger`;
  (c) drop the submenu's `leave` forwarding: case 4 closes only the submenu and
  focus stays inside the parent menu;
  (d) apply the intent in `close` instead of on the observed transition: case 5
  fails with focus `trigger` while `menu` is still painted.
- **No regression:** Escape still closes and returns focus to the trigger; a row
  activation still returns focus; an outside press still leaves focus where it
  went; the three recorded plan-540 placement failures stay the only failures in
  the dropdown suite.
- **Why not a unit test:** the defect is where native focus lands after a real
  close; a fold over the menu state cannot observe it.

## 5. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/dropdown-menu.test.tsx src/behaviour/context-menu.test.tsx
# before (measured 2026-10-20): 3 failed | 77 passed (80) — the three are the
#   recorded plan-540 placement cases
# after: 3 failed | 83 passed (86) — the same three placement cases and the five
#   new dropdown cases + the new context case among the passes
#   (measured 2026-10-20: Dropdown menu 62 (59 pass, 2 placement + 1 submenu
#   placement), Context menu 24 (23 pass, 1 placement))

nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/dialog.test.tsx
# 21 passed — the modal trap and the nested-Escape cases are untouched

nub run test        # unit suite (no native binding needed)
nub run check-types
```

From the repo root:

```sh
nub run check
nub run lint
nub run --filter @gpuixui/components test:behaviour
# the full native suite is the merge gate; read its own totals in the merge run
```

The playground smoke registry is GPUix-primitives only (no Tier 2 menu
scenario), so the native `TestRenderer` suite is the interaction evidence. The
two modal scenarios this change touches were re-run on 2026-10-20:

```sh
nub apps/playground/dist/smoke/run.js --only modal-focus-trap
# ok modal-focus-trap — 1/1 scenarios passed · modal=verified
nub apps/playground/dist/smoke/run.js --only overlay-dialog
# ok overlay-dialog — 1/1 scenarios passed · overlay=verified
```

Measured after the change (2026-10-20): Dropdown menu 62 (59 passed; the centred
surface and right-edge placements are the recorded plan-540 failures), Context
menu 24 (23 passed; its right-edge submenu case is the third), Dialog 21/21.
`nub run check`, `nub run lint` and `nub run test` all exit 0 (unit 485 in 46
files).

## 6. STOP conditions

- A new case does not fail at `HEAD`: stop and re-measure; do not weaken it.
- `focusNext` from the trigger does not reach `after` on this renderer: stop and
  report — do not move focus by guessing an id.
- The hand-off runs before the closed surface unmounts, so `focusNext` lands
  inside the menu: stop; the order is the contract (the observed `open -> false`
  transition, as in plan 721), not a timer.
- Escape, row activation or an outside press changes its focus result: stop and
  report which case.
- The change needs a second close path, a new hook or a timer: stop; the roots'
  existing close effects are the one place focus is restored.

## 7. Acceptance

- `Tab` from any open menu level closes the menu and continues with the control
  after its trigger; `Shift+Tab` continues before it — standalone and inside a
  dialog; a submenu leaves the whole menu, never one level.
- A refused controlled close keeps the surface and the user's focus.
- Escape, activation and outside presses keep their documented focus results.
- Dropdown menu 62 and Context menu 24 on this host; docs, `COMPONENTS.md`,
  `TODO.md`, the plan index and `PLAN.md` D30 agree.
