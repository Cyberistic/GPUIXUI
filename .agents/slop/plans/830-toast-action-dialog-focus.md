# Plan 830 — A modal opened from a toast action returns focus where the toast was raised

| | |
| --- | --- |
| Phase | F (Tier 2 hardening / composite integration) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 115, 117, 370, 548, 592, 770, 816, 820, 823, 826, 827 |
| Status | done — measured defect, fix landed, both directions proven |
| Claimed number | `830` — `828` is tokens-theme (`828-row-mark-fills`) and `829` is the playground (`829-line-clamp-pixels`); every `830`–`839` was free across every worktree and `main` on 2026-10-21 |

## 0. Why this plan exists — the measured defect

The composite suite already proves that a toast action runs above a dialog and
that a modal opened from a menu row or a command palette returns the keyboard to
a live control (plans 816, 820, 823, 826, 827). It does not cover the one gesture
where the modal's opener is a **toast action**, which unmounts with its card in
the same commit.

Measured in this worktree on 2026-10-21 with the in-flight probe
(`src/behaviour/zz-probe.test.tsx`, deleted after the measurement), against
`HEAD` `4cbdf298`:

```text
click "raise"        → toast-1 painted, focused host id 2  ("raise")
click "toast-1-action" → dialog opens, the toast is dismissed
after Escape         → dialog false, focus None
after the 500 ms exit→ dialog false, focus None
focusNext()          → focus Some("raise")   // the only live candidate
```

`ToastCard`'s action handler runs `focusNeighbour(); onSelect(); dismiss(id)`.
With one card on screen `focusNeighbour` has no neighbour and moves nothing, so
`onSelect` opens the dialog while the **action** still holds native focus. The
dialog captures the action as its opener — the plan-638 capture. The card then
leaves, and when the dialog closes its opener no longer exists, there is no
enclosing surface, so `useModalFocus` hands focus nowhere. The keyboard user is
stranded on `None` until they press `Tab`.

The measured host ids across the probe's renders were: `raise` = 2, action = 13,
dismiss = 15, dialog surface = 25; the card's **first** render reported the
focused host `2`. That is the fact this plan builds on: a toast card can record
where the user was when the notification arrived.

## 1. The rule

**A toast control that opens a modal names where the toast was raised as its
successor before the modal captures it.**

- A card captures the renderer's focused host once, on its first render: the
  place the user was when the notification arrived. A toast pushed from a real
  control therefore records that control; a programmatic toast with no focus
  records `null` and changes nothing.
- The action control is a **vanishing opener**: it runs the caller's handler and
  then unmounts with its card. Before `onSelect()` it marks itself against the
  captured origin, through the shared focus-successor channel
  (`internal/focus-successor.ts`) that plans 826/827 already use.
- `useModalFocus` already substitutes a marked successor at capture, so the
  dialog's opener becomes the raising control and its close returns there. No
  modal code changes.
- The mark is written **only when focus is still on the action after
  `focusNeighbour()`**. With a second card, `focusNeighbour` focuses that card's
  dismiss control first, the dialog captures that live control, and the
  neighbour handover of plan 770 still wins.
- A plain last-card dismissal is unchanged: with no action and no modal, focus
  still ends on nothing, because a toast has no trigger to return to. The origin
  is only used when a modal captured the toast control.
- The successor store is **per renderer**, in effect: it is module state and
  native host ids restart with each renderer, so the behaviour harness forgets
  every mark in its teardown (the same place the event claim is crossed and the
  root is unmounted). Without that, a mark left by one scene makes the next
  scene's new case pass for the wrong reason — measured while proving this plan
  red (§7).

This is plan 826/827's rule applied one layer earlier: the element that opens
the modal is the element that knows where the keyboard came from.

## 2. Exact files to change

1. `packages/components/src/toast/viewport.tsx` — capture the origin on the
   card's first render and mark it on the action path (§3.1).
2. `packages/components/src/behaviour/composition.test.tsx` — the
   `DialogFromToast` fixture and its case (§3.2).
