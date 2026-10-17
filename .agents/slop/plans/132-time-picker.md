# 132 — TimePicker: the time half of "date/time pickers"

- **Phase:** C (Tier 2 completion / hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 110, 117 (inventory gate), 119 (the date half)
- **Status:** planned, 2026-10-17. No implementation may start before this plan is
  indexed in `.agents/slop/plans/README.md`.

Plan 119 delivered the day picker and recorded "no time picker" as a limitation:
the mission's inventory item is **"date/time pickers where feasible"**, and only
half of it exists. A time picker *is* feasible in `@gpuix/native@0.10.0`: the
runtime ships real `<input>` host elements with `onChange`, `onKeyDown`, value
and read-only state (the same primitives `SearchInput` and `FieldInput` already
use), and `StyleDesc` can paint the field chrome. What the runtime does **not**
have is `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, so a custom
`role="spinbutton"` would be a half-announced widget. Two labelled text segments
are the honest shape.

The component is **not** folded into `DatePicker`: a date picker owns one day,
a time picker owns one time, and a combined value would force a
`YYYY-MM-DDTHH:mm` contract on every consumer that only needs one half. The two
compose in a form (see the example).

---

## 1. Files

```
packages/components/src/time-picker/time.ts          # pure parsing + clock arithmetic
packages/components/src/time-picker/time.test.ts     # the logic suite (+12)
packages/components/src/time-picker.tsx              # TimePicker (two segments + clear)
packages/components/src/behaviour/time-picker.test.tsx # native behaviour suite (+8)
packages/components/src/behaviour/theme-matrix.test.tsx # +1 both-theme row
packages/components/src/index.ts                     # export the module
packages/components/src/inventory.ts                 # timePickerMeta in the inventory
packages/components/examples/time-picker.example.tsx # the standup-time example
packages/components/examples/index.ts                # registry key "time-picker"
packages/components/docs/time-picker.mdx             # the component page
packages/components/README.md                        # two-row table update
packages/components/docs/date-picker.mdx             # point the time half at TimePicker
packages/components/src/date-picker.tsx              # datePickerMeta name + limitation
COMPONENTS.md                                        # split "Date / time pickers" into two rows
TODO.md                                              # the hardening task
.agents/slop/plans/README.md                         # index this plan
```

Read first: `src/search-input.tsx` (the input + clear + controlled pattern),
`src/field.tsx` (field chrome and the input contract), `src/date-picker.tsx`
(the value-format and pure-logic split), `src/behaviour/search-input.test.tsx`
(real keystrokes), `src/behaviour/theme-matrix.test.tsx` (the both-theme shape),
and `src/inventory.test.ts` (records must match rows).

## 2. Design decisions (do not re-litigate while implementing)

1. **The public value is `HH:mm`, 24-hour, or `null`.** Like the date picker's
   ISO day, the stored value never depends on display or locale. `undefined`
   means uncontrolled; `value` + `onValueChange` is the controlled contract.
2. **Two real `<input>` segments, hours and minutes.** No invented
   `role="spinbutton"`: 0.10.0 has `aria-valuetext` but no `aria-valuenow`, so a
   spinbutton would not announce its value. A text input announces its value
   natively.
3. **24-hour display, fixed.** No AM/PM and no locale: the repo has no i18n
   layer, and a 12-hour toggle is a display transformation that belongs to a
   message catalogue, not to this component. Document it.
4. **Typing is digit-only and segment-local.** Each segment keeps the last two
   digits of the incoming text (the host has no `maxLength`). A value above the
   segment maximum clamps immediately: `99` in hours becomes `23`, in minutes
   `59`. This is "parse, don't validate": the text and the value never disagree.
5. **Typing one segment composes a complete value with the other segment read as
   `0`, but does not fill the other segment's text.** So typing `9` in hours
   reports `09:00` while the field shows `9:MM`; the blank is filled on blur.
   This keeps the second keystroke predictable (no forced padding under the
   caret) and is the only reason the two segments are allowed to look
   temporarily incomplete.
6. **Emptying a segment clears the whole time.** Backspace in either segment to
   empty empties both texts and reports `null`. A half-erased time is not a
   value; the alternative leaves a displayed blank beside a stale value.
7. **Blur normalises.** When the field loses a segment and a value exists, the
   blank segment is filled with `00` and both segments are padded to two digits.
   Both segments blank with `null` stays blank.
8. **Arrow keys move by whole minutes through one arithmetic function.**
   `ArrowUp`/`ArrowDown` on hours shift `±60` minutes; on minutes shift
   `±minuteStep`. Both carry across the hour and wrap across midnight
   (`23:59 + 1 = 00:00`, `00:00 - 1 = 23:59`). One `addMinutes` implementation
   means hours and minutes cannot disagree at the boundary.
9. **`minuteStep` affects the arrow keys only** (default `1`, normalised to an
   integer in `1..59`; an invalid prop becomes `1`). Typed minutes are always
   `00..59`: the step is a convenience for incrementing, not a restriction on
   what a time may be. Document this explicitly.
10. **`clearable` is opt-in** and visible only when a value exists, matching
    `SearchInput` and `DatePicker`. It reports `null` and returns focus to the
    hours segment.
11. **Disabled is `readOnly` on both inputs**, plus no clear control and the
    dimmed container. 0.10.0 has no `aria-disabled`; a disabled time field that
    still responded to typing would be worse than the missing ARIA state.
12. **No `Date`, no timezone, no clock read.** This component handles a time of
    day only; it never constructs a timestamp. That is `DateTime`'s job when a
    consumer combines a day and a time.

## 3. `src/time-picker/time.ts` (pure)

```ts
import { pipe } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** Hours `0..23` and minutes `0..59`, independent of any date or zone. */
export interface TimeOfDay {
  readonly hours: number;
  readonly minutes: number;
}

/** Parse a canonical `HH:mm` (24-hour, two digits each). */
export const parseIsoTime: (value: string) => Option.Option<TimeOfDay>;

/** Canonical `HH:mm`. */
export const formatIsoTime: (time: TimeOfDay) => string;

/** Add whole minutes, wrapping across midnight in both directions. */
export const addMinutes: (time: TimeOfDay, amount: number) => TimeOfDay;

/** A strict segment: `"9"`/`"09"` are 9; empty, longer, non-digit or out of range is `None`. */
export const parseSegment: (
  text: string,
  max: number,
) => Option.Option<number>;

/** Digits clamped into `0..max`; non-digits or empty are `None`. */
export const clampSegment: (text: string, max: number) => Option.Option<number>;

/** Two digits: `0 -> "00"`, `9 -> "09"`, `23 -> "23"`. */
export const padSegment: (value: number) => string;

/** `undefined`, non-finite, `<1` -> `1`; `>59` -> `59`; fractional -> floor. */
export const normalizeStep: (step: number | undefined) => number;

/** The last two digits typed into a segment (the host has no `maxLength`). */
export const digitsOf: (raw: string) => string;

/** The canonical value of a segment pair; both blank is `None`. */
export const composeIsoTime: (
  hours: string,
  minutes: string,
) => Option.Option<string>;
```

Implementation notes:

- `parseIsoTime` uses `/^([01]\d|2[0-3]):([0-5]\d)$/` and `Number(...)`. It is
  strict: `"9:30"`, `"24:00"`, `"12:60"` are `None`.
- `formatIsoTime` uses `pipe(String(value), Str.padStart(2, "0"))`.
- `addMinutes` is total:
  `const total = ((hours * 60 + minutes + amount) % 1440 + 1440) % 1440;`
  then `{ hours: Math.floor(total / 60), minutes: total % 60 }`. Do not use
  `DateTime` here: a time of day is not an instant, and there is no clock read.
- `parseSegment` requires `/^\d{1,2}$/` and `<= max`. `clampSegment` requires
  `/^\d+$/` and returns `Math.min(Number(text), max)`; it never reads a number
  out of a non-digit string.
- `normalizeStep` is `Math.min(59, Math.max(1, Math.floor(step ?? 1)))`, with a
  non-finite guard (`Number.isFinite`) returning `1`.
- `digitsOf` is `pipe(raw, Str.replace(/\D/g, ""), Str.takeRight(2))`.
- `composeIsoTime` returns `None` when both texts are empty; otherwise blanks
  read as `0` and non-blank invalid text returns `None`:
  ```ts
  const segment = (text: string, max: number): Option.Option<number> =>
    text === "" ? Option.some(0) : parseSegment(text, max);
  ```
  combine with `Option.all` / `Option.flatMap` so an invalid pair is `None`.

No new dependency. `effect` and `effect/String` are already used in this package.

## 4. `src/time-picker.tsx`

### 4a. Public API

```ts
export interface TimePickerProps {
  /** The controlled `HH:mm` value, or `null` for none. `undefined` means uncontrolled. */
  readonly value?: string | null;
  readonly defaultValue?: string | null;
  readonly onValueChange?: (value: string | null) => void;
  /** The field group's accessible name; default `"Time"`. */
  readonly label?: string;
  /** Minutes per arrow-key step, normalised to 1..59. Default `1`. */
  readonly minuteStep?: number;
  /** Show a clear control while a time is set. Default `false`. */
  readonly clearable?: boolean;
  readonly disabled?: boolean;
  /** Base id for the parts: `<testId>-hours`, `-minutes`, `-clear`. Default `"time-picker"`. */
  readonly testId?: string;
}
```

Exports: `TimePicker`, `TimePickerProps`, `timePickerMeta`. JSDoc on every
export, and a header comment stating the value format, the two-segment choice
(no spinbutton because 0.10.0 lacks `aria-valuenow`), the fixed 24-hour display,
the step rule, the clear-on-empty rule, and the read-only disabled state.

### 4b. State

```ts
const initialValue = value !== undefined ? value : defaultValue;
const initialTime = Option.flatMap(Option.fromNullishOr(initialValue), parseIsoTime);
const [hoursText, setHoursText] = useState(() => Option.match(initialTime, {
  onNone: () => "",
  onSome: (time) => padSegment(time.hours),
}));
const [minutesText, setMinutesText] = useState(() => Option.match(initialTime, {
  onNone: () => "",
  onSome: (time) => padSegment(time.minutes),
}));
const [focused, setFocused] = useState(false);
const [selected, setSelected] = useControllableState<string | null>({
  value,
  defaultValue: defaultValue ?? null,
  onChange: onValueChange,
});
```

Two refs (`hoursInput`, `minutesInput`) of `PublicInstance | null`; the clear
action focuses `hoursInput`. No `useMergedRef` is needed: the component does not
expose a `ref` prop on either segment.

### 4c. External-value sync (the controlled contract)

A single `useEffect` keyed on `[selected, hoursText, minutesText]`:

```ts
const composed = Option.getOrNull(composeIsoTime(hoursText, minutesText));
if (composed === selected) return;
Option.match(
  Option.flatMap(Option.fromNullishOr(selected), parseIsoTime),
  {
    onNone: () => {
      setHoursText("");
      setMinutesText("");
    },
    onSome: (time) => {
      setHoursText(padSegment(time.hours));
      setMinutesText(padSegment(time.minutes));
    },
  },
);
```

Why this shape: when the displayed pair already canonicalises to the value
(typing `9` + blank minutes while the value is `09:00`), nothing is rewritten,
so the raw text under the caret survives. When a controlled consumer ignores a
change, the displayed pair no longer canonicalises to the prop, so the display
snaps back. A malformed controlled value canonicalises to nothing and shows an
empty field, exactly like a malformed `DatePicker` value shows the placeholder.
No refs, no "last emitted" sentinel.

### 4d. Editing

```ts
const emit = (next: string | null): void => setSelected(next);

const edit = (segment: "hours" | "minutes", raw: string): void => {
  const digits = digitsOf(raw);
  if (digits === "") {
    setHoursText("");
    setMinutesText("");
    emit(null);
    return;
  }
  const max = segment === "hours" ? 23 : 59;
  const clamped = Option.getOrElse(clampSegment(digits, max), () => 0);
  const text = Number(digits) > max ? padSegment(clamped) : digits;
  const nextHours = segment === "hours" ? text : hoursText;
  const nextMinutes = segment === "minutes" ? text : minutesText;
  if (segment === "hours") setHoursText(text);
  else setMinutesText(text);
  emit(Option.getOrNull(composeIsoTime(nextHours, nextMinutes)));
};
```

`onChange` on each input calls `edit("hours" | "minutes", event.value ?? "")` and
then the caller's own `onChange` is not part of the public props (the segment's
change is the component's). `onBlur` calls `normalize()`:

```ts
const normalize = (): void => {
  const time = Option.flatMap(Option.fromNullishOr(selected), parseIsoTime);
  Option.match(time, {
    onNone: () => undefined,
    onSome: (value) => {
      setHoursText(padSegment(value.hours));
      setMinutesText(padSegment(value.minutes));
    },
  });
  setFocused(false);
};
```

Arrow keys go through one helper:

```ts
const shift = (delta: number): void => {
  const from = Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(selected), parseIsoTime),
    () => ({ hours: 0, minutes: 0 }),
  );
  const next = addMinutes(from, delta);
  setHoursText(padSegment(next.hours));
  setMinutesText(padSegment(next.minutes));
  emit(formatIsoTime(next));
};
```

`onKeyDown` on an input: `ArrowUp` -> `shift(segment === "hours" ? 60 : step)`,
`ArrowDown` -> the negative. Ignore every other key; digits arrive through
`onChange`, and no key is swallowed. `step = normalizeStep(minuteStep)`.

Clear:

```ts
const clear = (): void => {
  setHoursText("");
  setMinutesText("");
  emit(null);
  const instance = hoursInput.current;
  if (instance !== null) renderer?.focusElement?.(instance.id);
};
```

`useGpuix().renderer` is imported exactly as in `SearchInput`.

### 4e. Markup and styling

```
div role="group" aria-label={label ?? "Time"} testId={testId ?? "time-picker"}
  input testId={`${id}-hours`}   aria-label={`${label ?? "Time"} hours`}
  text  ":"                       color mutedForeground, userSelect none
  input testId={`${id}-minutes`} aria-label={`${label ?? "Time"} minutes`}
  [div role="button" aria-label="Clear time" testId={`${id}-clear`} > text ✕]
