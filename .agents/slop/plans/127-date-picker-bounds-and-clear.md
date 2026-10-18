# 127 — DatePicker: bounded selection (`min`/`max`) and a clear action

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 119 (DatePicker), 117 (inventory gate)
- **Status:** done, 2026-10-17. 5 logic tests + 5 native tests as planned, plus a
  real ref-composition regression found on the way (3 more native tests).
  Counts and both-direction proof in §8.

`DatePicker` can express **which** day is chosen but not **which days are
choosable**, and it has no way back to "no date" from inside the control.

- Every real form that uses a date has a window: a booking, a deadline, a report
  range, a birth date in the past. Today the consumer must validate after the
  fact and render an error, because the picker will happily hand back a day
  outside the window.
- The docs and the example work around the missing clear by putting a separate
  `Button` next to the field (`examples/date-picker.example.tsx`). A consumer who
  does not do that cannot return to `null`: `value` is controlled, but there is
  no affordance in the component.

Both are inside the picker's existing design: the value is still an ISO day
string, the caller still owns it, and the grid stays six rows. This plan only
narrows the set of selectable cells and adds one action to the surface.

---

## 1. Files

```
packages/components/src/date-picker/calendar.ts        # DayBounds + four pure helpers
packages/components/src/date-picker/calendar.test.ts   # + 5 logic tests
packages/components/src/date-picker.tsx                # min/max/clearable props, clamped movement, clear row
packages/components/src/behaviour/date-picker.test.tsx # + 5 native tests
packages/components/docs/date-picker.mdx               # Bounds/Clearing sections, keyboard, limitations
packages/components/examples/date-picker.example.tsx   # use a booking window + clearable
packages/components/README.md                          # the date-picker row says constrained + clearable
packages/components/src/inventory.ts                   # datePickerMeta limitations
COMPONENTS.md                                          # Date / time pickers row
TODO.md                                                # tick the hardening task
README.md                                              # only if the repo status line changes (it does not)
.agents/slop/plans/README.md                           # index this plan
```

Read `packages/components/src/behaviour/date-picker.test.tsx` and
`src/date-picker/calendar.test.ts` before editing. Keep both suites' header
comments truthful: they name the bugs each suite guards.

## 2. Design decisions (do not re-litigate while implementing)

1. **Bounds are inclusive ISO days.** `min` is the first selectable day, `max`
   the last. Both are optional; absent means unbounded on that side.
2. **A malformed bound is ignored**, exactly like a malformed `value` today
   (`parseIsoDay` returns `None` and the trigger shows the placeholder). Document
   it; do not throw from render.
3. **`min` after `max` makes no day selectable.** This is fail-safe: the grid
   mutes every cell and activation does nothing. It is a caller bug and it is
   visible, not silent. Document it and test it.
4. **Bounds constrain choices, not a controlled value.** A controlled `value`
   outside the bounds is displayed as given; the picker must not rewrite the
   consumer's state. Document it.
5. **Keyboard movement clamps to the bounds instead of skipping.** Bounds have no
   interior gaps: everything before `min` and after `max` is unavailable. So
   clamping is exactly the "skip unavailable days" result with no loop, no
   iteration helper and no new collection abstraction.
6. **Month browsing stops at the bounds' months.** The previous/next controls are
   disabled at the min/max month, so a visible month always contains at least one
   selectable day (unless rule 3 applies). Month buttons keep their existing
   glyph; disabled state is the existing `IconButton` behaviour (out of tab order,
   dimmed, no handler).
7. **No `aria-disabled`.** `@gpuix/native@0.10.0` has no such prop (measured in
   `src/internal/button.tsx`). An unavailable cell is out of the tab order, does
   not activate, and its `aria-label` gains `", unavailable"`, which the host
   *does* support. Record this in `datePickerMeta.limitations`.
8. **Clear is opt-in.** `clearable` defaults to `false`, so existing consumers see
   no layout change. When `true` and a day is selected, the popover gets one
   right-aligned `Clear` row under the grid.

## 3. `src/date-picker/calendar.ts` — pure helpers

Append below `lastDayOfMonth`. Import nothing new: `Option`, `DateTime`, `pipe`
and `Match` are already imported (add `Match` from `effect`).

