# 122 — Context menu keyboard opening and focus return

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 114 (menus), 112 (dismiss stack)
- **Status:** done, 2026-10-17. 5 native tests (Context menu: 11), key-predicate
  suite extended, docs and inventory synced. Deviations in §10.

`COMPONENTS.md` records "no keyboard path to open" for the Context menu. A
pointer-only affordance is an accessibility hole: `Shift+F10` (and the dedicated
Menu key) is the desktop convention, and the menu must hand focus back to its
trigger when it closes.

`@gpuix/native@0.10.0` exposes the two pieces this needs: `getElementBounds(id)`
on the renderer and `focusElement(id)`. The trigger becomes a tab stop, opens the
same surface at its own bottom-left corner, and the root returns focus on close
for keyboard-opened menus only (a pointer-opened menu must not steal focus from
whatever the action focused).

---

## 1. Files

```
src/internal/key.ts                 # + isMenuKey (Shift+F10 / "contextmenu")
src/internal/key.test.ts            # + predicate cases (create if absent)
src/context-menu.tsx                # focusable trigger, keyboard open, focus return
src/behaviour/context-menu.test.tsx # + 5 native tests
docs/context-menu.mdx               # keyboard section, limitations
src/inventory.ts                    # limitations
COMPONENTS.md                       # Context menus row
TODO.md, .agents/slop/plans/README.md
```

Check first whether `src/internal/key.test.ts` exists; if not, add the predicate
to the existing suite that covers `internal/key.ts` (none exists today, so add
`src/internal/key.test.ts` with the new predicate plus the existing ones it can
assert as values).

## 2. `internal/key.ts`

```ts
/** The keyboard route to a context menu: Shift+F10, or the Menu key. */
export const isMenuKey = (event: EventPayload): boolean =>
  (event.key === "f10" && event.modifiers?.shift === true) ||
  event.key === "contextmenu";
```

If the runtime reports the Menu key under another name, record it; `shift-f10`
is the route the suite proves.

## 3. `src/context-menu.tsx`

1. `ContextMenuContextValue` gains:
   - `setTrigger: (id: number) => () => void` — registers the trigger's native
     id; returns an unregister.
   - `openFromKeyboard: (point: Point) => void` — sets the point, marks
     "restore focus on close", opens.
2. The root keeps `triggerId` and `restoreFocus` in refs (the layer callback in
   `dismiss-layer` must not be re-pushed when they change, following the
   existing `setOpenRef` pattern) and gets the renderer from `useGpuix()`.
3. `close` (used by Escape, an outside press, an item activation and Tab) keeps
   setting `open` false; when `restoreFocus` is set it also calls
   `renderer.focusElement(triggerId)` and clears the flag. A pointer-opened menu
   leaves the flag false.
4. `ContextMenuTrigger`:
   - keeps a `PublicInstance` in state via a stable ref callback (the List
     pattern);
   - registers its id on mount and unregisters on unmount;
   - `tabIndex={disabled ? -1 : 0}` and a focus ring while focused (0.10.0 has no
     `focusVisible`, the same honest maximum as List);
   - `onKeyDown`: when `isMenuKey(event)` and not disabled, read
     `renderer.getElementBounds(instance.id)`, open at
     `{ x: bounds.x, y: bounds.y + bounds.height }`, and drop the event from
     further handling; the user's `onKeyDown` still runs.
5. Pointer opening is unchanged (`onAuxClick` + `isRightClick`).
6. `MenuSurface` already `autoFocus`es, so the keyboard route lands focus in the
   menu.

No new positioning code: the context surface stays a bare `anchored` element at
a window-coordinate point.

## 4. Tests — `src/internal/key.test.ts`

- `isMenuKey` accepts `shift+f10`, rejects `f10` without shift, accepts the Menu
  key name, and rejects an unrelated key.
- One case per existing predicate is enough to prove the file's table; do not
  duplicate whole suites.

## 5. Tests — `src/behaviour/context-menu.test.tsx` (native)

Header states the bug: "a keyboard user could not open the menu at all, and
closing it dropped focus".

1. Focusing the trigger and pressing `shift-f10` opens the menu and focus is
   inside it (the surface auto-focuses).
2. The surface opens at the trigger's bottom-left: its measured `x` is within a
   few pixels of the trigger's `x`, and its `y` is at or just below the trigger's
   bottom.
3. `down` then `enter` on the opened menu runs the highlighted item's action.
4. `escape` closes it and returns focus to `trigger`.
5. A disabled trigger ignores `shift-f10` and shows no ring.
6. The existing pointer path still opens (already covered; keep green).

## 6. Docs, example, inventory

- `docs/context-menu.mdx`: add a Keyboard table (`Shift+F10`/Menu key opens at
  the trigger, arrows/Home/End move, Enter activates, Escape closes and focuses
  the trigger); remove "no keyboard path to open" from limitations; keep the
  no-portal/no-submenu notes. Mention the pointer path still does not restore
  focus by design.
- `src/inventory.ts`: drop the keyboard limitation if it is listed (check).
- `COMPONENTS.md`: Context menus row gains the keyboard route and drops the old
  limitation.
- Example unchanged: the existing one already has a trigger and items.

## 7. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # key predicate tests pass
nub run --filter @gpuixui/components test:behaviour   # context menu 6 → 11
nub run check                                         # repo gate, exit 0
```

## 8. STOP conditions

1. GPUI reports no `f10` keystroke (`event.key` is something else) → STOP,
   record the measured key name and the modifier shape; do not invent a
   different shortcut without updating this plan.
2. `getElementBounds` is absent at runtime (it is optional on `NativeRenderer`)
   → STOP and report; the pointer path must stay as the only opener, with the
   limitation restored in the docs.
3. The trigger's focus ring or tab stop breaks an existing pointer test → STOP;
   the pointer contract must not change.
4. Restoring focus on close also fires for pointer-opened menus → STOP; the
   flag is not being set/cleared correctly.

## 9. Acceptance criteria

- [x] `Shift+F10` opens at the trigger's bounds; focus lands in the menu.
- [x] Escape closes and returns focus to the trigger.
- [x] Disabled triggers do not open by key or pointer.
- [x] Pointer opening unchanged; no focus stealing on pointer-opened close.
- [x] Docs, inventory, `COMPONENTS.md`, `TODO.md` updated.
- [x] Gates in §7 pass.

## 10. Deviations, recorded during implementation (2026-10-17)

1. **`src/internal/key.test.ts` already existed**; the new predicate was added
   there instead of creating the file. The `keyEvent` helper gained a `shift`
   parameter, defaulting to `false`, so existing cases are unchanged.
2. **The dismiss layer now carries a reason.** Its handler receives the event, so
   the root maps `eventType === "keyDown"` to `dismiss` (Escape) and anything
   else to `outside`. Focus returns only for `dismiss`/`activate`; a mouse press
   elsewhere keeps focus where the user pressed.
3. **The trigger is now a tab stop and paints a focus ring** while focused
   (`tabIndex={disabled ? -1 : 0}`). 0.10.0 has no `focusVisible`, the same
   honest maximum as List.
4. **Two-direction proofs**: (a) removing the `isMenuKey` branch failed all five
   new tests (the later failures cascaded from the first test's un-unmounted
   root, which is expected); (b) forcing `restoreFocus` off made the Escape test
   report `Option.none()` for focus, proving the restore is what returns it.
5. **Keyboard-open position is the trigger's bottom-left**, not a caret: 0.10.0
   exposes element bounds, not text-caret geometry.

