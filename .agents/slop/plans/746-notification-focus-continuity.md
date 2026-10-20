# 746 — A notification row that vanishes must not take the reader's focus with it

**Phase:** F (integration and polish, Tier 2/5 hardening)
**Owner:** `components` workstream (`packages/components`)
**Depends on:** 110, 112, 117, 200, 201, 326, 510, 540, 576, 583, 608, 644, 708,
712, 741
**Number:** `746` is the first free number across every worktree — the
tokens-theme workstream claimed `744` and `745`; `742`/`743` are primitives and
components, and the playground's latest numbers are in the `700`s (`PLAN.md`
D30).

**Status: done** (2026-10-20) — Notification centre 25/25 in the real renderer;
the two removal cases fail at `HEAD` (`focused = None`) and the trigger pin
passes; `check`, `lint` and `test` exit `0` (unit 488 in 46 files).

---

## 1. The defect

`NotificationCentreList` renders every notification as a `role="button"` row with
`tabIndex={-1}`. Keyboard focus reaches a row only through the reading cursor:
`ArrowDown`/`ArrowUp` call `renderer.focusElement(row.id)`, and the active row
paints the accent fill plus the token focus ring. `docs/notification-centre.mdx`
→ **Keyboard** promises: *"The panel is focused when it opens. `ArrowDown` /
`ArrowUp` move the active row… The feed scrolls the active row into view with an
8 px margin, so the reading cursor never leaves the panel."*

Measured on this host (2026-10-20) with a throwaway
`src/behaviour/zz-probe.test.tsx` (deleted before this plan lands), against the
real `TestRenderer`:

| step | observation | verdict |
| ---- | ----------- | ------- |
| open the panel, `ArrowDown` | `focused = feed-b`, `active = b` | correct |
| rerender with `b` removed | `focused = None` | **defect** |
| the same rerender | the highlight falls back to `a` (`active` memo) | the paint recovers, focus does not |

So the reading cursor's **paint** survives a data update while its **focus**
does not: the app removes the notification the user is on (a very common inbox
move after `onRead`, `onClear` or a live feed dropping an old item), the host is
destroyed under the user, and every later key is delivered to the panel with no
focused row. The panel stays open, so the user sees a highlighted row that is
not actually focused.

This is the class plans 510, 708 and 712 fixed for `List` and `Tabs`: a native
focus change runs no React `onFocus`, and a removed host can no longer be read,
so the holder must be remembered **while it exists** and focus handed to the
live tab stop only when the panel itself held it.

## 2. The rule and the fix

**Rule.** When a notification row that the panel's reading cursor focused (or
that the app removed at the reading position) disappears, and native focus is
now on **nothing**, hand native focus to the row the component already exposes
as active — the first live notification — and reveal it. If any other host holds
native focus (a header action, the trigger, the app), leave it alone. If the
panel is closed, do nothing.

Only the notification id is remembered, not a host id: the removed host's id is
unreadable afterwards, and the active fallback is already the live row the paint
names.

### 2.1 `packages/components/src/notification-centre.tsx`

1. In `NotificationCentre`, add a holder ref beside `activeId`:

   ```ts
   /** The row the reading cursor last focused, remembered while it exists. */
   const heldRow = useRef<Option.Option<string>>(Option.none());
   ```

2. Record the holder in `setActive`, which every path that moves the reading
   cursor already calls (`moveActive`, a row press):

   ```ts
   const setActive = useCallback((id: string) => {
     heldRow.current = Option.some(id);
     setActiveId(Option.some(id));
   }, []);
   ```

3. Forget an active id that names no live notification, so a refill cannot
   resume it (the plan-510 rule). A plain `Option.getOrThrow` is avoided; the
   comparison is by reference:

   ```ts
   useEffect(() => {
     setActiveId((current) => {
       const live = Option.filter(current, (id) =>
         Arr.some(notifications, (item) => item.id === id),
       );
       return Option.isSome(current) && Option.isNone(live)
         ? Option.none()
         : current;
     });
   }, [notifications]);
   ```

