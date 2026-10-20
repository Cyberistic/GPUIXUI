# 721 — Tab leaves an open combobox instead of stranding the popup

**Owner:** components workstream · **Phase:** F (choice-input keyboard) ·
**Depends on:** 110, 116, 117, 138, 302, 323, 340, 398, 523, 541, 583, 602, 706, 719

**Numbering:** `716`/`717` went to tokens-theme, `718`/`719` are this branch's
last plans, and `720` is claimed by tokens-theme
(`720-density-consumer-exception`); `721` is the first number free across every
worktree on 2026-10-20. Recorded in `PLAN.md` D30.

## 1. What is measured today

`ComboboxInput` handles `Escape` (through the dismiss stack) but not `Tab`.
`Tab` therefore falls through to whatever is outside the popup, and the popup
keeps painting. Measured on this host from `packages/components` (scratch probe,
since deleted), open popup, focus on `combobox-input`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/zz-probe.test.tsx
# standalone:  Tab -> focus stays Some("combobox-input"), popup still painted
# in a dialog: Tab -> focus Some("combobox-trigger"), popup still painted
```

The standalone line is partly a harness fact — the `TestRenderer` does not
traverse on a synthetic `"tab"` (plan 140), so the headless suite cannot show
where a live window would go. The component's contract cannot depend on that
traversal either way: the popup must close when the user tabs out, and focus must
continue in app order. Inside a dialog the measured result is plainly wrong: the
modal's Tab trap cannot see the input (it lives in the anchored popup), wraps to
the popup's own **trigger**, and leaves the popup open — one `Tab` moves
backwards and paints no progress.

No docs page promises `Tab` behaviour today, so this is a gap rather than a
broken promise; it is still the one keyboard exit the component lacks.

## 2. The decision

**`Tab` is a close-and-leave gesture, exactly as it is for a popover.** The input
offers the key to the root with a leave intent:

- close through the existing dismiss layer (so the event is claimed and an
  enclosing dialog's trap leaves it alone — plan 719);
- once the close is observed, focus the trigger and move one native step
  (`focusNext`/`focusPrevious`), so focus continues after/before the picker;
- a controlled close the caller refuses paints nothing differently and moves no
  focus (the plan-704 rule the combobox already follows).

This reuses the combobox's existing close-then-restore machinery: a `leave`
ref beside `restoreFocus`, both applied in the same `visibleOpen` transition
effect. No timer and no new hook.

## 3. Exact changes

### 3.1 `packages/components/src/combobox.tsx`

1. Import `isTab` beside `isDismiss` (line 81).
2. Add the intent to the root's context type (near `noteEscape`, line 130):

   ```ts
   /** Tab left the popup: close, then continue after/before the trigger. */
   readonly noteLeave: (direction: "next" | "previous") => void;
   ```

3. Beside `const restoreFocus = useRef(false);` (line 277):

   ```ts
   /** Where a `Tab` that closes the popup continues from the trigger. */
   const leave = useRef<"next" | "previous" | null>(null);
   ```

4. Extend the close effect (line ~383):

   ```ts
   useLayoutEffect(() => {
     if (wasOpen.current && !visibleOpen) {
       const instance = trigger.current;
       const direction = leave.current;
       if (instance !== null && direction !== null) {
         renderer?.focusElement?.(instance.id);
         if (direction === "next") renderer?.focusNext?.();
         else renderer?.focusPrevious?.();
       } else if (instance !== null && restoreFocus.current) {
         renderer?.focusElement?.(instance.id);
       }
     }
     if (!visibleOpen) {
       restoreFocus.current = false;
       leave.current = null;
     }
     wasOpen.current = visibleOpen;
   }, [visibleOpen, renderer]);
   ```

   A refused controlled close never flips `visibleOpen`, so nothing moves and
   both intents stay pending until a real close clears them.

5. Add to the context value beside `noteEscape` (line ~450):

   ```ts
   noteLeave: (direction) => {
     leave.current = direction;
   },
   ```

6. In `ComboboxInput`'s `onKeyDown`, after the Escape branch:

   ```ts
   if (isTab(event)) {
     // Close through the stack, then continue in app order from the trigger:
     // without this the popup stayed painted and the modal trap wrapped to the
     // trigger, moving focus backwards (plan 721).
     noteLeave(event.modifiers?.shift === true ? "previous" : "next");
     dismissTopLayer(event);
   }
   ```

### 3.2 `packages/components/src/behaviour/combobox.test.tsx`

Add a fixture with app controls on both sides, bare and in a dialog:

```tsx
/** The picker where a tab-out can be observed: controls on both sides. */
const Framed = ({ inDialog = false }: { readonly inDialog?: boolean }) => {
  const [dialogOpen, setDialogOpen] = useState(true);
  const body = (
    <>
      <Button testId="before">Before</Button>
      <Picker />
      <Button testId="after">After</Button>
    </>
  );
  return inDialog ? (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent label="Assign" testId="dialog">
        <DialogTitle>Assign</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", padding: 40 }}>
      {body}
    </div>
  );
};
```

Three cases:

1. **"closes on Tab and continues with the control after the trigger"** (fails at
   `HEAD`: the popup is still painted): open, `Tab`, expect
   `combobox-content` gone and focus `after`.
2. **"closes on Shift+Tab and continues with the control before the trigger"**
   (fails at `HEAD`): open, `Shift+Tab`, expect the popup gone and focus
   `before`.
3. **"closes on Tab inside a dialog without moving focus twice"** (fails at
   `HEAD` with `combobox-trigger` and the popup painted): open in the dialog,
   `Tab`, expect the popup gone, focus `after`, and the dialog still defined.

Update the file header's guarded-bug list with the stranding.

### 3.3 Docs, inventory and counts

- `packages/components/docs/combobox.mdx`: keyboard table gains
  `Tab` / `Shift+Tab` rows (closes and continues after/before the trigger, inside
  a dialog too); the Verification paragraph names the three cases and its count
  `59 tests` becomes `62 tests`.
- `COMPONENTS.md`, Comboboxes row: `59 native behaviour tests` → `62`, with a
  clause that Tab closes and continues in app order.
- `TODO.md`: tick a plan-721 row under the Tier 2 hardening list.
- `.agents/slop/plans/README.md`: add the row to the components table.
- `PLAN.md` D30: record `721` as claimed.

## 4. Test plan

- **Can the tests fail?** All three fail at `HEAD` for the measured reasons
  above; case 1 also fails if only the leave direction is dropped (focus returns
  to the trigger instead of `after`).
- **Both-direction proof:**
  (a) remove the `isTab` branch from `ComboboxInput`: cases 1 and 2 leave the
  popup painted and focus on the input, case 3 returns `combobox-trigger`;
  (b) keep the branch but ignore `leave` (focus the trigger only): cases 1 and 3
  fail with `combobox-trigger`;
  (c) remove the plan-719 modal gate: case 3 fails because the dialog trap moves
  focus a second time.
- **No regression:** the Escape close (returns focus to the trigger) and every
  other combobox case keep their result; the three new cases join the pass list.
- **Why not a unit test:** the defect is where focus lands after a real close in
  the native renderer; a fold cannot observe it.

## 5. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/combobox.test.tsx
# before: the three new cases fail (plus the recorded plan-540 combobox failures)
# after: 62 passed (62) — this suite has no recorded plan-540 failure
#   (measured 2026-10-20; the three new cases are among the passes)

Measured after the change (2026-10-20): `Combobox 62/62`, so the three-file run
with popover and dialog is `3 failed | 106 passed (109)` — the three failures are
the popover's recorded plan-540 placement cases.

The playground smoke registry is GPUix-primitives only (no Tier 2 scenario for
this component), so the native `TestRenderer` suite is the interaction evidence.
The modal path this change touches does have two scenarios, both re-run on
2026-10-20: `nub apps/playground/dist/smoke/run.js --only modal-focus-trap`
(1/1, `modal=verified`) and `--only overlay-dialog` (1/1, `overlay=verified`).

nub run check-types
nub run test        # unit suite, no native binding needed
```

From the repo root:

```sh
nub run check
nub run lint
nub run --filter @gpuixui/components test:behaviour
# the full native suite is the merge gate. HEAD after plan 719 is 915 tests;
# this plan takes it to 918. Read its own totals in the merge run.
```

## 6. STOP conditions

- Case 1 does not fail at `HEAD`: stop and re-measure; do not weaken it.
- `focusNext` from the trigger does not reach `after` on this renderer: stop and
  report — do not move focus by guessing an id.
- The close effect runs before the popup's controls unmount, so `focusNext`
  lands inside the popup: stop; the order is the contract, not a bug to hide with
  a timer.
- Escape or select changes its focus result: stop and report which case.
- The change needs a second close path or a new hook: stop; the existing
  `visibleOpen` transition is the one place focus is restored.

## 7. Acceptance

- `Tab` from an open popup closes it and continues with the control after the
  picker; `Shift+Tab` continues before it — standalone and inside a dialog.
- Escape still closes and returns focus to the trigger; a refused controlled
  close moves nothing.
- Combobox is 62 of 62 on this host; docs, `COMPONENTS.md`, `TODO.md`, the plan
  index and `PLAN.md` D30 agree.
