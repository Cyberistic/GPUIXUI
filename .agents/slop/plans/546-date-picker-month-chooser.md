# 546 — Date picker: a month chooser with year stepping

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 completeness) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `112`, `117`, `119`, `127`, `303`, `323`, `368`, `375`, `396` |
| Status | done |
| Blocker | none — every assertion below avoids the two plan-540 binding defects (no position, no focus-event assertion) |

This plan is self-contained. A weaker executor must be able to run it without
reading any other file first.

---

## 1. Why

`DatePickerCalendar` can only change the month with the two header chevrons or
`PageUp`/`PageDown` (one month per press). The 2026-10-18 inventory records no
year jump and no month chooser, so reaching a date three years away costs 36
presses. Every calendar users know (macOS, Windows, the shadcn/Base UI
reference) offers a month chooser.

Scope of this plan:

- the header's month label becomes a control that opens a **12-month chooser**
  for the viewed year;
- in the chooser the header's chevrons step **years**, and the label becomes the
  year and returns to the day grid;
- the chooser is a second roving grid with its own keyboard contract;
- bounds still hold: a month wholly outside `min`/`max` is inert and named
  `, unavailable`, and a year stepper that has no available month is disabled.

**Out of scope** (do not add): a year *list* (decades), range selection, a
nested dismiss layer (Escape must keep closing the popover), a new public part,
a locale lookup. The value model stays one ISO day.

## 2. What exists today (read these first)

- `packages/components/src/date-picker/calendar.ts` — pure `DateTime` helpers:
  `addMonths`, `canBrowseMonth`, `clampToBounds`, `lastDayOfMonth`,
  `monthGrid`, `startOfMonth`, `formatMonthLabel`, `CalendarLabels`,
  `defaultCalendarLabels`, `resolveCalendarLabels`.
- `packages/components/src/date-picker.tsx` — `DatePickerCalendar` owns
  `viewMonth` and `active` (the focused day), attaches day-cell ids in
  `cellIds`, and focuses the active day through `renderer.focusElement`. The
  day grid's `onKeyDown` sits on the `role="grid"` container; cells are
  `role="gridcell"` divs with `tabIndex`, `aria-label`, `aria-selected`,
  `onClick` and the token focus ring painted from `active` (not from an
  `onFocus` event — the binding delivers none for a native focus move).
- `packages/components/docs/date-picker.mdx` — labels table, keyboard table,
  limitations and the canonical verification line.
- `packages/components/examples/date-picker.example.tsx`,
  `COMPONENTS.md` → Tier 2 → Date pickers, `src/inventory.ts`
  (`datePickerMeta`).

## 3. Design

### 3.1 Labels (`calendar.ts`)

Extend `CalendarLabels` with four English defaults; every existing field and
`resolveCalendarLabels`'s "one override keeps the rest" rule stay unchanged.

| Field | Default | Use |
| ----- | ------- | --- |
| `previousYear` | `"Previous year"` | the chooser's back chevron name |
| `nextYear` | `"Next year"` | the chooser's forward chevron name |
| `chooseMonth` | `"Choose month"` | the month label button's name in the day view, and the month grid's name |
| `showDays` | `"Show days"` | the year label button's name in the chooser |

### 3.2 Pure helpers (`calendar.ts`)

All four are pure and unit-tested in §5.1. Use `Option`/`Match`/`Arr`; no
`Date`, no `Intl`, no `throw`.

