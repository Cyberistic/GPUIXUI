# 719 — A popover's Tab walk is its own inside a dialog

**Owner:** components workstream · **Phase:** F (overlay keyboard) ·
**Depends on:** 110, 112, 117, 200, 201, 326, 327, 521, 583, 669, 718

**Numbering:** `716`/`717` are claimed by the tokens-theme worktree and `718` is
this branch's last plan; `719` is the first number free across every worktree on
2026-10-20. Recorded in `PLAN.md` D30.

## 1. What is measured today

`PopoverContent` walks its own tab stops and closes when the walk reaches an end
(plans 521/718). `handleModalKeyDown` (`internal/modal.ts`) traps `Tab` inside a
dialog or drawer on **every** key event that bubbles from its content. Neither
knows about the other, so inside a dialog one `Tab` moves focus twice: once by
the popover's walk, once by the modal's trap.

Measured on this host from `packages/components`, with a dialog whose content
holds a `Popover` (`first` → `second` → `third`) followed by an `after` button:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/zz-probe.test.tsx   # scratch probe, since deleted
# open the popover:            focused Some("first")
# Tab:                         focused Some("third")   <- `second` skipped, panel open
# Tab:                         focused Some("dialog-close"), panel closed
# Tab:                         focused Some("trigger")
# Tab:                         focused Some("after")
#
# Shift+Tab from the open panel's first control:
#                              focused None, panel closed
```

A keyboard user therefore cannot reach the panel's second control at all, and
the backward exit strands focus on no host (`None`). The same fixture outside a
dialog is correct in the existing suite (`first` → `second` → `third` →
`elsewhere`; `Shift+Tab` → `before`), so the defect is the double handling, not
the walk.

The same double move affects every popover-hosted surface inside a modal: the
date picker's calendar, a filter panel and a composer panel all live in a
`PopoverContent`.

## 2. The decision

**The surface that handled a `Tab` owns it.** The popover claims each `Tab` it
walks (the shared event-claim channel, plan 669), and the shared modal rules
ignore an event another surface has claimed. This is the rule the dismiss stack
already follows for `Escape` and outside presses, extended to `Tab`:

- `PopoverContent` claims the `Tab` before it moves focus or closes; claiming is
  the innermost handler's job, so the popover does not consult the claim itself
  (a nested menu does not claim `Tab`, and two `Tab` presses in one task are
  indistinguishable to the field-based claim — the reason plans 587/669 make
  real gestures cross a task);
- `handleModalKeyDown` runs its rules only when the event is unclaimed, and
  still calls the caller's `onKeyDown`, so a caller keeps observing every key
  (the documented contract);
- a surface that does **not** handle `Tab` (a menu closes on it without moving
  focus; a combobox input, a text field) claims nothing, so the modal trap
  still moves focus — the existing behaviour is unchanged.

## 3. Exact changes

### 3.1 `packages/components/src/popover.tsx`

1. Import the claim helper beside the dismiss-layer import:

   ```ts
   import { claimEvent } from "./internal/event-claim.js";
   ```

2. In the surface's `onKeyDown`, claim the `Tab` that `handleTab` acts on. The
   comment states why the claim is written here and not read here:

   ```ts
   Match.when(isTab, (value) => {
     // The walk moves focus itself; an enclosing modal must not trap the same
     // event and move it again (plan 719).
     claimEvent(value);
     handleTab(value.modifiers?.shift === true);
   }),
   ```

   Nothing else changes in `handleTab`: the walk, the refused-close `stay()` and
   the `leave()` hand-off are the plan-521/718 behaviour.

### 3.2 `packages/components/src/internal/modal.ts`

1. Import `isEventClaimed` from `./event-claim.js`.
2. Gate the modal rules on the claim, keeping the caller's `onKeyDown` last:

   ```ts
   if (!isEventClaimed(event)) {
     Match.value(event).pipe(
       Match.when(isDismiss, (value) => {
         dismissTopLayer(value);
       }),
       Match.when(isTab, (value) => {
         if (value.modifiers?.shift === true) {
           renderer?.focusPreviousWithin?.(contentId ?? -1);
         } else {
           renderer?.focusNextWithin?.(contentId ?? -1);
         }
       }),
       Match.orElse(() => undefined),
     );
   }
   onKeyDown?.(event);
   ```

3. Update the function's JSDoc: "Escape closes the topmost overlay; Tab wraps
   inside the surface unless an inner surface claimed the event; `onKeyDown` runs
   last, so a caller observes every key."

### 3.3 `packages/components/src/behaviour/popover.test.tsx`

Add a fixture next to `Columns`:

```tsx
/** A control-dense popover inside a dialog, with app controls on both sides. */
const ColumnsInDialog = ({ onKeyDown }: { readonly onKeyDown?: () => void }) => {
  const [dialogOpen, setDialogOpen] = useState(true);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent label="Settings" testId="dialog" onKeyDown={onKeyDown}>
        <DialogTitle>Settings</DialogTitle>
        <Button testId="before">Before</Button>
        <Popover>
          <PopoverTrigger testId="trigger">Columns</PopoverTrigger>
          <PopoverContent testId="panel">
            <Button testId="first">First</Button>
            <Button testId="second">Second</Button>
            <Button testId="third">Third</Button>
          </PopoverContent>
        </Popover>
        <Button testId="after">After</Button>
      </DialogContent>
    </Dialog>
  );
};
```

(The dialog test file already imports `Button`, `Dialog*`, `Popover*`,
`clickCentreOf`, `finishMotion` and `focusedTestId`; this file needs the dialog
imports added.)

Two cases:

1. **"walks its own controls inside a dialog"** (fails at `HEAD`): open the
   popover by pressing `trigger`; expect `first`; `Tab` → `second` (panel open);
   `Tab` → `third` (panel open); `Tab` → panel gone and focus `after`.
   Also pass an `onKeyDown` spy to `DialogContent` and expect it called for each
   `Tab`, pinning that the modal's caller still observes a claimed key.
2. **"walks backwards inside a dialog and leaves before the trigger"** (fails at
   `HEAD` with `None`): open; `Shift+Tab` → panel gone and focus `before`.

Call `finishMotion` after each close so the 100 ms exit ghost is gone before the
next assertion (plan 529).

Update the file's header comment with the guarded bug: "Tab inside a dialog moved
focus twice, because the popover walk and the modal trap both handled it".

### 3.4 Docs, inventory and counts

- `packages/components/docs/popover.mdx`: the Tab bullet says the walk owns the
  key inside a modal (the enclosing dialog's trap yields and resumes when the
  panel closes); the Verification paragraph is rewritten to name the two new
  cases and its count `24 tests` becomes `26 tests`.
- `packages/components/docs/dialog.mdx`: the Tab-trap bullet notes that a nested
  popover's walk is its own and the trap resumes after it closes. Re-read the
  stated native count; Dialog keeps 21.
- `COMPONENTS.md`, Popovers row: `24 native behaviour tests` → `26`, with the
  dialog-nesting sentence.
- `packages/components/src/popover.tsx`'s `popoverMeta.limitations`: no new
  limitation (this removes one); leave the list as is unless the walk's wording
  needs the modal note.
- `TODO.md`: tick a plan-719 row under the Tier 2 hardening list.
- `.agents/slop/plans/README.md`: add the row to the components table.
- `PLAN.md` D30: record `719` as claimed.

## 4. Test plan

- **Can the tests fail?** Both new cases fail at `HEAD` (measured above:
  `Some("third")` after one `Tab`, and `None` after `Shift+Tab`), and pass with
  the claim.
- **Both-direction proof:**
  (a) remove `claimEvent` from the popover: case 1 fails with `third` and case 2
  with `None`;
  (b) keep the popover's claim but remove the modal gate: both cases fail the
  same way, so both halves are necessary;
  (c) removing the modal gate also makes the existing "traps Tab inside the
  surface and wraps at both ends" case pass unchanged — the pin proves the gate
  is not what traps (the unclaimed path still does).
- **No regression:** the popover suite is 26 tests with the same three recorded
  plan-540 placement failures (`opens below its trigger`, `centres a requested
  panel`, `opens above a trigger near the window bottom`); the dialog suite keeps
  21 passing cases; the two-Escape nesting cases are untouched.
- **Why not a unit test:** the defect is focus delivery across two surfaces in
  the real renderer; a pure fold cannot observe it.

## 5. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/popover.test.tsx src/behaviour/dialog.test.tsx
# before: the two new cases fail (plus the three known popover placement cases)
# after: 3 failed | 44 passed — only the three plan-540 placement cases
#   (Popover 23/26; Dialog 21/21)

nub run check-types
nub run test        # unit suite, no native binding needed
```

