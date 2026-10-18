# 557 — A dropdown opened with Space stays open

**Owner:** components workstream · **Phase:** F (integration and polish) ·
**Number:** 557 — `555` and `556` are claimed in other worktrees, so this is the
first free number across every worktree.

## 1. The bug being guarded

`DropdownMenuTrigger` opens on `Space` during **key down** and the local
`Button` fires its synthetic activation click on **key up**. In a real window
there is a render between those two events, so the trigger sees:

| Event | `open` at that moment | Result |
| ----- | --------------------- | ------ |
| `keyDown` | `false` | `openAt("first")` → `setOpen(true)` |
| render | `true` | menu paints on its first row |
| `keyUp` | `true` | `Button`'s click → `setOpen(!open)` → `false` |

The menu opens for one frame and closes again, and the user sees nothing. The
docs promise the opposite (`docs/dropdown-menu.mdx` → Keyboard: `Enter` / `Space`
on the trigger opens on the first enabled row, or closes when open).

The bug is only invisible to the suite because `renderer.simulateKeystrokes`
sends key down and key up **in one batch**: the trigger's `onClick` closure still
reads `open === false` and re-opens the menu. Measured 2026-10-19:

```sh
cd packages/components
# A temporary case with real separated events:
const id = menu.renderer.findByTestId("trigger")?.id ?? -1;
menu.renderer.nativeSimulateKeyDown(id, "space");
menu.renderer.nativeSimulateKeyUp(id, "space");
expect(menu.renderer.findByTestId("menu")).toBeDefined();
# FAIL — expected undefined to be defined
```

`nativeSimulateKeyDown` / `nativeSimulateKeyUp` each dispatch one event through
the framework (`flushSync` in `createTestRoot`), which reproduces the render
between them. The same sequence with `enter` passes, because `Button` activates
Enter on key down before the trigger's own handler.

## 2. Exact change

`packages/components/src/dropdown-menu.tsx` only.

1. Replace the `isActivation` import with `isEnter` and `isSpaceRelease`:

   ```ts
   import { isDown, isEnter, isSpaceRelease, isUp } from "./internal/key.js";
   ```

2. In `DropdownMenuTrigger.onKeyDown`, keep only the arrow branches. Remove the
   `else if (isActivation(event)) openAt("first");` branch — a button-shaped
   control activates Space on release, not on press.

3. In `DropdownMenuTrigger.onClick`, detect the two keyboard activation clicks
   and name the row a keyboard open lands on **before** toggling:

   ```tsx
   onClick={(event) => {
     onClick?.(event);
     // A button-shaped control synthesises this click on Enter (key down) or
     // Space (key up). Only a keyboard open names a row.
     const fromKeyboard = isEnter(event) || isSpaceRelease(event);
     pendingFocus.current = fromKeyboard && !open ? "first" : null;
     if (dismissedByOutsidePress.current) {
       dismissedByOutsidePress.current = false;
       return;
     }
     setOpen(!open);
   }}
   ```

   The pointer path is unchanged: `pendingFocus` is cleared and the click
   toggles. `Enter` still opens on the first row because its click runs before
   the (no-longer-opening) `onKeyDown`. `Space` opens on its key-up click.
   A keyboard press on an already-open trigger still closes it.

4. Keep the existing `disabled` guard on the arrow branches.

## 3. Tests

`packages/components/src/behaviour/dropdown-menu.test.tsx`, next to the existing
Enter/Arrow tests.

Add **one** case, with the measured reason in the header comment:

```tsx
it("opens on the first enabled row from a real Space down/up pair", () => {
  const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
  focusTrigger(menu);

  const trigger = menu.renderer.findByTestId("trigger")?.id ?? -1;
  menu.renderer.nativeSimulateKeyDown(trigger, "space");
  menu.renderer.nativeSimulateKeyUp(trigger, "space");

  expect(menu.renderer.findByTestId("menu")?.customProps?.role).toBe("menu");
  expect(focusedTestId(menu)).toEqual(Option.some("rename"));

  menu.unmount();
});
```

Why this test can fail:

- on the current source it fails at the first assertion (the menu is closed);
- after the fix it passes both assertions — the menu is still painted **and** the
  first enabled row owns focus, so the key-up click did not merely toggle a
  visible menu back open.

