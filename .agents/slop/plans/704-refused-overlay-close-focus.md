# 704 — A controlled close the caller refuses must not move focus

**Owner:** components workstream · **Phase:** F (interaction consistency) ·
**Depends on:** 110, 112, 114, 317, 320, 398, 515, 521, 568, 583, 602, 696

**Numbering:** `695`–`703` are claimed by the docs-site, playground and
tokens-theme worktrees (`695-blockquote-body-role.md`,
`697-chart-colour-pixels.md`, `699-promotion-gate-with-chart-colour-pixels.md`,
`698-selected-option-check.md`, `700-pressed-option-label.md`,
`701-highlight-wash-pixels.md`, `702-promotion-gate-with-wash-pixels.md`,
`703-design-system-inactive-surface-count.md`), so `704` is the first free
number checked across every worktree on 2026-10-20. Recorded in `PLAN.md` D30.

## 1. What is measured today

`useControllableState` (the one open/value hook) gives a controlled prop
precedence: `setOpen(false)` only **asks** the caller, and a caller that keeps
`open` true leaves the surface painted. Three overlays already honour that on
close — `DropdownMenu` (`src/dropdown-menu.tsx:145-170`), `Combobox`
(`src/combobox.tsx:380-390`) and `DatePicker` (`src/date-picker.tsx:219-233`)
defer focus restoration until the `open` transition is observed.

Five surfaces do not. They focus the trigger immediately after requesting the
close, so a refused close leaves the surface open with focus **behind** it:

| Surface | File / lines today | What happens today |
| ------- | ------------------ | ------------------ |
| `Popover` | `src/popover.tsx:285-300`, `:313-323` | the layer calls `close.current()` and then `focusElement(trigger)` on the same Escape; `leave` (Tab past the last stop) does the same, then `focusNext`/`focusPrevious` |
| `PreviewCard` | `src/preview-card.tsx:222-239` | the layer calls `close.current()` and then `focusElement(trigger.id)` on Escape |
| `NavigationMenu` | `src/navigation-menu.tsx:239-256` | `dismiss.current()` calls `setOpen(null)` and then `focusTrigger(current)` |
| `NotificationCentre` | `src/notification-centre.tsx:414-433` | the layer calls `close.current()` and then `focusElement(trigger.id)` on Escape |
| `ContextMenu` | `src/context-menu.tsx:120-154` | `close("dismiss")` focuses the trigger **before** the caller has accepted the close |

Measured on 2026-10-20 for `Popover` (probe test added to
`src/behaviour/popover.test.tsx`): with `open={true}` and an `onOpenChange` that
records but never updates, Escape reports `false`, the panel is still painted,
**and focus has moved to `trigger`** (expected: the panel). At `HEAD` the probe
fails with `focusedTestId` = `Some("trigger")` instead of `Some("panel")`; the
other four have the same shape in code and their regression cases (§3.5) must be
run at `HEAD` before the fix.

This is not a cosmetic difference. In a controlled surface the caller may refuse
a close for a reason — an unsaved draft, a running job — and the user's focus
must stay inside the surface that is still asking for attention. Moving it to
the trigger strands a keyboard user outside an open panel and leaves the dismiss
layer armed with no visible cursor. The repository already treats this as a bug
in the two surfaces that guard it (plans 602, 398); this plan applies the same
rule everywhere.

## 2. The decision

**Focus restoration is part of the accepted close, not of the request.** One
shared hook records the focus a close was asked to restore; a `true -> false`
transition on `open` applies it. A refused close never transitions, so focus is
left where it is; the next close request overwrites the recorded intent, so a
later outside press does not inherit the Escape's intent.

The hook is generic over the focus token, because the surfaces restore different
things: `Popover` needs "trigger / next / previous / none", the menus and
notification centre need "trigger / none", and `NavigationMenu` needs the trigger
**value** captured when the close is requested (the panel is already `null` by
the time the effect runs).

## 3. Exact changes

### 3.1 New `packages/components/src/internal/close-focus.ts`

