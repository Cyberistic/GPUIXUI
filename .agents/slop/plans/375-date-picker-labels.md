# 375 — DatePicker display labels belong to the caller

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream |
| Depends on | `119` (date picker), `127` (bounds/clear), `303` (parts), `333`/`335` (docs truth), `337` (API truth) |
| Status | done |

## 1. The problem

`DatePicker` paints English strings the caller cannot change: twelve month
names, seven weekday headings, the `, unavailable` suffix on a day that cannot be
chosen, the previous/next month controls' accessible names and the `Clear`
control's text. `date-picker/calendar.ts` says this is deliberate ("the repo has
no i18n layer … inventing a half-locale here would be a second source of truth")
and `COMPONENTS.md` records it as a limitation.

That decision is right about a *locale lookup*: a `locale="fr-FR"` prop that
silently failed to find a catalogue would be worse than English. It is wrong
about *strings*: a consumer shipping a German, Japanese or brand-specific UI
already owns a message catalogue and has no way to hand three of its entries to
this control. The honest seam is a **typed set of display strings** — never a
locale identifier — so the caller's catalogue is the single source of truth and
the component performs no lookup.

This plan is additive: the defaults stay exactly the English strings the suite
already asserts, so no existing call site changes behaviour.

## 2. Scope

**In scope**

- `CalendarLabels` in `src/date-picker/calendar.ts`: `months` (12),
  `weekdays` (7, Sunday first), `unavailable`, `previousMonth`, `nextMonth`,
  `clear`.
- `defaultCalendarLabels` and `resolveCalendarLabels(overrides?)` so a caller may
  override one string without supplying all of them.
- `DatePicker` gains `labels?: Partial<CalendarLabels>`; the resolved labels live
  in the existing date-picker context.
- `DatePickerTrigger`, `DatePickerCalendar` consume the context labels for every
  string they paint.
- Weekday headings are keyed by column index, not by the label text. A caller
  supplying initials (`S M T W T F S`) has duplicate strings, and the current
  `key={name}` would give React duplicate keys.
- Docs, example, inventory record, `COMPONENTS.md` row and `TODO.md`.

**Out of scope — do not touch**

- No locale identifier, no `Intl` call, no message-catalogue dependency.
- No new display format (month-first, `17.10.2026`, RTL ordering). The label
  *strings* are the caller's; the *shape* (`Month YYYY`, `D Month YYYY`) stays.
- `TimePicker`'s 24-hour display (a separate, deliberately-scoped decision) and
  the calendar's fixed `DateTime` arithmetic.
- Any file outside `packages/components/`, `docs/`, `COMPONENTS.md`, `TODO.md`
  and this plan set. In particular `packages/tokens` is not involved.

## 3. Files and exact changes

### 3.1 `packages/components/src/date-picker/calendar.ts`

1. Add, above `MONTHS`:

   ```ts
   /** The display strings a calendar paints. Defaults are English. */
   export interface CalendarLabels {
     /** Twelve month names, January first. */
     readonly months: ReadonlyArray<string>;
     /** Seven short weekday names, Sunday first. */
     readonly weekdays: ReadonlyArray<string>;
     /** The suffix after the name of a day that cannot be chosen. */
     readonly unavailable: string;
     /** The previous-month control's accessible name. */
     readonly previousMonth: string;
     /** The next-month control's accessible name. */
     readonly nextMonth: string;
     /** The clear control's text. */
     readonly clear: string;
   }
   ```

2. Rename `MONTHS`/`WEEKDAYS` to module-private defaults used by
   `defaultCalendarLabels` (keep the arrays as the source):

   ```ts
   /** The English labels, used when a caller supplies none. */
   export const defaultCalendarLabels: CalendarLabels = {
     months: MONTHS,
     weekdays: WEEKDAYS,
     unavailable: "unavailable",
     previousMonth: "Previous month",
     nextMonth: "Next month",
     clear: "Clear",
   };

   /** Apply the caller's overrides over the defaults. Never returns undefined fields. */
   export const resolveCalendarLabels = (
     overrides?: Partial<CalendarLabels>,
   ): CalendarLabels => ({
     months: overrides?.months ?? defaultCalendarLabels.months,
     weekdays: overrides?.weekdays ?? defaultCalendarLabels.weekdays,
     unavailable: overrides?.unavailable ?? defaultCalendarLabels.unavailable,
     previousMonth:
       overrides?.previousMonth ?? defaultCalendarLabels.previousMonth,
     nextMonth: overrides?.nextMonth ?? defaultCalendarLabels.nextMonth,
     clear: overrides?.clear ?? defaultCalendarLabels.clear,
   });
   ```