```ts
/** Inclusive day bounds; an absent side is unbounded. */
export interface DayBounds {
  readonly min: Option.Option<DateTime.Utc>;
  readonly max: Option.Option<DateTime.Utc>;
}

/** No bounds at all. */
export const unbounded: DayBounds = {
  min: Option.none(),
  max: Option.none(),
};

/** Parse the public ISO props; a malformed or absent bound is ignored. */
export const boundsOf = (
  min?: string | null,
  max?: string | null,
): DayBounds => ({
  min: Option.flatMap(Option.fromNullishOr(min), parseIsoDay),
  max: Option.flatMap(Option.fromNullishOr(max), parseIsoDay),
});

/** Whether `day` may be selected: both bounds are inclusive. */
export const isAvailable = (
  day: DateTime.Utc,
  bounds: DayBounds,
): boolean => {
  const millis = DateTime.toEpochMillis(day);
  return (
    Option.match(bounds.min, {
      onNone: () => true,
      onSome: (min) => millis >= DateTime.toEpochMillis(min),
    }) &&
    Option.match(bounds.max, {
      onNone: () => true,
      onSome: (max) => millis <= DateTime.toEpochMillis(max),
    })
  );
};

/** `day` moved inside the bounds; an unbounded side returns it unchanged. */
export const clampToBounds = (
  day: DateTime.Utc,
  bounds: DayBounds,
): DateTime.Utc => {
  const millis = DateTime.toEpochMillis(day);
  const lower = Option.match(bounds.min, {
    onNone: () => day,
    onSome: (min) =>
      millis < DateTime.toEpochMillis(min) ? min : day,
  });
  return Option.match(bounds.max, {
    onNone: () => lower,
    onSome: (max) =>
      DateTime.toEpochMillis(lower) > DateTime.toEpochMillis(max)
        ? max
        : lower,
  });
};

/** Whether the previous (`-1`) or next (`1`) month is browseable. */
export const canBrowseMonth = (
  viewMonth: DateTime.Utc,
  direction: -1 | 1,
  bounds: DayBounds,
): boolean => {
  const current = DateTime.toEpochMillis(startOfMonth(viewMonth));
  return Match.value(direction).pipe(
    Match.when(-1, () =>
      Option.match(bounds.min, {
        onNone: () => true,
        onSome: (min) =>
          current > DateTime.toEpochMillis(startOfMonth(min)),
      }),
    ),
    Match.when(1, () =>
      Option.match(bounds.max, {
        onNone: () => true,
        onSome: (max) =>
          current < DateTime.toEpochMillis(startOfMonth(max)),
      }),
    ),
    Match.exhaustive,
  );
};
```

`unbounded` has no consumer in the component (it computes `boundsOf` from props);
export it anyway because the logic suite uses it as the fixture and it documents
the absent case. If the compiler's unused-export rule objects, drop the export and
build the fixture with `boundsOf()`.

## 4. `src/date-picker.tsx`

### 4a. Props and JSDoc

Add three props to `DatePickerProps`, after `weekStartsOn`:

```ts
  /**
   * The first selectable ISO day, inclusive. Absent or malformed means no lower
   * bound. Bounds constrain choosing; they never rewrite a controlled `value`.
   */
  readonly min?: string;
  /** The last selectable ISO day, inclusive. Absent or malformed is unbounded. */
  readonly max?: string;
  /** Show a `Clear` action in the surface while a day is selected. Default `false`. */
  readonly clearable?: boolean;
```

Destructure with `clearable = false`; keep `min`/`max` as given.

### 4b. Derived bounds and movement

After `selectedIso`:

```ts
const bounds = boundsOf(min, max);
```

Then replace the three movement helpers' targets with
`clampToBounds(<existing target>, bounds)`:

- `moveDays`: `focusActive(clampToBounds(addDays(from, delta), bounds))`.
- `moveToWeekEdge`: clamp the computed edge day.
- `moveMonths`: clamp the month-length-clamped day.

Keep `focusActive` itself unchanged: it is the callback that sets the view
month, so a clamped target outside the current month moves the view correctly.