```ts
/**
 * Focus restoration for a non-modal overlay.
 *
 * A close request names where focus should go; the move happens only once the
 * `open -> false` transition is observed. A controlled close the caller refuses
 * therefore leaves the surface and the user's focus alone, and the next request
 * replaces the recorded intent (an outside press cannot inherit an Escape's).
 */

import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * The focus a close was asked to restore, applied when the close is accepted.
 * `Focus` is the surface's own token: `"trigger"`, a direction, or a value.
 */
export const useCloseFocus = <Focus>(
  open: boolean,
  close: () => void,
  restore: (focus: Focus) => void,
): ((focus: Focus) => void) => {
  const pending = useRef<Focus | undefined>(undefined);
  const wasOpen = useRef(open);
  const closeRef = useRef(close);
  const restoreRef = useRef(restore);
  useLayoutEffect(() => {
    closeRef.current = close;
    restoreRef.current = restore;
  });

  useLayoutEffect(() => {
    if (wasOpen.current && !open && pending.current !== undefined) {
      restoreRef.current(pending.current);
    }
    if (!open) pending.current = undefined;
    wasOpen.current = open;
  }, [open]);

  return useCallback((focus: Focus) => {
    pending.current = focus;
    closeRef.current();
  }, []);
};
```

Do not add a second implementation in a component.

### 3.2 `src/popover.tsx`

- Import `useCloseFocus` and define
  `type PopoverCloseFocus = "trigger" | "next" | "previous" | "none";`.
- In `Popover`, take `const renderer = useGpuix().renderer;` and:
  ```ts
  const requestClose = useCloseFocus<PopoverCloseFocus>(open, () => setOpen(false), (focus) => {
    if (focus === "none") return;
    const target = trigger.current;
    if (target === null) return;
    renderer?.focusElement?.(target.id);
    if (focus === "next") renderer?.focusNext?.();
    if (focus === "previous") renderer?.focusPrevious?.();
  });
  ```
- Add `requestClose` to `PopoverContextValue` and the context object.
- `PopoverTrigger`: on close `requestClose("none")`, on open `setOpen(true)` (a
  trigger press already has focus on the trigger).
- `PopoverSurface` (dismiss layer): `requestClose("trigger")` for `keyDown`,
  `requestClose("none")` otherwise. **Remove** the immediate
  `focusElement(trigger)` block.
- `leave(backwards)`: `requestClose(backwards ? "previous" : "next")`; **remove**
  the immediate `focusElement`/`focusNext`/`focusPrevious` calls.
- The mouse-outside handler keeps its existing `pressedOn` guard, then calls
  `requestClose("none")`.
- Delete the `close` ref and its `useLayoutEffect`; the hook owns the request.

### 3.3 `src/preview-card.tsx`

- Define `type PreviewCloseFocus = "trigger" | "none";`.
- In the root, call the hook; the restore callback reproduces plan 515:
  ```ts
  const restore = (focus: PreviewCloseFocus): void => {
    if (focus === "none") return;
    const target = trigger.current;
    if (target === null) return;
    if (renderer?.getFocusedElementId?.() !== target.id) {
      suppressFocusOpen.current = true;
    }
    renderer?.focusElement?.(target.id);
  };
  ```
  (`useGpuix()` is already imported in this module's content; the root needs it
  too.)
- Expose `requestClose` through `PreviewCardContextValue`.
- Hover close: `hover: () => requestClose("none")`.
- Trigger click when open: `requestClose("none")`.
- Content layer: `requestClose("trigger")` on `keyDown`, `"none"` otherwise;
  remove the immediate focus/suppress block.

### 3.4 `src/navigation-menu.tsx`

- Define `type NavigationCloseFocus = string | null;` where the token is the
  trigger value to focus, `null` for no move.
- Root hook restore:
  ```ts
  (value) => {
    if (value !== null) focusTrigger(value);
  }
  ```
- Expose `requestClose` in the root context.
- Hover close: `requestClose(null)`.
- `dismiss.current` becomes:
  ```ts
  const dismiss = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    dismiss.current = () => requestClose(open);
  });
  ```
  A `keyDown` on the layer calls `dismiss.current()`; an outside press calls
  `requestClose(null)`.
- `NavigationMenuTrigger` toggle: close `requestClose(null)`, open
  `setOpen(value)`.
