# 303 — DatePicker and TimePicker become compound parts

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200-adopt-compound-part-api.md`, `119-tier2-date-picker.md`, `127-date-picker-bounds-and-clear.md`, `132-time-picker.md` |
| Status | done — 2026-10-17; DatePicker 16, TimePicker 10 native tests, both-direction proof measured |
| Source | `docs/component-api.md` §9 row "Date / time pickers"; `TODO.md` → "Split the remaining landed deviations … into parts" |

Self-contained. It migrates only the date and time pickers. Pagination,
CommandMenu and Combobox are `300`–`302`.

---

## 1. Why

`DatePicker` owns the trigger and the popup internally, so a caller cannot put an
extra action beside the trigger or a footer under the calendar. `TimePicker` owns
its two segments, so a caller cannot reorder them, drop the clear control, or
place a label between them.

`docs/component-api.md` §9 planned `DatePicker{,Trigger,Content,Calendar}` "and
the same for `TimePicker`". That is wrong for the landed TimePicker: it is a
**field**, not a trigger with a popup (the docs record why: no `aria-valuenow`,
so a spinbutton popup would be unannounced). This plan formalises the honest
shape — the field root, its segments, the separator and the clear control — and
amends §8/§9 to match. Do not build a TimePicker popup to satisfy the old line.

## 2. The target API

### DatePicker

```tsx
<DatePicker value={value} onValueChange={setValue} min={min} clearable>
  <DatePickerTrigger placeholder="Pick a date" label="Start date" />
  <DatePickerContent>
    <DatePickerCalendar />
  </DatePickerContent>
</DatePicker>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `DatePicker` | the value, the bounds, the open state, the trigger registry and the context | `value?`, `defaultValue?`, `onValueChange?`, `min?`, `max?`, `weekStartsOn?`, `clearable?`, `today?`, `disabled?` |
| `DatePickerTrigger` | the `PopoverTrigger` surface: label, caret, focus target | `placeholder?` (`"Pick a date"`), `label?`, `testId?` (`"date-picker-trigger"`), `disabled?` |
| `DatePickerContent` | the `PopoverContent` surface | `side?`, `align?`, `sideOffset?`, host props |
| `DatePickerCalendar` | the month navigation, the weekday header, the day grid, the key handling and the optional Clear action | `aria-label?` |

Rules:

- The root renders `<Popover open onOpenChange>` and provides the context; the
  open state stays there so `DatePickerCalendar` can reset its view/focus when
  the surface opens (the current `useLayoutEffect` moves into the calendar).
- The root no longer needs its own trigger ref: `DatePickerTrigger` passes
  `ref` to `PopoverTrigger`, which already merges it with the popover's internal
  trigger; the root registers that instance for `choose`/`clear`. Escape keeps
  returning focus through `PopoverContent`.
- `DatePickerCalendar` owns `viewMonth`, `active`, `cellIds` and `pendingFocus`;
  it reads the selected day, bounds, `today`, `weekStartsOn`, `clearable`,
  `disabled` and `closeToTrigger` from the context.
- Unavailable days keep leaving the tab order and keep the `", unavailable"`
  accessible name; today stays a border; the current day keeps `aria-selected`.
- `DatePickerTrigger` keeps `aria-label` from `label` and the placeholder text
  colour rule; `DatePickerContent` keeps `autoFocus={false}` and
  `pointerEvents: "auto"`.
- A part outside `DatePicker` throws `"DatePicker parts must be used inside
  DatePicker"`.
- `datePickerMeta` keeps its six limitations.

### TimePicker

```tsx
<TimePicker value={value} onValueChange={setValue} minuteStep={5} clearable>
  <TimePickerSegment segment="hours" />
  <TimePickerSeparator />
  <TimePickerSegment segment="minutes" />
  <TimePickerClear />
</TimePicker>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `TimePicker` | the value, the text state, clamping, arrows, blur padding, the focus ring and the context | `value?`, `defaultValue?`, `onValueChange?`, `minuteStep?`, `label?` (`"Time"`), `clearable?`, `disabled?`, `testId?` (`"time-picker"`) |
| `TimePickerSegment` | one labelled `<input>` (`HH` or `MM`) | `segment: "hours" \| "minutes"` (required) |
| `TimePickerSeparator` | the non-interactive `:` | host props |
| `TimePickerClear` | the clear affordance, only while `clearable` and a value exists | `label?` (`"Clear time"`), `testId?` (`${root}-clear`) |

Rules:

- The root keeps the `role="group"`, the group name, the input surface, the
  dimmed disabled state and the focus ring (any segment focusing lights the
  group). Segments report focus/blur through the context.
- Segment test ids stay `${testId}-hours` / `${testId}-minutes`; clear keeps
  `${testId}-clear`. `<TimePickerClear />` without `clearable` renders nothing.
- The two-digit clamp, the single clock function for arrows, `minuteStep`
  (arrows only) and blur padding do not change.
- A part outside `TimePicker` throws `"TimePicker parts must be used inside
  TimePicker"`.
