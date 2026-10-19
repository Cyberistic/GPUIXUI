# 612 — A disabled date picker is inert, even when it is open

**Phase:** F (behaviour truth) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 110, 112, 117, 119, 127, 303, 323,
368, 375, 394, 396, 516, 602.

**Status when written:** open. `DatePicker`'s `disabled` prop only reaches the
trigger. The trigger is a `Button`, so a press cannot open the picker — the
existing suite pins that — but the **surface** is a separate tree. A caller that
opens the picker (`defaultOpen`, or a controlled `open`) with `disabled` still
gets a fully operable calendar: days focus and choose, the header browses
months, the month chooser opens, and the Clear action writes `null`.

**Status now:** done (2026-10-19) — the surface is inert, three native cases
pin it, and every gate is green. Results in §8.

This is the plan-394 contract ("disabled means inert: no hover, no press, no
ring, no tab stop") applied to the one popup it never reached: plan 394 swept
`TimePicker`'s segments, but not `DatePicker`'s calendar.

## 1. Measured bug (this host, 2026-10-19)

A throwaway `TestRenderer` probe under `vitest.behaviour.config.ts` rendered

```tsx
<DatePicker disabled defaultOpen defaultValue="2026-10-17" clearable today="2026-10-17">
  <DatePickerTrigger label="Due date" />
  <DatePickerContent><DatePickerCalendar /></DatePickerContent>
</DatePicker>
```

and observed the tree before any change:

| Observed | Value |
| -------- | ----- |
| surface painted | yes (`date-picker-content` exists) |
| focused element | `date-day-2026-10-17` (the open effect moves focus in) |
| day `tabIndex` | `0` |
| day focus ring | painted (`boxShadow`, ring colour) |
| day cursor | `pointer` |
| previous / next / month control `tabIndex` | `0` |
| Clear action | painted |
| grid `aria-description` | absent |

A second probe pressed the day and the Clear action. Both wrote through:

| Action | Observed `onValueChange` |
| ------ | ------------------------ |
| press `date-day-2026-10-18` | `"2026-10-18"` |
| press `date-clear` | `null` |

The probes were deleted after the measurement. Their assertions are the ones
written into the real suite in §5 (as the fixed expectations).

## 2. Decision

`disabled` makes the **painted** picker inert; it does not unmount a surface the
caller forced open. That keeps the component consistent with `TimePicker` (a
disabled control stays visible and dimmed, but ignores input) and avoids a
controlled `open` silently disappearing.

1. **The value cannot change.** `choose` returns before `setSelected` when
   `disabled`; `clear` returns before `setSelected`. These are the authoritative
   guards — every other guard below is about the interaction surface.
2. **The calendar is not operable.** No day or month cell is a tab stop, has a
   click handler, paints a hover, or paints the focus ring. The arrow/Home/End/
   PageUp/PageDown handler and the chooser handler return immediately.
3. **No focus is taken into an inert surface.** The open effect still records
   that the surface opened, but does not move focus onto a day. A picker that
   turns disabled while open therefore keeps native focus where it was (nothing
   is stolen); the day it may be on stops painting a ring and stops being a tab
   stop.
4. **The header is inert.** Previous/next month or year, and the month label,
   are disabled (the local `Button` already drops handlers, leaves the tab
   order and announces `Disabled` through `aria-description`), so the month
   chooser cannot be opened and months cannot be browsed.
5. **The grid announces its state.** Both grids spread
   `stateDescription(disabled)`, the package's supported channel (plan 516),
   because 0.10.0 has no `aria-disabled`.
6. **Clear is absent while disabled.** `TimePicker` already hides its clear
   control when disabled; `DatePicker` does the same. Nothing a user cannot do
   should be painted as an action.

The day/month accessible names are unchanged: a disabled picker is not a set of
individually unavailable days, and the grid description carries the state. A
selected day keeps its primary paint (a disabled input still shows its value)
but loses the ring, hover, cursor and tab stop.

## 3. Files to create or change

| Action | Path | What |
| ------ | ---- | ---- |
| change | `packages/components/src/date-picker.tsx` | guard `choose`/`clear`; the calendar reads `disabled`, guards keys/focus/open, disables the header, removes cells from the tab order, suppresses hover/ring/clicks, hides Clear, adds `stateDescription` |
| change | `packages/components/src/behaviour/date-picker.test.tsx` | three native cases (§5) |
| change | `packages/components/docs/date-picker.mdx` | a Disabled section (inert surface, no focus, no Clear), accessibility and verification counts (`34` → `37`) |
| change | `COMPONENTS.md` | Date pickers row: the disabled guarantee and the native-test count |
| change | `TODO.md` | tick the task under Tier 2 hardening; refresh the gate counts if they moved |
| change | `.agents/slop/plans/README.md` | index this plan |
| change | `PLAN.md` | D30 records `612` as the claimed components number |

No new component, export or dependency.

## 4. Implementation

`date-picker.tsx`, root:

```ts
const choose = useCallback((day: DateTime.Utc): void => {
  if (disabled || !isAvailable(day, bounds)) return;
  setSelected(formatIsoDay(day));
  closeToTrigger();
}, [bounds, closeToTrigger, disabled, setSelected]);

const clear = useCallback((): void => {
  if (disabled) return;
  setSelected(null);
  closeToTrigger();
}, [closeToTrigger, disabled, setSelected]);
```

`DatePickerCalendar` destructures `disabled` from `useDatePicker()` and applies
the following:

- the open effect: after `wasOpen.current = true`, `if (disabled) return;`; add
  `disabled` to the dependency list (the `eslint-disable` line already covers the
  anchor comment; keep the existing deps and add `disabled`);
- `handleKeyDown` and `handleMonthKeyDown` start with `if (disabled) return;`;
- `openMonths` starts with `if (disabled) return;` (defence; the button is
  disabled);
- previous/next buttons: `disabled={disabled || !canBrowseMonth(...)}` (and the
  year pair likewise);
- the month label `Button`: `disabled={disabled}`;
- both `role="grid"` divs: `{...stateDescription(disabled)}`;
- day cells: `const interactive = available && !disabled;` use `interactive`
  for `onClick`, `cursor`, `hover`; `tabIndex={!disabled && iso ===
  formatIsoDay(tabbable) ? 0 : -1}`; ring `disabled ? {} : ...`;
- month cells: `const interactive = available && !disabled;` same treatment,
  `tabIndex={!disabled && index === monthFocus ? 0 : -1}`;
- Clear row: `clearable && !disabled && Option.isSome(selectedDay)`.

Import `stateDescription` from `./internal/state-description.js`. The root's
`disabled` guard makes the value safe even if a future part forgets a guard.

## 5. Test plan

`src/behaviour/date-picker.test.tsx`, header comment gains the bug: a disabled,
forced-open picker that still chose a day and cleared its value.

1. **"refuses a day and the clear action while disabled"** — render
   `<Picker disabled defaultOpen defaultValue="2026-10-17" clearable />`; assert
   `date-picker-content` is painted (the surface is not silently unmounted);
   press `date-day-2026-10-18`; `onValueChange` not called; `date-clear` is not
   shown.
2. **"leaves a disabled calendar with no tab stop, ring or header action"** —
   same fixture; assert `date-day-2026-10-17` has `tabIndex -1`, no
   `style.boxShadow`, `cursor "not-allowed"`; `date-prev`, `date-next` and
   `date-month` have `tabIndex -1` and `aria-description "Disabled"`; the grid's
   `aria-description` is `"Disabled"`; nothing is focused
   (`focusedTestId` is `None`).
3. **"ignores the arrow keys after it turns disabled"** — render enabled
   `defaultOpen defaultValue="2026-10-17"`; wait for the day focus; rerender with
   `disabled`; press `right` through the focused day; the focused day is still
   `date-day-2026-10-17`, no ring is painted, and `onValueChange` was not called.

Both directions, as measured: reverting `date-picker.tsx` to its state before
this plan fails all three cases (`3 failed | 1 passed | 33 skipped`; the pass is
the existing "does not open when disabled"). The root `choose`/`clear` guards
are defence in depth and are not independently observable through the UI: the
calendar's `interactive` gate removes the click handler, so removing only the
root guards still passes. Removing the calendar treatment while keeping the root
guards is likewise not a supported configuration — the two layers guard the same
action from opposite sides.

Commands (this host has the locally built `darwin-x64` binding):

```sh
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/date-picker.test.tsx
nub run --filter @gpuixui/components test
nub run check
nub run lint
```

Expected: the date-picker suite reports `37 passed`; the unit suite stays green;
`check` and `lint` exit `0`. The full native suite should be unchanged except
for the three added cases (the 35 recorded plan-540 binding failures are
pre-existing).

## 6. STOP conditions

- The `TestRenderer` will not paint a disabled, `defaultOpen` picker at all, so
  the measured probe in §1 cannot be reproduced. Stop: the decision in §2
  assumes the surface exists.
- A guard changes a **valid** picker's behaviour: any existing date-picker case
  fails. Stop and re-read the diff; a disabled picker must be the only change.
- The header `Button` does not report `Disabled` through `aria-description`, or
  a rendered disabled `IconButton` keeps `tabIndex 0`. Stop: this is the
  plan-516 contract and the test is asserting the wrong surface.
- A full native run shows failures outside the 35 named plan-540 cases. Stop
  and compare with the recorded baseline before claiming green.

## 7. Acceptance

- A disabled date picker never calls `onValueChange`, whether it was opened by a
  press, `defaultOpen` or a controlled `open`.
- Every interactive element in its surface is out of the tab order, inert and
  announced `Disabled` where the runtime supports it.
- `date-clear` is absent while disabled.
- The three native cases fail without the fix and pass with it.
- Docs, `COMPONENTS.md`, `TODO.md` and the plan index state the same contract and
  the same test count.

## 8. Results (2026-10-19, this host)

**Probe before the fix** — the forced-open disabled picker measured: content
painted, `date-day-2026-10-17` focused with `tabIndex 0` and a ring, day cursor
`pointer`, prev/next/month `tabIndex 0`, Clear painted, grid description absent;
a press on 18 reported `"2026-10-18"`, a press on Clear reported `null`.

**Probe after the fix** — the same fixture measured: content painted, nothing
focused, day `tabIndex -1`, no ring, cursor `not-allowed`, prev/next/month
`tabIndex -1` with `aria-description "Disabled"`, Clear absent, grid
`aria-description "Disabled"`.

**Tests** — `nub run test:behaviour src/behaviour/date-picker.test.tsx`:
`37 passed (37)`.

**Both directions** — `git show HEAD:.../date-picker.tsx` over the working file
and the same suite: `3 failed | 1 passed | 33 skipped` (the three new cases fail,
the pre-existing disabled-trigger case passes). Restored file: all 37 pass.

**Gates** (this worktree, 2026-10-19) — `nub run check` exit `0`; `nub run lint`
exit `0`; `nub run test` exit `0` (449 tests in 44 files); the full native suite
`776 passed / 35 failed of 811`, with every failure one of the recorded plan-540
binding defects (no new failure, and `date-picker.test.tsx` is not in the failed
list). The same counts are recorded in `TODO.md` Phase G.
