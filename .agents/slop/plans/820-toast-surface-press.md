# Plan 820 — A press on a toast belongs to the toast, not to the overlay beneath it

| | |
| --- | --- |
| Phase | F (Tier 2 hardening / composite integration) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 115, 117, 123, 124, 370, 548, 592, 669, 704, 738, 743, 770, 816 |
| Status | **planned** |
| Claimed number | `820` — `816` is this workstream's last; `817`–`819` are `tokens-theme`'s and the playground's, checked across every worktree on 2026-10-21 |

## 0. Why this plan exists — the measured defect

Plan 816 generalised the dismiss stack so a press inside a **nested** overlay
surface never dismisses the overlay that encloses it. The toast viewport is the
one overlay that is not nested: it is the app root's last child (paint order
means it floats above everything) and it pushes no dismiss layer, because Escape
must not close a toast. Its cards are therefore invisible to the ownership rule.

A toast raised **from inside an open dialog** — the ordinary "could not save,
retry" shape — is a card painted outside the dialog's box. `@gpuix/react@0.10.0`
reports `mouseDownOutside` by bounds, so pressing the card's own action reaches
the dialog's outside handler and `dismissTopLayer` closes the dialog on mouse
**down**: the action never runs, the dialog is gone, the user's focus is nowhere.

Measured in this worktree on 2026-10-21 with the real `TestRenderer`, at `HEAD`,
with a `Dialog open` and a toast pushed from a button in its content:

```text
before the press:  toast-1 present, dialog present
press the card's "Retry" action
  onAction calls    0
  onOpenChange      [[false]]        // the dialog closed
  dialog painted    false
  toast painted     true             // the card is still there, its action dead
  focus             Option.none()
```

The same fixture without a dialog runs the action once and dismisses the card
(`toast.test.tsx`, "runs an action once and dismisses its toast"). The defect is
the composition, not the toast itself.

### 0.1 The rule

**A painted overlay surface may register itself as owning presses, whether or not
it is a dismiss layer.** The dismiss stack refuses a press that lands inside any
registered surface, without claiming the event, so the release still reaches the
control under the pointer and the enclosing overlay stays open.

The toast card is such a surface. A press on the card — its action or its dismiss
control — belongs to the toast: the control runs and the dialog under it is
untouched. A press anywhere else still closes the topmost dismiss layer exactly
as before, and Escape is untouched (a toast registers no layer, so it never
consumes a key).

This is plan 816's rule with the nesting requirement removed: ownership is a
property of the *surface*, not of the stack position.

## 1. Exact files to change

1. `packages/components/src/internal/dismiss-layer.ts` — `registerPressSurface`
   and the registry check in `dismissTopLayer`.
2. `packages/components/src/internal/dismiss-layer.test.ts` — three unit cases.
3. `packages/components/src/toast/viewport.tsx` — each `ToastCard` registers its
   own box.
4. `packages/components/src/behaviour/composition.test.tsx` — the regression case
   (a toast action over an open dialog) and the pin (a press elsewhere still
   closes the dialog with a toast up).
5. `packages/components/docs/toast.mdx` — one sentence in the limitations/behaviour
   section naming the rule and the plan.
6. `docs/component-api.md` — one sentence in the dismiss-stack section.
7. `COMPONENTS.md` — the Toasts row (append to the limits cell).
8. `TODO.md` — a ticked hardening item under Tier 2.
9. `.agents/slop/plans/README.md` — the index row for `820`.
10. `PLAN.md` D30 — record `820`, and `821` as the next free number.

Delete `packages/components/src/behaviour/zz-toast-dialog-probe.test.tsx` (the
measurement fixture used to write this plan); it must not be committed.

## 2. Implementation

### 2.1 `internal/dismiss-layer.ts`

