# Plan 396 — Date picker: show and select adjacent-month days

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 completion) / F (consistency) |
| Owner | components workstream |
| Depends on | `110`, `112`, `119`, `127`, `200`, `201`, `303`, `323`, `368`, `375` |
| Status | done — `monthGrid` returns 42 real days with `inMonth`; adjacent days are muted, selectable and bounds-aware; 2 pure + 3 native cases, both-direction proof (unit 390, behaviour 619); docs, inventory and `COMPONENTS.md` synced |
| Number | First free number in the `300–399` block (last landed: `395`) |

This plan is self-contained. A weaker executor can run every step without reading
another plan. Facts marked **measured** were reproduced on this host (Intel
macOS, the locally built `darwin-x64` binding from plan `140`).

---

## 1. Goal

`COMPONENTS.md`, `docs/date-picker.mdx` and `datePickerMeta` record one remaining
Tier 2 gap: **"the grid shows only the current month; adjacent-month days are
blank"**. Every other calendar in the reference set (shadcn/ui, GPUI Kit) shows
the surrounding days, and a blank first or last row makes the grid look broken
beside them.

Make the six-week grid complete:

1. `monthGrid` returns **42 real days** — the month plus the leading/trailing days
   needed to fill the weeks — each marked `inMonth`.
2. `DatePickerCalendar` renders the adjacent days in muted text; they are
   selectable exactly like a day in the month.
3. Choosing an adjacent day sets that ISO value and closes the popover, the same
   contract as every other day.
4. Arrow/Home/End/Page keys keep working across the boundary; the view month
   already follows the focused day (`focusActive`), and the focus cell now exists
   in the rendered grid.
5. `min`/`max` still apply to adjacent days; an out-of-bounds adjacent day is
   announced `, unavailable` and does nothing.

The grid height does not change: it is still six rows of seven cells.

## 2. Facts this design rests on

- `date-picker/calendar.ts` already computes `firstCell` = the week start on or
  before the 1st, then maps 42 indices to days. Only the membership test decides
  `Some`/`None`; the days themselves are already real `DateTime` values.
- `DatePickerCalendar` focuses through `cellIds[iso]` and only renders `Some`
  cells, so an outside day previously had no host node to focus. That is why
  keyboard crossing only worked after the view month changed (plan `368`).
- `focusActive` already sets `setViewMonth(startOfMonth(day))` for any day, so
  crossing a boundary re-renders the target month. No new keyboard code is
  needed once the cells render.
- `choose(day)` already applies `isAvailable` and closes through
  `closeToTrigger`; it does not care which month the day belongs to.
- The fixed 42-cell grid exists so the popover does not jump height between
  February and a 31-day month (`docs/date-picker.mdx` §Anatomy); this plan keeps
  that invariant.
- `hover`, `focusRing`, `colors.mutedForeground` and `colors.primary` are already
  the roles the cell uses; no new tokens.
- **Baseline (measured 2026-10-18 before the change):** `nub run --filter
  @gpuixui/components test` → 389 unit tests green; `test:behaviour` → 616
  native tests across 49 files green; DatePicker 20 native tests and
  `date-picker/calendar.test.ts` 22 tests.

## 3. Design

### 3.1 `monthGrid` returns cells, not optional days

```ts
/** One cell: a real day, and whether it belongs to the month being viewed. */
export interface CalendarCell {
  readonly day: DateTime.Utc;
  readonly inMonth: boolean;
}

/**
 * Six weeks of seven real days for `month`. Leading and trailing cells belong
 * to the adjacent months and carry `inMonth: false`.
 */
export const monthGrid = (
  month: DateTime.Utc,
  weekStartsOn: WeekStart,
): ReadonlyArray<ReadonlyArray<CalendarCell>>;
```

The arithmetic is unchanged; the membership test now produces the flag instead of
`Option.some`/`Option.none`. The return is always `6 × 7`; no `Option` remains in
the grid.