```ts
/** `"2026"`. */
export const formatYearLabel: (value: DateTime.Utc) => string;

/** The first moment of `value`'s year. */
export const startOfYear: (value: DateTime.Utc) => DateTime.Utc;

/** Whether any day of `value`'s month lies inside `bounds`. */
export const isMonthAvailable: (value: DateTime.Utc, bounds: DayBounds) => boolean;

/** Whether any day of `value`'s year lies inside `bounds`. */
export const isYearAvailable: (value: DateTime.Utc, bounds: DayBounds) => boolean;

/** Whether stepping `direction` year lands on a year with an available month. */
export const canBrowseYear: (
  viewMonth: DateTime.Utc,
  direction: -1 | 1,
  bounds: DayBounds,
) => boolean;

/** The next available month index from `from` by `step` (±1, ±3); `from` when
 *  the step leaves the year or lands on no available month. No wrapping. */
export const stepMonth: (
  from: number,
  step: number,
  available: ReadonlyArray<boolean>,
) => number;

/** The available month nearest `from`; `from` when none is available. */
export const nearestAvailableMonth: (
  from: number,
  available: ReadonlyArray<boolean>,
) => number;

/** The day to focus after choosing `month`: `from`'s day-of-month clamped to
 *  the chosen month's length, then to the bounds. */
export const dayInMonth: (
  from: DateTime.Utc,
  month: DateTime.Utc,
  bounds: DayBounds,
) => DateTime.Utc;
```

Rules:

- `isMonthAvailable` is `first day <= max && last day >= min` (so a bounded
  month whose first and last days are both outside is still available when an
  interior day is not). `isYearAvailable` is the same rule over January 1 and
  December 31. An absent bound is unbounded (reuse `Option.match`).
- `canBrowseYear(viewMonth, direction, bounds)` is
  `isYearAvailable(addMonths(viewMonth, direction * 12), bounds)`.
- `stepMonth` builds `availableIndices = Arr.filter(Arr.range(0, 11), (i) => available[i] === true)`,
  then takes the first index `>= from + step` for a positive step or the last
  `<= from + step` for a negative one, falling back to `from`. It never wraps
  across the year (the chooser shows one year).
- `nearestAvailableMonth` prefers the nearest index at or after `from`, then the
  nearest before it, then `from`. Use `Arr.findFirst`/`Arr.findLast` over the
  available indices; do not write an index loop.
- `dayInMonth` uses `lastDayOfMonth(month)`, then `clampToBounds`.

### 3.3 `DatePickerCalendar` state (`date-picker.tsx`)

Add:

```ts
const [mode, setMode] = useState<"days" | "months">("days");
const [monthFocus, setMonthFocus] = useState(0);          // 0 = January
const monthIds = useRef<Record<number, number>>({});
const pendingMonthFocus = useRef(false);
```

Derive each render:

```ts
const months = Arr.map(Arr.range(0, 11), (index) =>
  addMonths(startOfYear(viewMonth), index),
);
const availableMonths = Arr.map(months, (month) => isMonthAvailable(month, bounds));
const viewMonthIndex = DateTime.toPartsUtc(viewMonth).month - 1;
const year = DateTime.toPartsUtc(viewMonth).year;
```

- Reset `mode` to `"days"` in the existing open effect (the one that resets
  `viewMonth`/`active` when `open` flips true).
- `openMonths()`: `setMonthFocus(nearestAvailableMonth(viewMonthIndex, availableMonths))`,
  `pendingMonthFocus.current = true`, `setMode("months")`.
- One more `useLayoutEffect` mirrors the day focus effect: if
  `pendingMonthFocus.current`, look up `monthIds.current[monthFocus]`, clear the
  flag and call `renderer?.focusElement?.(id)`. It must return without clearing
  when the id is missing (the grid renders in the same commit).
- `attachMonth(index)` returns a ref callback that stores/deletes the host id,
  exactly like `attachCell`.
- `chooseMonth(index)`: return when `availableMonths[index] !== true`; otherwise
  `focusActive(dayInMonth(Option.getOrElse(active, () => startOfMonth(viewMonth)), months[index], bounds))`
  and `setMode("days")` (choose no value: the day grid still owns selection).
- `stepYear(direction)`: `const next = addMonths(viewMonth, direction * 12)`; set
  `viewMonth` to `next`, recompute the next year's availability, set
  `monthFocus` to `nearestAvailableMonth(monthFocus, nextAvailable)`, and set
  `pendingMonthFocus.current = true`.