- `timePickerMeta` keeps its five limitations.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/date-picker.tsx` | rewrite as four parts over a context, composed over `Popover` |
| `packages/components/src/time-picker.tsx` | rewrite as four parts over a context |
| `packages/components/src/behaviour/date-picker.test.tsx` | compose the parts; 14 existing tests stay; add 2 |
| `packages/components/src/behaviour/time-picker.test.tsx` | compose the parts; 8 existing tests stay; add 2 |
| `packages/components/src/behaviour/theme-matrix.test.tsx` | check whether it renders the pickers directly; update the tree if so |
| `packages/components/examples/date-picker.example.tsx` | compose the parts |
| `packages/components/examples/time-picker.example.tsx` | compose the parts |
| `packages/components/docs/date-picker.mdx` | anatomy by part, composed snippet, test count |
| `packages/components/docs/time-picker.mdx` | anatomy by part, the field-vs-popup note, test count |
| `COMPONENTS.md` | Date pickers + Time pickers rows: parts and new counts |
| `docs/component-api.md` | §8 rows list the parts; delete the §9 row; add a sentence explaining the TimePicker field shape |
| `TODO.md` | tick the date/time slice |

`rg -n "<DatePicker|<TimePicker" packages apps examples` before editing; expect
the two examples, the two behaviour suites and the theme matrix (if it names
them).

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # exit 0, DatePicker 16, TimePicker 10, total +4
nub run --filter @gpuixui/components test             # exit 0 (calendar/time logic unchanged)
nub run check                                         # exit 0
nub run lint                                          # exit 0
```

## 5. STOP conditions

Stop and report if:

- the calendar's open-reset effect cannot live in `DatePickerCalendar` because the
  open state is not observable through context (keep `open` in the root context;
  do not reach into Popover internals);
- `DatePickerTrigger`'s ref cannot be read by the root for the choose/clear focus
  return (register it in context on layout; do not add a second focus path);
- a segment cannot be a part because the root must own input focus order (the
  parts keep their DOM order; do not reorder automatically);
- the existing logic suites (`date-picker/calendar.test.ts`,
  `time-picker/time.test.ts`) would have to change — they test pure functions and
  must not need a change.

## 6. Test plan

**DatePicker** — keep all fourteen (open on the selected month + focus, ISO
selection + close + trigger label, controlled value, day/week/edge movement,
PageDown browsing, Escape focus return, next-month target, both-theme selected
fill, disabled does not open, unavailable day refuses + announces, lower-bound
clamp, month browsing stops at the bound, clear closes + returns focus, Clear only
when asked). Add:

1. **the trigger takes its own placeholder and name** — `<DatePickerTrigger placeholder="Choose a day" label="Start date" />`
   shows `"Choose a day"` with `aria-label="Start date"`.
2. **the calendar is a part** — compose the root + trigger + content *without*
   `DatePickerCalendar`: opening shows `date-picker-content` and no
   `date-day-*` node (composition is not silently re-added by the root).

**TimePicker** — keep all eight (typed canonical value, completion from minutes,
clamping, carry/wrap, minuteStep, blur padding, clear only when asked, controlled
value). Add:

1. **the segments are parts in caller order** — compose minutes before the
   separator and hours; assert the layout order and that typing in the first
   segment still reports a canonical value (the context, not position, decides
   which segment is which).
2. **no clear control without the part** — `clearable` with a value but no
   `<TimePickerClear />` renders no `${testId}-clear`.

**Both directions.** In `DatePicker`, make `DatePickerCalendar` ignore the
context value and always start at today: the "opens on the selected month" test
fails. Restore. In `TimePicker`, make `TimePickerSegment` use `hours` for both
segments: the segments-in-caller-order and completion tests fail. Restore.

## 7. Acceptance criteria

- Four parts per component with JSDoc; no compatibility props for the moved
  regions (`placeholder`/`emptyLabel`-style props are gone from the roots).
- Every preserved behaviour in §6 still passes in the real renderer.
- Docs, examples, inventory, `COMPONENTS.md` and `docs/component-api.md` agree;
  §9 has no date/time row.
- All gates in §4 green.

## 8. Result

Landed 2026-10-17:

- `date-picker.tsx` — four parts over a root context, composed over `Popover`.
  The root keeps the value, bounds, open state and trigger registry; the calendar
  keeps the view month, the focused day and the cell ids. The trigger's ref is
  merged with the caller's and registered with the root, so select/clear still
  return focus; Escape still returns through `PopoverContent`.
- `time-picker.tsx` — four parts over a field root. The root keeps the value, the
  text state and the clamping; `TimePickerSegment` takes `segment`, the separator
  is a part, and `TimePickerClear` renders only with `clearable` and a value.
  The contract's §8 note and §9 record that this is a field, not a popup.
- Tests: DatePicker 16 (14 kept + trigger placeholder/name + empty surface without
  the calendar), TimePicker 10 (8 kept + caller order + no clear part). Full
  behaviour suite 291 green.
- Both directions: `DatePickerTrigger` printing the placeholder unconditionally
  fails open/select/controlled trigger tests; `TimePickerSegment` reading the
  hours text for both segments fails the typed-value tests. Restored, green.
- Examples compose the parts; docs pages updated; `COMPONENTS.md` says 16 and 10;
  `docs/component-api.md` §8 lists the parts and §9 now records no deviations.
- Gates: `nub run check-types` green, 222 unit tests, 291 behaviour tests.
