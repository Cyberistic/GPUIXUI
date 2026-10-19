# Plan 583 — A press on an overlay's own trigger closes it once

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 114, 116, 317, 320, 398, 515, 521, 568 |
| Status | **landed** — a press on an overlay's own trigger is claimed without closing, so the release click closes it; six native cases (each fails on the old code); full native suite 747 passing / 35 pre-existing plan-540 failures |
| Claimed number | first free after `582` (checked every worktree; recorded in `PLAN.md` D30) |

## 0. Why this plan exists

Every overlay in this package that toggles from its trigger has a one-gesture
guard: the outside press closes the overlay and marks the click that follows as
already handled, so the same press cannot re-open it. The mark is cleared with
`queueMicrotask`.

That is the wrong lifetime. The runtime delivers the press and the click in
**separate tasks** — an outside press fires on mouse down, the trigger's click on
mouse up. A microtask runs between them, so the mark is gone before the click
arrives. The click then sees a closed overlay and toggles it open again.

Measured on this host, 2026-10-19, in the real renderer. A held press is
`nativeSimulateMouseDown(centre)` → `await setTimeout(10)` →
`nativeSimulateMouseUp(centre)`, which is what a person does; the existing
suites use `simulateClick`, which drives both halves inside one task and never
sees the defect.

**Measured event order for one press on the trigger:**

```text
mouseDownOutside   ← closes the surface, marks the click, queues the microtask
trigger mouseDown
(microtask clears the mark, React commits the closed state)
trigger click      ← sees closed, toggles open
```

**Result on `HEAD` — every one of these stays open after a held trigger press:**

| Suite | Case | Result |
| --- | --- | --- |
| `popover.test.tsx` | panel after a held trigger press | still open |
| `dropdown-menu.test.tsx` | menu after a held trigger press | still open |
| `combobox.test.tsx` | popup after a held trigger press | still open |
| `preview-card.test.tsx` | card after a held trigger press (and its delay) | still open |
| `navigation-menu.test.tsx` | panel after a held trigger press | still open |
| `notification-centre.test.tsx` | panel after a held trigger press | still open |

A user cannot close any of these by pressing the control that opened them, which
is the first gesture everyone tries. The existing tests pass only because
`simulateClick` batches the two halves.

**The rule that fixes all six:** a press on the overlay's **own trigger** is not
an outside press. The trigger's click is the gesture that closes it. The overlay
therefore claims the press (so an enclosing dialog does not also close) but
leaves its own open state alone. A press anywhere else still closes on the press,
and its click lands on the other element, so no mark is needed at all.

`Combobox` needs one extra step: its popup is GPUix's headless `ComboboxContent`,
which closes itself in its own `onMouseDownOutside` after ours runs. Our
`onOpenChange(false)` therefore ignores exactly one close when the press landed
on our trigger, and the trigger's click closes the popup normally.

## 1. Exact files to change

1. `packages/components/src/internal/pointer.ts` — **new**: whether a pointer
   event landed on a part.
2. `packages/components/src/popover.tsx`
3. `packages/components/src/dropdown-menu.tsx`
4. `packages/components/src/combobox.tsx`
5. `packages/components/src/preview-card.tsx`
6. `packages/components/src/navigation-menu.tsx`
7. `packages/components/src/notification-centre.tsx`
8. The six behaviour suites beside them.
9. The six `packages/components/docs/*.mdx` pages (verification sentence and
   count).
10. `COMPONENTS.md` (six rows), `TODO.md`, `PLAN.md` D30, the plan index.
11. `packages/components/src/index.ts` only if the helper is exported — it is
    **not**; `internal/*` stays private (plan 338).

Do not change the dismiss stack, the placement rules, any open/close motion, or
the trigger's keyboard activation.

## 2. Implementation

### 2.1 `internal/pointer.ts` — the one hit test

```ts
import type {
  EventPayload,
  NativeRenderer,
  PublicInstance,
} from "@gpuix/react";
import * as Option from "effect/Option";

/**
 * Whether a pointer event landed on `element`.
 *
 * `mouseDownOutside` fires on the press, while the trigger's click arrives on
 * release — separate tasks (measured, plan 583). An overlay must therefore read
 * "the user pressed my trigger" from the press itself; a mark cleared on a
 * microtask cannot survive to the click.
 */
export const pressedOn = (
  renderer: NativeRenderer | null | undefined,
  element: PublicInstance | null,
  event: EventPayload,
): boolean =>
  Option.match(
    Option.all({
      x: Option.fromNullishOr(event.x),
      y: Option.fromNullishOr(event.y),
      box: Option.flatMap(Option.fromNullishOr(element), (target) =>
        Option.fromNullishOr(renderer?.getElementBounds?.(target.id)),
      ),
    }),
    {
      onNone: () => false,
      onSome: ({ x, y, box }) =>
        x >= box.x &&
        x <= box.x + box.width &&
        y >= box.y &&
        y <= box.y + box.height,
    },
  );
```