```ts
/**
 * Painted overlay surfaces that are not dismiss layers. A toast card floats above
 * the app but Escape must not close it, so it registers its box instead of a
 * layer; a press on it belongs to it, never to the overlay beneath (plan 820).
 */
let pressSurfaces: ReadonlyArray<DismissOwnership> = [];

/** Register a surface that owns presses. Returns the removal function. */
export const registerPressSurface = (owns: DismissOwnership): (() => void) => {
	pressSurfaces = Arr.append(pressSurfaces, owns);
	return () => {
		pressSurfaces = Arr.filter(pressSurfaces, (candidate) => candidate !== owns);
	};
};
```

and in `dismissTopLayer`, immediately after the claim check:

```ts
	// A press on a painted surface that is not a layer (a toast card) belongs to
	// that surface: the control under the pointer runs and nothing is dismissed.
	if (Arr.some(pressSurfaces, (owns) => owns(event))) return false;
```

No claim here: the release must reach the control, and an enclosing handler in
the same task must not read the press as consumed.

### 2.2 `toast/viewport.tsx`

In `ToastCard`: `const renderer = useGpuix().renderer;`, a
`const surface = useRef<PublicInstance | null>(null);`, a registration effect

```ts
	useEffect(() => registerPressSurface(ownsSurface(renderer, () => surface.current?.id)), [renderer]);
```

and `ref={surface}` on the outer card `div` (`role="status"`). `useGpuix` is
already imported; `ownsSurface` comes from `../internal/pointer.js`; the
registration reads the id at event time, because the card's host id is assigned
after the effect has run.

`ToastCard` is per card, so two cards register two boxes and a press on either
is owned by that card only.

### 2.3 The composite cases

In `src/behaviour/composition.test.tsx`, add a fixture `ToastOverDialog`:

- a controlled `Dialog open` with `DialogContent label="Editor" testId="editor"`;
- inside it a `Button testId="fail"` that pushes
  `{ title: "Could not save", tone: "danger", action: { label: "Retry" } }` with
  `{ onAction }`;
- a sibling `Button testId="outside"` (app control outside the dialog);
- `<ToastViewport />` as the last child, inside the existing `ToastProvider`.

Cases:

1. **runs a toast action over the open dialog** — press `fail`, drain the store
   (`settle` helper: three `await Promise.resolve()`), assert `toast-1` and
   `editor` are both painted; press `toast-1-action`; `onAction` ran once, the
   card leaves after its exit (`finishMotion(scene, 500)`), and `editor` is
   still painted. **Fails at `HEAD`** (0 calls, dialog closed).
2. **a press outside still closes the dialog with a toast up** — press `fail`,
   settle, assert the card is painted; press `outside`; `finishMotion`; the
   dialog is gone and the card is still painted (the toast is independent of the
   dialog). This pins that ownership is surface-scoped, not a global
   press-immunity.

Use the existing `clickCentreOf`, `finishMotion`, `isShown` helpers.

### 2.4 Unit cases in `internal/dismiss-layer.test.ts`

No renderer; ownership is a plain predicate. After each case, remove the
registration (the registry is module-level and shared across a file).

1. a registered surface whose `owns` is `true` makes `dismissTopLayer` return
   `false`, runs no handler and claims nothing (the next reader still sees a live
   event);
2. the same registration whose `owns` is `false` does not protect the layer:
   the handler runs once;
3. the removal function unregisters: after it, a press on that box no longer
   protects a layer.

## 3. Test plan

From `packages/components` (the worktree root is the repo root):

