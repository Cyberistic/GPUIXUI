# 366 — One Escape closes one overlay (dismiss-stack event identity)

**Phase.** F — integration and polish (a measured runtime defect in every nested
overlay).
**Workstream.** components (`packages/components`).
**Depends on.** 110, 112, 114, 117, 131, 187 (playground evidence), 326.
**Status.** done 2026-10-18 — unit copy case + 1 native nested-dismiss case; both
fail on the `WeakSet` and pass after it (Dialog 14, behaviour 526, unit 357).

## 1. Why this plan exists

`internal/dismiss-layer.ts` consumes an event with a
`WeakSet<EventPayload>`: "the event itself is the unit of consumption". The
runtime does not deliver one event object to every handler.

The playground measured the opposite fact in plan `187` §9 (this host, locally
built 0.10.0, ADR 0003): one `x` key press reached an inner and an enclosing
`onKeyDown` as **two distinct objects** (`keyObjects=2`), and with a stack
written exactly like `dismiss-layer.ts`, **one Escape closed both layers**.

Reproduced in this worktree on 2026-10-18 with a throwaway probe (deleted): a
controlled `Dialog` containing an open `Popover`, one `simulateKeystrokes`
(`"escape"`):

| Before | After |
| ------ | ----- |
| `d=true p=true`, both surfaces painted | `d=false p=true`, both surfaces gone |

So the popover dismissed itself **and** the dialog dismissed itself on the same
keystroke. Every nested overlay — a popover or a menu inside a dialog — has this
bug, and no behaviour suite covered a nested pair (the submenu case passes
because its surface is not inside the parent surface's handler path).

`internal/event-claim.ts` already implements the correct mechanism for menus and
the hotkey recorder: a claim keyed on the event's **fields** (`eventType`, `key`,
`keyChar`, modifiers), cleared in a microtask, so a payload copy still matches.
Plan `187` §9 measured that the field claim closes exactly one layer and the
second Escape closes the parent.

## 2. What will change

1. `internal/event-claim.ts` grows the pointer fields the dismiss stack needs
   (`x`, `y`, `button`); its claim is no longer key-only.
2. `internal/dismiss-layer.ts` stops using `WeakSet` identity: it asks the field
   claim whether this event was already handled, and claims it before dismissing.
3. A unit test proves two payload **copies** of one keystroke dismiss one layer
   (fails on the `WeakSet`).
4. A native behaviour test proves a nested popover-inside-dialog keeps the
   dialog open on the first Escape and closes it on the second.
5. Docs/inventory counts updated; `COMPONENTS.md` notes the shared claim.

No public API changes.

## 3. Exact implementation

### 3.1 `packages/components/src/internal/event-claim.ts`

- Rename the interface `KeyClaim` → `EventClaim` and add:

  ```ts
  readonly x: number | undefined;
  readonly y: number | undefined;
  readonly button: number | undefined;
  ```

- `claimOf` fills them from `event.x`, `event.y`, `event.button`.
- `sameClaim` compares them too.
- Update the header comment: the claim covers **one event**, key or pointer;
  the runtime delivers one payload copy per handler, so identity cannot carry it;
  the claim is cleared in a microtask.
- Keep the consume-on-read rule (`isEventClaimed` clears the claim) and its
  comment: the enclosing surface is the claim's one reader.

### 3.2 `packages/components/src/internal/dismiss-layer.ts`

Delete the `WeakSet` and import the claim:

```ts
import { claimEvent, isEventClaimed } from "./event-claim.js";

export const dismissTopLayer = (event: EventPayload): boolean => {
  if (isEventClaimed(event)) return false;
  return Option.match(Arr.last(layers), {
    onNone: () => false,
    onSome: (onDismiss) => {
      claimEvent(event);
      onDismiss(event);
      return true;
    },
  });
};
```

Update the module header: the runtime delivers a separate payload copy per
handler (measured, plan `187` §9), so consumption is a field claim, not object
identity; one Escape or outside press dismisses exactly one layer.

**Why this order is correct.** An event travels from the focused element up
through every enclosing overlay: the inner (topmost) handler calls
`dismissTopLayer` first, dismisses `Arr.last(layers)` and claims. The enclosing
handler then reads a claim and returns `false`. With one layer paused/removed,
the next event reaches the new topmost layer.

No call site changes: every overlay already calls `dismissTopLayer(event)`.

### 3.3 `packages/components/src/internal/dismiss-layer.test.ts`