3. `packages/components/src/internal/focus-successor.ts` — export
   `clearFocusSuccessors` (§3.3), because native host ids restart with a renderer.
4. `packages/components/src/internal/focus-successor.test.ts` — one reset case,
   plus a `beforeEach` so the suite starts clean.
5. `packages/components/src/behaviour/setup.ts` — forget successors in the
   teardown, next to the unmount and the event-claim task crossing (§3.3).
6. `packages/components/docs/toast.mdx` — the Actions and accessibility
   paragraphs state the restore rule.
7. `docs/component-api.md` §2 — the opener paragraph gains the toast case.
8. `COMPONENTS.md` — the Toasts row.
9. `TODO.md` — add and tick the task under Tier 2 hardening.
10. `.agents/slop/plans/README.md` — the index row for `830`.
11. `PLAN.md` D30 — record `830` and the origin rule.

`internal/modal.ts`, the provider and the store are **not** changed: the
successor channel already exists and the origin is card-local state.

## 3. Implementation

### 3.1 `src/toast/viewport.tsx`

Imports: add `markFocusSuccessor` from `../internal/focus-successor.js`.

In `ToastCard`, `renderer` is already read (`const renderer = useGpuix().renderer`).
Move that line above the controls' state (it is currently just below the
`surface` ref) so the origin can be seeded, and add:

```tsx
// Where the user was when this notification arrived. A toast control that runs
// an action and unmounts with its card leaves the modal it opened without an
// opener; that modal returns here instead of to nothing (plan 830).
const [origin] = useState<number | null>(
  () => renderer?.getFocusedElementId?.() ?? null,
);
```

The action control's handler becomes:

```tsx
onClick={() => {
  focusNeighbour();
  // A neighbour that took focus is a live opener; keep it (plan 770). With no
  // neighbour the action itself will vanish with its card, so name the place
  // the user came from before the modal captures this control (plan 830).
  const leaving =
    actionHost !== null && renderer?.getFocusedElementId?.() === actionHost;
  if (
    leaving &&
    origin !== null &&
    origin !== actionHost &&
    renderer?.getElementBounds?.(origin) !== null
  ) {
    markFocusSuccessor(actionHost, origin);
  }
  onSelect();
  dismiss(toast.id);
}}
```

Nothing else in the card changes. The mark is a no-op when the action does not
open a modal: it is keyed by a host id that is gone, so no later modal can
capture it, and the store is bounded and consumed on read (plan 827).

### 3.2 `src/behaviour/composition.test.tsx`

Add next to `DialogFromCommand`:

```tsx
/** A toast action that opens a dialog: the action leaves with its card. */
const DialogFromToast = () => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 1200,
        height: 760,
      }}
    >
      <Button
        testId="raise"
        onClick={() =>
          toast.push(
            { title: "Saved", tone: "success", action: { label: "Undo" } },
            { onAction: () => setOpen(true) },
          )
        }
      >
        Raise
      </Button>
      {/* Before the dialog on purpose (plan 820 §7). */}
      <ToastViewport />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent label="Undo" testId="undo-dialog" size="sm">
          <DialogTitle>Undo</DialogTitle>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DialogFromToastPage = () => (
  <ToastProvider>
    <DialogFromToast />
  </ToastProvider>
);
```

The case, appended inside `describe("composition")`:

```tsx
it("returns focus to the toast's origin when its action's dialog closes", async () => {
  const scene = renderComponent(<DialogFromToastPage />);
  clickCentreOf(scene, "raise");
  await settle();
  finishMotion(scene, 500);
  expect(isShown(scene, "toast-1")).toBe(true);
  expect(focusedTestId(scene)).toEqual(Option.some("raise"));

  clickCentreOf(scene, "toast-1-action");
  await settle();
  finishMotion(scene, 500);
  expect(isShown(scene, "undo-dialog")).toBe(true);

  // A person dismisses the dialog in a later task than the toast's close.
  await nextTask();
  scene.renderer.simulateKeystrokes("escape");
  finishMotion(scene);

  expect(isShown(scene, "undo-dialog")).toBe(false);
  expect(focusedTestId(scene)).toEqual(Option.some("raise"));

  scene.unmount();
});
```