```sh
# 0. Measurement, at HEAD (before the source change): the new composite case 1
#    fails with 0 action calls and a closed dialog; case 2 passes.
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx
# EXPECT: 7 passed / 1 failed (the toast-action case).

# 1. After the source change: 8/8.
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx
# EXPECT: 8 passed.

# 2. The stack's own suite.
nub exec vitest run --config vitest.behaviour.config.ts src/internal/dismiss-layer.test.ts
# EXPECT: the existing cases plus 3 new ones pass.

# 3. Toast, because the card's host now carries a ref and a registration.
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/toast.test.tsx
# EXPECT: 28 passed (unchanged).

# 4. Every suite that pushes a dismiss layer (the registry is consulted on every
#    outside press).
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/dialog.test.tsx src/behaviour/drawer.test.tsx \
  src/behaviour/confirm-dialog.test.tsx src/behaviour/popover.test.tsx \
  src/behaviour/preview-card.test.tsx src/behaviour/notification-centre.test.tsx \
  src/behaviour/dropdown-menu.test.tsx src/behaviour/context-menu.test.tsx \
  src/behaviour/navigation-menu.test.tsx src/behaviour/combobox.test.tsx \
  src/behaviour/command-menu.test.tsx src/behaviour/date-picker.test.tsx
# EXPECT: the recorded plan-540 failures stay exactly the same classes and no
# other case changes verdict.

# 5. Unit suite (the new registry cases).
nub run --filter @gpuixui/components test
# EXPECT: exit 0, unit count measured this turn + 3.

# 6. End-of-task: the full native suite (a cross-cutting rule).
nub run --filter @gpuixui/components test:behaviour
# EXPECT: the plan-816 baseline (1047 passed / 20 failed of 1067) plus this plan's
# passing cases, with the same 20 recorded failures; record the totals.

# 7. Headless smoke (the dismiss stack and overlays).
nub apps/playground/dist/smoke/run.js --only overlay-dialog --only modal-focus-trap
# EXPECT: both green.

# 8. Gates.
nub run check && nub run lint && nub run test
# EXPECT: all exit 0.
```

Both-direction proof: composite case 1 fails on `HEAD` (§0) and passes after
§2.1–§2.2; reverting only `internal/dismiss-layer.ts` restores the failure, and
reverting only the toast registration also restores it. Record all three runs.

## 4. STOP conditions

- Composite case 1 passes at `HEAD`. Stop and re-measure: the premise in §0 no
  longer holds.
- Composite case 2 stops closing the dialog. Stop: the registry has become a
  global press shield instead of a surface rule.
- Escape anywhere changes verdict, or a toast starts consuming keys. Stop: the
  surface registry must never participate in key handling.
- An existing outside-press case in the suites of step 4 changes verdict. Stop
  and name it: the registry is meant to skip a dismissal only when the point is
  inside a registered card.
- The card's host id is not readable at event time (no `ref`/`id` on a
  `role="status"` div). Stop and record it; do not key ownership on the painted
  content bounds of a child.
- A fix needs a new dependency or a change outside `packages/components`,
  `docs/component-api.md`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan
  index. Stop.
- `820` is taken by another worktree before the plan is committed. Renumber to
  the next free number, rename the file, update the index and D30.

## 5. Docs and inventory

- `docs/toast.mdx`: in "Accessibility and limitations", state that a card is a
  painted surface: a press on its action or dismiss control belongs to the toast
  and never dismisses an overlay beneath it (plan 820), while a press elsewhere
  still closes that overlay.
- `docs/component-api.md`: in the dismiss-stack section, add the surface
  registry: a non-dismiss overlay (a toast card) registers its box, and a press
  inside it is never an outside press.
- `COMPONENTS.md` Toasts row: append the sentence above. No other Tier 2 row
  changes; a toast is the only non-dismiss surface.
- `TODO.md`: a ticked hardening item under Tier 2 with the measurement.
- No component's stated native-test count changes: the two cases live in
  `composition.test.tsx`, which is not any record's `testFile`. If
  `inventory.test.ts` fails, fix the page rather than weakening the check.

## 6. Acceptance

- A toast's action and dismiss controls work over an open dialog, and the dialog
  stays open with the user's work intact.
- A press outside both still closes the topmost dismiss layer, and Escape is
  unchanged.
- Composite case 1 fails at `HEAD` and passes after; the unit cases fail without
  the registry and pass with it; the recorded plan-540 failures are unchanged.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the scoped smoke
  scenarios are green.
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the plan index agree.
- Committed on `agent/components` and pushed.

## 7. Results

<!-- Filled in when the plan lands. -->