### 3.2 Cell rendering

- `role="gridcell"`, `aria-label` = `formatDayLabel(day)` (plus
  `, ${labels.unavailable}` when out of bounds), `aria-selected` when chosen,
  `testId={`date-day-${iso}`}`.
- An adjacent day paints `colors.mutedForeground`; an in-month day paints
  `colors.foreground`; the selected day keeps `colors.primary` /
  `colors.primaryForeground`; an unavailable day keeps `mutedForeground` and the
  `not-allowed` cursor.
- Adjacent days get the same hover and pointer rules as in-month days, because
  they are real choices. No opacity dimming (it would also dim the selected
  fill); the muted text is the signal.
- The tab stop stays one cell: `active` when it is in the view month, else the
  first of the view month (existing `tabbable` rule). Adjacent cells are rendered
  but never add a second tab stop.
- The focus ring stays on the active day. When a key move crosses a month,
  `focusActive` re-renders that month, so the ring is on a real cell.

### 3.3 Selection and bounds

`choose` is unchanged. The component now exposes one extra behaviour by
construction: clicking an adjacent day chooses it. That is the only new
selection rule, and it matches the keyboard rule that already crossed months.

## 4. Files to create or change

| Path | Action |
| ---- | ------ |
| `src/date-picker/calendar.ts` | `CalendarCell`, `monthGrid` returns 42 real cells with `inMonth`; update the module header |
| `src/date-picker/calendar.test.ts` | helpers take `CalendarCell`; grid tests assert 42 cells, month membership and adjacent days |
| `src/date-picker.tsx` | render every cell; muted adjacent days; remove the old `Option.match` branch and the "no adjacent-month days" header/doc claims |
| `src/behaviour/date-picker.test.tsx` | three new native tests: choose an adjacent day, cross left across the month edge, refuse an out-of-bounds adjacent day |
| `docs/date-picker.mdx` | Anatomy, Bounds, Accessibility/Limitations and Verification lines |
| `src/date-picker.tsx` (`datePickerMeta`) | remove the adjacent-month limitation |
| `COMPONENTS.md` | Date pickers row: new behaviour and the new test counts |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | tick the task under the Tier 2 hardening list |

No example changes: `examples/date-picker.example.tsx` already opens the grid, and
the new days need no new prop.

## 5. Steps

1. In `calendar.ts`, add `CalendarCell`, change `monthGrid` as in §3.1, and update
   the header comment: the grid now shows the adjacent days; only the in-month
   ones are flagged.
2. In `calendar.test.ts`, update the helpers to read `.day` and add:
   - "always has six rows of seven real days" (42 cells, no blanks);
   - "marks exactly the month's days" (`inMonth` count equals the month length);
   - "draws the adjacent days around the month" (first cell is the week start on
     or before the 1st; last cell is the day before the next week start; every
     day is sequential).
   Keep the leap-February, week-start, uniqueness and month-membership assertions
   by filtering on `inMonth`.
3. In `date-picker.tsx`, replace the `Option.match(cell, …)` render with a direct
   cell render; keep every existing prop, id, row and key. The `onSome` body is
   the current body; the `onNone` blank branch disappears.
4. In `behaviour/date-picker.test.tsx`, add the three tests in §6 with a comment
   naming the bug each guards.
5. Run the suites (§7). Recount the native and calendar tests.
6. Update `docs/date-picker.mdx`:
   - Anatomy: "The six-week grid also shows the days of the adjacent months, in
     muted text. Choosing one selects that day (and closes), so the grid has no
     dead cells."
   - Bounds: mention adjacent days in the bounds bullet.
   - Limitations: delete "**No adjacent-month days**"; keep "no range selection".
   - Verification: the real counts and the new coverage sentences.
7. Update `datePickerMeta.limitations`, the `COMPONENTS.md` row (behaviour + test
   counts), plan index status and the `TODO.md` task.

## 6. Test plan

### Pure (`src/date-picker/calendar.test.ts`)