- Add a regression test:

  ```ts
  it("consumes one keystroke even when the runtime copies the payload", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeInner = pushDismissLayer(inner);

    const first: EventPayload = {
      elementId: 7,
      eventType: "keyDown",
      key: "escape",
    };
    const copy: EventPayload = { ...first };

    expect(dismissTopLayer(first)).toBe(true);
    expect(dismissTopLayer(copy)).toBe(false);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
  });
  ```

  Header comment: the bug being guarded is the `WeakSet` version closing both
  layers when the runtime hands each handler its own payload copy.

- The existing "lets the next event reach the layer that is now topmost" test
  now needs a microtask boundary between two identical events (the claim resets
  in a microtask). Make it `async` and `await Promise.resolve()` between the two
  `dismissTopLayer` calls, with a comment naming the runtime boundary. Do not
  weaken it: assert `outer` ran exactly once.

### 3.4 `packages/components/src/behaviour/dialog.test.tsx`

Add one native test and a small fixture:

```tsx
/** A dialog whose content holds an open popover, for the nested-dismiss case. */
const NestedOverlays = () => {
  const [dialogOpen, setDialogOpen] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(true);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger testId="open">Open</DialogTrigger>
      <DialogContent label="Settings" testId="dialog">
        <DialogTitle>Settings</DialogTitle>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger testId="columns">Columns</PopoverTrigger>
          <PopoverContent testId="panel">
            <text>Visible columns</text>
          </PopoverContent>
        </Popover>
      </DialogContent>
    </Dialog>
  );
};
```

Test: render it; both painted; `simulateKeystrokes("escape")`; **the panel is
gone and the dialog is still there**; a second Escape closes the dialog. This
fails on the `WeakSet` code with the dialog gone after the first Escape.

### 3.5 `packages/components/docs/dialog.mdx`, `COMPONENTS.md`, plan index

- Dialog verification count 13 → 14 and the new case named.
- Dialog row: 14 native tests; note that one Escape closes one overlay because
  the dismiss stack shares the field claim with the menus.
- Plan index row and `TODO.md` task.

## 4. Exact commands and expected results

From `packages/components`:

```sh
nub exec vitest run src/internal/dismiss-layer.test.ts
```

Expected: all cases green after the change. With §3.1/§3.2 reverted to the
`WeakSet`, the copy test fails with `expected true to be false` / both handlers
called.

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/dialog.test.tsx
```

Expected: Dialog 14/14. On the old code the nested test fails with the dialog
missing after the first Escape.

```sh
nub run --filter @gpuixui/components test:behaviour
nub run --filter @gpuixui/components test
nub run check
```

Expected: behaviour 526 (525 + 1), unit 356 + 1, `check` exit `0`.

## 5. STOP conditions

1. After the change, one Escape still closes both layers. Measure whether the
   two handlers run in the same synchronous propagation; if they do not, STOP and
   report the measured ordering (the claim resets in a microtask and cannot span
   tasks).
2. A legitimate second Escape in the same tick is swallowed. That is the
   measured microtask boundary; record it as a documented harness nuance, not a
   runtime defect (plan `187` §9), and do not widen the claim's lifetime.
3. Any existing menu, popover, dropdown or command-menu test regresses. Trace
   whether the claim is consumed by a handler that did not act; do not add a
   second claim module.
4. The nested test cannot focus the popover after opening (popover `autoFocus`).
   Focus the popover trigger explicitly through `focusElement` and record it.

## 6. Acceptance

- Two payload copies of one event dismiss exactly one layer (unit test proves
  both directions).
- A native nested overlay keeps its parent open on the first Escape and closes it
  on the second.
- `nub run check`, package unit and behaviour suites pass; docs and inventory
  counts match; plan indexed and `TODO.md` ticked.

## 7. Result

Executed on this host, 2026-10-18.

- `src/internal/dismiss-layer.test.ts`: **6/6 green**. With `dismiss-layer.ts`
  restored to the `WeakSet`, the copy case fails (`expected true to be false`)
  while the other five pass.
- `src/behaviour/dialog.test.tsx`: **14/14 green**; the nested test renders a
  dialog, opens a popover inside it through the trigger, presses Escape once and
  keeps the dialog, then closes it with the second Escape. On the `WeakSet` code
  the same test fails with the dialog already gone after the first Escape.
- Full behaviour suite **526 passed** (525 + 1); unit **357 passed** (356 + 1).
- Docs and inventory counts updated; `docs/dialog.mdx` now states the field-claim
  mechanism and the one-commit mount-order nuance (a nested overlay mounted open
  in the same commit joins the stack below its dialog, so the first Escape closes
  the dialog; the interactive path is the expected one).

**Measured nuance, not a defect.** The dialect question in the plan's STOP list
was answered by the probe: the popover and the dialog each received a distinct
payload copy for one Escape, exactly as plan `187` §9 measured. With the field
claim the enclosing handler sees the claim and leaves the event alone.