4. Add the handover layout effect after the active memo:

   ```ts
   /**
    * A row the reading cursor was on can disappear under the user (a read, a
    * clear, a live feed dropping an old item). The host is gone, so the sample
    * cannot be read afterwards; the holder was remembered while it existed.
    * Hand a lost focus to the live row the accent already names, and reveal it,
    * but never steal focus from another control (plans 510/708/712).
    */
   useLayoutEffect(() => {
     const held = heldRow.current;
     if (Option.isNone(held)) return;
     if (Arr.some(notifications, (item) => item.id === held.value)) return;
     heldRow.current = Option.none();
     const focused = renderer?.getFocusedElementId?.() ?? null;
     if (focused !== null) return;
     Option.match(active, {
       onNone: () => undefined,
       onSome: (id) => {
         const row = rowRefs.current.get(id);
         if (row === undefined) return;
         renderer?.focusElement?.(row.id);
         revealRow.current(id);
       },
     });
   });
   ```

   No dependency array: the effect must run on every render, because the row
   registry and `active` settle in the same commit the removal renders in.
   `rowRefs` and `revealRow` are the root's refs, already populated by
   `NotificationCentreList`.

5. Import `useLayoutEffect` (already imported? check) and keep `useEffect` for
   step 3. `Arr` and `Option` are already imported.

### 2.2 What must not change

