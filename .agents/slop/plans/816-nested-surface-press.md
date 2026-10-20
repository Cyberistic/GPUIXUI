# Plan 816 — A press on a nested overlay's surface is not an outside press

| | |
| --- | --- |
| Phase | F (Tier 2 hardening / composite integration) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 114, 116, 117, 309, 320, 366, 389, 583, 587, 669, 719, 730, 732 |
| Status | **done** — every dismiss layer names its surface; the composite suite's four workflow cases were red at `HEAD` and 6/6 after |
| Claimed number | `816` — `813` is this workstream's last plan, `814`/`815` are `tokens-theme`'s; checked across every worktree on 2026-10-21 and recorded in `PLAN.md` D30 |

## 0. Why this plan exists — the measured defect

Tier 2 has per-component suites and an all-examples mount, but **no suite composes
the tier the way an app does**. MISSION.md's testing section requires
"integration tests for composites"; this is the first one, and it found a defect
that no per-component suite could see.

Measured in this worktree on 2026-10-21 with the real `TestRenderer`, at `HEAD`.
A picker inside an open `Dialog`:

```text
dialog bounds            { x: 425, y: 366, width: 478, height: 116 }   // ends at y 482
combobox popup bounds    { x: 430, y: 443, width: 346, height: 94 }    // ends at y 537
option "viewer" bounds   { x: 438, y: 501, width: 338, height: 28 }    // entirely below 482
press the option centre
  onValueChange calls    []                     // the choice is lost
  trigger text           "Select…"              // still nothing selected
  popup                  closed
  focus                  Option.none()          // the user's focus is gone
```

The same composition outside a dialog selects the value and returns focus to the
trigger (`focused = combobox-trigger`). Two sibling surfaces fail the same way:

```text
popover inside a dialog, panel below the dialog's box
  press a control in the panel → 0 presses, panel closed

dropdown menu inside a dialog, second row below the dialog's box
  press the row               → onSelect never ran, menu closed
```

### 0.1 The mechanism

`@gpuix/react@0.10.0` reports `mouseDownOutside` by **bounds**, not by tree: a
nested surface that paints beyond its ancestor's box is "outside" that ancestor.
An overlay nested in a modal therefore delivers an outside press to the modal's
`onMouseDownOutside`, which calls `dismissTopLayer`. The topmost layer is the
nested surface's own layer, so the **nested surface closes as if the user had
pressed elsewhere** — on mouse *down*, before the release that would have run the
row or button. The selection, the action and the focus are all lost.

Plan 389 fixed the menu-only version of this (a nested submenu's row was reported
as an outside press by its deeper layer) by testing every enclosing menu surface
inside the menu's own handler. This plan generalises the same idea to the dismiss
stack, which every overlay shares.

### 0.2 Why it is a library defect, not a test artefact

A combobox, popover or menu inside a dialog is the ordinary shape of a settings
workflow. The user cannot select a role, run a filter action or run a menu row in
any panel that hangs below the dialog's box. The press closes the panel with
nothing done and leaves focus on nothing.

## 1. The rule

**A dismiss layer may name the surface it paints, and a press inside that surface
never dismisses it.**

`dismissTopLayer` already picks the topmost layer; it now asks that layer whether
the event's point lies inside the layer's own surface. If it does, nothing is
dismissed (`false`): the press belongs to the surface, and whatever an enclosing
overlay reported about its own bounds is irrelevant. The enclosing overlay stays
open too, because nothing was dismissed.

The rule is uniform across the stack: a popover, combobox, menu, submenu,
navigation panel, preview card, notification panel, dialog and drawer each supply
their own painted surface. It does not replace the plan-583 trigger-press claim
(the trigger is outside the surface, so that path is unchanged) and it does not
touch Escape, which carries no pointer position.

## 2. Exact files to change

1. `packages/components/src/internal/pointer.ts` — `pressedWithin(renderer, id,
   event)` (the point-in-bounds rule, which `pressedOn` now delegates to) and
   `ownsSurface(renderer, surfaceId)` (the layer ownership predicate).
2. `packages/components/src/internal/dismiss-layer.ts` — `DismissOwnership`, the
   third `pushDismissLayer` argument, and the skip in `dismissTopLayer`.
3. `packages/components/src/internal/dismiss-layer.test.ts` — three unit cases.
4. `packages/components/src/internal/modal.ts` — `surfaceId` in `ModalState`, the
   ownership argument on the modal layer.