- `NavigationMenuLink`: `requestClose(null)` after `onSelect` (the previous code
  did not move focus on a link, keep that).
- The `focusTrigger` immediate call is removed from the dismissal path.

### 3.5 `src/notification-centre.tsx`

- Define `type NotificationCloseFocus = "trigger" | "none";`.
- Root hook restore: on `"trigger"`, `renderer?.focusElement?.(trigger.current.id)`
  when the trigger exists.
- Expose `requestClose` through the context.
- Trigger click when open: `requestClose("none")`.
- Panel layer: `requestClose("trigger")` on `keyDown`, `"none"` otherwise;
  remove the immediate focus call and the now-unused `close` ref.

### 3.6 `src/context-menu.tsx`

- Define `type ContextCloseFocus = "trigger" | "none";`.
- Root hook restore: `"trigger"` focuses `triggerId.current` when defined.
- Replace the immediate block in `close(reason)`:
  ```ts
  const requestClose = useCloseFocus<ContextCloseFocus>(open, () => setOpenRef.current(false), (focus) => {
    if (focus === "none") return;
    const target = triggerId.current;
    if (target !== undefined) renderer?.focusElement?.(target);
  });
  const close = (reason: MenuCloseReason): void => {
    requestClose(
      restoreFocus.current && (reason === "activate" || reason === "dismiss")
        ? "trigger"
        : "none",
    );
    restoreFocus.current = false;
  };
  ```
  Keep `restoreFocus` as the "opened from the keyboard" flag. The layer passes
  `"dismiss"` for `keyDown` and `"outside"` otherwise, unchanged.
- `openAt`/`openFromKeyboard` keep their existing behaviour.

### 3.7 Tests (write first, run at `HEAD`, then apply §3.1–§3.6)

Each fixture is the suite's existing one, extended with a controlled `open` prop
where it has none. Every case states the bug in the file's header comment.

1. `src/behaviour/popover.test.tsx` — `Filters` and `Columns` gain optional
   `open`/`onOpenChange`.
   - **does not take focus from a controlled close the caller refuses** (already
     added as the probe): forced-open `Filters`, Escape, panel still defined,
     focus still `panel`.
   - **keeps Tab inside a panel whose close the caller refuses**: forced-open
     `Columns`, focus `first`, Tab to `third`, Tab again; panel still defined,
     focus still `third` (at `HEAD`: `elsewhere`).
2. `src/behaviour/preview-card.test.tsx` — the controlled `Workspace` fixture
   already takes `open`/`onOpenChange`.
   - **keeps focus inside a card whose close the caller refuses**: forced open,
     focus `inside`, Escape; card defined, focus `inside` (at `HEAD`: `trigger`).
   - **restores focus when the same card is later closed for real**: a fixture
     that refuses the first close and accepts the second; the second Escape
     closes and focuses `trigger`.
3. `src/behaviour/navigation-menu.test.tsx` — force the existing `Workspace`
   with `value="platform"` and a recording `onValueChange`.
   - **keeps focus in a panel whose close the caller refuses**: focus
     `link-overview`, Escape; panel defined, focus `link-overview` (at `HEAD`:
     `trigger-platform`).
4. `src/behaviour/notification-centre.test.tsx` — `Centre` gains optional
   `open`.
   - **keeps focus in a panel whose close the caller refuses**: `open`,
     Escape; panel shown, focus is not `bell`.
5. `src/behaviour/context-menu.test.tsx` — add `RefuseClose` fixture that
   accepts the open and refuses the close.
   - **keeps focus in a keyboard-opened menu whose close is refused**:
     `Shift+F10`, Escape; menu defined, focus is still one of the menu rows
     (at `HEAD`: `row`).

The existing accepted-close cases in all five suites are the other direction and
must stay green: Escape returns focus, Tab leaves past the trigger, outside
presses do not steal focus back.

### 3.8 Docs, inventory and counts

- `packages/components/docs/popover.mdx` — verification `20 tests` → `22`; one
  sentence: a controlled close the caller refuses leaves the panel and focus
  where they are, and focus moves only when the close is accepted.
- `packages/components/docs/preview-card.mdx` — `16` → `18`; the same sentence
  for Escape (the hover close never moves focus).