Guard selection in `choose` (defence in depth; clamped focus should already
prevent it):

```ts
const choose = (day: DateTime.Utc): void => {
  if (!isAvailable(day, bounds)) return;
  setSelected(formatIsoDay(day));
  closeToTrigger();
};
```

Extract the focus-return tail of `choose` so clear shares it:

```ts
/** Close the surface and hand focus back to the trigger. */
const closeToTrigger = (): void => {
  setOpen(false);
  const instance = trigger.current;
  if (instance !== null) renderer?.focusElement?.(instance.id);
};

/** Drop the selection and close. */
const clear = (): void => {
  setSelected(null);
  closeToTrigger();
};
```

Do **not** reset `viewMonth`/`active` on clear: the next open anchors on today,
and the closed surface has no visible month.

### 4c. Tabbable cell

Replace the existing `tabbable` expression so the tab stop is always a
selectable cell when the bounds permit one:

```ts
const tabbable = clampToBounds(
  Option.getOrElse(
    Option.filter(active, (day) => isSameDay(startOfMonth(day), viewMonth)),
    () => startOfMonth(viewMonth),
  ),
  bounds,
);
```

Known limit to document in the component header and the docs, not to work
around: when `min` is after `max` (rule 3), no cell is tabbable; the grid is
visible and inert.

### 4d. Grid cells

Inside the `onSome` branch, after `iso`, `isSelected`, `isToday`:

```ts
const available = isAvailable(day, bounds);
```

Then, in the cell element:

- `aria-label`: `formatDayLabel(day)` when available, otherwise
  `` `${formatDayLabel(day)}, unavailable` ``.
- `onClick`: `available ? () => choose(day) : undefined`.
- style `color` order: selected → `primaryForeground`; else unavailable →
  `mutedForeground`; else `foreground`. (A controlled out-of-bounds selection is
  still shown as selected: rule 4.)
- `cursor`: `available ? "pointer" : "not-allowed"`.
- `hover`: unchanged when selected; `undefined` when unavailable; otherwise the
  existing `theme.colors.hover`.

Leave `tabIndex`, `ref`, `testId`, `onFocus` and the focus ring unchanged. The
tab stop is clamped, and arrows clamp, so focus cannot land on an unavailable
cell while the bounds are valid.

### 4e. Month controls

```tsx
<IconButton
  label="Previous month"
  size="sm"
  testId="date-prev"
  disabled={!canBrowseMonth(viewMonth, -1, bounds)}
  onClick={() => setViewMonth(addMonths(viewMonth, -1))}
>
```

and the mirror with `1` for `date-next`. The `onClick` stays; `IconButton`
drops it while disabled, which is the existing disabled contract. Do not change
the glyphs.

### 4f. Clear row

After the grid `</div>`, before `</PopoverContent>`:

```tsx
{clearable && Option.isSome(selectedDay) ? (
  <div style={{ display: "flex", justifyContent: "flex-end" }}>
    <Button
      variant="ghost"
      size="sm"
      testId="date-clear"
      onClick={clear}
    >
      Clear
    </Button>
  </div>
) : null}
```

Add `Button` to the existing `./internal/button.js` import (`IconButton` is
already there). The row appears only while a value is selected, so the surface
does not change height for the empty case.

### 4g. Component header

The header comment currently lists the known scope. Replace the scope sentence
with the new facts: the value is an ISO day, `min`/`max` bound selection
inclusively, movement clamps, and `clearable` adds the reset. Keep the fixed
English labels and no-time-picker notes.

## 5. Tests

### 5a. `src/date-picker/calendar.test.ts` (pure, +5)

Extend the header comment with the new guarded bugs: *a bound treated as
exclusive dropped the first and last legal day; a malformed bound crashed instead
of being ignored; movement past a bound landed on an unavailable day; the month
controls browsed past the bound's month; `min` after `max` still allowed a
selection.*

Add a `bounds` describe. Use the existing `day(iso)` fixture.

1. `boundsOf` parses both bounds, ignores `undefined` and malformed strings, and
   returns `None` for each side.
2. `isAvailable` is inclusive at `min` and `max`, false one day outside each, and
   true everywhere with `unbounded`.