`settle`, `finishMotion`, `clickCentreOf`, `focusedTestId`, `isShown` and
`nextTask` are already imported. `ToastProvider`, `ToastViewport`, `useToast`
and `Button` are already imported. If the click on `raise` does not leave the
button focused on this host, record the measured id and assert the control the
probe reported — **do not weaken the assertion to “not `None`”**.

### 3.3 `src/internal/focus-successor.ts` and the behaviour teardown

The successor store is module state keyed by a native host id, and host ids
restart with a new renderer. Export a reset:

```ts
/**
 * Forget every mark. The behaviour harness calls this between tests: native host
 * ids restart with each renderer, so a mark left behind by one scene is readable
 * by a modal in the next (plan 830).
 */
export const clearFocusSuccessors = (): void => {
  successors = [];
};
```

`src/behaviour/setup.ts` calls it in the existing `afterEach`, after
`unmountComponentRoot()` and before the task crossing, and its header states why
next to the event-claim rule. `src/internal/focus-successor.test.ts` adds one
case (mark, reset, read → `None`) and a `beforeEach(clearFocusSuccessors)`.

This is harness isolation, not a production rule: one app window owns one
renderer, so ids cannot repeat inside it.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components/packages/components`.

1. Add the fixture and case **and** the teardown reset, then restore the old
   `viewport.tsx` only (keep the test, the reset and its case):
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx`
   → **expected:** 1 failed / 13 passed, the new case reporting
   `expected { _tag: 'None' } to deeply equal Some("raise")`. Record the exact
   text in §7. Without the reset the case **passes** at `HEAD` when the whole
   file runs, because a stale mark from an earlier scene is keyed by a host id
   the new renderer reuses — measured, and the reason §3.3 is part of the fix.
2. Apply §3.1 → the composition suite is **14/14**; the helper suite is **7/7**.
3. **Both directions**, restoring after each:
   - remove the `markFocusSuccessor` call → the new case fails with `None`;
   - mark `actionHost` as its own successor → the new case fails with `None`
     (the capture consumes the mark and stores the vanishing action);
   - drop the `origin` seed (always `null`) → the new case fails with `None`;
   - remove the teardown reset → the new case passes at `HEAD` with the whole
     file (the stale-mark path above), which is the defect the reset guards.
   The `leaving` condition itself is hygiene, not a separately observable rule:
   with a second card, `focusNeighbour` moves focus before the dialog captures,
   so the mark is never read and the neighbour wins regardless of where the mark
   is written. The two-card neighbour case in `toast.test.tsx` stays green and
   pins that handover.
