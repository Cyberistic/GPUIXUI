# 119 — Date picker (the deferred Tier 2 item)

- **Phase:** C (Tier 2 completion)
- **Workstream:** components · **Owns:** `packages/components/**`
- **Depends on:** 110, 112 (Popover), 117 (inventory gate)
- **Status:** done, 2026-10-17. 13 calendar tests + 9 native behaviour tests;
  example, docs and inventory row. Deviations in §10.

The only Tier 2 inventory item still `todo`. GPUix has no calendar primitive and
no native date input, so the calendar is ours: a pure month-grid module over
Effect's `DateTime`, a `Popover` surface, and a seven-column grid of day buttons.

---

## 1. Files

```
src/date-picker/calendar.ts        # pure month math and labels
src/date-picker/calendar.test.ts   # leap year, week starts, boundaries
src/date-picker.tsx                # DatePicker (trigger + popover + grid)
src/behaviour/date-picker.test.tsx # native keyboard/selection/dismissal
examples/date-picker.example.tsx
docs/date-picker.mdx
```

## 2. `date-picker/calendar.ts`

```ts
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";

export type WeekStart = 0 | 1;

/** Six weeks of seven cells; `None` is a day outside the month. */
export const monthGrid: (
  month: DateTime.Utc,
  weekStartsOn: WeekStart,
) => ReadonlyArray<ReadonlyArray<Option.Option<DateTime.Utc>>>;

/** The first day of the month, at 00:00:00.000 UTC. */
export const startOfMonth: (value: DateTime.Utc) => DateTime.Utc;

/** Month arithmetic on the first of the month. */
export const addMonths: (value: DateTime.Utc, amount: number) => DateTime.Utc;

/** Calendar-day equality (the time of day is ignored). */
export const isSameDay: (left: DateTime.Utc, right: DateTime.Utc) => boolean;

/** `"October 2026"`; fixed English names, no locale dependency. */
export const formatMonthLabel: (value: DateTime.Utc) => string;

/** `"17 October 2026"`, for a day button's accessible name. */
export const formatDayLabel: (value: DateTime.Utc) => string;

/** Parse `YYYY-MM-DD` into a UTC day, or `None` for anything else. */
export const parseIsoDay: (value: string) => Option.Option<DateTime.Utc>;

/** `YYYY-MM-DD`, the public value format. */
export const formatIsoDay: (value: DateTime.Utc) => string;
```

Rules:

- `monthGrid` always returns **six rows**, so the surface does not jump in height
  between a 28-day February and a 31-day month.
- A cell is `Some(day)` only when the day belongs to `month`; the leading and
  trailing blanks are `None`, and the grid renders them as empty boxes, not as
  adjacent-month buttons (a second visible month in one grid is a different
  component).
- `weekStartsOn` is `0` (Sunday) or `1` (Monday); the column order follows.
- Month labels are fixed English strings: the repo has no locale/i18n layer, and
  inventing one here would be a second source of truth. Document it.

## 3. `DatePicker`

```tsx
export interface DatePickerProps {
  /** The controlled ISO day (`YYYY-MM-DD`), or `null` for none. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** The trigger's accessible name. */
  label?: string;
  /** Default `"Pick a date"`. */
  placeholder?: string;
  /** Default `1` (Monday). */
  weekStartsOn?: WeekStart;
  disabled?: boolean;
  testId?: string;
}
```

- Controlled/uncontrolled via `useControllableState<string | null>`; the public
  value is the ISO day, never a `DateTime` and never a locale-formatted string.
- The trigger is a field-shaped `PopoverTrigger`: the selected day's
  `formatDayLabel`, or `placeholder`, plus a `▾`.
- `PopoverContent` holds:
  - a header row: previous-month `IconButton` (`testId="date-prev"`), the month
    label (`testId="date-month"`), next-month `IconButton`
    (`testId="date-next"`);
  - a weekday header row (`Mon`…`Sun` or `Sun`…`Sat`) as non-focusable text;
  - the six-row grid, each day a `div role="button"` with
    `testId="date-day-<YYYY-MM-DD>"`, `aria-label=formatDayLabel`,
    `aria-selected` for the chosen day, and the selected fill
    (`colors.primary` / `colors.primaryForeground`); today gets a border in
    `colors.primary`.
- Opening shows the selected day's month, or the current month. The view month is
  separate state (`viewMonth: DateTime.Utc`) so browsing does not change the
  value.
- Keyboard (on the grid container, real focus on the active day):
  - `ArrowLeft`/`ArrowRight` move one day, crossing a month boundary by rebuilding
    the view month;
  - `ArrowUp`/`ArrowDown` move seven days;
  - `Home`/`End` go to the week's first/last day using `weekStartsOn`;
  - `PageUp`/`PageDown` move one month and keep the day-of-month when it exists,
    else clamp to the month's last day;
  - `Enter`/`Space` selects the active day, updates the trigger and closes;
  - `Escape` closes through the `Popover` dismiss layer.
