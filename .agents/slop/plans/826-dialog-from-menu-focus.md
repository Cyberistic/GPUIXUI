# Plan 826 — A dialog opened from a menu row returns focus to the menu trigger

| | |
| --- | --- |
| Phase | F (Tier 2 hardening / composite integration) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 114, 117, 638, 704, 722, 730, 824 |
| Status | done — measured defect, fix landed, both directions proven |
| Claimed number | `826` — `825` was claimed by the playground (`825-document-anchors`) and tokens-theme (`825-size-constraints`), checked across every worktree on 2026-10-21 |

## 0. Why this plan exists — the measured defect

Plan 824's probe found a second composite defect. A `DropdownMenuItem` whose
`onSelect` opens a `Dialog` unmounts with its menu in the same commit, while
`useModalFocus` captures the opener at the surface's first render (plan 638). The
captured id is therefore the **row**, which no longer exists when the dialog
closes; the restore checks `getElementBounds` (plan 730) and, with no enclosing
surface for a root dialog, focuses nothing.

Measured in this worktree on 2026-10-21 with the real `TestRenderer`, at `HEAD`:

```text
click the "Actions" menu trigger → click the "Edit" row (opens a Dialog)
Escape
  edit-dialog   false          // the dialog closed
  focused       None           // the keyboard user has no focus at all
```

The menu already restores focus to its trigger on `close("activate")` (a layout
effect), but that effect runs **after** the dialog captured its opener, so the
dialog's restore has nothing live to return to. The user's natural place is the
menu's trigger: the menu is closed, and that is the control they opened it from.

## 1. The rule

**A modal's opener is the element the user will return to, not necessarily the
element that was focused when it opened.** When an overlay closes *because a row
was activated*, and that activation opens a modal in the same gesture, the row's
focus is handed to the overlay's trigger. The closing overlay marks the element
that is about to vanish (`markFocusSuccessor(from, to)`); a modal that captures
that element as its opener substitutes the marked successor. The mark lives **one
task** — the commit that unmounts the row — so it can never retarget a later
modal (the lifetime rule of `internal/event-claim.ts`, plan 587).

This holds for the Dropdown menu, the Context menu and a row inside a submenu:
the **root** menu's close runs in the chain and marks the focused row (or the
submenu surface, if a pointer click left focus there) against the root trigger.

No other overlay type needs the mark: a popover, picker or preview card has no
trigger-restoring row action, and a menu row that keeps its menu open
(`closeOnSelect={false}`) leaves its row mounted, so its opener is alive.

## 2. Exact files to change

1. **New** `packages/components/src/internal/focus-successor.ts` — the mark and
   its one-task lifetime (§3.1).
2. **New** `packages/components/src/internal/focus-successor.test.ts` — three
   cases (§5).
3. `packages/components/src/internal/modal.ts` — the capture substitutes a
   marked successor (§3.2).
4. `packages/components/src/dropdown-menu.tsx` — `close` marks on `activate`
   (§3.3).
5. `packages/components/src/context-menu.tsx` — the same mark in its `close`
   (§3.4).
6. `packages/components/src/behaviour/composition.test.tsx` — the
   dialog-from-a-menu fixture and its case (§3.5).
7. `docs/component-api.md` §2 or §4 — one sentence on the opener rule.
8. `packages/components/docs/dropdown-menu.mdx` and `context-menu.mdx` — the
   row-activation focus paragraph gains the dialog case.
9. `COMPONENTS.md` — the Dropdown menus and Context menus rows.
10. `TODO.md` — tick the task plan 824 recorded; add any new measured defect.
11. `.agents/slop/plans/README.md` — the index row for `826`.
12. `PLAN.md` D30 — record `826` and the next free number.

## 3. Implementation

### 3.1 `internal/focus-successor.ts`