5. `packages/components/src/dialog.tsx` — `DialogContent` writes its surface id
   into the modal state.
6. `packages/components/src/drawer.tsx` — the same write.
7. `packages/components/src/popover.tsx` — ownership on the layer it pushes.
8. `packages/components/src/preview-card.tsx` — the same.
9. `packages/components/src/notification-centre.tsx` — the same.
10. `packages/components/src/menu/sub.tsx` — the same for a submenu layer.
11. `packages/components/src/navigation-menu.tsx` — a `surface` ref in the root's
    context, written by `NavigationMenuContent`, ownership on the layer.
12. `packages/components/src/dropdown-menu.tsx` — the same in the menu context.
13. `packages/components/src/context-menu.tsx` — the same.
14. `packages/components/src/combobox.tsx` — the same.
15. `packages/components/src/behaviour/composition.test.tsx` — **new**: the
    composite suite (the settings workflow) and the regression cases.
16. `packages/components/docs/component-api.md` — the rule, in the dismiss
    section (`## 4. Keyboard` neighbours the dismissal rules; add it under the
    existing dismiss prose).
17. `packages/components/docs/{combobox,popover,dropdown-menu,dialog,drawer}.mdx`
    — one sentence each in the limitations/notes section, pointing at the rule.
18. `COMPONENTS.md` — the rows named in §6.
19. `TODO.md` — a ticked hardening item under Tier 2.
20. `.agents/slop/plans/README.md` — the index row for `816`.
21. `PLAN.md` D30 — record `816` and the next free number.

Delete `packages/components/src/behaviour/zz-composite-probe.test.tsx` if it is
still present (the measurement fixture for §0); it must not be committed.

## 3. Implementation

### 3.1 `internal/pointer.ts`

Keep `pressedOn`'s signature (five call sites import it). Add:

```ts
/**
 * Whether the event's point lies inside native element `id`. A key event has no
 * point, so it is never inside.
 */
export const pressedWithin = (
  renderer: NativeRenderer | null,
  id: number | null | undefined,
  event: EventPayload,
): boolean =>
  Option.match(
    Option.all({
      x: Option.fromNullishOr(event.x),
      y: Option.fromNullishOr(event.y),
      id: Option.fromNullishOr(id),
      box: Option.flatMap(Option.fromNullishOr(id), (target) =>
        Option.flatMap(Option.fromNullishOr(renderer), (live) =>
          Option.fromNullishOr(live.getElementBounds?.(target)),
        ),
      ),
    }),
    {
      onNone: () => false,
      onSome: ({ box, x, y }) =>
        x >= box.x &&
        x <= box.x + box.width &&
        y >= box.y &&
        y <= box.y + box.height,
    },
  );

/**
 * A layer's ownership test: the press landed on the surface `surfaceId` names.
 * Reads the id at event time, because a surface mounts after its layer.
 */
export const ownsSurface = (
  renderer: NativeRenderer | null,
  surfaceId: () => number | null | undefined,
): ((event: EventPayload) => boolean) =>
  (event) => pressedWithin(renderer, surfaceId(), event);
```

and make `pressedOn` one line: `pressedWithin(renderer, element?.id ?? null,
event)`.

### 3.2 `internal/dismiss-layer.ts`

```ts
/** Whether a press belongs to a layer: it landed inside the layer's surface. */
export type DismissOwnership = (event: EventPayload) => boolean;

interface DismissLayer {
  readonly onDismiss: DismissHandler;
  readonly depth: number;
  readonly owns: DismissOwnership | undefined;
}

export const pushDismissLayer = (
  onDismiss: DismissHandler,
  depth = 0,
  owns?: DismissOwnership,
): (() => void) => { ... };

export const dismissTopLayer = (event: EventPayload): boolean => {
  if (isEventClaimed(event)) return false;
  ...
  return Option.match(topmost, {
    onNone: () => false,
    onSome: (layer) => {
      // A press inside the layer's own surface is not an outside press: 0.10.0
      // reports `mouseDownOutside` by bounds, so an enclosing overlay reported a
      // nested surface's own press (plan 816).
      if (layer.owns?.(event) === true) return false;
      claimEvent(event);
      layer.onDismiss(event);
      return true;
    },
  });
};
```

Do **not** claim the event when the layer owns the press: the click that follows
must reach the row, and an enclosing handler in the same task must not treat the
press as consumed for a different layer.