- `packages/components/docs/navigation-menu.mdx` — `23` → `24`; the same
  sentence.
- `packages/components/docs/notification-centre.mdx` — `19` → `20`; the same
  sentence.
- `packages/components/docs/context-menu.mdx` — `22` → `23`; the same sentence,
  scoped to a keyboard-opened menu (a pointer-opened menu never restored focus).
- `docs/component-api.md` §2 — one bullet: a refused state request leaves the
  surface and the user's focus alone; focus restoration belongs to the accepted
  transition (plan 704).
- `COMPONENTS.md` — the five rows' counts: Popovers 20 → 22, Preview Card 16 →
  18, Navigation Menu 23 → 24, Notification centre 19 → 20, Context menus 22 →
  23, each with the refused-close clause.
- `TODO.md` — one ticked Tier 2 hardening entry naming the five surfaces.
- `.agents/slop/plans/README.md` — index this plan.
- `PLAN.md` D30 — record `704` and why.

## 4. Test plan

- **Can the tests fail?** Yes. Run every new case at `HEAD` first and record the
  failure: Popover, Preview card, Navigation menu and Notification centre fail on
  `focusedTestId` (trigger instead of the panel or the control inside it), and
  Context menu fails on the focused row it left. A case that passes at `HEAD` is
  measuring the wrong thing — stop and report.
- **Both-direction proof:** after the fix, revert one component at a time (put
  the immediate `focusElement` back) and confirm exactly that suite's new case
  fails; restore.
- **Stale intent:** the PreviewCard second case and the existing outside-press
  cases pin that a refused Escape's intent does not survive into a later close.
- **No regression:** all five affected suites keep their other results,
  including the recorded plan-540 binding failures (Popover's three placement
  cases, PreviewCard's placement/dismissal cases, Context menu's right-edge
  submenu case — unchanged by this plan).
- `check-types`, `check`, `lint`, `test` pass; the full native suite is re-run
  once at the end and its only failures are the recorded plan-540 set.

## 5. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/popover.test.tsx \
  src/behaviour/preview-card.test.tsx \
  src/behaviour/navigation-menu.test.tsx \
  src/behaviour/notification-centre.test.tsx \
  src/behaviour/context-menu.test.tsx
# before: the 7 new cases fail for the reasons in §3.7
# after: 7 new cases pass; the suites' pre-existing plan-540 failures are the
# only reds (record the exact counts from the run — do not copy them from prose)
```

Then:

```sh
nub run check-types
nub run check        # inventory rows and docs verification lines hold the counts
nub run lint
nub run test         # unit suite, no native binding needed
nub run --filter @gpuixui/components test:behaviour   # end-of-task native run
```

The five touched suites plus the unit suite are the scoped gate while iterating;
the full native run is the end-of-task check because the shared hook is
cross-cutting.

## 6. STOP conditions

- A surface's close path does not go through one request function (for example
  the runtime closes it outside our handler): stop and record the path; do not
  guess where focus should go.
- `useCloseFocus` cannot run in the root because `open` is not owned there: stop
  and report the component; the hook belongs where the controlled state lives.
- A new case passes at `HEAD`: stop and report the measured tree — the surface
  already defers, or the test does not press the layer that owns the event.
- The context-menu keyboard flag cannot be preserved with the token: stop and
  report; do not drop the keyboard-opened focus restoration (its existing case
  is a shipped contract).
- An existing accepted-close test changes result: stop; this plan must not alter
  what an accepted close does.

## 7. Acceptance

- A controlled `Popover`, `PreviewCard`, `NavigationMenu`,
  `NotificationCentre` or keyboard-opened `ContextMenu` that refuses a close
  stays painted **and** keeps focus where it was; no new focus move happens
  until a close is actually accepted.
- An accepted close still restores focus exactly as the five suites already
  specify (Escape to the trigger, Tab past the trigger for Popover, outside
  presses never steal focus back).
- Seven new native cases fail at `HEAD` and pass after; docs, `COMPONENTS.md`,
  `docs/component-api.md`, `TODO.md`, the plan index and `PLAN.md` D30 agree with
  the code and the new counts (Popover 22, Preview card 18, Navigation menu 24,
  Notification centre 20, Context menu 23).