```ts
/**
 * Where focus goes when the element holding it is about to disappear.
 *
 * A menu row can open a modal from `onSelect`, and the row unmounts with its menu
 * in the same commit — before the modal captures its opener. The closing overlay
 * marks its trigger as the row's successor, and `useModalFocus` substitutes it.
 * The mark lives one task: a stale one must never retarget a later modal (the
 * rule `event-claim.ts` uses for its claim, plan 587).
 */

import * as Option from "effect/Option";

interface FocusSuccessor {
  readonly from: number;
  readonly to: number;
}

let successor: Option.Option<FocusSuccessor> = Option.none();

/** Mark `to` as where focus returns once `from` disappears. */
export const markFocusSuccessor = (from: number, to: number): void => {
  const marked: FocusSuccessor = { from, to };
  successor = Option.some(marked);
  setTimeout(() => {
    successor = Option.filter(successor, (current) => current !== marked);
  }, 0);
};

/** The successor marked for `from`, while the mark is still in its task. */
export const focusSuccessor = (from: number): Option.Option<number> =>
  Option.map(
    Option.filter(successor, (current) => current.from === from),
    (current) => current.to,
  );
```

### 3.2 `internal/modal.ts` — the capture

Add `import * as Option from "effect/Option";` and replace the capture:

```ts
const [previousFocus] = useState<number | null>(() => {
  const focused = renderer?.getFocusedElementId?.() ?? null;
  // A row that opened this modal unmounted with its menu before this render; the
  // menu named its trigger as that row's successor (plan 826).
  return focused === null
    ? null
    : Option.getOrElse(focusSuccessor(focused), () => focused);
});
```

Nothing else in the effect changes: the restore still checks the target's bounds
and falls back to the enclosing surface.

### 3.3 `dropdown-menu.tsx` — `close`

```ts
const close = useCallback(
  (reason: MenuCloseReason) => {
    restoreFocus.current = reason === "activate" || reason === "dismiss";
    leaveFocus.current = null;
    // The row that opened a modal is unmounted by this close, before the modal
    // captures its opener. The trigger is where the user was (plan 826).
    const target = trigger.current;
    const focused = renderer?.getFocusedElementId?.() ?? null;
    if (reason === "activate" && target !== null && focused !== null) {
      markFocusSuccessor(focused, target.id);
    }
    setOpenRef.current(false);
  },
  [renderer],
);
```

### 3.4 `context-menu.tsx` — `close`

```ts
const close = useCallback(
  (reason: MenuCloseReason) => {
    const restore =
      restoreFocus.current && (reason === "activate" || reason === "dismiss");
    const target = triggerId.current;
    const focused = renderer?.getFocusedElementId?.() ?? null;
    if (reason === "activate" && target !== undefined && focused !== null) {
      markFocusSuccessor(focused, target);
    }
    requestClose(restore ? "trigger" : "none");
    restoreFocus.current = false;
  },
  [renderer, requestClose],
);
```