3. `clampToBounds` returns the bound below/above and the day itself inside.
4. `canBrowseMonth` is false for `-1` in the min month, false for `1` in the max
   month, true between, and true on both sides when unbounded.
5. `min` after `max` makes no day available while both still parse.

Expected: `src/date-picker/calendar.test.ts` 13 → 18 tests.

### 5b. `src/behaviour/date-picker.test.tsx` (native, +5)

Extend the header comment with the new guarded bugs: *a click on an
out-of-range day produced a value; arrow keys walked past `min`/`max`; the month
controls browsed past the bound; a picked day could not be cleared from the
surface; Clear appeared without a value or without `clearable`.*

Extend the local `Picker` wrapper with `min`, `max`, `clearable`.

1. **An unavailable day does not select or close.**
   - `<Picker min="2026-10-17" onValueChange={spy} />`, open, click
     `date-day-2026-10-16`;
   - `onValueChange` not called, `date-picker-content` still present, trigger
     still says `Pick a date`;
   - the cell's `customProps["aria-label"]` is
     `"16 October 2026, unavailable"`.
2. **Arrow movement clamps at the bound.**
   - `<Picker defaultValue="2026-10-18" min="2026-10-17" />`, open (focus is
     `date-day-2026-10-18`), press `left` twice;
   - focus is `date-day-2026-10-17`, and the value is still the 18th
     (`getAllText` contains `18 October 2026` and not `17 October 2026`).
3. **The month controls stop at the bound's month.**
   - `<Picker defaultValue="2026-10-17" min="2026-10-17" />`, open;
   - `date-prev` is disabled (`customProps.tabIndex === -1`), click it, and the
     month label is still `October 2026`.
4. **Clear resets the value, closes and returns focus.**
   - `<Picker defaultValue="2026-10-17" clearable onValueChange={spy} />`, open,
     click `date-clear`;
   - `onValueChange` called once with `null`; `date-picker-content` gone; trigger
     shows `Pick a date`; focus is on `date-picker-trigger`.
5. **Clear exists only when asked for and only with a value.**
   - `<Picker clearable />` (empty), open: no `date-clear`;
   - `<Picker defaultValue="2026-10-17" />` (not clearable), open: no
     `date-clear`.
   - Both assertions in one test; each is independently able to fail.

Expected: the DatePicker behaviour suite 9 → 14 tests; overall behaviour
`212 → 217`.

### 5c. Both directions

This is a feature, not a regression, so the "fails without the fix" rule is
proved mechanically against the implementation:

1. Run the new suites green.
2. Temporarily remove the `available` guard from `choose` and the `disabled`
   branch from the previous-month control.
3. Re-run and record the red output: test 1 fails on the value spy, test 3 fails
   on the month label.
4. Restore. Record both outputs in the plan's §8 and the commit message.

## 6. Docs, example, inventory, ledgers

- `docs/date-picker.mdx`:
  - anatomy table: add the clear row;
  - new `## Bounds` section with the `min`/`max` example, the inclusive rule, the
    malformed-bound rule, the `min > max` fail-safe and "bounds constrain
    choosing, not a controlled value";
  - new `## Clearing` section with `clearable` and the `null` payload;
  - keyboard table: "moves by day/week, clamped to `min`/`max`"; PageUp/PageDown
    "clamped to the month's last day and the bounds"; note the month controls
    disable at the bound's month;
  - limitations: replace nothing that is still true; **add** "no `aria-disabled`
    in 0.10.0 — an unavailable day leaves the tab order and its accessible name
    ends in `, unavailable`" and repeat the `min > max` fail-safe;
  - verification counts: calendar 13 → 18, behaviour 9 → 14.
- `examples/date-picker.example.tsx`: keep the card and the app-owned state; give
  the picker `min="2026-10-17" max="2026-12-31" clearable`, delete the separate
  `Button` (the component now owns the reset), and update the header comment and
  the caption text. No new export; the registry key stays `date-picker`.
- `src/inventory.ts` → `datePickerMeta.limitations`: add the `aria-disabled`
  limitation and the `min > max` fail-safe sentence; keep the i18n, adjacent
  month, time picker and `aria-current` entries.