4. The touched suites:
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/{composition,toast,dialog,confirm-dialog}.test.tsx`
   → composition 14/14, Toast **28/28**, Dialog 21/21, Confirmation dialog
   10/10. Any other failure must be one of the recorded plan-540 classes.
5. `nub exec vitest run` → **49 files / 528 tests** (one net helper case; the
   behaviour case lives in the behaviour suite).
6. From the repo root: `nub run check`, `nub run lint`, `nub run test` →
   **all exit 0**.
7. Scoped smoke from the repo root, one id per run:
   `nub apps/playground/dist/smoke/run.js --only overlay-dialog`,
   `--only modal-focus-trap` → **green**. No smoke scenario mounts a toast.
8. End-of-task, because this touches the toast stack and the shared dismiss
   layer: the full headless suite
   `nub apps/playground/dist/smoke/run.js` → **17/20**, the same three recorded
   binding failures (`focus-traversal`, `floating-placement`,
   `shell-navigation`). Any other failure stops the task.

**STOP conditions.** Stop and report instead of improvising if:

- the card's first render does **not** report the raising control as the focused
  host on this binding — then capture the origin at `ToastProvider.push` and
  expose it through the context instead; do not guess an id;
- the dialog captures the origin *directly* (focus has already moved) and the
  new case passes without the mark — then the measurement is wrong and the
  probe must be rerun against a clean `HEAD`;
- any existing toast focus case changes (the neighbour handover or the last-card
  no-focus rule), because the origin must not replace plan 770's neighbour;
- a mark is consumed by a modal that did not capture the action (a stale mark
  retargeted a later modal) **and it survives the §3.3 teardown reset**, because
  then the key or the consumption is wrong;
- the composition case only passes because the dialog never opened, or because
  focus never left `raise` before the click — assert `undo-dialog` is shown.

## 5. Test plan — what each case can catch

| Case | Guards |
| --- | --- |
| composition: a toast action's dialog returns to `raise` | the measured defect, through a real press and Escape |
| mutation: no mark | the successor being the whole fix |
| mutation: mark the action itself | the target being the origin, not the vanishing control |
| mutation: no origin | the origin being captured from the real focus, not invented |
| mutation: no teardown reset | a stale mark from an earlier scene retargeting a later modal |
| helper: a reset forgets every mark | the reset doing anything at all |
| Toast 28/28 | the plain dismiss, neighbour, hold, progress and placement rules are untouched |
| Dialog / Confirmation suites | the shared modal capture and restore are untouched |

## 6. Acceptance criteria

- The new composition case fails at `HEAD` with `None` and passes after; the
  three mark/origin mutations and the neighbour mutation each fail their case,
  and removing the teardown reset makes the case pass at `HEAD` again.
- `check`, `lint`, `test` exit 0; the unit suite is 49 files / 528 tests, the
  helper suite 7/7, the composition suite 14/14 and Toast 28/28.
- `docs/toast.mdx`, `docs/component-api.md` §2, `COMPONENTS.md`, `TODO.md`, the
  plan index and `PLAN.md` D30 state the origin rule and its limit: a modal
  returns to where the toast was raised; a plain last-card dismissal still
  leaves focus alone.
- The scoped smoke ids are green and recorded; the full headless suite is 17/20
  with only the three recorded binding failures.

## 7. Outcome (2026-10-21)

- **Measured at `HEAD` `4cbdf298`.** Alone, the new composition case failed with
  `expected { _id: 'Option', _tag: 'None' } to deeply equal
  { …, _tag: 'Some', value: 'raise' }`. The probe measured the card's first
  render with focused host `2` (`raise`), the action as host `13`, and the
  dialog capturing `13`; after Escape the focused host was `None` and
  `focusNext()` landed on `raise`, the recorded fallback candidate.
- **A stale mark made the case pass at `HEAD` when the whole file ran**: the
  successor store is module state and native host ids restart with each
  renderer, so a mark written by an earlier scene was consumed by this scene's
  capture. The helper now exports `clearFocusSuccessors`, the behaviour
  teardown calls it, and with the reset in place the case is **1 failed / 13
  passed at `HEAD`** and **14/14 after**. Removing the reset reproduces the
  spurious pass.
- **After the fix.** Composition **14/14**, Toast **28/28**, Dialog 21/21,
  Confirmation dialog 13/13; the four suites together 76/76.
- **Both directions proven.** Removing the `markFocusSuccessor` call fails the
  new case with `None`; marking the action as its own successor fails it with
  `None`; dropping the origin seed fails it with `None`. The `leaving` condition
  is hygiene: with a second card, `focusNeighbour` moves focus before the capture
  and the neighbour wins regardless (the existing two-card case pins it).
- **Gates.** `nub run check`, `nub run lint` and `nub run test` exit 0; unit
  suite **528 tests in 49 files**. Scoped smoke `overlay-dialog` 1/1 and
  `modal-focus-trap` 1/1 green; the full headless suite is **17/20** with the
  same three recorded binding failures (`focus-traversal`,
  `floating-placement`, `shell-navigation`).
- Docs, `docs/component-api.md` §2, `COMPONENTS.md`, `TODO.md`, the plan index
  and `PLAN.md` D30 synced.
