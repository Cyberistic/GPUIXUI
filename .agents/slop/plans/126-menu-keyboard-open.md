# 126 — Dropdown menu keyboard opening lands on a row

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 114 (menus), 117 (inventory gate)
- **Status:** done, 2026-10-17. 4 native tests (DropdownMenu: 13); both-direction
  proof recorded. Deviations in §8.

`DropdownMenuTrigger` is the local `Button`: Enter/Space opens the menu, but the
opened surface takes focus and **no row is highlighted**, so the next Enter runs
nothing and the user must press `ArrowDown` first. `ArrowDown`/`ArrowUp` on the
closed trigger do nothing at all. Radix/shadcn and every desktop menu button open
on the arrow keys with the first (or last) action focused.

The rules already exist: `menu/logic.ts` maps `First`/`Last` onto
`internal/collection.ts`, and `useMenuState.step` focuses the resulting row. This
plan only routes a keyboard open to that existing arithmetic; it does not touch
pointer opening, which keeps focus on the surface.

The one design decision is **where the pending edge lives**. The trigger knows the
key, the content is what has rows, and the rows register one commit after the menu
opens. A `pendingFocus` ref on the `DropdownMenu` root bridges the two: the
trigger records `"first"`/`"last"`, and the content consumes it in a layout effect
once at least one row has registered.

---

## 1. Files

```
src/dropdown-menu.tsx                  # pending edge, trigger keys, content effect
src/behaviour/dropdown-menu.test.tsx   # + 4 native tests
docs/dropdown-menu.mdx                 # keyboard table, verification count
examples/dropdown-menu.example.tsx     # name the keyboard path in the header
src/inventory.ts                       # only if the record names the old focus behaviour
COMPONENTS.md                          # Dropdown menus row: keyboard opening + test count
TODO.md                                # tick the new hardening task
README.md                              # package table row for src/dropdown-menu.tsx (if it names keys)
.agents/slop/plans/README.md           # index this plan
```

Read `src/inventory.ts` before editing. The type-ahead limitation stays — this
plan does not add type-ahead. Change the record only if one of its sentences
describes the old keyboard-opening focus behaviour.

## 2. `src/dropdown-menu.tsx`

### 2a. Context

`DropdownContextValue` gains one stable ref:

```ts
/** The row a keyboard open should focus once the rows have registered. */
readonly pendingFocus: RefObject<"first" | "last" | null>;
```

Create it in `DropdownMenu` with
`const pendingFocus = useRef<"first" | "last" | null>(null);` and include it in
the memoised context (the ref identity is stable, so it does not change the
dependency list).

Clear it whenever the menu closes:

```ts
useLayoutEffect(() => {
  if (!open) pendingFocus.current = null;
}, [open]);
```

Keep that effect separate from the existing focus-restore effect; the restore
effect also runs on the open edge.

### 2b. Trigger

Destructure `onKeyDown` as well as `onClick` so both compose with the caller's.

```ts
const openAt = (edge: "first" | "last"): void => {
  pendingFocus.current = edge;
  setOpen(true);
};
```

Pointer activation must not leave a stale edge:

```ts
onClick={(event) => {
  onClick?.(event);
  pendingFocus.current = null;
  if (dismissedByOutsidePress.current) { … }   // existing guard, unchanged
  setOpen(!open);
}}
```

Order matters in the key handler: the local `Button` runs `onClick` on
Enter/Space **before** it calls the caller's `onKeyDown`, so the click handler
must not clear the edge after the key handler sets it. Inside one render both
handlers see the same `open` closure, so:

```ts
onKeyDown={(event) => {
  if (!open) {
    if (isDown(event)) openAt("first");
    else if (isUp(event)) openAt("last");
    else if (isActivation(event)) openAt("first");
  }
  onKeyDown?.(event);
}}
```

- `isDown`/`isUp` come from `internal/key.ts` and include `Ctrl+N`/`Ctrl+P`.
- When the menu is already open, Enter/Space reaches the trigger only if the user
  focused it again; the click handler toggles it closed and the key handler does
  nothing (the `!open` guard). Do not change that path.
- Disabled triggers already drop their handlers in `Button`; nothing to add.

### 2c. Content

In `DropdownMenuContent`, after the existing hooks (it may not call hooks after
the `if (!open) return null` early return — keep the effect above the return):

```ts
const { pendingFocus } = useDropdownContext();
const pending = pendingFocus.current;

useLayoutEffect(() => {
  if (!open) return;
  const edge = pendingFocus.current;
  if (edge === null || menu.rows.length === 0) return;
  pendingFocus.current = null;
  menu.step({ _tag: edge === "first" ? "First" : "Last" });
}, [open, menu.rows, menu.step, pendingFocus]);
```

Child layout effects run before the parent's, so the rows are registered in that
commit; if React has not published them to the root state yet, the effect runs
again when the `rows` identity changes. `step` is stable enough for the
dependency list (it changes only when the highlight or row set changes).

Do not call `focusRow` directly: `step` is the shared arithmetic, including the
disabled-row skip.

## 3. Tests — `src/behaviour/dropdown-menu.test.tsx`

Extend the header comment with the bug being guarded: *a menu opened from the
keyboard landed on the surface with nothing highlighted, so Enter ran nothing and
ArrowDown/ArrowUp on the closed trigger did nothing.*

Add a local helper:

