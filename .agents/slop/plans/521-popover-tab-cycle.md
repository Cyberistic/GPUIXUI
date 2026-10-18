# 521 — Popover: Tab walks the panel's controls and leaves at the ends

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `112` (popover), `323` (placement), `326`/`327` (behaviour harness), `379` (the live Tab finding), `514` (Escape claims) |
| Status | done — 5 new native cases + 1 strengthened (Popover 17, behaviour 677); four mutation proofs |

## 1. The problem

`PopoverContent` closes on `Tab` and does **not** move focus anywhere:

```ts
Match.when(isTab, () => setOpen(false)),
```

Two measured defects on this host, real `TestRenderer`, 2026-10-18:

| Probe | Result |
| ----- | ------ |
| open a popover, press `Tab` once | the panel unmounts and `getFocusedElementId()` is `null` — the keyboard user is stranded with nothing focused |
| open a popover with two buttons, focus the first, press `Tab` | the panel closes and focus is `null` — the second button is unreachable |

The package's own `examples/popover.example.tsx` is exactly this shape: a
four-toggle column chooser inside a `PopoverContent`. A keyboard user can open it
and can never reach the second column. This is not a runtime limitation — the
renderer provides `focusNextWithin`/`focusPreviousWithin`, `focusNext`,
`focusPrevious` and `getElementBounds`, and the measurements below show they do
what the fix needs.

Measured facts the fix is built on (all on this host, 0.10.0):

| Probe | Result |
| ----- | ------ |
| `focusNextWithin(surface)` with three controls | `first → second → third → first` (wraps in the surface) |
| `focusPreviousWithin(surface)` from the surface | the **last** control |
| `focusNextWithin(surface)` with no tab stops | focus stays on the surface |
| `focusNextWithin(surface)` while the surface is **not** focused | moves to the first control |
| `focusElement(trigger)` then `focusNext()` while the panel is open | the next app control after the trigger (`elsewhere`); the panel is skipped |
| `focusElement(trigger)` then `focusPrevious()` while the panel is open | the previous app control (`before`) |
| moving focus with `focusNextWithin`/`focusPreviousWithin` | dispatches the controls' `onFocus`/`onBlur` — so a hidden "probe both ends on open" is observable and is **not** used here |

## 2. The contract

1. On open, focus moves to the **first tab stop inside the panel** (or to the
   panel itself when it has none). `autoFocus={false}` keeps the caller's focus
   handling, as `DatePicker` already relies on.
2. `Tab` moves to the next control **inside** the panel and keeps it open.
3. `Tab` past the last control closes the popover and continues with the app's
   next control **after the trigger**; `Shift+Tab` before the first control
   closes it and continues backwards.
4. A popover with no tab stops closes on `Tab` (as before) but focus now
   continues instead of being lost.
5. The panel's tab cycle is bounded by the stops visited since it opened. A
   wrap, or a first stop removed while open, therefore closes the popover after
   at most one extra Tab; it can never trap the user.

## 3. Scope

**In scope**

- `packages/components/src/popover.tsx`: the focus seed, the Tab/Shift+Tab rule,
  the close-and-continue helper, and the module header.
- `packages/components/src/behaviour/popover.test.tsx`: new fixtures and tests.
- `packages/components/docs/popover.mdx`: dismissal table, focus section,
  limitations, verification count.
- `COMPONENTS.md` (Popover row and count), `TODO.md` (hardening entry),
  `.agents/slop/plans/README.md` (this plan).

**Out of scope — do not touch**

- No change to Escape, outside presses, placement, the dismiss stack, or the
  trigger's re-open guard.
- No change to `DropdownMenu`, `ContextMenu`, `NavigationMenu` or `PreviewCard`:
  a menu is arrow-navigated and closes on Tab by design; their panels are
  separate rows if they need the same treatment.
- No tab-stop enumeration API (the renderer has none) and no focus probe that
  would fire consumer `onFocus` handlers on open.
- No `DatePicker` change: it already passes `autoFocus={false}` and focuses its
  day cell itself.
- No files outside `packages/components/`, `COMPONENTS.md`, `TODO.md` and this
  plan set.

## 4. Files and exact changes

### 4.1 `packages/components/src/popover.tsx`

1. Imports: add `useState`? No. Add `Arr` from `effect/Array` for the visited
   lists and `type NativeRenderer` from `@gpuix/react` (it already imports
   `useGpuix`).
2. Destructure `autoFocus = true` in `PopoverContent`, and stop forwarding it
   through `...rest`. Pass `autoFocus={false}` to `FloatingLayer`: this component
   now owns where focus lands (the runtime's autofocus otherwise runs after
   effects and would override it).