Both roots already hold `renderer` and their trigger id/ref, so no new plumbing
and no context change. A submenu row is covered because its `close("activate")`
calls `parentClose("activate")` (plan 722's chain).

### 3.5 `composition.test.tsx`

Fixture:

```tsx
/** A menu row that opens a dialog: where does the dialog give focus back? */
const DialogFromMenu = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <DropdownMenu>
        <DropdownMenuTrigger testId="menu-trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent testId="menu-panel">
          <DropdownMenuItem testId="menu-edit" onSelect={() => setOpen(true)}>
            Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent label="Edit" testId="edit-dialog" size="sm">
          <DialogTitle>Edit</DialogTitle>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

Case (red at `HEAD`):

```tsx
it("returns focus to the menu trigger when a dialog opened from a row closes", () => {
  const scene = renderComponent(<DialogFromMenu />);
  clickCentreOf(scene, "menu-trigger");
  finishMotion(scene);
  clickCentreOf(scene, "menu-edit");
  finishMotion(scene);
  expect(isShown(scene, "edit-dialog")).toBe(true);

  scene.renderer.simulateKeystrokes("escape");
  finishMotion(scene);

  expect(isShown(scene, "edit-dialog")).toBe(false);
  expect(focusedTestId(scene)).toEqual(Option.some("menu-trigger"));

  scene.unmount();
});
```

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components/packages/components`.

1. Add the unit cases only:
   `nub exec vitest run src/internal/focus-successor.test.ts`
   → **expected:** all pass (the helper is new; this is its own suite).
2. Add the composition case only:
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx`
   → **expected:** 1 failed / 11 passed — `expected {_tag: 'None'}` to equal
   `Some("menu-trigger")`. Record the text.
3. Apply §3.1–§3.5:
   - the composition suite → **12/12 pass**;
   - `nub exec vitest run` → **49 files / 524 tests pass** (521 + the 3 helper cases; the composite case lives in the behaviour suite).
4. Both directions. Remove the two `markFocusSuccessor` calls:
   - the composition case fails with `None` and every other case passes.
   Restore.
   Then remove the substitution in `useModalFocus` (read `focused` directly):
   - the composition case fails again; no other case changes. Restore.
5. No regressions in the menu and modal suites:
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/dropdown-menu.test.tsx src/behaviour/context-menu.test.tsx src/behaviour/dialog.test.tsx src/behaviour/drawer.test.tsx src/behaviour/confirm-dialog.test.tsx`
   → the same failure set as the plan-824 run (the recorded plan-540 position
   cases), no new case.
6. From the repo root: `nub run check`, `nub run lint`, `nub run test` →
   **all exit 0**.
7. Scoped smoke, one id per run:
   `nub apps/playground/dist/smoke/run.js --only overlay-dialog` and
   `nub apps/playground/dist/smoke/run.js --only modal-focus-trap` → **green**.

**STOP conditions.** Stop and report instead of improvising if:

- the mark is consumed by a modal the app opens **later** (not in the row's
  gesture), because then the one-task lifetime is wrong and the mechanism needs a
  different anchor;
- focus lands on the trigger while the dialog is **still open**, because the mark
  is being applied to the wrong capture;
- a menu that keeps its menu open (`closeOnSelect={false}`) changes focus;
- a Context menu opened by pointer stops returning focus to the pressed region,
  because `triggerId` was marked under the wrong reason;
- the dialog/drawer/confirm suites change any assertion beyond the baseline.

## 5. Test plan — what each case can catch

| Case | Guards |
| --- | --- |
| helper: a marked id returns its successor | the mark is readable for the element the modal captured |
| helper: an unmarked id returns `None` | substitutes never leak to an unrelated opener |
| helper: the mark clears after one task | a stale mark retargeting a later modal |
| composition: dialog from a menu row returns to the trigger | the measured defect, through real clicks and Escape |
| menu, dialog, drawer, confirmation suites | the mark does not move focus on the existing close paths |

## 6. Acceptance criteria

- The composition case fails at `HEAD` and passes after; removing either the mark
  or the substitution fails it again; the helper suite is 3/3.
- `check`, `lint`, `test` exit 0; the unit suite is 49 files / 524 tests.
- `docs/component-api.md`, both menu pages, `COMPONENTS.md`, `TODO.md`, the plan
  index and `PLAN.md` D30 state the opener rule.
- The scoped smoke ids are green and recorded.

## 7. Outcome (2026-10-21)

- **Measured at `HEAD`.** The composition case was 1 failed / 11 passed:
  `expected {_tag: 'None'}` to equal `Some("menu-trigger")` after Escape closed
  the dialog. The helper suite is 3/3 (new code).
- **After the fix.** The composition suite is 12/12.
- **Both halves proven necessary.** Removing the two `markFocusSuccessor` calls
  fails exactly the new case (11/12); removing the substitution in
  `useModalFocus` fails exactly the new case (11/12). No other case moves.
- **No regressions.** Dialog 21/21 and Confirmation dialog 10/10 are green;
  Dropdown menu 63 (2 failed), Context menu 25 (1) and Drawer 18 (1) fail only
  the recorded plan-540 position/box cases — the same set as the plan-824 run
  (140 tests, 4 failed).
- **Gates.** `nub run check`, `nub run lint` and `nub run test` exit 0; the unit
  suite is 524 tests in 49 files.
- **Scoped smoke.** `overlay-dialog` and `modal-focus-trap` green, `1/1` each,
  run separately.
- `docs/component-api.md`, `docs/dropdown-menu.mdx`, `docs/context-menu.mdx`,
  `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 state the rule.