- `COMPONENTS.md` → Date / time pickers row: note `min`/`max` clamping and the
  built-in clear, and update the test counts (`9 native` → `14 native`, `13
  calendar` → `18 calendar`).
- `packages/components/README.md` → `src/date-picker.tsx` row: "bounded
  selection and a clear action" in the same sentence.
- `TODO.md` → under "Tier 2 hardening after the inventory closed":
  `- [x] Date picker min/max bounds and a clear action — plan 127`.
- `.agents/slop/plans/README.md` → add the plan 127 row with the final counts.

## 7. STOP conditions

1. `@gpuix/native@0.10.0` rejects any prop used here (`aria-disabled` is already
   known to be absent; do not try to smuggle it through `customProps`) → STOP and
   report the type error; do not cast.
2. A disabled `IconButton` still fires `onClick` in the real renderer → STOP and
   report; do not guard with a second click handler.
3. Arrow movement still lands on an out-of-range cell → STOP after one retry and
   report the focus sequence; do not add a skip loop.
4. Clamping changes movement in the unbounded case → STOP; existing keyboard
   tests (2 and 5 in the suite) must stay green unchanged.
5. The clear action appears without `clearable` or without a value → STOP.
6. Any type error needs `any`, a cast or a non-null assertion → STOP with the
   compiler output.
7. A test is flaky across two consecutive runs → STOP and report; nothing here
   is time-dependent.

## 8. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 181 → 186 logic tests
nub run --filter @gpuixui/components test:behaviour   # 212 → 220; DatePicker 9 → 14
nub run check                                         # the repo gate, exit 0
nub run lint                                          # exit 0
nub run test                                          # exit 0
```

The behaviour total is 220 rather than 217 because the ref-composition regression
in §9.1 added three trigger tests; DatePicker itself is the planned 14.

If the logic count is not `186`, the plan's five new tests were not all written;
do not adjust the expectation to match a smaller number without recording why in
§9.

## 9. Deviations, recorded during implementation

1. **A real regression blocked the clear path and was fixed at its source.**
   `PopoverTrigger` spread its props onto `Button` and then passed its own
   `ref={trigger}`, so the caller's `ref` was overwritten (last ref wins). The
   same overwrite existed in `DropdownMenuTrigger` and `ContextMenuTrigger`.
   `DatePicker` therefore never had a trigger ref, and its documented
   focus-return after selecting a day silently did nothing — no suite asserted it.
   Fixed with `src/internal/ref.ts` (`useMergedRef`), applied at all three
   trigger parts. Three native tests were added (`Popover`, `DropdownMenu`,
   `ContextMenu`: "feeds both the internal and the caller's trigger ref"), and
   the existing selection test now asserts the trigger focus. This is why the
   behaviour total is 220, not the planned 217.
2. **Both-direction proof, recorded from the actual runs.**
   - Removing the `isAvailable` guard from `choose` and the conditional cell
     `onClick`: `refuses an unavailable day and announces it as such` failed with
     `expected "vi.fn()" to not be called at all, but actually been called 1
     times` (the value was produced).
   - Removing the month-control `disabled` bound: `stops month browsing at the
     bound's month` failed with `expected +0 to be -1` (the control stayed
     enabled).
   - Removing `clampToBounds` from `moveDays`: `clamps arrow movement at the
     lower bound` failed with focus on `date-day-2026-10-16` instead of
     `date-day-2026-10-17`.
   - Reverting `PopoverTrigger` to `ref={trigger}`: the selection test failed with
     focus `None` and the new Popover ref test failed with
     `expected undefined to be 2`.
   All restored; the four suites then passed 50/50 and the full behaviour run
   220/220.
3. **Actual counts.** Logic 181 → 186 (calendar 13 → 18). Behaviour 212 → 220:
   DatePicker 9 → 14, Popover 8 → 9, DropdownMenu 13 → 14, ContextMenu 11 → 12.
4. **`unbounded` is exported** and used as the bounds fixture in the logic suite,
   as §3 allowed.
5. **The clear action's row is a plain right-aligned `div`** with the local ghost
   `Button`; no new layout primitive was needed.