3. Add two local helpers above `PopoverContent`:

   ```ts
   /** Whether `innerId`'s centre lies inside `outerId` (bounds are all we have). */
   const inside = (
     renderer: NativeRenderer | undefined,
     outerId: number,
     innerId: number,
   ): boolean => { … }

   /** The last tab stop inside `surfaceId`; `null` when it has none. */
   const firstTabStopOf = (
     renderer: NativeRenderer | undefined,
     surfaceId: number,
   ): number | null => {
     renderer?.focusNextWithin?.(surfaceId);
     const focused = renderer?.getFocusedElementId?.() ?? null;
     return focused !== null && focused !== surfaceId && inside(renderer, surfaceId, focused)
       ? focused
       : null;
   };
   ```

   `inside` mirrors the bounds-centre test `internal/reveal.tsx` already uses
   (`focusedInside`); it is local because the two surfaces want different
   fallbacks.

4. `PopoverContent` state:

   ```ts
   const firstTabStop = useRef<number | null>(null);
   const visitedForward = useRef<ReadonlyArray<number>>([]);
   const visitedBackward = useRef<ReadonlyArray<number>>([]);
   ```

5. Seed on open (one `useLayoutEffect`):

   ```ts
   useLayoutEffect(() => {
     firstTabStop.current = null;
     visitedForward.current = [];
     visitedBackward.current = [];
     const element = surface.current;
     if (!open || element === null || !autoFocus) return;
     const first = firstTabStopOf(renderer, element.id);
     if (first === null) {
       renderer?.focusElement?.(element.id);
       return;
     }
     firstTabStop.current = first;
     visitedForward.current = [first];
   }, [autoFocus, open, renderer]);
   ```

   This is the only focus move on open: when the panel has controls, focus lands
   on the first one (a legitimate "focus entered the popover" event); with no
   controls it lands on the surface as before. It never probes the last control,
   so no extra `onFocus`/`onBlur` fires.

6. `leave(backwards)` helper:

   ```ts
   const leave = (backwards: boolean): void => {
     setOpen(false);
     const target = trigger.current;
     if (target === null) return;
     renderer?.focusElement?.(target.id);
     if (backwards) renderer?.focusPrevious?.();
     else renderer?.focusNext?.();
   };
   ```

   Measured: from the trigger these move to the app control before/after it while
   the panel is still mounted, so focus is never lost.

7. `handleTab(backwards)` helper, called from the surface's `onKeyDown` `isTab`
   branch instead of `setOpen(false)`:

   ```ts
   const handleTab = (backwards: boolean): void => {
     const element = surface.current;
     if (element === null) return;
     const current = renderer?.getFocusedElementId?.() ?? null;
     const first = firstTabStop.current;

     if (backwards) {
       if (first === null || current === first) { leave(true); return; }
       renderer?.focusPreviousWithin?.(element.id);
       const previous = renderer?.getFocusedElementId?.() ?? null;
       if (previous === null || previous === element.id ||
           !inside(renderer, element.id, previous) ||
           Arr.contains(visitedBackward.current, previous)) { leave(true); return; }
       visitedBackward.current = Arr.append(visitedBackward.current, previous);
       return;
     }

     // A wrap closes: the target is the first stop, or a stop already visited.
     renderer?.focusNextWithin?.(element.id);
     const next = renderer?.getFocusedElementId?.() ?? null;
     if (next === null || next === element.id ||
         !inside(renderer, element.id, next)) { leave(false); return; }
     if (first === null) {
       // No seed (autoFocus={false}): only a move from the surface can seed.
       if (current !== element.id) { leave(false); return; }
       firstTabStop.current = next;
       visitedForward.current = [next];
       return;
     }
     if (next === first || Arr.contains(visitedForward.current, next)) { leave(false); return; }
     visitedForward.current = Arr.append(visitedForward.current, next);
   };
   ```

8. In `onKeyDown`, replace the Tab branch with `Match.when(isTab, (value) => handleTab(value.modifiers?.shift === true))`.
9. Rewrite the module header's Tab bullet: Tab walks the panel's tab stops and
   closes only when it leaves; focus continues with the app control after the
   trigger.
10. `popoverMeta.limitations`: replace the "Tab closes" wording with the new
    contract and the `autoFocus={false}` note.

### 4.2 `packages/components/src/behaviour/popover.test.tsx`

Header comment: add the two guarded bugs (Tab strands focus; Tab closes a
multi-control panel before the second control is reachable).

New fixtures:

- `Columns` — a trigger, three buttons (`first`/`second`/`third`) inside the panel,
  a `before` button above and an `elsewhere` button below.
- `Removable` — a panel whose first control unmounts when the second control is
  pressed (`useState` inside the fixture).

New tests (names are the both-direction proof targets):

1. **opens with focus on the first control** — `focusedTestId` is `some("first")`.
2. **moves to the next control on Tab and keeps the panel open** — Tab twice:
   `second`, then `third`, panel defined.
3. **closes past the last control and continues with the next app control** —
   from `third`, Tab: panel gone, `focusedTestId` is `some("elsewhere")`.
4. **walks backwards on Shift+Tab and leaves before the first control** — from
   `second`, Shift+Tab → `first` (panel open); Shift+Tab → panel gone,
   `focusedTestId` is `some("before")`.