No other test changes. Do **not** touch the 50 existing cases, including the
`Space` radio-row case: that path is a composite row, not a button trigger.

## 4. Both-direction proof (required before calling it done)

Run from `packages/components`:

```sh
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/dropdown-menu.test.tsx -t 'real Space down/up pair'
# expected: 1 passed
```

Then apply and revert each mutation:

1. **Old code:** restore `else if (isActivation(event)) openAt("first")` in
   `onKeyDown` and use the old `pendingFocus.current = null` click → the new case
   fails (`expected undefined to be defined`).
2. **Half fix:** keep the click branch but re-add the key-down branch → the new
   case fails the same way.
3. **No row focus:** remove `pendingFocus.current = ...` → the menu stays open
   but `focusedTestId` is the surface, not `rename`; the second assertion fails.

Record the observed failures in the commit message or the plan's status line.

## 5. Docs, example and inventory sync

- `packages/components/docs/dropdown-menu.mdx` → `## Verification`: 50 → 51
  tests, and add “a real Space key-down/key-up pair staying open on the first
  row” to the prose list.
- `packages/components/examples/dropdown-menu.example.tsx`: the header comment
  names `Enter`, `Space`, `ArrowDown`, `ArrowUp` as the keyboard opens (currently
  it omits Space).
- `COMPONENTS.md` → `Dropdown menus` row: 50 → 51 native behaviour tests, and
  say the Space path is proven with separated key-down/key-up events.
- `TODO.md` → add and tick a Tier 2 hardening row for plan 557 under the
  existing `Tier 2 hardening after the inventory closed` list.
- `.agents/slop/plans/README.md` → index plan 557 in the components table.
- `PLAN.md` → no architecture decision changes; no ADR needed.

The inventory test (`src/inventory.test.ts`) holds the docs count and the
`COMPONENTS.md` row to the suite, so run it after the edits.

## 6. Commands and expected results

From the repo root:

```sh
nub run --filter @gpuixui/components test
# expected: 41 files, 417 tests, all pass

nubx vitest run --config vitest.behaviour.config.ts src/behaviour/dropdown-menu.test.tsx
# expected: 51 passed

nub run --filter @gpuixui/components test:behaviour
# expected: 738 total, 683 passed, 55 pre-existing plan-540 binding failures
# (the new case must be among the passing ones; the failures are unchanged)

nub run check
nub run lint
```

The suite's known 55 red cases are the plan-540 `getElementBounds` and
focus/blur delivery defects; do **not** touch them. The new case does not read
bounds or rely on React focus events.

## 7. STOP conditions

Stop and report rather than loosening the test if:

- the new case fails on the fixed source at the **focus** assertion — then the
  key-up click still toggles and the event ordering differs from the measured
  sequence; record the observed `focusedTestId`;
- the new case also fails with a **pointer** open — the click branch changed the
  pointer path, which was not the intent;
- `Enter` stops opening on the first row — the click branch must not regress the
  existing Enter case;
- the inventory test reports a docs/`COMPONENTS.md` count mismatch — fix the
  stated count, never the test.

## 8. Acceptance

- The new native case fails on the old source and passes on the new source.
- The existing 50 dropdown cases still pass.
- `nub run check`, `nub run lint` and the unit suite pass; the behaviour suite has
  exactly the same 55 pre-existing binding failures.
- Docs, example, `COMPONENTS.md`, `TODO.md` and this index record the fix.

## 9. Observed (2026-10-19)

- New case on the fixed source: `1 passed` (menu painted, `rename` focused).
- Mutation 1 (old `isActivation` key-down branch): `1 failed` —
  `expected undefined to be defined` at the `menu` role assertion.
- Mutation 3 (no `pendingFocus` from the keyboard click): `1 failed` — focus
  stayed on the surface instead of `rename`.
- Full dropdown suite: `49 passed | 2 failed (51)`. The two failures are the
  plan-540 binding position cases (`centres a requested menu on its trigger` off
  by 4 px; `opens to the left when the right side cannot hold it` off by 1 px),
  both present before this change.
- Full behaviour suite: `683 passed | 55 failed (738)` — exactly the plan-540
  binding set, no new failure.
- `nub run check` exits 0; the unit suite is 417/417.