```

- Container: `display: flex; flexDirection: row; alignItems: center; gap:
  spacing["2xs"]; height: controlHeight(theme, "md"); paddingLeft/Right:
  spacing.sm; backgroundColor: colors.input; borderWidth: thin; borderColor:
  colors.border; borderRadius: radius.md; opacity: disabled ? 0.5 : 1;
  ...(focused && !disabled ? focusRing(theme) : {})`.
- Segment input: `...textStyle(theme, "body"); width: 26; height: "100%;
  padding: 0; textAlign: "center"; backgroundColor: undefined; color:
  colors.inputForeground`. `readOnly={disabled}`, `tabIndex={disabled ? -1 :
  0}`, `placeholder="HH"` / `"MM"`, `value={hoursText|minutesText}`.
- Clear control: copy the `SearchInput` clear control's 18×18 `radius.sm`
  chrome, hover `colors.accent`/`accentForeground`, muted glyph. Rendered only
  when `clearable && Option.isSome(selectedTime) && !disabled`.
- `onFocus` on either input sets `focused`; `onBlur` runs `normalize` (which
  clears the flag). The ring therefore wraps both segments while either has
  focus.

### 4f. Inventory record

```ts
export const timePickerMeta = {
  name: "Time pickers",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "fixed 24-hour display: no AM/PM and no locale, because the repo has no i18n layer",
    "two labelled text segments instead of a spinbutton: 0.10.0 has no aria-valuenow",
    "minuteStep affects the arrow keys only; typed minutes accept 00..59",
    "disabled is readOnly plus dimming: 0.10.0 has no aria-disabled",
    "no seconds and no timezone: the value is a time of day, not an instant",
  ],
  docs: "docs/time-picker.mdx",
  example: "examples/time-picker.example.tsx",
  testFile: "src/behaviour/time-picker.test.tsx",
} as const;
```

## 5. Tests

### 5a. `src/time-picker/time.test.ts` (pure, 12 tests)

The header comment states the guarded bugs: *a canonical-only parser that
accepted `9:30`; formatting that dropped the leading zero; minute arithmetic
that did not carry at the hour or wrap at midnight; an out-of-range segment that
was stored instead of clamped; a step of `0` that made arrow keys a no-op.*

1. `parseIsoTime` accepts `00:00`, `09:05`, `23:59`; rejects `9:30`, `24:00`,
   `12:60`, `""`, `12:5`.
2. `formatIsoTime` pads both parts and round-trips every one of the 1440
   minutes (`Arr.range(0, 1439)` + a fold / `Arr.every`): for each total,
   `parseIsoTime(formatIsoTime(t))` equals `t`.
3. `addMinutes` carries forward at the hour (`09:59 + 1 = 10:00`).
4. `addMinutes` carries backward at the hour (`10:00 - 1 = 09:59`).
5. `addMinutes` wraps forward across midnight (`23:59 + 1 = 00:00`) and backward
   (`00:00 - 1 = 23:59`).
6. `addMinutes` is total over a whole day either way (`+1440`, `-1500`).
7. `parseSegment` accepts `"9"` and `"09"` as `9`; rejects `""`, `"1a"`, `" 9"`,
   `"123"`, and `"24"` with `max = 23`.
8. `clampSegment` turns `"99"` into `23` (and `"99"` into `59` with `max = 59`),
   leaves `"09"` at `9`, and returns `None` for `""` and non-digits.
9. `padSegment` maps `0 -> "00"`, `9 -> "09"`, `23 -> "23"`.
10. `normalizeStep` maps `undefined`, `0`, `-3`, `NaN` to `1`; `90` to `59`;
    `5.7` to `5`.
11. `digitsOf` keeps only digits and the last two: `"09"` -> `"09"`,
    `"0a9"` -> `"09"`, `"092"` -> `"92"`, `"ab"` -> `""`.
12. `composeIsoTime` returns `None` for `("", "")`, `09:00` for `("9", "")` and
    `("", "0")` for the minute side, and `None` for a non-digit pair.

Expected: logic suite 199 -> 211.

### 5b. `src/behaviour/time-picker.test.tsx` (native, 8 tests)

Header comment states the guarded bugs: *typing that never reached
`onValueChange`; an hour typed without filling the minutes; a value that
disagreed with the displayed text; arrow keys that stopped at the hour or the
midnight boundary; a clear control on an empty or non-clearable field; a
controlled field that changed itself when the consumer said no.*

Wrapper: `<div style={{ width: 360, padding: 40 }}><TimePicker testId="time"
value={value} defaultValue={defaultValue} onValueChange={spy}
minuteStep={step} clearable={clearable} /></div>` rendered via
`renderComponent`.

Helper `typeIn(root, testId, text)`: `renderer.focusElement` the segment, then
one `simulateKeystrokes(char)` per character — the same technique as
`search-input.test.tsx`.

1. **Typing hours reports a canonical time.** Focus `time-hours`, type `0`,
   `9`; the last `onValueChange` call is `["09:00"]`, the hours input's
   `customProps.value` is `"09"`, and the minutes input is still blank.
2. **Typing minutes completes the value.** From hours `9`, focus `time-minutes`,
   type `4`, `5`; last call is `["09:45"]`, and both segment values are `"9"`
   and `"45"` (raw text survives while editing).
3. **Out-of-range digits clamp in the text and the value.** Type `9`, `9` in
   hours: last call `["23:00"]` and `customProps.value` is `"23"` (not `"99"`).
4. **Arrow keys carry and wrap through one path.** `defaultValue="09:59"`,
   focus minutes, `simulateKeystrokes("up")` -> `["10:00"]` and texts `"10"`,
   `"00"`; re-render with `defaultValue="00:30"`, focus hours, `"down"` ->
   `["23:30"]`. Both assertions in one test, each independently able to fail.
5. **`minuteStep` moves minutes only.** `defaultValue="09:50"` with
   `minuteStep={15}`, `"up"` on minutes -> `["10:05"]`; `"up"` on hours ->
   `["11:05"]`.
6. **Blur pads the segments.** Type `9` in hours, then move focus to minutes
   (or blur the hours input through the renderer): hours' value becomes `"09"`
   while the minute segment is focused. (Use a real focus change, not a direct
   handler call; STOP if the renderer has no blur route — report, do not fake.)
7. **Clear is opt-in and resets.** `defaultValue="09:30"` + `clearable`, click
   `time-clear`: last call `["null"]`, both segments read `""`, and focus is
   `time-hours`. Then render an empty `clearable` picker and a non-clearable
   one: neither has `time-clear` (one test, independent assertions).
8. **The controlled contract holds.** `value="09:00"` + spy; type `3` in hours
   (incoming `"09" + "3"` -> last two `93` -> clamp `23`); the spy receives
   `"23:00"` while the displayed hours stay `"09"` because the consumer did not
   adopt the change.

Add a `disabled` assertion inside test 7 or 8 (no extra count): both inputs have
`customProps.readOnly === true` and the clear control is absent.

Expected: the TimePicker suite is 8 tests; behaviour 250 -> 258 before the
matrix row.

### 5c. `src/behaviour/theme-matrix.test.tsx` (+1)

Add a `TimePicker` import and one `it`:

```ts
it("TimePicker takes its field surface and text from the theme", () => {
  bothThemes(
    () => <TimePicker testId="time" defaultValue="09:30" />,
    (root, theme) => {
      expect(root.renderer.findByTestId("time")?.style.backgroundColor).toBe(
        theme.colors.input,
      );
      expect(
        root.renderer.findByTestId("time-hours")?.style.color,
      ).toBe(theme.colors.inputForeground);
    },
  );
});
```

Update the file header's list of components covered here (it currently omits
DatePicker and DropdownMenu because their suites assert both themes). State that
TimePicker is covered by this matrix.

Expected behaviour total 250 -> 259.

### 5d. Both directions

Feature, not a regression fix; prove the tests can fail mechanically:

1. Run the new suites green; record the counts.
2. Remove the `Number(digits) > max` clamp branch -> test 3 must fail on the
   `"23"` text and the `"23:00"` value.
3. Change `shift(60)` for hours to `shift(step)` -> test 4's `23:30` fails.
4. Remove the external-sync effect -> test 8 must fail (the display keeps
   `"23"`), proving it guards the controlled contract.
5. Restore everything and re-run green. Record each red line in §9.

## 6. Example, docs, inventory, ledgers

- `examples/time-picker.example.tsx` — a "Daily standup" card: app-owned
  `string | null` state, `TimePicker label="Standup time" minuteStep={15}
  clearable`, and a caption showing the selected `HH:mm` or "not set". Imports
  `Card`/`CardHeader`/`CardTitle`/`CardDescription`, `TimePicker`, and
  `textStyle`/`useTheme` exactly like the date-picker example.
- `examples/index.ts` — import and register `time-picker: TimePickerExample`
  (alphabetical, after `tabs`? Registry is alphabetical except grouped imports:
  put `TimePickerExample` after `TabsExample` and the key after `tabs`).
- `docs/time-picker.mdx` — frontmatter title/description; intro; code block;
  Value format; Anatomy table (group / hours / minutes / colon / clear); Editing
  (digit rules, clear-on-empty, blur); Keyboard table (typing, arrows with
  step/carry/wrap, Tab, clear); `minuteStep`; Controlled and uncontrolled;
  Theming; Accessibility and limitations (no `aria-valuenow`/spinbutton role, no
  `aria-disabled`, fixed 24-hour/no locale, no seconds/timezone, step is arrows
  only); Verification (12 logic + 8 native); Related (Date picker, Field,
  Combobox).
- `docs/date-picker.mdx` — replace the "No time picker" limitation with a
  pointer to **Time pickers** (the day and the time compose in a form; the date
  picker still owns one day), and add **Time picker** to Related.
- `src/date-picker.tsx` — `datePickerMeta.name` becomes `"Date pickers"`; the
  "no time picker" limitation becomes "time is a separate TimePicker; this
  control owns one day". Keep every other limitation.
- `src/index.ts` — `export * from "./time-picker.js";` in the alphabetical list.
- `src/inventory.ts` — import `timePickerMeta` and add it to `inventory` in
  alphabetical order.
- `COMPONENTS.md` — rename the date row to **Date pickers** and drop "no time
  picker" from its notes (point at the new row). Add a **Time pickers** row
  directly after it: `done`, `yes`, value `HH:mm`/`null`, two labelled input
  segments, arrows with carry/wrap, typed clamp, `minuteStep`, `clearable`,
  blur padding, disabled readOnly; 8 native behaviour tests + 12 logic tests;
  limitations (fixed 24-hour/no locale, no `aria-valuenow` spinbutton, no
  `aria-disabled`, no seconds/timezone).
- `packages/components/README.md` — split/extend the table:
  `src/time-picker.tsx`, `src/time-picker/time.ts` | TimePicker: 24-hour
  `HH:mm` in two labelled segments, arrow carry/wrap, clamped typing, optional
  clear. Update the date-picker row to "DatePicker: the day half" wording.
- `TODO.md` — under "Tier 2 hardening after the inventory closed":
  `- [x] Time picker, the time half of the date/time item — plan 132`.
- `.agents/slop/plans/README.md` — add plan 132 to the components table with its
  final test counts and `done` status.

## 7. STOP conditions

1. A GPUix `<input>` does not deliver `onKeyDown` for `ArrowUp`/`ArrowDown` in
   the real renderer -> STOP and report the event sequence; do not move the
   handler to a wrapper div unless the probe shows the keys arrive there, and
   record whichever surface does.
2. A `<input>` rejects `placeholder`, `value`, `readOnly`, `textAlign` or
   `backgroundColor: undefined` at the type level -> STOP with the compiler
   output; do not cast.
3. `simulateKeystrokes` does not reach an input focused with `focusElement`
   (the SearchInput suite proves it normally does) -> STOP and report; do not
   call the React handler directly.
4. There is no way to blur a segment in the test renderer -> STOP and report;
   do not fake the blur test by calling an internal handler.
5. The controlled sync effect loops (a render/effect cycle) -> STOP and report
   the render count; do not add a ref-based escape hatch without updating this
   plan.
6. Clamping one segment changes the other segment's text while typing -> STOP;
   rule 5 exists to prevent that.
7. Any type error needs `any`, a cast or a non-null assertion -> STOP with the
   compiler output.
8. A test is flaky across two consecutive runs -> STOP and report; nothing here
   is time-dependent.

## 8. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 199 -> 211 logic tests
nub run --filter @gpuixui/components test:behaviour   # 250 -> 259; TimePicker 8
nub run check                                         # repo gate, exit 0
nub run lint                                          # exit 0
nub run test                                          # exit 0
```

If a count differs, record why in §9 — do not lower an expectation to match a
missing test.

## 9. Deviations, recorded during implementation

(fill in during implementation: actual counts, both-direction output, any STOP
condition hit and its evidence, and any API decision the runtime forced.)