- Opening the panel still focuses the surface, not a row; the first `ArrowDown`
  still lands on the **second** notification, because the active fallback is
  already the first (plan 644's behaviour).
- `onRead`, `onMarkAllRead` and `onClear` remain requests; the centre writes
  nothing.
- The prepend re-anchor, the 8 px reveal, grouping, the badge, the dismiss
  stack, the held-trigger press and the header-action key ownership are
  untouched.
- A removal while focus is on the trigger, a header action or the app must not
  move focus (the two pins).
- A *surviving* row that holds focus and a removal elsewhere must not move
  focus (the second pin).

## 3. Test plan

File: `packages/components/src/behaviour/notification-centre.test.tsx` (real
GPUix renderer). Add one helper if it keeps the cases readable:

```ts
/** The panel's native id, for sending real keys to it. */
const panelId = (root: ComponentTestRoot): number => {
  const panel = root.renderer.findByTestId("panel");
  if (panel === undefined) throw new Error("behaviour: the panel is not open");
  return panel.id;
};
```

The file already has `press`; reuse it.

1. **New** `hands focus to the first live row when the focused notification is
   removed`:
   - `renderComponent(<Centre notifications={seed} defaultOpen />)`;
   - `press(root, "down")` once → `focusedTestId(root)` is
     `Some("feed-review")` (the fallback already starts at `deploy`);
   - `root.rerender(<Centre notifications={seed.filter((item) => item.id !== "review")} />)`;
   - assert `focusedTestId(root)` is `Some("feed-deploy")`, the panel is still
     shown, and `feed-deploy` is shown.
   - At `HEAD` this reads `None` (the probe's exact measurement).

2. **New pin** `does not steal focus when a row is removed while the trigger
   holds it`:
   - open, `press(root, "down")` (so a row is remembered as the holder), then
     `focusElement(bell)`; remove `review`; assert focus is still `bell` and the
     panel is open.
   - At `HEAD` this passes too; it fails if the handover drops its
     `focused !== null` guard (measured: focus moves to `feed-deploy`).

3. **New** `remembers a surviving row across another removal before handing
   over`:
   - open, `press(root, "down")` → focus `feed-review`; remove `token`
     (a *different* row) and assert focus is still `feed-review` — an unrelated
     removal must not forget the holder;
   - remove `review` too; assert focus is now `feed-deploy`.
   - At `HEAD` the second half reads `None`, so this case is red at `HEAD`; it
     also fails if the handover forgets a live holder (the first half loses the
     later handover) or skips the "still live" check.

Suite 22 → 25 cases.

### Both-direction proof (measured)

- New tests 1 and 3 + the old component: **2 failed / 23 passed**, both on
  `expected Some("feed-deploy"), got None`.
- Tests 1 and 3 + the fix: 25/25.
- Remove only the `focused !== null` guard → test 2 fails (`bell` becomes
  `feed-deploy`), 1 failed.
- Remove only the "still live" check on the holder → tests 1 and 3 fail
  (2 failed: the holder is forgotten by the unrelated removal).
- Remove only `heldRow.current = Option.some(...)` from `setActive` → tests 1
  and 3 fail (2 failed), proving the holder is the signal.
- Remove the reveal call → test 1 still passes on focus; the reveal half is
  covered by the existing plan-644 cases, so do not claim a new proof for it.

## 4. Documentation and inventory sync (all required before "done")

1. `packages/components/docs/notification-centre.mdx`
   - **Keyboard**: add one sentence — *"If the row the reader is on disappears
     (a read, a clear, a live feed), the cursor and native focus move to the
     first live row instead of being stranded; a removal while another control
     holds focus leaves that focus alone."*
   - **Accessibility and limitations**: replace the "best-effort" sentence with
     the measured rule: the holder is remembered while the row exists, because
     the host cannot be read after removal.
   - **Verification**: 22 → 25 and name the removal handover and its two pins.
2. `COMPONENTS.md` → **Notification centre** row: 22 → 25 and the continuity
   rule in the notes.
3. `src/notification-centre.tsx` → `notificationCentreMeta.limitations`: add
   *"a focused row that is removed hands focus to the first live row only when
   nothing else holds native focus; a removal inside the commit is not
   distinguishable from a lost focus"*.
4. `TODO.md` → under *Tier 2 hardening after the inventory closed*, add the
   ticked row for plan 746 with the measurement, counts and gates.
5. `.agents/slop/plans/README.md` → add the 746 row with its status.
6. `PLAN.md` D30 → append that tokens-theme claimed 744/745 and 746 is this
   plan; the next components overflow plan is `747`.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

| Command | Expected |
| ------- | -------- |
| `cd packages/components && nub run test:behaviour notification-centre` | **before**: 22 passed. **after**: 25 passed. |
| the same with the old `notification-centre.tsx` and the new tests | test 1 fails with focus `None`; pins 2 and 3 pass |
| `nub run check` | exit 0 (types, unit suite, inventory/docs count check agreeing with 25) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

The full native suite is **not** required for this change (not cross-cutting).
The recorded baseline is 922 passed / 28 failed of 950 (the plan-540 binding
classes); if run, expect one extra pass and no new failure.

## 6. STOP conditions

Stop and report with evidence if any of these happen:

- `getFocusedElementId()` still reports the removed row's host after the
  rerender (the host is not gone), so the "lost focus" test cannot be
  distinguished from a live row — the fix needs a different signal.
- The handover moves focus on the **first** render of a closed panel (the
  holder is seeded from a stale mount) — do not add a timer; report it.
- `root.rerender` remounts the root (the open state resets), so the case cannot
  exercise a removal in place — report the harness behaviour instead of
  switching to a click-driven fixture.
- A pin starts failing: the guard is too broad; tighten the effect rather than
  changing the pin.

## 7. Acceptance

- Removing the focused notification hands native focus to the first live row and
  reveals it; the panel stays open.
- A removal while any other host holds focus does not move focus.
- A removal elsewhere does not move focus from a surviving row.
- Test 1 fails at `HEAD` for the measured reason and passes after; the two pins
  fail when their half of the guard is removed.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 are synced;
  the docs' stated count is the suite's real count.
- `nub run check`, `nub run lint` and `nub run test` exit `0`.
- The change is committed on `agent/components` and pushed (never to `master`).