- One tab stop: the selected day, else the first day of the view month. Every
  other day is `tabIndex={-1}`; arrow moves call `renderer.focusElement`.

## 4. Tests — `date-picker/calendar.test.ts`

- February 2024 (leap) has 29 `Some` cells; February 2025 has 28.
- October 2026 starts on Thursday: with `weekStartsOn: 1` the first row has three
  blanks; with `0` it has four.
- 31-day months, a month starting on the week start (no leading blanks) and a
  month ending on the week end (no trailing cells in the last week beyond 42).
- Every grid has six rows and 42 cells; every `Some` day is inside the month;
  every day of the month appears exactly once.
- `addMonths` crosses a year in both directions; `startOfMonth` clears the time.
- `isSameDay` ignores time; different days are not equal.
- `parseIsoDay` accepts `2026-10-17`, rejects `2026-13-01`, `17/10/2026`, and
  `2026-02-30`; `formatIsoDay` round-trips.
- Header states the guarded bug: "a month starting mid-week rendered days from
  the previous month as if they belonged to it".

## 5. Tests — `behaviour/date-picker.test.tsx`

1. The trigger shows the placeholder; opening shows the current month and focuses
   a day.
2. Selecting a day reports its `YYYY-MM-DD` value and closes.
3. A controlled value keeps the trigger on the prop when the consumer ignores
   the change.
4. ArrowRight moves focus to the next day; ArrowDown moves a week; Home/End move
   to the week's edges.
5. PageDown moves the view month; the selected day is unchanged until Enter.
6. `Escape` closes and returns focus to the trigger.
7. The selected day has the primary fill; the grid renders in both themes.
8. A disabled picker does not open.

## 6. Example and docs

- `examples/date-picker.example.tsx`: a "Due date" field beside a small summary of
  the chosen day, with a Clear button.
- `docs/date-picker.mdx`: anatomy, value format, month browsing vs selection,
  keyboard table, fixed-English/no-locale limitation, no adjacent-month days, no
  time picker, `DateTime`-based math (no `Date`), both-theme note.

## 7. Commands

```
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour
nub run check
```

Expected: exits 0; the calendar suite and the date-picker behaviour suite ran;
`inventory.test.ts` still passes with the new record.

## 8. STOP conditions

1. `DateTime` cannot build a stable month grid without a `Date` or a locale
   dependency → STOP and report; do not introduce `Date`.
2. `Popover` cannot host a focusable grid without stealing focus from the day
   buttons → STOP; the composition is the requirement.
3. PageUp/PageDown clamping needs `Date` because `DateTime` has no
   "last day of month" → compute it as `addMonths(startOfMonth(next), -1)`; if
   that cannot be made total, STOP and report.
4. A 42-cell grid cannot be laid out in the popover without clipping → measure
   with `getElementBounds`; if the grid exceeds the window, reduce the cell size
   and record it. Do not ship a clipped grid.

## 9. Acceptance criteria

- [x] Pure calendar module with a table-driven suite that fails on a leap-year or
      week-start regression.
- [x] Native behaviour suite covering selection, navigation, dismissal and both
      themes.
- [x] Example, docs page, inventory record and `COMPONENTS.md` row (`done`).
- [x] No `Date` and no `Intl` in the calendar module.

## 10. Deviations, recorded during implementation (2026-10-17)

1. **A `today?: string` prop was added.** The initial view needs "today", and
   reading a clock inside the library would be both effectful and untestable.
   Without the prop the component reads `DateTime.nowUnsafe()` (Effect's own
   clock, no raw `Date` in our source); a test or a server boundary passes a
   fixed ISO day.
2. **Day cells are `role="gridcell"`, not `role="button"`.** The plan said
   button, but `aria-selected` is only meaningful on a grid cell/option/row. The
   grid is `role="grid"`, rows are `role="row"`, and the keyboard handler lives on
   the grid, which is the ARIA grid pattern rather than 31 buttons in a box.
3. **`PopoverContent` is opened with `autoFocus={false}`.** The popover's
   autoFocus would focus the surface; the picker needs the selected day focused
   instead. The grid focuses the active cell in a layout effect once its native id
   is registered.
4. **`DateTime.nowUnsafe` is the only clock read**, isolated in `todayOf` at the
   component boundary. `date-picker/calendar.ts` is pure and takes `DateTime`
   values, so the leap-year and month math remain testable with fixed inputs.
5. **The focus ring is painted on the active cell** (not only the focused one):
   0.10.0 has no `:focus-visible`, the same documented limitation as List. The
   ring follows real focus because arrow keys call `focusElement`.