Do **not** normalise the plan-540 box conventions here. The press is a point
inside a control's box, not a comparison of two origins; the centre of the
trigger is inside every convention this binding reports (plan 540 §2).

### 2.2 The five overlays we own — claim, do not close

For `Popover`, `DropdownMenu`, `PreviewCard`, `NavigationMenu` and
`NotificationCentre`, at the top of the pushed dismiss handler:

```ts
if (event.eventType !== "keyDown" && pressedOn(renderer, trigger.current, event)) {
  return;
}
```

(`NavigationMenu` uses `Option.fromNullishOr(triggerFor(open))`; every other one
uses its `trigger` ref.)

`dismissTopLayer` claims the event **before** it calls the handler, so returning
here still keeps an enclosing dialog open on the same press — the property plans
366 and 514 established.

Then delete the now-dead one-gesture mark:

- `Popover`: remove `dismissedByOutsidePress` from the context, the provider, the
  trigger's click branch and the dismiss handler (including its
  `queueMicrotask`).
- `DropdownMenu`: remove `dismissedByOutsidePress` from the context, the
  provider, the trigger and `close`'s `reason === "outside"` branch. Keep the
  `outside` close reason itself: a press elsewhere still restores no focus.
- Keep each trigger's ordinary `setOpen(!open)`/`setOpen(expanded ? null : value)`
  click path untouched: with the surface still open at click time it does the
  right thing.
- `Combobox`: remove the same mark and instead add
  `dismissedOnTrigger = useRef(false)`; `noteOutsidePress` becomes
  `noteOutsidePress(onTrigger: boolean)` and stores it; the dismiss handler
  returns early when it is `true`; `onOpenChange(false)` ignores one close while
  it is `true` and clears it. Do not guard `onOpenChange(true)` any more — the
  popup never closes on that press, so the headless trigger's click requests
  `false`.

### 2.3 Behaviour suites — one real held press each

Add one case per suite beside the existing outside-press case. The shape:

```tsx
it("closes on a held trigger press instead of re-opening", async () => {
  const root = renderComponent(<Fixture />);
  clickCentreOf(root, "trigger");
  finishMotion(root);

  const { x, y, width, height } = requireBounds(root, "trigger");
  root.renderer.nativeSimulateMouseDown(x + width / 2, y + height / 2);
  // The runtime delivers the release in a later task; the old microtask mark was
  // already gone by then, so the click re-opened the surface.
  await new Promise((resolve) => setTimeout(resolve, 10));
  root.renderer.nativeSimulateMouseUp(x + width / 2, y + height / 2);
  finishMotion(root);

  expect(root.renderer.findByTestId("panel")).toBeUndefined();

  // A new press opens it again: the mark must not outlive its gesture.
  clickCentreOf(root, "trigger");
  finishMotion(root);
  expect(root.renderer.findByTestId("panel")).toBeDefined();

  root.unmount();
});
```

Per fixture:

- Popover: `<Filters />`, `panel`.
- Dropdown: the existing `FileActions`, `menu`.
- Combobox: the existing `Picker`, `combobox-content`; open with `await open(...)`
  and settle instead of `finishMotion` (the popup has no motion).
- PreviewCard: the existing profile fixture; after the held press wait past
  `openDelay` (default 300 ms) before asserting, because the old path re-opened
  through the hover timer rather than a direct set.
