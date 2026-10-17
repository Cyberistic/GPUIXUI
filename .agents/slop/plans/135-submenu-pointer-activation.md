# 135 — Submenu pointer activation and ContextMenu submenus

- **Phase:** C/F (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 112 (overlays/dismiss stack), 114 (menus), 131 (submenus),
  134 (inventory gate)
- **Status:** done, 2026-10-17. 5 native tests (DropdownMenu 33, ContextMenu 17,
  behaviour 274); shared `menu/sub.tsx`, docs and inventory updated.

A submenu row can be chosen with the keyboard but not with the pointer. Measured
on 2026-10-17: with a `DropdownMenu` open and its `Share` submenu showing, a real
click on `Copy link` **closed both levels and never called `onSelect`**
(`{ calls: [], menu: false, submenu: false }`). The existing submenu suite only
activates rows by keyboard, so nothing caught it.

The cause is geometric. The native `onMouseDownOutside` of the parent surface
fires for a press on the submenu, because the submenu is painted outside the
parent's bounds. That offers the event to the top dismiss layer — the submenu —
whose handler closes itself **and cascades `outside` to the parent**. Both
surfaces unmount before the click lands on the row.

The same press path blocks the obvious next feature: the Context menu has no
submenus, although the Dropdown does. This plan fixes the pointer bug once, hoists
the submenu parts out of `dropdown-menu.tsx` so both menus share them, and exposes
them as `ContextMenuSub*`.

## 1. Files

```
packages/components/src/menu/sub.tsx                 # NEW: shared submenu parts
packages/components/src/dropdown-menu.tsx            # delete the moved parts; re-export aliases
packages/components/src/context-menu.tsx             # re-export ContextMenuSub* + meta
packages/components/src/behaviour/dropdown-menu.test.tsx  # +1 pointer regression
packages/components/src/behaviour/context-menu.test.tsx   # +4 submenu tests
packages/components/examples/context-menu.example.tsx     # Share submenu
packages/components/docs/context-menu.mdx                 # submenu section + API
packages/components/docs/dropdown-menu.mdx                # pointer note
packages/components/README.md                             # rows for menu/sub.tsx and the context menu
COMPONENTS.md                                             # both menu rows
TODO.md                                                   # the hardening task
.agents/slop/plans/README.md                              # index this plan
```

## 2. Design decisions (do not re-litigate)

1. **A press inside the submenu is not a dismissal.** The submenu already owns
   the top dismiss layer. Its handler ignores a `mouseDownOutside` whose point is
   inside its own painted bounds; every other event (Escape, a press elsewhere)
   closes it exactly as before. Do not try propagation: `EventPayload` has no
   `stopPropagation` in 0.10.0 (see `internal/dismiss-layer.ts`).
2. **`dismissTopLayer` still marks the event handled.** Ignoring inside the
   submenu therefore keeps the parent open without a second guard; that is the
   intended nesting rule.
3. **Hoist, do not copy.** A second menu now needs the parts, so they move to
   `src/menu/sub.tsx` beside `state.ts`, `item.tsx` and `surface.tsx`. The
   dropdown and context menu each re-export their own part names.
4. **The close semantics are unchanged.** Selecting a submenu row closes both
   levels; `Escape` and `ArrowLeft` close one level and return focus to the
   sub-trigger; an outside press closes both. The only new behaviour is that a
   pointer press on the submenu no longer counts as outside.
5. **One level of nesting**, as today. Deeper nesting follows the same rule but is
   untested and stays recorded as a limitation.
6. **No `aria-haspopup`.** 0.10.0 has no such prop; a sub-trigger announces
   `aria-expanded` only, matching **Dropdown menu**.

## 3. Probe evidence (2026-10-17, real renderer, window 1280×800)

Before the fix, with a pointer-opened `DropdownMenu` and its `Share` submenu:

| Probe | Result |
| ----- | ------ |
| click `Copy link` | `onSelect` never called; menu and submenu both unmounted |
| keyboard `ArrowRight` then `Enter` | action runs once, both close (the existing suite) |

After adding the bounds guard to the submenu handler:

| Probe | Result |
| ----- | ------ |
| click `Copy link` | `onSelect` called once with `"copy"`; both levels close |
| ContextMenu `ArrowDown ArrowDown ArrowRight` | focus lands on `Copy link` |
| ContextMenu `Escape` in the submenu | submenu closes, parent stays, focus returns to `Share` |
| ContextMenu `ArrowLeft` | submenu closes, focus on `Share` |

The same probe showed the pre-existing `anchored` clamp keeps a pointer menu
inside the window (8px margin), so positioning needs no change here.

## 4. Implementation

### 4a. `src/menu/sub.tsx` (new)

Move `SubContextValue`, `SubContext`, `useSubContext`, the sub props, `MenuSub`,
`MenuSubTrigger`, `SUBMENU_GAP` and `MenuSubContent` from `dropdown-menu.tsx`,
renaming the exports without the `Dropdown` prefix. Keep the prop names:
`MenuSubProps`, `MenuSubTriggerProps`, `MenuSubContentProps`. Change the missing
context error to `"Submenu parts must be used inside a Submenu"`.

The module imports: `useGpuix`, `EventPayload`, `Props`, `PublicInstance`,
`mergeStyles`, `Match`, `Option`, `useCallback`, `useContext`, `useLayoutEffect`,
`useMemo`, `useRef`, `useState`, `ReactNode`, `RefObject`, `createContext`,
`claimEvent`, `isDown`/`isLeft`/`isRight`/`isUp`, `useMergedRef`,
`textStyle`/`useTheme`, `MenuItem`/`MenuItemProps`, `MenuContext`/
`useMenuContext`/`useMenuState`/`MenuCloseReason`, `MenuSurface`.

In `MenuSubContent`, add:

```ts
const surface = useRef<PublicInstance | null>(null);
const setSurface = useCallback((next: PublicInstance | null) => {
  surface.current = next;
}, []);

/** Whether a pointer event landed on this submenu's own surface. */
const insideSurface = useCallback(
  (event: EventPayload): boolean => {
    const instance = surface.current;
    if (instance === null) return false;
    const bounds = renderer?.getElementBounds?.(instance.id);
    if (bounds === null || bounds === undefined) return false;
    const { x, y } = event;
    return (
      x !== undefined &&
      y !== undefined &&
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  },
  [renderer],
);
```

The dismiss layer becomes:

```ts
const pop = pushDismissLayer((event) => {
  // The parent's outside handler offers a press inside this surface here
  // first. Closing would unmount the row before its click lands.
  if (event.eventType === "mouseDownOutside" && insideSurface(event)) return;
  closeRef.current(event.eventType === "keyDown" ? "dismiss" : "outside");
});
```

and its dependency list grows by `insideSurface`. Pass `ref={setSurface}` to
`MenuSurface`.

### 4b. `dropdown-menu.tsx`

Delete the moved block. Import nothing from `menu/sub.tsx` for local use; alias
re-export instead:

```ts
export {
  MenuSub as DropdownMenuSub,
  MenuSubContent as DropdownMenuSubContent,
  MenuSubTrigger as DropdownMenuSubTrigger,
} from "./menu/sub.js";
export type {
  MenuSubContentProps as DropdownMenuSubContentProps,
  MenuSubProps as DropdownMenuSubProps,
  MenuSubTriggerProps as DropdownMenuSubTriggerProps,
} from "./menu/sub.js";
```

Keep the existing row/part exports and meta untouched. The public names do not
change, so the 32 existing tests keep compiling.

### 4c. `context-menu.tsx`

Add the same alias block with `ContextMenu*` names, next to the row aliases.
Extend `contextMenuMeta.limitations`:

- replace `"no submenus, as with DropdownMenu; type-ahead follows the same rules there"`
  with `"one level of submenus is tested; deeper nesting follows the same rule but is untested"`;
- add `"no aria-haspopup in 0.10.0; a submenu trigger announces aria-expanded only"`.

Also correct the stale comparison: Dropdown menus now have submenus.

## 5. Tests

### 5a. New cases

`src/behaviour/dropdown-menu.test.tsx` (+1, in `describe("DropdownMenu submenus")`):

1. **A pointer click on a submenu row runs it once and closes both levels.**
   Open with `clickCentreOf("trigger")`, `clickCentreOf("share")`, then
   `clickCentreOf("copy-link")`; assert `onSelect` got `["copy-link"]` once, both
   surfaces are gone, and focus is the trigger or nowhere (assert what the run
   reports, not an invention). This test fails without the guard.

`src/behaviour/context-menu.test.tsx` (+4, new `describe("ContextMenu submenus")`
with a fixture that has one `Share` submenu):

2. **Clicking a submenu row runs it and closes both levels.** `defaultOpen`, press
   `down down right`, click `copy-link`: one call, both gone.
3. **`ArrowRight` opens the submenu and focuses its first row.** After
   `down down right`, the submenu is a `menu` and focus is `copy-link`.
4. **`Escape` closes only the submenu and returns focus to the sub-trigger.**
   Parent surface still mounted; focus `share`.
5. **`ArrowLeft` closes the submenu and returns focus to the sub-trigger.**

### 5b. Both directions

1. Run the new tests green.
2. Remove the `insideSurface` early return → test 1 fails with
   `expected "vi.fn()" to be called 1 times, but got 0 times` and both surfaces
   unmounted; context test 2 fails the same way.
3. Remove the `ContextMenuSub*` exports → `tsc` fails on the new imports.
4. Restore, then run the whole behaviour suite.

Expected counts: DropdownMenu 32 → 33; ContextMenu 13 → 17; behaviour 269 → 274;
logic suites stay 223.

## 6. Docs, example, inventory, ledgers

- `docs/context-menu.mdx`:
  - anatomy table: add `ContextMenuSub`/`ContextMenuSubTrigger`/`ContextMenuSubContent`;
  - a **Submenus** section: one level, opens by click, hover, `Enter`/`Space` or
    `ArrowRight`, closes on one `Escape`/`ArrowLeft`, focus returns to the row
    it came from; pointer and keyboard both select a row;
  - keyboard table: `ArrowRight` opens a submenu, `ArrowLeft` closes it;
  - limitations: replace "No submenus in v1" with one-level + no `aria-haspopup`;
  - verification: 13 → 17 tests and the new cases.
- `docs/dropdown-menu.mdx`: one sentence in the submenu section that a row is
  chosen by pointer as well as keyboard (the bug fix).
- `examples/context-menu.example.tsx`: add a `Share` submenu with
  `Copy link` / `Email` actions, both reporting into `lastAction`.
- `COMPONENTS.md`: context menus row — submenus, 16 native tests; dropdown menus
  row — 33 native tests and a pointer-selection note.
- `packages/components/README.md`: `src/menu/*` row mentions the shared submenu
  core; context menu row mentions submenus.
- `TODO.md`: `- [x] Submenu pointer activation and ContextMenu submenus — plan 135`
  under Tier 2 hardening.
- `.agents/slop/plans/README.md`: index row with final counts.

## 7. STOP conditions

1. A pointer press on the submenu still closes the parent after the guard → STOP
   and report the event order; do not add a global click interceptor.
2. A press elsewhere no longer closes the submenu (the guard over-matches) → STOP;
   the fix must use painted bounds, not "any press while a submenu is open".
3. `ref` on `MenuSurface` does not deliver a `PublicInstance` → STOP with the
   type error; do not fall back to test ids.
4. Keyboard submenu behaviour changes (Escape/ArrowLeft/selection) → STOP; only
   pointer presses may take the new path.
5. Any existing DropdownMenu submenu test fails → STOP and report which one.
6. A test is flaky across two consecutive runs → STOP; nothing here is
   time-dependent.

## 8. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 223 unchanged
nub run --filter @gpuixui/components test:behaviour   # 269 -> 274
nub run check                                         # exit 0
nub run test                                          # exit 0
```

## 9. Deviations, recorded during implementation

1. **ContextMenu already had 13 tests, not 12.** The docs and `COMPONENTS.md`
   were one behind (the plan's own text repeated the stale number). The suite is
   now 17, which is the number both carry.
2. **The submenu block moved with no public name change** — the Dropdown parts
   still export as `DropdownMenuSub*`, so the existing 32 tests compiled
   untouched. The shared module is the only structural change.
3. **Both-direction proof, recorded from the actual runs.**
   - Removing the `insideSurface` early return made *runs a submenu row clicked
     with the pointer* (DropdownMenu) and *runs a submenu row clicked with the
     pointer and closes both levels* (ContextMenu) fail with
     `expected "vi.fn()" to be called 1 times, but got 0 times`. The failures
     then cascaded into the remaining submenu tests because the first failure
     left a root mounted; the pointer failures are the signal.
   - Restored; DropdownMenu 33/33, ContextMenu 17/17, behaviour 274/274.
4. **A combined `"down down right"` keystroke string is too fast for the Context
   menu fixture**: the submenu is not mounted when the same call's `right` is
   dispatched, so the test helper sends three separate calls. The Dropdown suite
   can use the combined form because its rows are already registered; this is a
   harness timing detail, not a behaviour difference.
5. **A pointer-opened ContextMenu leaves focus nowhere after a submenu row is
   clicked** (the probe read `focus: null`). That is the existing pointer-dismiss
   contract; the test asserts the action and the two unmounts, not a focus move.
