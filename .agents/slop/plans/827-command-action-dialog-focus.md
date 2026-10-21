# Plan 827 — A modal opened from a closing modal inherits its restore target

| | |
| --- | --- |
| Phase | F (Tier 2 hardening / composite integration) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 114, 117, 638, 704, 730, 826 |
| Status | done — measured defect, fix landed, both directions (three mutations) proven |
| Claimed number | `827` — plan 826 records that `825` went to the playground and tokens-theme and that `827` was the next free components number, checked across every worktree on 2026-10-21 |

## 0. Why this plan exists — the measured defect

Plan 826 fixed the *menu row* case: the row that opens a modal unmounts with its
menu before the modal captures its opener, so the menu marks its trigger as the
row's focus successor and `useModalFocus` substitutes it.

The command palette is the same gesture through a different owner. A
`CommandMenu` action's `perform` opens a `Dialog`; `run` then calls `close()`,
which closes the palette in the same commit. The palette is itself a `Dialog`
(its search field is the surface's `initialFocus`), so the new dialog captures
the **palette's focused control** — `command-input` — as its opener. That field
belongs to a surface that is closing in the same commit. On Escape the new
dialog closes and the focused host is `None`, where the palette's own close
would have returned the keyboard to the control that opened the palette.

Measured in this worktree on 2026-10-21 while verifying plan 826:

```text
click "open-palette" → run the action that opens a Dialog → Escape
  edit-dialog   false          // the dialog closed
  focused       None           // the keyboard user has no focus at all
```

The command row cannot write the mark: the target is the **palette's** opener,
which `useModalFocus` keeps private, and the palette's close runs *after* the new
dialog captured. The mark must therefore be written where the restore target is
known — the closing surface's own close cleanup — and it must outlive the one
task plan 826 gave it, because the new modal restores seconds later.

## 1. The rule

**A modal that captures an element belonging to a surface closing in the same
commit inherits that surface's restore target.**

- Every `useModalFocus` cleanup records the target it is about to focus against
  the element that holds focus at that moment — the element the closing surface
  leaves behind (`markFocusSuccessor(from, to)`).
- At capture *and* at restore, `useModalFocus` prefers a recorded successor for
  the id it captured. Restore prefers it even when the captured element still
  exists: a surface in its exit motion is still mounted, and focusing it only to
  lose the keyboard when it unmounts is the same defect one animation later.
- The mark is **durable until read**, not one task: the modal that owns it
  restores much later. It is keyed by the native id of an element that has
  vanished, and a modal can only capture an element that exists, so a mark can
  only ever apply to the modal that captured it before it vanished. It is
  **consumed on read** and the store is bounded (newest 8), so a mark that is
  never read cannot retarget a later modal and cannot grow without limit.

This supersedes plan 826 §1's one-task lifetime. The event-claim rule of plan
587 stays as it is: a claim is answered across one propagation, a successor is
answered by one modal's restore. The two are different questions.

The rule is generic: it covers a `Dialog`, `Drawer`, `ConfirmDialog` or
`CommandMenu` opened from a closing menu row, palette, dialog or drawer, because
it lives in the one place every modal already shares.

## 2. Exact files to change

1. `packages/components/src/internal/focus-successor.ts` — durable, bounded,
   consumed-on-read marks; `takeFocusSuccessor` replaces `focusSuccessor` (§3.1).
2. `packages/components/src/internal/focus-successor.test.ts` — four cases
   (§5).
3. `packages/components/src/internal/modal.ts` — capture substitutes; the
   restore prefers the recorded successor and records its own vanishing element
   (§3.2).
4. `packages/components/src/behaviour/composition.test.tsx` — the
   command-action fixture and its case (§3.3).
5. `packages/components/docs/command-menu.mdx` — the closing paragraph gains the
   dialog case.
6. `packages/components/docs/dialog.mdx` — one sentence next to the plan-638
   opener paragraph.
7. `docs/component-api.md` §2 — the opener paragraph gains the inheritance rule.
8. `COMPONENTS.md` — the Command menus row.
9. `TODO.md` — tick the task recorded at ~1562.
10. `.agents/slop/plans/README.md` — the index row for `827`.
11. `PLAN.md` D30 — record `827` and the successor lifetime rule.

`drawer.mdx` needs no change: it points at the same shared rule and the drawer
already documents the plan-730 handover.

## 3. Implementation

### 3.1 `internal/focus-successor.ts`

```ts
/**
 * Where focus goes when the element holding it is about to disappear.
 *
 * A row, or a whole palette, can open a modal and close in the same commit: the
 * modal captures a control of the closing surface as its opener, and the surface
 * returns focus where it would have gone itself when that control vanishes. Each
 * cleanup marks the element it is leaving behind against the target it focuses
 * (`useModalFocus`), and the modal that captured the mark prefers it at capture
 * and at restore (plan 827).
 *
 * The mark is keyed by the id of an element that has vanished. A modal can only
 * capture an element that exists, so a mark can only apply to the modal that
 * captured it; it is consumed on read and the store keeps the newest few, so it
 * never retargets a later modal and never grows (plan 827, superseding the
 * one-task lifetime of plan 826).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

interface FocusSuccessor {
  readonly from: number;
  readonly to: number;
}

/** How many unread marks are kept; enough for a burst of closing overlays. */
const LIMIT = 8;

let successors: ReadonlyArray<FocusSuccessor> = [];

/** Mark `to` as where focus goes once `from` disappears. */
export const markFocusSuccessor = (from: number, to: number): void => {
  successors = Arr.take(
    Arr.prepend(
      Arr.filter(successors, (current) => current.from !== from),
      { from, to },
    ),
    LIMIT,
  );
};

/** The successor marked for `from`; the mark is consumed by the read. */
export const takeFocusSuccessor = (from: number): Option.Option<number> => {
  const marked = Arr.findFirst(successors, (current) => current.from === from);
  successors = Arr.filter(successors, (current) => current.from !== from);
  return Option.map(marked, (current) => current.to);
};
```

### 3.2 `internal/modal.ts`

Import `markFocusSuccessor, takeFocusSuccessor`. Capture stays plan 826's
substitution, with the new name:

```ts
const [previousFocus] = useState<number | null>(() => {
  const focused = renderer?.getFocusedElementId?.() ?? null;
  return focused === null
    ? null
    : Option.getOrElse(takeFocusSuccessor(focused), () => focused);
});
```

The cleanup gains the inheritance:

```ts
return () => {
  // A surface that closed in the same commit handed its own target on: this
  // modal captured one of its controls, which is leaving with it (plan 827).
  const inherited =
    previousFocus === null
      ? Option.none<number>()
      : takeFocusSuccessor(previousFocus);
  const opener = Option.getOrElse(inherited, () => previousFocus);
  const usable =
    opener !== null &&
    opener !== contentId &&
    renderer?.getElementBounds?.(opener) !== null;
  const target = usable ? opener : hostRef.current.contentId;
  if (target === null || target === undefined || target === contentId) {
    return;
  }
  // The element holding the keyboard now is about to vanish with this surface.
  // Name it against the target, for the modal that captured it (plan 827).
  const leaving = renderer?.getFocusedElementId?.() ?? null;
  if (leaving !== null && leaving !== target) {
    markFocusSuccessor(leaving, target);
  }
  renderer?.focusElement?.(target);
};
```

Nothing else changes: the bounds check, the enclosing-surface fallback and the
depth rule are plan 730's.

### 3.3 `composition.test.tsx`

Fixture (next to `DialogFromMenu`, which stays):

```tsx
/** A palette action that opens a dialog: the palette closes in the same commit. */
const DialogFromCommand = () => {
  const [palette, setPalette] = useState(false);
  const [dialog, setDialog] = useState(false);
  const actions: ReadonlyArray<CommandAction> = [
    { id: "edit", label: "Edit item", perform: () => setDialog(true) },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Button testId="open-palette" onClick={() => setPalette(true)}>
        Commands
      </Button>
      <CommandMenu open={palette} onOpenChange={setPalette} actions={actions}>
        <CommandMenuInput />
        <CommandMenuList />
      </CommandMenu>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent label="Edit item" testId="command-dialog" size="sm">
          <DialogTitle>Edit item</DialogTitle>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

New imports: `CommandMenu`, `CommandMenuInput`, `CommandMenuList` from
`../command-menu.js`, and `type CommandAction`.

Case (red at `HEAD`):

```tsx
it("returns focus to the palette's opener when a command's dialog closes", async () => {
  const scene = renderComponent(<DialogFromCommand />);
  clickCentreOf(scene, "open-palette");
  finishMotion(scene);
  expect(focusedTestId(scene)).toEqual(Option.some("command-input"));

  scene.renderer.simulateKeystrokes("enter");
  finishMotion(scene);
  expect(isShown(scene, "command-dialog")).toBe(true);

  // A person dismisses the dialog in a later task than the palette's close.
  await nextTask();

  scene.renderer.simulateKeystrokes("escape");
  finishMotion(scene);

  expect(isShown(scene, "command-dialog")).toBe(false);
  expect(focusedTestId(scene)).toEqual(Option.some("open-palette"));

  scene.unmount();
});
```

The palette is opened by a real `Button` press rather than mounted open: measured
while writing this plan, a palette that starts open captures `null` as its opener
(the document had no focus at its render), so it holds nothing to hand on and the
case would prove nothing about inheritance. The `await nextTask()` is the guard
for the mark's lifetime — without it the palette's close and the dialog's restore
sit in one task, so a one-task mark passes; §7 records that measurement. If the
scene reports a different opener id, record what it reports and use the control
the case actually clicked — do not weaken the assertion to "not `None`".

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components/packages/components`.

1. Rewrite §3.1 and its suite only:
   `nub exec vitest run src/internal/focus-successor.test.ts`
   → **expected:** all six cases pass (new code).
2. Add the composition case only:
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx`
   → **expected:** 1 failed / 12 passed — `expected {_tag: 'None'}` to equal
   `Some("open-palette")`. Record the exact text in §7.
3. Apply §3.2 → the composition suite is **13/13**; the helper suite stays 6/6.
4. **Both directions**, restoring after each:
   - remove the `markFocusSuccessor` call in the cleanup → the new case fails
     with `None`, every other case passes;
   - remove the restore's `inherited` (use `previousFocus` directly) → the new
     case fails, every other case passes;
   - put the one-task `setTimeout` back in the mark → the new case fails,
     every other case passes.
5. `nub exec vitest run` → **49 files / 527 tests** (the measured baseline is
   524; three net helper cases; the composite case lives in the behaviour suite).
6. No regressions in the modal and menu suites:
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/{command-menu,dialog,drawer,confirm-dialog,dropdown-menu,context-menu}.test.tsx`
   → the same failure set as the plan-826 run (the recorded plan-540 position
   cases), no new case.
7. From the repo root: `nub run check`, `nub run lint`, `nub run test` →
   **all exit 0**.
8. Scoped smoke, one id per run:
   `nub apps/playground/dist/smoke/run.js --only overlay-dialog`,
   `--only modal-focus-trap` → **green**. The registry has no
   `command-palette` scenario (`window-key-shortcut` covers the palette key); the
   full headless suite is the end-of-task check, because every modal's close path
   is touched.

**STOP conditions.** Stop and report instead of improvising if:

- the closing surface's cleanup runs *after* the new modal's focus entry, so the
  mark is keyed by the new surface's own control — then the anchor is wrong and
  the rule needs a close-time mark, not a cleanup-time one;
- any modal restore now returns to a successor of an element it did not capture
  (a stale mark retargeted a later modal), because then the store or its
  consumption is wrong;
- the palette's own Escape (no dialog involved) changes where focus lands;
- the composition case only passes because focus never left the palette input —
  assert the dialog closed and that the palette's surface is gone;
- the dialog, drawer, confirmation, command-menu or menu suites change any
  assertion beyond the plan-540 baseline.

## 5. Test plan — what each case can catch

| Case | Guards |
| --- | --- |
| helper: a marked id returns its successor once | the mark is readable by the modal that captured the element |
| helper: the second read reports nothing | a consumed mark retargeting a later modal |
| helper: an unmarked id reports nothing | marks never leak to an unrelated opener |
| helper: a mark survives two tasks | the plan-826 one-task lifetime returning |
| helper: the newest eight are kept | unbounded growth after many closes |
| helper: the newest target wins for one element | a repeated close leaving an older target |
| composition: a command's dialog returns to the palette's opener | the measured defect, through a real keystroke and Escape |
| command-menu, dialog, drawer, confirmation, menu suites | the inheritance does not move focus on the existing close paths |

## 6. Acceptance criteria

- The composition case fails at `HEAD` with `None` and passes after; each of the
  three mutations in §4.4 fails it again; the helper suite is 6/6.
- `check`, `lint`, `test` exit 0; the unit suite is 49 files / 527 tests.
- `docs/component-api.md`, `command-menu.mdx`, `dialog.mdx`, `COMPONENTS.md`,
  `TODO.md`, the plan index and `PLAN.md` D30 state the inheritance rule and the
  successor's lifetime.
- The scoped smoke id(s) are green and recorded.

## 7. Outcome (2026-10-21)

- **Measured at `HEAD`.** The composition case was 1 failed / 12 passed:
  `expected { _id: 'Option', _tag: 'None' } to deeply equal { _id: 'Option',
  _tag: 'Some', … }` after Escape closed the dialog. Two probe corrections were
  measured on the way: a palette **mounted open** captures `null` as its opener,
  so the case opens it from a real `Button` press; and a one-task mark **passes**
  the case unless the test crosses a task between the palette's close and the
  dialog's dismissal, so the case awaits `nextTask()` there.
- **After the fix.** The composition suite is 13/13; the helper suite is 6/6
  (3 rewritten, 3 new).
- **All three mutations proven necessary.** Disabling the cleanup's
  `markFocusSuccessor` → 1 failed / 12 passed. Restoring `previousFocus` without
  the inherited successor → 1 failed / 12 passed. Clearing the store one task
  after a mark (plan 826's lifetime) → 1 failed / 12 passed. Each was restored
  afterwards and the suite returned to 13/13.
- **No regressions.** Dialog 21/21, Confirmation dialog 10/10 and Command menu
  28/29 are green; Dropdown menu 63 (2 failed), Context menu 25 (1) and Drawer 18
  (1) fail only the recorded plan-540 position cases. Command menu's
  `keeps the highlighted row inside the list viewport` fails at `HEAD` too
  (`expected 948 to be less than or equal to 568`) — the same position class,
  measured with the source changes stashed.
- **Gates.** `nub run check`, `nub run lint` and `nub run test` exit 0; the unit
  suite is 527 tests in 49 files (baseline 524).
- **Scoped smoke.** `overlay-dialog` 1/1 and `modal-focus-trap` 1/1, run
  separately. The **full headless suite** is 17/20: the three failures are
  `focus-traversal` (no native focus signal on a click), `floating-placement`
  (`expected 166 ± 1, got 175`) and `shell-navigation` (scenario list bounds),
  and all three fail identically with the source changes stashed — the recorded
  plan-540 binding classes. No capability regressed (`overlay`, `modal`,
  `workspace` stay `verified`).
- `docs/component-api.md`, `command-menu.mdx`, `dialog.mdx`, `COMPONENTS.md`,
  `TODO.md`, the plan index and `PLAN.md` D30/D32 state the rule.