3. Thread the labels with a default parameter so existing call sites (tests,
   docs and the package) keep compiling unchanged:

   ```ts
   export const formatMonthLabel = (
     value: DateTime.Utc,
     labels: CalendarLabels = defaultCalendarLabels,
   ): string => { … Arr.get(labels.months, parts.month - 1) … };

   export const formatDayLabel = (
     value: DateTime.Utc,
     labels: CalendarLabels = defaultCalendarLabels,
   ): string => `${parts.day} ${formatMonthLabel(value, labels)}`;

   export const weekdayLabels = (
     weekStartsOn: WeekStart,
     labels: CalendarLabels = defaultCalendarLabels,
   ): ReadonlyArray<string> =>
     weekStartsOn === 1
       ? [...Arr.drop(labels.weekdays, 1), ...Arr.take(labels.weekdays, 1)]
       : labels.weekdays;
   ```

   The fallback when a month index is missing stays as today
   (`String(parts.month)`), so a short `months` array cannot crash a render.

### 3.2 `packages/components/src/date-picker.tsx`

1. Import `resolveCalendarLabels`, `type CalendarLabels` from
   `./date-picker/calendar.js`.
2. Add to `DatePickerProps` (after `today`):

   ```ts
   /**
    * Display strings the calendar paints: month names, weekday headings, the
    * unavailable suffix and the three control names. The defaults are English.
    * This is not a locale: the component performs no lookup, so pass the entries
    * from your own catalogue. Partial: every omitted field keeps its default.
    */
   readonly labels?: Partial<CalendarLabels>;
   ```

3. Destructure `labels` in `DatePicker`, resolve it once
   (`const calendarLabels = resolveCalendarLabels(labels);`), add
   `readonly labels: CalendarLabels` to `DatePickerContextValue` and put the
   resolved value on the provider.
4. `DatePickerTrigger`: read `labels` and pass it to
   `formatDayLabel(day, labels)`.
5. `DatePickerCalendar`: read `labels`; use it for
   - the month heading: `formatMonthLabel(viewMonth, labels)`;
   - `weekdayLabels(weekStartsOn, labels)` with `key={index}` on the heading
     cells;
   - the day's `aria-label`: `${formatDayLabel(day, labels)}, ${labels.unavailable}`;
   - the previous/next `IconButton` labels;
   - the clear `Button` text: `{labels.clear}`.
6. Update the module header comment: replace "fixed English month/day labels (no
   i18n layer in the repo yet)" with "display labels default to English and are
   the caller's (`labels`), never a locale lookup".
7. Update `datePickerMeta.limitations`: replace

   `"day and month labels are fixed English strings: the repo has no i18n layer"`

   with

   `"display labels default to English: pass `labels` from your catalogue; there is no locale lookup, and the display shape (Month YYYY / D Month YYYY) is fixed"`.

### 3.3 `packages/components/src/date-picker/calendar.test.ts`

Add one `describe("caller labels")` block with **four** tests (fail-able: each
asserts a string the old code cannot produce):

1. `resolveCalendarLabels()` returns the English defaults — October index 9,
   `weekdays[0] === "Sun"`, `unavailable === "unavailable"`,
   `clear === "Clear"`.
2. An override of `clear` alone keeps every other field at its default
   (proves the merge is partial, not a replacement).
3. `formatMonthLabel`/`formatDayLabel` with a renamed October produce
   `"oktober 2026"` / `"17 oktober 2026"`.
4. `weekdayLabels(1, labels)` rotates the caller's list (a German list starting
   `So` becomes `Mo Di Mi Do Fr Sa So`).

The suite header comment gains a line naming the bug guarded: "a calendar that
only spoke English".

### 3.4 `packages/components/src/behaviour/date-picker.test.tsx`

1. Extend the `Picker` fixture with an optional `labels` prop passed through to
   `DatePicker`.
2. Add **two** native tests:

   - **paints the caller's strings**: `defaultValue="2026-10-17"`,
     `labels` with `months` whose October is `"Oktobar"`, `weekdays` starting
     `"Ned"`, `previousMonth: "Prethodni mesec"`, `nextMonth: "Sledeći mesec"`,
     `clear: "Obriši"`, `unavailable: "nedostupno"`, `clearable`, `min` that
     makes 16 October unavailable. Open and assert:
     - `findByText("Oktobar 2026")` is defined;
     - the trigger (closed) painted `"17 Oktobar 2026"` before opening —
       assert with `getAllText()` after unmounting the content path, or check
       before `open(picker)`;
     - the weekday heading "Ned" is painted;
     - `date-day-2026-10-16`'s `aria-label` is
       `"16 Oktobar 2026, nedostupno"`;
     - `date-prev`/`date-next` `customProps["aria-label"]` are the caller's;
     - the clear control's painted text is `"Obriši"`.
   - **defaults are unchanged**: the existing first test already asserts
     `"17 October 2026"` and `"October 2026"`; do **not** duplicate it. Instead
     assert one API boundary: `labels={{ clear: "Dismiss" }}` (only one field)
     still paints `October 2026` and the default weekday "Sun" while the clear
     control reads `"Dismiss"`. This catches a merge that replaced the whole
     object.

3. Header comment: add "the labels: a calendar that only spoke English, and a
   partial `labels` object wiping the defaults".

