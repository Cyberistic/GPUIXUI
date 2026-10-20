# Plan 823 — A press on the toast stack's own control belongs to the stack

| | |
| --- | --- |
| Phase | F (Tier 2 hardening / composite integration) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 115, 117, 370, 548, 592, 597, 770, 816, 820 |
| Status | done — measured defect, fix landed, both directions proven |
| Claimed number | `823` — `821`/`822` are `tokens-theme`'s, checked across every worktree on 2026-10-21 |

## 0. Why this plan exists — the measured defect

Plan 820 made a press on a toast **card** belong to the toast: the card registers
its measured box as a press surface, and `dismissTopLayer` refuses a press inside
a registered surface without claiming it. That closed the "could not save →
retry" defect for cards.

The viewport has a second painted API that plan 820 did not register: its
**`children` slot**, documented as "an optional element before the toasts, e.g. a
'Dismiss all' action" (`docs/toast.mdx`, `ToastViewportProps.children`). The slot
is rendered inside the same deferred anchored layer at `priority: 2`, so it is
painted above a dialog's veil and receives the press — but it is not a press
surface, so the enclosing dialog's `mouseDownOutside` handler still treats the
press as outside and dismisses the dialog **on mouse down**.

Measured in this worktree on 2026-10-21 with the real `TestRenderer`, at `HEAD`,
with a `Dialog open` and a `<ToastViewport><Button>Dismiss all</Button></ToastViewport>`:

```text
press the slot's "Dismiss all"
  onDismissAll        [[]]          // the slot's own action ran
  onOpenChange        [[false]]     // the dialog beneath was dismissed anyway
  dialog painted      false
```

The user presses "Dismiss all" over a dialog and loses the dialog. This is plan
820's defect one surface short: ownership must cover every surface the stack
paints, not just the cards.

## 1. The rule

**The toast stack owns the presses on everything it paints.** Each card already
registers itself (plan 820). The viewport's `children` slot is the only other
thing the stack paints, so it registers its own measured box the same way. A
press inside that box runs the slot's control and leaves an overlay beneath open;
a press anywhere else still dismisses the topmost layer exactly as before.

Do **not** register the whole viewport group: it is a window-height flex column
with `gap`s and `pointerEvents: "none"`, so a press in the space between cards
passes through to the app behind it. Registering the group would make such a
press "inside the stack" and leave the dialog open although the user pressed the
app. The slot wrapper is content-sized, so its box is exactly the slot.

## 2. Exact files to change

1. `packages/components/src/toast/viewport.tsx`
   - add `slot` (a `useRef<PublicInstance | null>`),
   - register it through `registerPressSurface(ownsSurface(renderer, () => slot.current?.id))`
     while a `children` slot exists (the same shape `ToastCard` uses),
   - wrap the slot in a content-sized column with a `ref`, preserving the stack's
     cross-axis alignment and gap,
   - hoist the corner alignment expression into one `crossAlign` constant used by
     both the group and the wrapper,
   - append one limitation to `toastMeta.limitations` naming the slot rule.
2. `packages/components/src/behaviour/composition.test.tsx` — two cases: the
   slot action runs without dismissing the dialog; a press outside still closes
   it (pin).
3. `packages/components/docs/toast.mdx`
   - fix the stale anatomy sentence that still says "Render the viewport **last**
     in the app root" (plan 820 made paint order independent of tree order and
     measured that a viewport mounted after a dialog can be dropped by this
     binding — the same page already says to render it before the app's dialogs),
   - state that the viewport's own `children` control belongs to the stack.
4. `docs/component-api.md` — extend the "Ownership is a property of the surface"
   paragraph: the toast stack registers each card **and its own controls**.
5. `COMPONENTS.md` — the Toasts row: replace "render the viewport last in the app
   root" with the accurate mount rule, and add the slot ownership sentence.
6. `TODO.md` — one ticked hardening item under Tier 2.
7. `.agents/slop/plans/README.md` — the index row for `823`.
8. `PLAN.md` D30 — record `823` and the next free number `824`.

Delete `packages/components/src/behaviour/zz-toast-slot-probe.test.tsx` (the
measurement fixture used to write this plan); it must not be committed.

## 3. Implementation

### 3.1 `toast/viewport.tsx`

Near the top of `ToastViewport`, after `dismissHosts`:

```tsx
const slot = useRef<PublicInstance | null>(null);
const hasSlot = children !== undefined && children !== null;
// The stack's own controls are painted by the same anchored layer as its cards,
// so they own their presses too (plan 823). Read the host at event time: the
// wrapper mounts after this effect.
useEffect(() => {
  if (!hasSlot) return;
  return registerPressSurface(ownsSurface(renderer, () => slot.current?.id));
}, [hasSlot, renderer]);
```

Hoist the alignment once, next to the corner helpers' use:

```tsx
const crossAlign =
  position === "top-left" || position === "bottom-left" ? "flex-start" : "flex-end";
```

The group uses `alignItems: crossAlign`. In the body, replace the bare
`{children}` with:

```tsx
{hasSlot ? (
  <div
    ref={slot}
    style={{
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.md,
      alignItems: crossAlign,
      pointerEvents: "none",
    }}
  >
    {children}
  </div>
) : null}
```

Why this shape:

- `pointerEvents: "none"` keeps the wrapper transparent to hit-testing; a
  control inside restores `auto` for itself (the `Button` already does), exactly
  as a card does.
- `gap`/`alignItems` preserve the layout the slot's children had as direct flex
  items of the group.
- The wrapper is content-sized, so its measured box cannot cover the app behind
  the gaps between cards.

