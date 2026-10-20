# 770 — A dismissed toast hands focus to the next card

| Field | Value |
| ----- | ----- |
| Workstream | components (Tier 2 composition and feedback) |
| Phase | F — integration and polish |
| Depends on | 110, 115, 117, 123, 124, 322, 370, 516, 522, 525, 597, 677, 738, 743, 769 |
| Status | pending |
| Claimed number | `770` — the first free number across every worktree at claim time (`769` is this workstream's; checked in the shared checkout and every `workspaces/*` tree) |

## 1. The bug

A toast card's controls dismiss the card they live on. `dismiss(id)` drops the
toast from the store, `AnimatePresence` keeps the card painted for its 500 ms
exit (plan 525), and the card — with the focused control — then unmounts. Focus
is left on an element that no longer exists, **while the other cards are still on
screen**.

Measured 2026-10-20 in the real `TestRenderer` (scratch probe
`src/behaviour/zz-probe.test.tsx`, two cards, `defaultDuration` infinite):

```
DISMISS CONTROLS 2                       # both cards' controls answer to one testId
FOCUS BEFORE      { _id: 'Option', _tag: 'Some', value: 'toast-dismiss' }
FOCUS AFTER REQUEST { _id: 'Option', _tag: 'Some', value: 'toast-dismiss' }
FOCUS AFTER EXIT  { _id: 'Option', _tag: 'None' }
TEXT [ 'Push first', 'Push second', 'Elsewhere', 'Second' ]   # card 2 is still painted
```

Two defects in one measurement:

1. **Focus is dropped** although a live card remains: a keyboard user who
   dismisses one notification is out of the tab order entirely.
2. **Every card's controls share `testId="toast-dismiss"` / `"toast-action"`**,
   so neither a consumer's harness nor this suite can address one card's control
   — the same defect plan 675 fixed for `AlertDismiss` and plan 381 for the tag
   chip's removal control. The handover needs per-card identity anyway.

This continues the focus-continuity family: a removed `List` row hands focus to
the live tab stop (plan 708), a removed tab hands focus on (plans 712/646), a
removed notification row reveals the next (plan 746), and a control that
unmounts with its token/binding hands focus to its group's surviving stop (plan
769). A toast stack is a group whose rows own a control each.

## 2. The rule

**Dismissing a card from one of its own controls hands focus to the next live
card's dismiss control; with no other card, focus is left alone.** "Next" is the
card below it in the stack (the following entry in the queue), else the card
above; the queue is the caller's push order, oldest first.

- `ToastCard` receives `focusNeighbour: () => void` from the viewport, so the
  card does not need to know the queue.
- The viewport keeps a registry of each live card's dismiss host id (a `Map`
  keyed by toast id, filled by the card's ref callback). It computes the
  neighbour from the queue it already renders, then calls
  `renderer.focusElement(host)`.
- Both controls use it: the dismiss control and the action control (the action
  runs `focusNeighbour()`, then the caller's handler, then `dismiss(id)`, so a
  handler that opens a dialog still ends up owning focus).
- Per-card ids: `testId={`toast-${toast.id}-dismiss`}` and
  `toast-${toast.id}-action`. The card surface stays `toast-${toast.id}`, the
  animated wrapper `toast-${toast.id}-surface` (plan 597).