### 3.3 Each surface

Every root that pushes a layer supplies `ownsSurface(renderer, () => id)`.

- **Surface already in the pushing component** (`popover.tsx` `PopoverContent`,
  `preview-card.tsx` `PreviewCardContent`, `notification-centre.tsx` panel,
  `menu/sub.tsx` `MenuSubContent`): add the third argument, e.g.

  ```ts
  return pushDismissLayer((event) => { ... }, depth, ownsSurface(renderer, () => surface.current?.id));
  ```

  `renderer` and `surface` are already in scope in each of those four.

- **Root pushes, content owns the surface** (`dropdown-menu`, `context-menu`,
  `combobox`, `navigation-menu`): add `surface: RefObject<PublicInstance | null>`
  to the context value, created in the root (`useRef(null)`), and in the content
  merge it into the existing surface ref:

  ```ts
  const setSurface = useMergedRef<PublicInstance | null>(attachSurface, context.surface, ref);
  ```

  then push with `ownsSurface(renderer, () => context.surface.current?.id)`.
  The context objects are `useMemo`-ed; include the ref in the dependency list
  (a ref is stable).

- **Modal** (`internal/modal.ts`): `useModalState` creates
  `const surfaceId = useRef<number | null>(null)` and returns it in `ModalState`.
  Push with `ownsSurface(renderer, () => surfaceId.current)`.
  `DialogContent` and `DrawerContent` (which already compute `content.id`) set
  `surfaceId.current = content?.id ?? null` in a layout effect:

  ```ts
  const { surfaceId } = useDialogContext();
  useLayoutEffect(() => {
    surfaceId.current = contentId ?? null;
  });
  ```

  `useDialogContext`/`useDrawerContext` already expose the modal state; extend the
  shape rather than adding a context.

### 3.4 The composite suite

`src/behaviour/composition.test.tsx` — header comment naming the bug (a press on
a nested surface closed it and dropped the choice) and the measured bounds from
§0. One fixture, `SettingsWorkflow`, with:

- a `ToastProvider` + `ToastViewport` around everything;
- a `Button testId="open-settings"`;
- a controlled `Dialog` with `DialogContent label="Settings" testId="settings"`;
- a `Tabs` (Profile / Notifications, `testId`s `tab-profile`,
  `tab-notifications`, panels `panel-profile`, `panel-notifications`);
- a `Field` + `FieldInput testId="name"`;
- a `Combobox` (`testId`s `role-trigger`, `combobox-input`, options `owner`,
  `editor`, `viewer`);
- a `DialogFooter` with `DialogClose testId="cancel"` and
  `Button testId="save"` (disabled until a name **and** a role exist);
- save closes the dialog, calls `onSaved` and pushes `{ title: "Settings saved" }`.

Cases (each asserts one thing; no geometry thresholds):