- `moveMonthFocus(index)`: `setMonthFocus(index)` and focus the id immediately
  (all twelve cells are already mounted).

### 3.4 Rendering

Header row (three slots, same layout):

- **Day view** — unchanged ids `date-prev`/`date-next` (months), and the label
  becomes a `Button variant="ghost" size="sm" testId="date-month"` whose child
  is `formatMonthLabel(viewMonth, labels)` and whose `aria-label` is
  `labels.chooseMonth`. `onClick={openMonths}`.
- **Chooser** — the same left/right slots become `IconButton`s with ids
  `date-prev-year`/`date-next-year`, labels `labels.previousYear`/`labels.nextYear`,
  disabled by `!canBrowseYear(viewMonth, direction, bounds)`, `onClick` →
  `stepYear(direction)`. The centre `date-month` button shows `formatYearLabel(viewMonth)`
  and `aria-label={labels.showDays}`; `onClick` → `setMode("days")`.

Body when `mode === "months"` replaces the day grid:

```tsx
<div role="grid" aria-label={labels.chooseMonth} onKeyDown={handleMonthKeyDown}
     style={{ display: "flex", flexDirection: "column", gap: theme.spacing["2xs"] }}>
  {4 rows (role="row", flex row, gap 2xs)}
    {3 cells per row, index = row * 3 + column}
```