5. **closes instead of trapping when the first control is removed** — open,
   Tab to the removing control, press it, then Tab: panel gone and focus is
   `some("elsewhere")`.

Update the existing **closes on Tab** test to assert focus moved to `elsewhere`
instead of only asserting the panel is gone (that was the stranded-focus defect).
Update the stated count in the header if it names one.

### 4.3 `packages/components/docs/popover.mdx`

1. Dismissal table: replace the `Tab` row and add `Shift+Tab`:
   `Tab` → "moves to the next control inside the panel; past the last one it
   closes and focus continues after the trigger"; `Shift+Tab` → "the same,
   backwards".
2. **Focus and keyboard**: focus moves to the panel's first control on open (the
   panel itself when it has none). Tab walks its controls instead of closing on
   the first press. The panel closes at the ends and focus continues with the app
   control after the trigger, so a keyboard user is never left with nothing
   focused. `autoFocus={false}` leaves focus to the caller and Tab then closes.
3. **Accessibility and limitations**: note that the renderer has no tab-stop
   enumeration, so the first tab stop is measured once on open; a stop removed
   mid-cycle costs one extra Tab before the panel closes, and the visited stops
   keep it from trapping.
4. **Verification**: update the count and describe the five new cases.

### 4.4 `COMPONENTS.md`

Append to the Popover row: "Tab walks the panel's tab stops and closes only at the
ends, where focus continues with the app control after the trigger (it is never
left on an unmounted surface); the first tab stop is measured on open, and the
visited stops bound the cycle so a removed one cannot trap". Update the test
count (12 → 17).

### 4.5 `TODO.md`

Under **Tier 2 hardening after the inventory closed (plans 120+)**, add and tick:

```
- [x] Popover: Tab walks the panel's controls and leaves at the ends — plan 521.
  Measured: Tab closed a two-control panel on the first press and left focus
  `null`. 5 new native cases + 1 strengthened (Popover 17, behaviour 677), four
  mutation proofs; docs, `COMPONENTS.md` and the inventory synced
```

### 4.6 `.agents/slop/plans/README.md`

Add plan 521 to the components table with the final counts once every gate is
green.

## 5. Commands and expected results

Run from `workspaces/components`.

```sh
nub run --filter @gpuixui/components check-types
# expected: exit 0

nub run --filter @gpuixui/components test
# expected: pass; the inventory/docs checks pick up the new counts

nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/popover.test.tsx
# expected after the change: 17/17 (12 before, one strengthened, five new)

nub run --filter @gpuixui/components test:behaviour
# expected: all files pass; behaviour total 672 → 677

nub run check
nub run lint
nub test
```

## 6. Both-direction proof

From `packages/components`:

1. Revert the `isTab` branch to `Match.when(isTab, () => setOpen(false))`. Run
   the popover file. Expected: 5 failures — the strengthened single-control case
   and tests 2–5. Restore.
2. Stop recording the measured first stop (`firstTabStop.current = null` after the
   probe). Expected: 3 failures (tests 2, 4 and 5); focus still lands on the first
   control because the probe itself moved it. Restore.
3. Drop the visited-stop check (`next === first` only). Expected: test 5 fails —
   the removed first stop no longer bounds the cycle. Restore.
4. Remove `leave`'s `focusNext`/`focusPrevious` (keep `focusElement(trigger)`).
   Expected: 4 failures — every case that asserts focus continues after (or
   before) the trigger, including the strengthened single-control case. Restore.
5. Re-run the file: 17/17.

Record the failing assertion names in the commit message body.

## 7. STOP conditions

Stop and report with evidence instead of improvising if:

- `focusNextWithin(surfaceId)` does not move focus when the surface is **not**
  focused (measured: it does) — then the seed cannot work without the runtime's
  autofocus and the plan needs revising;
- a control's `onFocus`/`onBlur` fires more than once on open, or for a control
  other than the first (the seed must make exactly one focus move);
- `focusNext()` / `focusPrevious()` after focusing the trigger do not reach the
  adjacent app control while the panel is open (measured: `elsewhere` /
  `before`);
- closing the panel between `focusElement(trigger)` and `focusNext()` makes the
  next call a no-op or moves focus into a stale id;
- `Tab` from a focused control does not reach the surface's `onKeyDown`;
- the existing popover suite's Escape/outside-press behaviour changes;
- a gate fails twice for the same reason.

## 8. Acceptance criteria

- Opening a popover focuses its first control; a panel with no controls focuses
  the surface (existing behaviour).
- Tab walks every control in the panel, then closes at the end and continues with
  the app control after the trigger. Shift+Tab is the mirror.
- A tab stop removed while the panel is open cannot trap focus: the visited stops
  close the popover after at most one extra Tab.
- The new and updated native tests fail on the old code paths in §6 and pass
  after.
- Docs, the inventory record, `COMPONENTS.md`, `TODO.md` and the plan index are
  synced, with the real test counts.
- `nub run check`, `nub run lint` and `nub test` pass; no probe files remain.