- NavigationMenu: the existing two-item fixture, `nav-panel` (the case must press
  the *open* item's trigger).
- NotificationCentre: the existing seed with `defaultOpen`, `centre`.

Update each file header with the bug: a held press — press and click in separate
tasks — closed on the press and re-opened on the release.

## 3. Commands and expected results

Before any change, each new case fails (measured above). Keep the probes out of
the tree; the committed tests are the proof. From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/popover.test.tsx
```

Expected before: 1 failed (the new case) / 19 passed; after: **20 passed**.

Repeat for the six files. After the fix:

| File | Expected |
| --- | --- |
| `popover.test.tsx` | 20 passed |
| `dropdown-menu.test.tsx` | 52 passed |
| `combobox.test.tsx` | 46 passed |
| `preview-card.test.tsx` | 16 passed |
| `navigation-menu.test.tsx` | 22 passed |
| `notification-centre.test.tsx` | 17 passed |

(Three of these suites also carry pre-existing plan-540 failures in the full run
— focus/position cases — so run each file with `-t` or accept the recorded red
cases; the new case must pass.)

Then:

```sh
nub run test            # unit: 42 files, 426 tests, exit 0
nub run test:behaviour  # full: 747 passing / 35 known plan-540 failures of 782
cd ../.. && nub run check && nub run lint
```

The full-suite number moves from 741/35 of 776 to **747/35 of 782**: six new
cases, no other verdict changes.

## 4. Both-direction proof

1. Add the six tests, run them against `HEAD`: all six fail (quoted in §0).
2. Apply §2.1–§2.2: all six pass; a new press still opens.
3. Remove only the one-line hit test from `Popover`'s dismiss handler: its new
   case fails and the other five stay green, proving the shared helper is not
   doing the work by accident.
4. For `Combobox`, remove only the `onOpenChange(false)` ignore: its case fails
   while the ring/selection cases stay green.
5. Restore everything; run the scoped suites again.
6. Paste the failing and passing runs into the commit body.

`scripts/verify-two-directions.sh` calls `jj` (not installed, D1); do the runs by
hand.

## 5. STOP conditions

- A trigger press does not fire `mouseDownOutside` (no event to test): stop and
  report; the premise is wrong for that overlay.
- `pressedOn` reads the press as outside the trigger at the trigger's centre:
  stop; record the measured point and box rather than widening the box.
- A new test passes without §2.2: stop — it does not guard the defect.
- Any test other than the six new cases changes verdict: stop and name it.
- The combobox needs a second ignored close (i.e. both its own handler and the
  headless one close twice): stop and record the order before adding another
  guard.

## 6. Acceptance

- One held press on an open overlay's trigger closes it and leaves it closed, in
  Popover, Dropdown menu, Combobox, Preview card, Navigation menu and
  Notification centre.
- A subsequent, separate press opens it again.
- A press elsewhere still closes; a press inside the panel still does not.
- An enclosing dialog stays open for the same press (the layer claim is kept).
- Six native tests (each fails on `HEAD`), docs counts, `COMPONENTS.md` rows, the
  inventory, the plan index, `TODO.md` and `PLAN.md` agree.
- `nub run check`, `nub run lint`, the unit suite and the six scoped suites are
  green; the full native suite is `747 passing / 35 known failures` of 782.
- One commit: `fix(components): a press on an overlay's own trigger closes it once (plan 583)`.

## 7. Results

- Measured on this host before the change: the runtime orders one held press as
  `mouseDownOutside → trigger mouseDown → (microtask) → trigger click`. Every one
  of the six probes stayed open after the release.
- `src/internal/pointer.ts` (new): `pressedOn` reads the event's window position
  against the trigger's measured box, converting the runtime's `| null` shapes
  once at that boundary. No box-convention normalisation (plan 540): the trigger's
  centre is inside its reported box under every convention.
- `popover.tsx`, `dropdown-menu.tsx`, `preview-card.tsx`, `navigation-menu.tsx`,
  `notification-centre.tsx`: the pushed dismiss handler claims a press on its own
  trigger without closing; the now-dead one-gesture marks and their microtasks are
  deleted. The enclosing layer claim is unchanged (`dismissTopLayer` claims before
  the handler runs).
- `combobox.tsx`: `noteOutsidePress(event)` records whether the press hit the
  trigger; the layer skips its own close and `onOpenChange(false)` ignores the
  headless content's close once, so the trigger's click closes the popup. The
  `onOpenChange(true)` guard is gone.
- Six new native cases: Popover 20, Dropdown menu 52, Combobox 46, Preview card
  16, Navigation menu 22, Notification centre 17. All six fail with their fix
  reversed (proven for Popover, Combobox and the pre-fix probes of the other four).
- Scoped suites: the new cases pass; the only reds are the recorded plan-540
  focus/position cases (Popover 3, Dropdown 2, Preview card 7).
- Full native suite: **747 passing / 35 failed** of 782 (was 741/35 of 776).
- Unit suite: 42 files, 426 tests, exit `0`. `nub run check` (test check, lint,
  format, types) exits `0`.
- Docs, `COMPONENTS.md`, the inventory, the plan index, `TODO.md` and `PLAN.md`
  D30 synced.