1. **opens and switches sections** — `open-settings` opens `settings`; the Profile
   panel is painted and Notifications is not; pressing `tab-notifications` flips
   that. (Pins the composite's own wiring; passes at `HEAD`.)
2. **picks a role inside the dialog** — open, press `role-trigger`, press
   `combobox-option-viewer`; the trigger paints `Viewer`, `onValueChange` reported
   `viewer`, the popup is gone, the dialog is still open and focus is
   `role-trigger`. **Fails at `HEAD`** (no report, focus `None`).
3. **runs a popover control inside the dialog** — a second fixture with a
   `Popover` whose trigger sits at the bottom of a `size="sm"` dialog and whose
   panel holds three `Button`s; press the third; its `onClick` runs once and the
   panel is still painted. **Fails at `HEAD`** (0 clicks, panel closed).
4. **runs a menu row inside the dialog** — a `DropdownMenu` in the same short
   dialog; press the second row; `onSelect` runs once and the menu is gone (a row
   *should* close its menu). **Fails at `HEAD`** (no `onSelect`).
5. **Escape keeps one layer per gesture** — with the role popup open, one
   `Escape` closes the popup and leaves the dialog painted, focus on
   `role-trigger`; after `await nextTask()` a second `Escape` closes the dialog
   and returns focus to `open-settings`. (Pins the plan-669/587 rule inside this
   composition.)
6. **saves the whole workflow** — pick a role, type a name, press `save`; the
   dialog is gone after its exit, `onSaved` ran once, focus is back on
   `open-settings`, and exactly one `status` node is named `Settings saved`.

Use `clickCentreOf`, `finishMotion`, `focusedTestId`, `isShown`, `nextTask`,
`until` from `internal/interaction.js` and `nodesWithRole`/`nodesNamed` from
`internal/a11y.js` (pass `root.renderer`). Every `renderComponent` root calls
`unmount()` (the `afterEach` in `setup.ts` covers a thrown assertion, but each
test still unmounts its own).

### 3.5 Unit cases in `internal/dismiss-layer.test.ts`

Three cases, no renderer (the ownership test is a plain predicate):

1. a layer whose `owns` returns `true` is not dismissed and the event is not
   claimed — the next layer must still see a live event in the same task;
2. a layer whose `owns` returns `false` is dismissed as before;
3. a deeper layer with `owns` true leaves the shallower layer alone and
   `dismissTopLayer` returns `false`.

Add a comment on each naming the measured bug.

## 4. Test plan

From `packages/components` (the worktree root is the repo root):

```sh
# 0. Measurement, at HEAD: the composite cases 2–4 fail for the recorded reason.
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx
# EXPECT: 1, 5, 6 pass; 2, 3, 4 fail (no value / 0 clicks / no onSelect).

# 1. After the source changes: 6/6.
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx
# EXPECT: 6 passed.

# 2. The shared rule's unit cases.
nub run --filter @gpuixui/components test
# EXPECT: exit 0, unit 514 + 3 cases (or the count measured this turn + 3).

# 3. Every suite the change touches, because the rule is shared.
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/dialog.test.tsx src/behaviour/drawer.test.tsx \
  src/behaviour/confirm-dialog.test.tsx src/behaviour/popover.test.tsx \
  src/behaviour/combobox.test.tsx src/behaviour/dropdown-menu.test.tsx \
  src/behaviour/context-menu.test.tsx src/behaviour/navigation-menu.test.tsx \
  src/behaviour/preview-card.test.tsx src/behaviour/notification-centre.test.tsx \
  src/behaviour/command-menu.test.tsx src/behaviour/date-picker.test.tsx \
  src/behaviour/mention-input.test.tsx src/behaviour/composition.test.tsx
# EXPECT: the recorded plan-540 failures stay exactly the same classes and no
# other case changes verdict.

# 4. End-of-task: the full native suite (a cross-cutting change).
nub run --filter @gpuixui/components test:behaviour
# EXPECT: the plan-813 baseline (1041 passed / 20 failed of 1061) plus this
# plan's new passing cases, with the same 20 recorded failures. Record the totals.

# 5. Headless smoke (the dismiss stack and overlays).
nub apps/playground/dist/smoke/run.js --only overlay-dialog --only modal-focus-trap
# EXPECT: both green.

# 6. Gates.
nub run check && nub run lint && nub run test
# EXPECT: all exit 0.
```

Both-direction proof: the composite cases 2–4 must fail with only the new suite
present (step 0), and pass after §3.1–§3.3; reverting only
`internal/dismiss-layer.ts` must restore all three failures. State both runs.

## 5. STOP conditions

- Any of the three regression cases passes at `HEAD`. Stop and re-measure: the
  premise in §0 no longer holds.
- An existing dismiss case changes verdict (Dialog 21, Drawer 18, Popover 30,
  Combobox 70, Dropdown 63, Context 25, Navigation 34, Preview card 21,
  Notification 33, Command 29, DatePicker 43, Mention 25). Stop and name it: the
  rule is meant to add a skip, not to reorder the stack.
- A press **outside** a surface stops closing it, or Escape loses its layer
  ordering. Stop; the fix has become a different rule.
- A layer's ownership needs the renderer's bounds *before* the surface mounts.
  Stop: read the id at event time (the closure in `ownsSurface`), never at push
  time.
- `getElementBounds` returns nothing for a surface that is painted: record it and
  treat that layer as unowned (a missing box must not silently claim presses).
- A fix needs a new dependency or a change outside `packages/components`,
  `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index. Stop.
- `816` is taken by another worktree before the plan is committed. Renumber to
  the next free number, rename the file, update the index and D30.

## 6. Docs and inventory

- `docs/component-api.md`: state the rule next to the dismiss-stack description —
  a layer names its own surface, and a press inside it is never a dismissal, with
  the bounds evidence from §0 in one sentence.
- `docs/combobox.mdx`, `docs/popover.mdx`, `docs/dropdown-menu.mdx`,
  `docs/dialog.mdx`, `docs/drawer.mdx`: one sentence in the nested-overlay note
  naming the rule and plan 816.
- `COMPONENTS.md` rows (append to the limits cell, no status change): Comboboxes,
  Popovers, Dropdown menus, Context menus, Navigation Menu, Preview Card,
  Notification centre, Dialogs, Drawer. Each gets "a press on a nested surface
  belongs to it, so a picker, popover or menu inside a dialog keeps its press
  (plan 816)".
- The composite suite is recorded in the Comboboxes row (it is the workflow that
  found the bug) as "plus a composite settings-workflow suite
  (`src/behaviour/composition.test.tsx`)".
- No component's stated native-test count changes: the new cases live in a file
  that is not any record's `testFile`, so `inventory.test.ts` is unaffected. If it
  fails, fix the page rather than weakening the check.

## 7. Acceptance

- A press inside a nested overlay surface never dismisses that surface, whatever
  an enclosing overlay reports; a press outside still closes the topmost layer.
- The settings workflow selects a role, switches sections, saves, toasts and
  returns focus to its opener, driven only through real presses and keystrokes.
- Composite cases 2–4 fail on `HEAD` and pass after; the unit cases fail without
  the rule and pass with it; the recorded plan-540 failures are unchanged.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the scoped smoke
  scenarios are green.
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the plan index agree.
- Committed on `agent/components` and pushed.

## 8. Results

- `internal/pointer.ts`: `pressedWithin(renderer, id, event)` holds the
  point-in-bounds rule and `pressedOn` delegates to it; `ownsSurface(renderer,
  surfaceId)` builds a layer's ownership test, reading the id at event time.
- `internal/dismiss-layer.ts`: `DismissOwnership` is the third
  `pushDismissLayer` argument; `dismissTopLayer` returns `false` **without
  claiming the event** when the topmost layer owns the press, so the release
  still reaches the row and an enclosing handler does not read the event as
  consumed.
- `internal/ref.ts`: `useMergedRef` takes one more slot (the surface), so a part
  feeds its own ref, the caller's and the layer's.
- The rule is wired into nine overlays and both modals: `Popover`,
  `PreviewCard`, `NotificationCentre` and `MenuSubContent` already held their
  surface in the pushing component; `DropdownMenu`, `ContextMenu`, `Combobox`
  and `NavigationMenu` publish it through their context; `useModalState` carries
  a `surfaceId` written by `DialogContent`/`DrawerContent`.
- `behaviour/composition.test.tsx` (new, 6 cases): the settings workflow opens,
  switches sections, picks a role, closes one layer per `Escape`, saves and
  announces the toast; plus a popover control and a menu row in a short dialog.
  Both-direction proof on this host: **4 failed / 2 passed at `HEAD`** (`expected
  "vi.fn()" to be called 1 times, but got 0` three times, and the save case) and
  **6 passed** after. The three measured regression cases are the ones in §0.
- `internal/dismiss-layer.test.ts`: 3 new unit cases (owned press is not
  dismissed, a press elsewhere still is, an owned press claims nothing for the
  next layer). Unit suite: **517 in 48 files** (was 514).
- No regression: the 14 affected suites' failure list is identical before and
  after (20 names → the same 16 for those files: the recorded plan-540 classes;
  diff taken with the source stashed). Full native suite: **1047 passed / 20
  failed of 1067** (baseline 1041/20 of 1061 — the +6 are this plan's cases, the
  same 20 classes; the 5 names outside the affected files were re-measured and
  are pre-existing).
- Headless smoke: **17/20**, the same three playground-owned failures as the
  recorded baseline; `overlay-dialog` and `modal-focus-trap` green.
- Gates: `nub run check`, `nub run lint` and `nub run test` exit `0`
  (`fmt:fix` reformatted the touched files).
- Docs: the rule in `docs/component-api.md` §4, one note each in
  `combobox`/`popover`/`dropdown-menu`/`dialog`/`drawer`, the ten Tier 2
  `COMPONENTS.md` rows, `TODO.md`, this index and `PLAN.md` D30.
- Not covered by this plan: the fixed handles recorded under `TODO.md` (a caller
  cannot address `search-clear`, `combobox-input` or `date-day-<iso>` per
  instance) still stand, as plan 675 decided.