### 3.2 `composition.test.tsx`

Add a fixture next to `ToastOverDialog`:

```tsx
/** A dialog behind a toast stack that carries its own "dismiss all" control. */
const SlotOverDialog = ({ onDismissAll }: { readonly onDismissAll: () => void }) => {
  const toast = useToast();
  const [open, setOpen] = useState(true);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 1200, height: 760 }}>
      <Button testId="outside">Outside</Button>
      <ToastViewport>
        <Button
          testId="dismiss-all"
          onClick={() => {
            onDismissAll();
            toast.dismissAll();
          }}
        >
          Dismiss all
        </Button>
      </ToastViewport>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent label="Editor" testId="slot-editor" size="sm">
          <DialogTitle>Editor</DialogTitle>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

Wrap it in a `ToastProvider` the way the other pages are.

Case 1 (must be red at `HEAD`):

```tsx
it("runs the stack's own control without dismissing the dialog beneath", () => {
  const onDismissAll = vi.fn();
  const scene = renderComponent(<SlotOverDialogPage onDismissAll={onDismissAll} />);
  finishMotion(scene);
  expect(isShown(scene, "slot-editor")).toBe(true);

  clickCentreOf(scene, "dismiss-all");
  finishMotion(scene, 500);

  expect(onDismissAll).toHaveBeenCalledTimes(1);
  expect(isShown(scene, "slot-editor")).toBe(true);

  scene.unmount();
});
```

Case 2 (the pin — green both ways):

```tsx
it("still closes the dialog on a press outside the stack with a slot control up", () => {
  const onDismissAll = vi.fn();
  const scene = renderComponent(<SlotOverDialogPage onDismissAll={onDismissAll} />);
  finishMotion(scene);

  clickCentreOf(scene, "outside");
  finishMotion(scene, 500);

  expect(isShown(scene, "slot-editor")).toBe(false);
  expect(onDismissAll).not.toHaveBeenCalled();

  scene.unmount();
});
```

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

1. Before the fix, with only case 1 in the suite:
   `nub run --filter @gpuixui/components test:behaviour -- src/behaviour/composition.test.tsx`
   → **expected:** 1 failed (`slot-editor` gone / `onDismissAll` ran but the
   dialog dismissed). Record the failure text in the plan/TODO note.
2. Apply §3.1 and add case 1:
   same command → **expected:** 9/9 pass.
3. Add case 2: same command → **expected:** 10/10 pass, and case 2 also passes
   with §3.1 reverted (it is the pin that proves the fix does not cover the
   window).
4. Revert `viewport.tsx`'s registration only (`git stash` the one hunk or comment
   the effect out): same command → **expected:** exactly case 1 fails, case 2
   passes. Restore it.
5. `nub run --filter @gpuixui/components test:behaviour -- src/behaviour/toast.test.tsx`
   → **expected:** 28/28 pass (the stack layout and cards are unchanged).
6. `nub run --filter @gpuixui/components test` → **expected:** 48 files / 520
   tests pass, no new file.
7. `nub run check`, `nub run lint`, `nub run test` at the repo root → **expected:**
   all exit 0.
8. Scoped smoke (the same scenarios plan 820 used):
   `nub apps/playground/dist/smoke/run.js --only overlay-dialog --only modal-focus-trap`
   → **expected:** both scenario ids green. Record the exact ids run.

**STOP conditions.** Stop and report instead of improvising if:

- the slot control is not painted above the veil (case 1's press does not run
  `onDismissAll` at all), because that would mean the defect is in the anchored
  layer rather than the ownership registry;
- case 2 fails after the fix, because then the wrapper is covering the app and
  the content-sized wrapper assumption is wrong;
- the toast suite changes any assertion, because the stack's layout must be
  byte-for-byte equivalent for cards.

## 5. Test plan — what each case can catch

| Case | Guards |
| --- | --- |
| slot action keeps the dialog | a press surface that the stack paints but does not register (plan 820's class, second surface) |
| press outside still closes | an over-broad registration: a window-sized surface would leave every dialog unclosable |
| toast suite (28) | the wrapper must not change the stack's layout, stacking order, focus handover or exit |

Both new cases run in the real `TestRenderer` through hit testing
(`clickCentreOf`), not by calling a handler.

## 6. Acceptance criteria

- `composition.test.tsx` has both cases; case 1 fails at `HEAD` and passes after
  the fix, case 2 passes both ways.
- `docs/toast.mdx`, `docs/component-api.md`, `COMPONENTS.md`, `TODO.md`, the plan
  index and `PLAN.md` D30 state the slot rule and the corrected mount guidance.
- The probe file is deleted; `git status` shows only the intended files.
- `check`, `lint`, `test` exit 0; the scoped smoke ids are green.

## 7. Outcome (2026-10-21)

- Measured at `HEAD` with the probe: `onDismissAll [[]]`,
  `onOpenChange [[false]]`, `slot-editor` gone — the slot action ran and the
  dialog beneath was dismissed.
- With the registration, `composition.test.tsx` is 10/10; removing only the
  registration fails exactly the slot case (1 failed / 9 passed) and the
  outside-press pin stays green both ways.
- `toast.test.tsx` 28/28 (the wrapper did not change the stack's layout,
  stacking order, focus handover or exit); `examples` 1/1 (the example now uses
  the slot).
- `nub run check`, `nub run lint`, `nub run test` all exit 0; the unit suite is
  520 tests in 48 files.
- Scoped smoke: `overlay-dialog` and `modal-focus-trap` green (run separately:
  this build's CLI keeps only the last `--only`).