Measured after the change (2026-10-20): `Popover 23/26` and `Dialog 21/21`, so
the two-file run is `3 failed | 44 passed (47)` — the three failures are the
recorded plan-540 placement cases, unchanged.

The playground smoke registry is GPUix-primitives only (no Tier 2 scenario for
this component), so the native `TestRenderer` suite is the interaction evidence.
The modal path this change touches does have two scenarios, both re-run on
2026-10-20: `nub apps/playground/dist/smoke/run.js --only modal-focus-trap`
(1/1, `modal=verified`) and `--only overlay-dialog` (1/1,
`overlay=verified`).

From the repo root:

```sh
nub run check
nub run lint
nub run --filter @gpuixui/components test:behaviour
# HEAD measured 2026-10-20: 885 passed / 28 failed of 913, every failure one of
# the recorded plan-540 binding defects. After this plan it is 915 tests
# (887 passed / 28 failed) — the two new cases among the passes.
```

## 6. STOP conditions

- Either new case passes unchanged at `HEAD`: stop and re-measure; do not weaken
  the assertion or keep a case that cannot fail.
- The fix needs the popover to read the claim as well: stop — two `Tab` presses
  in one task are indistinguishable to the field claim, so reading it would
  swallow the second press of a synchronous walk.
- The plain dialog trap ("traps Tab inside the surface and wraps at both ends")
  changes result: stop and report; unclaimed `Tab` must still trap.
- Any existing popover walk case changes result beyond the three recorded
  placement failures: stop and report which.
- The claim leaks between tests: stop; the behaviour teardown already crosses a
  task (plan 587), do not add a local reset.

## 7. Acceptance

- Inside a dialog, a popover's `Tab`/`Shift+Tab` walk reaches every control once,
  closes at either end and hands focus to the app control after/before the
  trigger.
- A modal whose content holds no Tab-owning surface still traps `Tab` and wraps
  at both ends — unchanged.
- A caller's `onKeyDown` on the dialog observes every key, claimed or not.
- Popover is 23 of 26 on this host, every failure a recorded plan-540 placement
  case; Dialog is 21 of 21; docs, `COMPONENTS.md`, `TODO.md`, the plan index and
  `PLAN.md` D30 agree.