No last card → nothing to focus. A toast has no trigger to return to (it is
pushed programmatically), so that case is documented as a limitation rather than
invented: the viewport does not remember "what had focus before the toast".

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/toast/viewport.tsx` | The dismiss-host registry, the neighbour rule, both per-card ids, both controls calling the handover |
| `packages/components/src/behaviour/toast.test.tsx` | 4 native cases (24 → 28), the existing `toast-dismiss` / `toast-action` handles renamed per card, the header's bug list |
| `packages/components/src/behaviour/motion-surface.test.tsx` | Its one `toast-dismiss` handle renamed |
| `packages/components/docs/toast.mdx` | The per-card control ids, the handover rule, the limitation, the verification count |
| `COMPONENTS.md` | Toasts / notifications row: the rule and the count |
| `.agents/slop/plans/README.md` | Index this plan |
| `PLAN.md` | Append `770` to the D30 overflow list |
| `TODO.md` | Tick the hardening line under the Tier 2 hardening list |

No public prop change (the ids are host `testId`s the component already owned), no
dependency, no other package. `examples/toast.example.tsx` already pushes two
toasts, so it exercises the rule without an edit.

## 4. Test plan

### Native (`src/behaviour/toast.test.tsx`)

Each case states the bug it guards:

1. **"names each card's controls after the card"** — push a plain and an action
   toast, assert `toast-1-dismiss`, `toast-2-dismiss` and the action card's
   `toast-<id>-action` exist and that no two controls share one `testId`.
   **Fails at `HEAD`** (the per-card ids do not exist).
2. **"hands focus to the next card when a dismiss control removes its card"** —
   two cards, take both dismiss hosts with
   `findByType("div").filter(testId === "toast-dismiss")`, focus the first, press
   `Enter`, run the 500 ms exit, and assert `getFocusedElementId()` is the
   **second** card's dismiss host. **Fails at `HEAD`** (`null` after the exit).
   Written against host ids so the case fails on the old source for the focus
   reason, not for the id rename.
3. **"hands focus to the card above when the last card is dismissed"** — three
   cards, dismiss the last, assert focus is on the middle card's dismiss control
   after the exit. **Fails at `HEAD`.**
4. **"hands focus to the neighbouring card when an action removes its card"** —
   an action toast below a plain card, press the action, assert the action ran,
   the card is gone after its exit, and focus is on the plain card's dismiss
   control. **Fails at `HEAD`.**
5. The existing cases are the pins: the auto-dismiss hold (plan 743) must still
   hold while focus is on a card's control, and `dismisses only the toast whose
   control was pressed` must keep dismissing exactly one card now that both are
   individually addressable.

### Commands and expected results

```sh
# 1. Prove the new native cases fail on the old source
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/toast.test.tsx src/behaviour/motion-surface.test.tsx
# EXPECT: the four new cases fail (case 1 on the missing ids, 2–4 on focus);
# every existing card case passes on the old ids it uses at HEAD.

# 2. After the fix
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/toast.test.tsx src/behaviour/motion-surface.test.tsx
# EXPECT: 28 + motion-surface's cases pass, no plan-540 class in these files.

# 3. Pure suite (inventory counts)
cd ../../ && nub run --filter @gpuixui/components test
# EXPECT: exit 0, 495 tests in 47 files.

# 4. End-of-task native run
nub run --filter @gpuixui/components test:behaviour
# EXPECT: 4 more passing than this turn's baseline (966 passed / 20 failed of
# 986), the same 20 recorded plan-540 failures. Record the exact totals.

# 5. Gates
nub run check && nub run lint && nub run test
# EXPECT: all exit 0.
```

Delete `src/behaviour/zz-probe.test.tsx` before the first commit.

## 5. STOP conditions

- Any of the four new cases passes at `HEAD`. Stop and re-measure.
- Focus lands on the dismissed card's own control (the exit ghost still holds
  the host briefly). Stop: the target is the neighbour.
- Focus lands on a neighbour that is itself exiting, or on a host that has gone.
  Stop: look the neighbour's dismiss host up in the registry, never a stored id.
- The action's caller handler loses focus to the neighbour after it opened a
  dialog. Stop: the handover runs first, the handler second.
- Any existing toast or motion-surface case changes for a reason other than the
  renamed handles, or a full-suite failure appears outside the recorded plan-540
  classes. Stop and record it.
- `770` is taken by another worktree before the plan is committed. Renumber to
  the next free number, rename the file, and update the index, D30 and this
  header.

## 6. Acceptance criteria

- Dismissing a card from its dismiss control or its action hands focus to the
  next live card's dismiss control (below, else above); dismissing the only card
  leaves focus alone, and the docs state that.
- Every card's controls are individually addressable:
  `toast-<id>-dismiss`, `toast-<id>-action`.
- The four new native cases fail on the old source and pass after, and the
  existing hold and single-card dismissal cases stay green.
- `docs/toast.mdx`, `COMPONENTS.md` and the inventory agree with the suite's
  count; `inventory.test.ts` passes.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the full native
  suite has no failure outside the recorded plan-540 classes.
- The plan is indexed, `TODO.md` is ticked, and the work is committed on
  `agent/components` and pushed.