- **42 real cells**: `Arr.length(Arr.flatten(grid)) === 42` and every cell has
  `inMonth: boolean`; fails if a blank cell returns.
- **Month membership**: for August 2026 (31 days) exactly 31 cells have
  `inMonth: true`; February 2024 has 29; February 2025 has 28.
- **Adjacent days are the real neighbours**: the first cell of October 2026 with
  `weekStartsOn = 1` is `2026-09-28`; the last is `2026-11-08`; consecutive days
  differ by one day. Reverting to the blank grid fails the first/last cell.
- Keep the existing week-start, uniqueness, bounds, labels and parsing tests.

### Native (`src/behaviour/date-picker.test.tsx`)

Header comment for each new test: the bug is the missing cell / stale view.

1. **Choose an adjacent day** — `defaultValue="2026-10-17"`, open, click
   `date-next` (November 2026), click `date-day-2026-10-31`; expect the trigger to
   read `31 October 2026`, `onValueChange("2026-10-31")`, and the surface closed.
   Fails before the fix because that cell does not exist.
2. **Adjacent days paint muted, in-month days paint the foreground** —
   `defaultValue="2026-10-17"`, dark theme, open; `date-day-2026-09-28` exists and
   its `style.color` is `darkTheme.colors.mutedForeground`, while
   `date-day-2026-10-18` is `darkTheme.colors.foreground`. Fails before the fix on
   the missing adjacent cell.
3. **An out-of-bounds adjacent day is inert** — `defaultValue="2026-11-15"`
   `min="2026-11-01"`, open; `date-day-2026-10-31` exists, its `aria-label` ends
   in `, unavailable`, clicking it changes nothing and leaves the surface open.
   Fails before the fix on the missing cell.

Keyboard crossing is already exercised by the existing arrow/`Home`/`End` tests;
it does not prove the new rendering on its own because `focusActive` switches the
view month. These three assert the grid itself.

Both directions: run each new native test against the pre-change source (stash
the `date-picker.tsx`/`calendar.ts` changes) and confirm it fails; restore and
confirm it passes. Record the commands and results in the commit message or the
plan status line.

### Existing suites

`nub run --filter @gpuixui/components test:behaviour` must keep every other
DatePicker assertion green; `nub run check` must typecheck the new cell type.

## 7. Commands and expected results

```sh
cd packages/components
nub run test                          # expected: 39 files, all green; calendar tests +2
nub run test:behaviour                # expected: 49 files, 619 native tests (616 + 3)
nub run check-types                   # expected: exit 0
cd ../..
nub run check                         # expected: check-tests, lint, fmt and types all green
nub run test                          # expected: every workspace package green
```

Test counts are **measured after the change**, not assumed: update the docs and
`COMPONENTS.md` with the real numbers the runs print.

## 8. STOP conditions

Stop and report with evidence if:

- the calendar test count or native count differs from the plan after the change
  (do not edit a count to make a check pass; record the real number);
- a 42-cell grid changes the popover height or makes the surface scroll (then the
  six-row invariant is broken and the plan needs a design decision);
- `focusElement` refuses an adjacent cell's native id (then keyboard crossing
  cannot be promised and the docs must say so);
- any existing DatePicker test fails for a reason other than the changed grid
  shape; do not weaken an assertion to get green.

## 9. Acceptance criteria

- `monthGrid` always returns 42 real `DateTime` days with an `inMonth` flag.
- Every adjacent day is rendered, muted, selectable, bounds-aware and reachable
  by the arrow keys; choosing one selects it and closes.
- The grid is still six rows, the popover height is unchanged, and the tab stop
  is still exactly one cell.
- The three native tests fail on the pre-change source and pass after it.
- `docs/date-picker.mdx`, `datePickerMeta` and the `COMPONENTS.md` row match the
  implementation and the real test counts; the limitation is removed rather than
  reworded.
- `nub run check`, `nub run test` and `nub run lint` are green.
