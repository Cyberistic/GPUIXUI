# Plan 824 — A press on the toast stack still dismisses a non-modal overlay beneath it

| | |
| --- | --- |
| Phase | F (Tier 2 hardening / composite integration) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 114, 115, 117, 366, 583, 669, 704, 816, 820, 823 |
| Status | done — measured defect, fix landed, both directions proven |
| Claimed number | `824` — checked across every worktree on 2026-10-21 (`823` was taken by `components`, `playground` and `tokens-theme`) |

## 0. Why this plan exists — the measured defect

Plan 820 made a press on a toast belong to the toast: a card registers its box as
a **press surface**, and `dismissTopLayer` returns before touching the layer stack
when a press lands inside one. That protected a dialog's work and the card's own
action. It also made that early return **unconditional**, so the press no longer
counts as an outside press for *any* open overlay.

The dropdown menu's page states the contract it breaks:

> A press outside every menu surface closes the whole menu. — `docs/dropdown-menu.mdx`

Measured in this worktree on 2026-10-21 with the real `TestRenderer`, at `HEAD`,
with a `DropdownMenu` open and a toast whose action is pressed:

```text
press the toast's "Undo" action with the Sort menu open
  onAction           1 call        // the toast's control ran
  sort-panel         still shown   // the menu stayed open
```

The action runs, which is correct; the menu is left painted and usable behind a
notification the user has moved on to. The same holds for a popover, a combobox
popup, a preview card, a navigation panel and the notification centre: all are
**non-modal**, and a press on the toast is an outside press for every one of
them.

A **modal** is different, and plan 820's measurement still stands: a dialog holds
unsaved work, and a notification must not destroy it. The existing composite case
`runs a toast action above an open dialog without dismissing it` pins that half
and must stay green.

## 1. The rule