Cell rules (copy the day cell's shape, not its behaviour):

- `role="gridcell"`, `testId={`date-month-${index}`}`,
  `aria-selected={index === viewMonthIndex}`,
  `aria-label` = `formatMonthLabel(months[index], labels)` when available,
  otherwise that plus `, ${labels.unavailable}`.
- `tabIndex={index === monthFocus ? 0 : -1}`.
- `onClick={available ? () => chooseMonth(index) : undefined}`,
  `onFocus={() => setMonthFocus(index)}`.
- Visible text is `Option.getOrElse(Arr.get(labels.months, index), () => String(index + 1))`.
- Style: `textStyle(theme, "caption")`, `display: flex`, centre, height `CELL`,
  width `monthCell = (CELL * 7 - theme.spacing["2xs"] * 2) / 3` so three cells
  span the day grid's width, `borderRadius: theme.radius.sm`; selected fill
  `theme.colors.primary` + `primaryForeground` (the viewed month); unavailable
  text `mutedForeground` and `cursor: "not-allowed"`; hover on available
  unselected months `theme.colors.hover`; and
  `...(index === monthFocus ? focusRing(theme) : {})`.

Keyboard (`handleMonthKeyDown`, on the grid container — the host bubbles cell
keys to it, as the day grid already relies on):

| Key | Action |
| --- | ------ |
| `Left` / `Right` | `stepMonth(monthFocus, ∓1, availableMonths)` |
| `Up` / `Down` | `stepMonth(monthFocus, ∓3, availableMonths)` |
| `Home` / `End` | `nearestAvailableMonth(0 / 11, availableMonths)` |
| `Enter` / `Space` | `chooseMonth(monthFocus)` through `isActivation` (press/release, one activation per keystroke) |
| anything else | no-op |

No Escape handling: the popover's dismiss stack owns it, so one Escape closes
the surface from either view.

### 3.5 Boundaries and permissions

- Touch only `packages/components/**` and the two repo ledgers
  (`COMPONENTS.md`, `TODO.md`) plus the plan index.
- Never call `renderer.getBoundingClientRect`/`getElementBounds` from the new
  code. No new dependency, no `Date`, no `Intl`, no CSS class.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/date-picker/calendar.ts` | four label fields, the eight helpers in §3.2 |
| `packages/components/src/date-picker/calendar.test.ts` | the new pure cases (§5.1) |
| `packages/components/src/date-picker.tsx` | `DatePickerCalendar` state, header, chooser grid, keyboard (§3.3–§3.4); extend `datePickerMeta.limitations` with "the chooser shows one year at a time (no year list)" |
| `packages/components/src/behaviour/date-picker.test.tsx` | the new native cases (§5.2); update nothing that already passes |
| `packages/components/docs/date-picker.mdx` | a "Choosing a month" section, labels table rows, keyboard rows, limitations, and the verification count |
| `packages/components/examples/date-picker.example.tsx` | show the new labels in the custom-label usage (the chooser itself needs no prop) |
| `COMPONENTS.md` | the Date pickers row: chooser behaviour, year bounds, new count, the one-year-at-a-time limitation |
| `TODO.md` | tick the new Phase C row (§7) |
| `.agents/slop/plans/README.md` | index this plan as done with its counts |

## 5. Test plan

Every test must be able to fail; state the guarded bug in the suite's header
comment (extend the existing header list).

### 5.1 Pure (`calendar.test.ts`)

1. `isMonthAvailable` — true for a month with an interior available day when
   both ends are outside the bounds; false for a month wholly before `min` or
   after `max`; true with no bounds.
2. `isYearAvailable` / `canBrowseYear` — a year that only touches the bound
   month is browseable; a year wholly before `min` (or after `max`) is not; both
   directions.
3. `dayInMonth` — keeps the day-of-month; clamps 31 → 28/29 for February and
   30 for April; clamps into `min`/`max`; leaves an in-bounds day alone.
4. `stepMonth` — skips unavailable months; does not wrap (December +1 stays
   11); a step with no available month returns `from`; `nearestAvailableMonth`
   picks the closest available index, preferring forward on a tie.
5. `formatYearLabel` — `"2026"`.

Expected: the calendar suite grows from 24 to at least 30 passing cases.

### 5.2 Native (`date-picker.test.tsx`, real `TestRenderer`)

All assertions use text, `testId`, `aria-label`, `aria-selected`, `tabIndex`,
`onValueChange` and `focusedTestId` only. **Do not assert bounds or a focus
ring on a focus move** (plan 540: the current binding mixes box conventions and
delivers no `onFocus` for `focusElement`).

1. **Opens the chooser** — open a picker on 2026-10-17, click `date-month`:
   `date-month-0` … `date-month-11` exist, no `date-day-*` does, the viewed
   month is `aria-selected`, and focus is `date-month-9` (October).
2. **Choosing a month returns to the day grid and moves focus** — choose April
   (`date-month-3`): the grid shows 2026-04, focus is `date-day-2026-04-17`, and
   `onValueChange` was **not** called.
3. **A short month clamps the day** — value 2026-01-31, choose February: focus
   is `date-day-2026-02-28`; the trigger still shows 31 January 2026.
4. **Year stepping** — chooser → `date-prev-year` → choose January: the grid
   shows a 2025 day (`date-day-2025-01-17` exists); `date-next-year` returns to
   2026 and 2027 across a year boundary.
5. **Bounds** — with `min="2026-03-10" max="2026-08-20"`, in the chooser
   `date-month-0`'s `aria-label` ends `, unavailable`, clicking it leaves the
   chooser open and changes nothing, and both year steppers are disabled
   (`customProps?.tabIndex === -1`).
6. **The year label returns without changing the view** — chooser → `date-month`
   (now showing the year): back on the day grid, the same month is shown and a
   day is focused.
7. **Keyboard** — chooser opened on October: `right` moves focus to
   `date-month-10`, `down` to 11 (or the next available), `home` to the first
   available, `end` to the last, and `enter` selects the focused month, returns
   to the day grid and focuses a day in it.
8. **Caller labels** — `chooseMonth`, `showDays`, `previousYear`, `nextYear`
   reach the four control names in a partial-override render (extend the
   existing Serbo-Croatian labels case).

Expected: the suite grows from 23 to 31 passing cases. Run it with
`nub run --filter @gpuixui/components test:behaviour -- src/behaviour/date-picker.test.tsx`
and it must print `31 passed` (no other file's pre-existing failures count).

### 5.3 Both directions (AGENTS §3)

For at least three of the new cases prove they fail without the feature:
stash the `date-picker.tsx` change (`git stash push packages/components/src/date-picker.tsx`
or temporarily restore it) and confirm those tests fail with a missing
`date-month-3` (or the wrong focused id), then restore. Record the exact count
in the commit message.

## 6. Commands and expected results

Run from `workspaces/components`:

```sh
nub run --filter @gpuixui/components test                         # 417 passed (411 + 6 new)
nub run --filter @gpuixui/components test:behaviour src/behaviour/date-picker.test.tsx
                                                                  # 31 passed
nub run --filter @gpuixui/components check-types                   # exit 0
nub run check                                                      # check:tests + lint + fmt + types, exit 0
nub run --filter @gpuixui/components test:perf                     # measured red on this host, see below
```

Measured on 2026-10-19: `test:perf` fails at
`src/perf/list.test.tsx:60` (`focusedTestId` reads `row-0` after a focus move,
expected `row-1`). The perf suite imports only `List`, imports nothing the date
picker touches, and the known plan-540 binding defect is the missing focus
delivery for a programmatic move — so this is pre-existing and unrelated to plan
546. It is recorded rather than skipped: the perf suite is not part of the
package gate, and the binding owner has the classification in plan 540 §5.

Also re-run the package's inventory test (inside `test`): the updated
`COMPONENTS.md` and docs counts must match the suite, or it fails by name.

The both-direction proof measured here: with `src/date-picker.tsx` restored to
its pre-546 content, exactly the 8 new native cases fail and the 23 existing
ones pass; with the change, 31 pass.

## 7. Docs, inventory and TODO

- `docs/date-picker.mdx`: a "Choosing a month" section (header control, 12-month
  grid, year chevrons, bounds behaviour, no year list), new label rows, new
  keyboard rows for the chooser, the one-year-at-a-time limitation, and the
  canonical verification line with the **new** count:
  `src/behaviour/date-picker.test.tsx runs in the real GPUix renderer (31 tests)`.
- `COMPONENTS.md` Date pickers cell: add the chooser, year stepping and month
  bounds in the existing prose, change `23 native behaviour tests` to `31
  native behaviour tests`, and add the one-year-at-a-time limitation.
- `TODO.md` → Phase C → hardening list: add and tick
  `Date picker month chooser and year stepping — plan 546; N pure + 8 native
  tests, both-direction proof; docs, example, COMPONENTS.md and inventory synced`.
- Plan index: change plan 546's status to `done — …` with the measured counts.

## 8. STOP conditions

Stop and report instead of improvising when:

- a new native test needs `getElementBounds` or a focus-ring assertion to pass
  (the plan-540 binding defect — do not weaken the test, do not normalise);
- `findByText` cannot see the `Button`'s label text (then keep the label a
  `text` inside a pressable div with the activation contract, and say so in the
  plan's status);
- `DateTime.startOf("year")` or the `Arr`/`Option` helpers are not in the
  installed Effect 4.0.5 (read
  `node_modules/.store/effect@4.0.5/node_modules/effect/dist/DateTime.d.ts`
  and `Array.d.ts` before writing);
- an existing date-picker test fails for a reason other than the intended header
  change (list the failing case and stop);
- the inventory count check fails because a docs/row count was not updated
  (fix the count, not the check).

## 9. Acceptance

- The chooser opens from the header, selects a month, returns to the day grid,
  steps years, respects `min`/`max`, and is fully keyboard-operable with a
  roving tab stop and the token focus ring.
- `select` still changes the value; the chooser never does.
- 8 new native cases and the new pure cases pass; the existing 23 native and 24
  pure date-picker cases still pass; the package unit suite and type check pass.
- The docs page, example, `COMPONENTS.md` row, `TODO.md` and plan index are
  consistent with the measured counts.