```ts
const focusTrigger = (root: ComponentTestRoot): void => {
  root.renderer.focusElement(root.renderer.findByTestId("trigger")?.id ?? -1);
};
```

`FileActions` already has a disabled second row, so it proves the skip.

1. **`ArrowDown` opens on the first enabled row.**
   - render, `focusTrigger`, `simulateKeystrokes("down")`;
   - menu exists, `focusedTestId` is `Some("rename")` (not `duplicate`).
2. **`ArrowUp` opens on the last enabled row.**
   - same, `simulateKeystrokes("up")`;
   - `focusedTestId` is `Some("delete")`.
3. **`Enter` opens on the first row and a second `Enter` runs it.**
   - render with `onSelect`, `focusTrigger`, `simulateKeystrokes("enter")`;
   - menu exists, focus `rename`;
   - `simulateKeystrokes("enter")`;
   - `onSelect` called once with `"rename"`, menu closed, focus back on `trigger`.
4. **A pointer open still focuses the surface, not a row.**
   - `clickCentreOf(menu, "trigger")`;
   - `focusedTestId` is `Some("menu")` (the existing contract).
   - This guard passes before and after; it protects pointer users from a focus
     jump they did not ask for.

Run both directions: with the `onKeyDown` branch removed and the content effect
removed, test 1 fails with focus on `menu`/`None`; test 3 fails because the
second Enter does nothing. Record the red output in the commit message.

## 4. Docs, example, inventory

- `docs/dropdown-menu.mdx` keyboard table:
  - replace the trigger row with three: `Enter`/`Space` on the trigger → "opens on
    the first enabled row, or closes when open"; `ArrowDown` on the trigger →
    "opens on the first enabled row"; `ArrowUp` on the trigger → "opens on the
    last enabled row".
  - Verification: 9 → 13 tests, naming the keyboard-open cases.
- `examples/dropdown-menu.example.tsx`: header comment gains one sentence —
  "Keyboard opens (`Enter`, `ArrowDown`, `ArrowUp`) land on the first/last
  action." Do not change the visual layout.
- `src/inventory.ts` → `dropdownMenuMeta`: no limitation is removed. If the record
  gains a capability note, it must stay out of `limitations` (they are claims the
  inventory check treats as prose); prefer leaving the record untouched except
  for a test-count reference if one exists.
- `COMPONENTS.md` → Dropdown menus row: note that keyboard opening focuses the
  first/last enabled row and update the test count 9 → 13.
- `README.md` → `src/dropdown-menu.tsx` row: only if it already names keyboard
  behaviour; add "keyboard opens on a row" in the same sentence.
- `TODO.md` → under "Tier 2 hardening after the inventory closed":
  `- [x] Dropdown menu keyboard opening lands on a row — plan 126`.
- `.agents/slop/plans/README.md` → add the plan 126 row with status and counts
  once the gates pass.

## 5. STOP conditions

1. Enter/Space on the focused trigger does **not** open the menu in the real
   renderer → STOP and report the payload; do not simulate by calling
   `onKeyDown` directly.
2. The content effect never sees the registered rows (focus stays on `menu` after
   a keyboard open) → STOP after one retry with `menu.rows.length` as the
   dependency; report the commit sequence rather than moving focus from the
   trigger with a timeout.
3. A pointer open starts landing on a row → STOP; pointer focus must stay on the
   surface.
4. `pendingFocus` forces a cast, `any` or a non-null assertion → STOP with the
   compiler output.
5. Any test fails intermittently across two consecutive runs → STOP and report;
   there is nothing time-dependent here.

## 6. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 181 logic tests, unchanged
nub run --filter @gpuixui/components test:behaviour   # DropdownMenu 9 → 13; 208 → 212 overall
nub run check                                         # repo gate, exit 0
nub run lint                                          # exit 0
nub run test                                          # exit 0
```

## 7. Acceptance criteria

- [x] `ArrowDown` / `ArrowUp` / `Enter` / `Space` on the closed trigger open the
      menu with the first/last enabled row focused.
- [x] Enter on the newly focused row activates it, closes the menu and returns
      focus to the trigger (no extra key press).
- [x] A pointer open still focuses the menu surface.
- [x] Disabled rows are skipped by the keyboard open.
- [x] The native tests fail without the handler/effect and pass with them.
- [x] Docs, example, inventory, `COMPONENTS.md`, `README.md`, `TODO.md` and the
      plan index agree with the code, and every command in §6 passes.

## 8. Deviations, recorded during implementation (2026-10-17)

1. **The content effect depends on `menu`, not `menu.rows` + `menu.step`.** The
   context object already changes when the row set or highlight changes, and the
   effect is guarded by `pendingFocus`, so no extra focus move occurs. The plan's
   narrower dependency list would have needed two more values with no benefit.
2. **Both-direction proof.** With the `onKeyDown` branch replaced by a passthrough
   and the focus effect replaced by a no-op, the new ArrowDown test failed with
   `expected undefined to be 'menu'` — the menu never opened, and the other new
   tests then failed on the leaked root. With both restored, the suite passes
   13/13.
3. **Actual counts.** DropdownMenu 9 → 13; the full behaviour run is 208 → 212;
   the default logic suite is unchanged at 181.
4. **Docs correction in passing.** `docs/dropdown-menu.mdx` claimed the
   type-ahead gap was a `TODO` in `src/menu/logic.ts`; it is not, and never was.
   The sentence now points at `dropdownMenuMeta.limitations`, which is the record
   the inventory check actually keeps.