**Ownership tells a press whose control to run; modality decides whether the
press also dismisses.** A painted surface that is not a layer (a toast card, or
the viewport's `children` slot) owns its press, so the control under the pointer
runs and the event is not claimed. Whether an open overlay also treats that press
as outside itself depends on the overlay:

- **non-modal** (`Popover`, `PreviewCard`, `NavigationMenu`, both menus, the
  Combobox popup, `NotificationCentre`, submenus) — it dismisses, exactly as for
  any other outside press, and claims the event so an enclosing reader skips it;
- **modal** (`Dialog`, `Drawer`, `ConfirmDialog`, the `CommandMenu` dialog) — it
  keeps its work: nothing is dismissed and nothing is claimed (plan 820).

The stack dismisses one layer per gesture, as it does for every other event
(plan 669): with a menu open inside a popover, one press on the toast closes the
menu; the next such press closes the popover.

## 2. Exact files to change

1. `packages/components/src/internal/dismiss-layer.ts`
   - add `modal?: boolean` to the layer, carried by an options object (§3.1),
   - keep `owns` and `depth` in the same object so call sites stay readable,
   - rewrite the head of `dismissTopLayer` (§3.2) and its JSDoc.
2. `packages/components/src/internal/modal.ts` — push with `modal: true` (§3.3).
3. Every other `pushDismissLayer` call site moves to the options object with no
   `modal` key: `popover.tsx`, `preview-card.tsx`, `navigation-menu.tsx`,
   `dropdown-menu.tsx`, `context-menu.tsx`, `combobox.tsx`,
   `notification-centre.tsx`, `menu/sub.tsx`.
4. `packages/components/src/internal/dismiss-layer.test.ts`
   - the four press-surface cases model a **dialog**, so they push with
     `{ modal: true }` and keep their assertions,
   - every positional `(handler, depth)` / `(handler, depth, owns)` call moves to
     the options object,
   - **one new case**: a non-modal layer under a registered press surface is
     dismissed by an owned press (§4 step 1),
   - header comment gains the plan-824 rule.
5. `packages/components/src/behaviour/composition.test.tsx` — one new case and
   its fixture (§3.4). The existing dialog case is the modal pin and is not
   edited.
6. `docs/component-api.md` §4's "Ownership is a property of the surface"
   paragraph — one sentence: the press is still an outside press for a
   non-modal overlay; only a modal keeps its work.
7. `packages/components/docs/toast.mdx` — the ownership/outside-press paragraph
   gains the same rule.
8. `COMPONENTS.md` — the Toasts row: one sentence after the ownership claim.
9. `TODO.md` — one ticked hardening item under Tier 2, and one **new unclaimed**
   row recording the next measured defect (§7).
10. `.agents/slop/plans/README.md` — the index row for `824`.
11. `PLAN.md` D30 — record `824` and the next free number.

Delete `packages/components/src/behaviour/zz-probe.test.tsx` (the measurement
fixture used to write this plan); it must not be committed.

## 3. Implementation

### 3.1 `internal/dismiss-layer.ts` — the layer shape

```ts
/** One open overlay: its handler, its nesting depth and its painted surface. */
interface DismissLayer {
  readonly onDismiss: DismissHandler;
  readonly depth: number;
  readonly owns: DismissOwnership | undefined;
  readonly modal: boolean;
}

export interface DismissLayerOptions {
  /** How deeply the layer is nested in other overlays. Default `0`. */
  readonly depth?: number;
  /** The surface the layer paints; a press inside it is not an outside press. */
  readonly owns?: DismissOwnership;
  /**
   * A modal keeps its work when a painted surface that is not a layer (a toast)
   * takes the press. Every other overlay treats that press as outside itself
   * and closes (plan 824).
   */
  readonly modal?: boolean;
}

export const pushDismissLayer = (
  onDismiss: DismissHandler,
  { depth = 0, owns, modal = false }: DismissLayerOptions = {},
): (() => void) => {
  layers = Arr.append(layers, { onDismiss, depth, owns, modal });
  return () => {
    layers = Arr.filter(layers, (layer) => layer.onDismiss !== onDismiss);
  };
};
```

### 3.2 `internal/dismiss-layer.ts` — the press rule

```ts
export const dismissTopLayer = (event: EventPayload): boolean => {
  if (isEventClaimed(event)) return false;
  // A surface that is not a layer (a toast card, the stack's own slot) owns the
  // press, so the control under the pointer runs either way. Whether an open
  // overlay also dismisses depends on whether it is modal (plan 824).
  const ownedBySurface = Arr.some(pressSurfaces, (owns) => owns(event));
  const topmost = Arr.reduce(/* unchanged */);
  return Option.match(topmost, {
    onNone: () => false,
    onSome: (layer) => {
      if (layer.owns?.(event) === true) return false;
      // A modal keeps its work behind a notification; a non-modal overlay is
      // dismissed exactly like any other outside press, and claims the event.
      if (layer.modal && ownedBySurface) return false;
      claimEvent(event);
      layer.onDismiss(event);
      return true;
    },
  });
};
```

No other line changes in this module. `registerPressSurface`, `hasDeeperLayer`
and `dismissLayerCount` are untouched.

### 3.3 `internal/modal.ts`

```ts
return pushDismissLayer(() => dismiss.current(), {
  depth,
  owns: ownsSurface(renderer, () => surfaceId.current),
  modal: true,
});
```

Every other call site keeps its current three arguments, moved into the object:

```ts
return pushDismissLayer(
  (event) => { /* unchanged handler */ },
  { depth, owns: ownsSurface(renderer, () => surface.current?.id) },
);
```

### 3.4 `composition.test.tsx`

Fixture next to the toast-over-dialog pair:

```tsx
/** A menu open over a toast whose action the user presses. */
const ToastUnderMenu = ({ onAction }: { readonly onAction: () => void }) => {
  const toast = useToast();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 1200, height: 760 }}>
      <Button
        testId="raise"
        onClick={() =>
          toast.push(
            { title: "Saved", tone: "success", action: { label: "Undo" } },
            { onAction },
          )
        }
      >
        Raise
      </Button>
      <ToastViewport />
      <DropdownMenu>
        <DropdownMenuTrigger testId="sort-trigger">Sort</DropdownMenuTrigger>
        <DropdownMenuContent testId="sort-panel">
          <DropdownMenuItem testId="sort-name">Name</DropdownMenuItem>
          <DropdownMenuItem testId="sort-date">Date</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
```

Wrap it in a `ToastProvider` the way the existing pages are. The case:

```tsx
it("closes a menu from a press on the toast stack, and still runs the toast's action", async () => {
  const onAction = vi.fn();
  const scene = renderComponent(<ToastUnderMenuPage onAction={onAction} />);
  clickCentreOf(scene, "raise");
  await settle();
  finishMotion(scene, 500);
  clickCentreOf(scene, "sort-trigger");
  finishMotion(scene);
  expect(isShown(scene, "sort-panel")).toBe(true);

  clickCentreOf(scene, "toast-1-action");
  await settle();
  finishMotion(scene, 500);

  expect(onAction).toHaveBeenCalledTimes(1);
  expect(isShown(scene, "sort-panel")).toBe(false);

  scene.unmount();
});
```

The toast must be raised **before** the menu opens, so the menu's layer is the
top one when the press arrives.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components/packages/components`
(`nub exec vitest …`; the root `--filter` form is equivalent).

1. Before any source change, add only the new unit case in
   `dismiss-layer.test.ts`:
   `nub exec vitest run src/internal/dismiss-layer.test.ts`
   → **expected:** 1 failed — `dismissTopLayer(claimed press)` returns `false`
   and the non-modal layer is never called. Record the failure text.
2. Before any source change, add the composition fixture and case:
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx`
   → **expected:** 1 failed on `expect(isShown(scene, "sort-panel")).toBe(false)`
   (`expected true to be false`), with `onAction` already `1`. This is the
   measured defect in §0.
3. Apply §3.1–§3.3:
   - `nub exec vitest run src/internal/dismiss-layer.test.ts` → **all pass**;
   - `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx`
     → **11/11 pass**.
4. Prove both directions. Replace `if (layer.modal && ownedBySurface)` with the
   old unconditional `if (ownedBySurface)`:
   - the unit suite → exactly the new non-modal case fails;
   - the composition suite → exactly the new menu case fails, and
     `runs a toast action above an open dialog without dismissing it` still
     passes. Restore the fix.
5. Confirm the modal half is still pinned:
   - `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/toast.test.tsx`
     → **28/28 pass**;
   - the dialog, drawer and menu suites are unchanged:
     `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/dialog.test.tsx src/behaviour/drawer.test.tsx src/behaviour/dropdown-menu.test.tsx src/behaviour/context-menu.test.tsx`
     → the same failure set as before the change (the recorded plan-540
     position/focus classes), no new case.
6. `nub exec vitest run` → **48 files / 521 tests pass** (520 + the one new unit
   case).
7. From the repo root: `nub run check`, `nub run lint`, `nub run test` →
   **all exit 0**.
8. Scoped smoke, one id per run (this build's CLI keeps only the last `--only`):
   `nub apps/playground/dist/smoke/run.js --only overlay-dialog` and
   `nub apps/playground/dist/smoke/run.js --only modal-focus-trap`
   → **both green**. Record the ids and the totals. (The registry has no
   toast/menu scenario; the `TestRenderer` suites above are the native evidence.)

**STOP conditions.** Stop and report instead of improvising if:

- the toast action stops running after the fix (the dismissal claims the event
  before the click — the press and the click must stay separate gestures);
- the existing dialog composite case goes red, because then the modal flag is not
  reaching `pushDismissLayer` from `internal/modal.ts`;
- a position/focus case fails that the baseline does not (diff the failure list
  against the plan-823 run);
- the options-object refactor changes any other dismiss behaviour (Escape, the
  own-trigger press, nesting depth), because that would mean a call site lost an
  argument in the move.

## 5. Test plan — what each case can catch

| Case | Guards |
| --- | --- |
| unit: non-modal layer is dismissed by an owned press | the unconditional early return (this defect), at the rule's own level |
| unit: four existing press-surface cases with `modal: true` | the modal half: a dialog must not close under a toast |
| composition: menu closes, toast action runs | the defect through real hit-testing, and that claiming does not swallow the click |
| composition: toast action above a dialog keeps it open (existing) | the plan-820 rule surviving the change |
| unit: own-surface and out-of-surface presses (existing) | `owns` precedence is unchanged |
| unit: nesting/depth/claim cases (existing) | the options-object refactor moved no argument |

## 6. Acceptance criteria

- Both new cases fail at `HEAD` (or with the condition reverted) and pass after;
  the dialog pin passes both ways.
- `check`, `lint`, `test` exit 0; the unit suite is 521 tests in 48 files; the
  composition suite is 11/11.
- `docs/component-api.md`, `docs/toast.mdx`, `COMPONENTS.md`, `TODO.md`, the plan
  index and `PLAN.md` D30 state the rule.
- The probe file is deleted; `git status` shows only the intended files.
- The two smoke ids are green and recorded.

## 7. Still open — the next measured defect (record in `TODO.md`, do not fix here)

A probe of the same composition found a second defect, recorded as its own
unclaimed task:

> **A dialog opened from a menu row loses the keyboard when it closes.**
> Measured 2026-10-21: `DropdownMenuItem onSelect` opens a `Dialog`; on Escape the
> dialog closes and `getFocusedElementId()` is `null`. `useModalFocus` captures
> the opener at the surface's first render (plan 638), which is the menu **row**
> — the row unmounts with the menu, so the restore check finds no bounds and a
> root dialog has no enclosing surface to fall back to (plan 730). The natural
> target is the menu trigger, which the menu returns to on `close("activate")` in
> a layout effect that runs after the dialog has already captured. A fix needs a
> decision: a successor mark written by the row before `onSelect`, or a capture
> that can resolve a dead opener. Do not guess one inside plan 824.

## 8. Outcome (2026-10-21)

- **Measured at `HEAD`.** `composition.test.tsx`: 1 failed / 10 passed — the new
  case failed on `expect(isShown(scene, "sort-panel")).toBe(false)` with
  `expected true to be false`, and `onAction` was already `1`. The unit suite:
  1 failed / 17 passed — `dismissTopLayer` returned `false` for an owned press and
  the non-modal layer was never called.
- **After the fix.** The unit suite is 18/18 and `composition.test.tsx` is 11/11.
- **Both directions proven.** Replacing the condition with the old unconditional
  `if (ownedBySurface) return false` fails exactly the new unit case (17/18) and
  the new composition case (10/11), with the dialog pin still green. Removing
  `modal: true` from `internal/modal.ts` fails 2 of 11 — the toast action over a
  dialog and the stack slot over a dialog — so the modal half is genuinely
  pinned, not incidental.
- **No regressions.** Toast 28/28, Dialog 21/21, Combobox 70/70,
  Navigation menu 34/34 and Notification centre 33/33 are green;
  Dropdown menu 63 (2 failed), Context menu 25 (1), Drawer 18 (1),
  Popover 30 (3) and Preview card 21 (7) fail only the recorded plan-540
  position/box cases (centred surface, right-edge submenu, drawer width, popover
  placement), which are unchanged from the baseline.
- **Gates.** `nub run check`, `nub run lint` and `nub run test` exit 0; the unit
  suite is 521 tests in 48 files; the whole workspace test run is green
  (tokens 196, primitives 282, tw 103, playground 20, testing 19, icons 19,
  docs 7, components 521).
- **Scoped smoke.** `overlay-dialog` and `modal-focus-trap` green,
  `1/1` each (run separately — this build's CLI keeps only the last `--only`).
  The registry has no toast or menu scenario; the `TestRenderer` suites are the
  native evidence.
- `docs/component-api.md`, `docs/toast.mdx`, `COMPONENTS.md`, `TODO.md`, the plan
  index and `PLAN.md` D30 state the rule; the probe file is deleted.