### 3.5 `packages/components/examples/date-picker.example.tsx`

Add a second field to the existing card, "Review date", composing the same parts
with compact labels:

```tsx
const COMPACT: Partial<CalendarLabels> = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  previousMonth: "Previous month",
  nextMonth: "Next month",
  clear: "Clear",
};
```

Keep it controlled state (`review`/`setReview`), `clearable`, and one sentence
under the fields saying the display strings come from the caller. Do **not**
create a new example file: the registry enforces one example per docs page id
(`src/inventory.test.ts`, plan 330), and `date-picker` already owns that id.

### 3.6 `packages/components/docs/date-picker.mdx`

1. Add a `## Labels` section between **Clearing** and **Keyboard** with a short
   `labels={{ … }}` snippet and these claims:
   - defaults are the English strings above;
   - `labels` is partial, and this is not a locale — no lookup happens;
   - the display shape stays `Month YYYY` and `D Month YYYY`;
   - the weekday heading may repeat (initials are allowed) because headings are
     keyed by column.
2. In **Accessibility and limitations**, replace the "Fixed English labels"
   bullet with one that says the strings are the caller's, the value is still an
   ISO day, and the *shape* is fixed.
3. In **Verification**, update the counts: calendar `18 → 22` tests, behaviour
   `18 → 20` tests, and name the new cases in the sentence.

### 3.7 `COMPONENTS.md`

In the **Date pickers** row, replace the phrase

> Fixed English labels, no adjacent-month days in the grid, …

with

> Display labels default to English and are the caller's (`labels`: months,
> weekdays, unavailable suffix, month/clear control names — no locale lookup);
> no adjacent-month days in the grid, …

Keep the rest of the row and its test count unchanged except for the new count.

### 3.8 `TODO.md`

Under **Tier 2 hardening after the inventory closed**, add and tick:

```
- [x] DatePicker display labels are the caller's (`labels`), not fixed English —
  plan 375; 4 calendar + 2 native tests, both-direction proof
```

### 3.9 This plan set

Add plan 375 to `.agents/slop/plans/README.md` with status `done` once every gate
below passes.

## 4. Commands and expected results

Run from `workspaces/components`.

```sh
nub run --filter @gpuixui/components check-types
# expected: tsc --noEmit … Done (exit 0)

nub run --filter @gpuixui/components test
# expected: all suites pass; the unit total rises by 4 (357 → 361)

nub run --filter @gpuixui/components test:behaviour
# expected: all 47 files pass; the behaviour total rises by 2 (545 → 547)

nub run check
# expected: check:tests, lint, fmt, check-types all exit 0

nub run lint
nub run test
# expected: exit 0
```

If the behaviour suite cannot start, read `src/runtime.test.tsx` and
`.agents/adr/0003-darwin-x64-source-build.md`; a host without the binding is a
STOP, not a reason to skip the assertions.

## 5. Both-direction proof

After the suite is green, prove each new native assertion can fail:

1. In `date-picker.tsx`, make `DatePickerCalendar` call
   `formatMonthLabel(viewMonth)` and `formatDayLabel(day)` **without** `labels`,
   and render the default `"Previous month"` label. Run
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/date-picker.test.tsx`
   from `packages/components`.
   Expected: the new "paints the caller's strings" test fails on the first
   mismatched string; the rest may pass.
2. Restore the labelling. Re-run the same command: all tests pass.
3. For the merge test, change `resolveCalendarLabels` to
   `(overrides) => overrides as CalendarLabels` (a whole-object replacement) and
   run `vitest run src/date-picker/calendar.test.ts`. Expected: the
   "keeps the other defaults" test fails. Restore.

Record the exact failing assertion names in the commit message body or in this
plan's status line.

## 6. STOP conditions

Stop and report instead of improvising if:

- a change would require editing any file outside the paths listed in §3;
- the runtime paints a caller label but `findByText`/`customProps` cannot observe
  it (then the test must assert through the raw element tree and the plan's API
  claim stays honest — record the limitation rather than weakening the seam);
- a full-object `labels` prop turns out to be needed because partial merging
  cannot be typed without `any` (it can: `Partial<CalendarLabels>` plus `??`);
- the example registry check starts failing because a second example file was
  added (do not add one);
- any gate fails twice for the same reason.

## 7. Acceptance criteria

- `DatePicker` accepts `labels?: Partial<CalendarLabels>`; every string the
  calendar or trigger paints is resolved from it, with English defaults.
- A partial object keeps every omitted field at its default (unit test proves
  it).
- The weekday heading is keyed by column, so duplicate initials are legal.
- Four calendar tests and two native tests fail on the pre-change code path
  demonstrated in §5 and pass after it.
- Docs, example, inventory record, `COMPONENTS.md`, `TODO.md` and the plan index
  are synced; no docs page claims a test count the suite does not have.
- `nub run check`, `nub run lint` and `nub run test` pass.
- No locale, `Intl`, `Date` or new dependency is introduced.
