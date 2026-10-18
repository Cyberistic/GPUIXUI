/**
 * The month grid behind DatePicker: pure `DateTime` arithmetic, no `Date`, no
 * `Intl`, no locale lookup.
 *
 * A grid is always six rows of seven cells so the popover does not change height
 * between a short February and a long month. Only days that belong to the month
 * are `Some`; the leading and trailing blanks are `None` and render as empty
 * boxes, because a grid that also shows the adjacent month is a different
 * component with different selection rules.
 *
 * The strings the grid paints — month names, weekday headings, the unavailable
 * suffix and the three control names — are a typed label set with English
 * defaults. A consumer with a message catalogue passes its entries in; there is
 * no locale lookup here, because a locale id that silently failed to resolve
 * would be worse than English.
 */

import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";

/** Which weekday a week starts on: Sunday (`0`) or Monday (`1`). */
export type WeekStart = 0 | 1;

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

const MONTHS: ReadonlyArray<string> = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Sunday-first, then Monday-first; `weekDay` is 0 for Sunday. */
const WEEKDAYS: ReadonlyArray<string> = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

/** The English labels, used when a caller supplies none. */
export const defaultCalendarLabels: CalendarLabels = {
  months: MONTHS,
  weekdays: WEEKDAYS,
  unavailable: "unavailable",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  clear: "Clear",
};

/**
 * Apply the caller's overrides over the defaults. Every omitted field keeps its
 * default, so one renamed control does not blank the rest.
 */
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

/** The weekday labels in the column order the grid uses. */
export const weekdayLabels = (
  weekStartsOn: WeekStart,
  labels: CalendarLabels = defaultCalendarLabels,
): ReadonlyArray<string> =>
  weekStartsOn === 1
    ? [...Arr.drop(labels.weekdays, 1), ...Arr.take(labels.weekdays, 1)]
    : labels.weekdays;

/** `"October 2026"`. */
export const formatMonthLabel = (
  value: DateTime.Utc,
  labels: CalendarLabels = defaultCalendarLabels,
): string => {
  const parts = DateTime.toPartsUtc(value);
  const month = Option.getOrElse(Arr.get(labels.months, parts.month - 1), () =>
    String(parts.month),
  );
  return `${month} ${parts.year}`;
};

/** `"17 October 2026"`, the accessible name of a day button. */
export const formatDayLabel = (
  value: DateTime.Utc,
  labels: CalendarLabels = defaultCalendarLabels,
): string => {
  const parts = DateTime.toPartsUtc(value);
  return `${parts.day} ${formatMonthLabel(value, labels)}`;
};

/** The first moment of the month, in UTC. */
export const startOfMonth = (value: DateTime.Utc): DateTime.Utc =>
  DateTime.startOf("month")(value);

/** Add calendar months to the first of a month; day one never overflows. */
export const addMonths = (value: DateTime.Utc, amount: number): DateTime.Utc =>
  DateTime.add({ months: amount })(startOfMonth(value));

/** Whether two values fall on the same calendar day, ignoring the time. */
export const isSameDay = (left: DateTime.Utc, right: DateTime.Utc): boolean => {
  const a = DateTime.toPartsUtc(left);
  const b = DateTime.toPartsUtc(right);
  return a.year === b.year && a.month === b.month && a.day === b.day;
};

/** `YYYY-MM-DD`, the public value format. */
export const formatIsoDay = (value: DateTime.Utc): string =>
  DateTime.formatIsoDateUtc(value);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a `YYYY-MM-DD` day at UTC midnight. Anything malformed, out of range, or
 * normalised by the parser (such as `2026-02-30`) is `None`.
 */
export const parseIsoDay = (value: string): Option.Option<DateTime.Utc> =>
  pipe(
    ISO_DAY.test(value) ? Option.some(value) : Option.none(),
    Option.flatMap((day) => DateTime.make(`${day}T00:00:00.000Z`)),
    Option.filter((parsed) => DateTime.formatIsoDateUtc(parsed) === value),
    Option.map((parsed) => DateTime.startOf("day")(parsed)),
  );

/**
 * Six weeks of seven cells for `month`. `Some` is a day in the month; `None` is a
 * blank cell before the first or after the last day.
 */
export const monthGrid = (
  month: DateTime.Utc,
  weekStartsOn: WeekStart,
): ReadonlyArray<ReadonlyArray<Option.Option<DateTime.Utc>>> => {
  const start = startOfMonth(month);
  const monthParts = DateTime.toPartsUtc(start);
  const offset = (monthParts.weekDay - weekStartsOn + 7) % 7;
  const firstCell = DateTime.add({ days: -offset })(start);

  const cell = (index: number): Option.Option<DateTime.Utc> => {
    const day = DateTime.add({ days: index })(firstCell);
    const parts = DateTime.toPartsUtc(day);
    return parts.year === monthParts.year && parts.month === monthParts.month
      ? Option.some(day)
      : Option.none();
  };

  return Arr.map(Arr.range(0, 5), (week) =>
    Arr.map(Arr.range(0, 6), (day) => cell(week * 7 + day)),
  );
};

/** Add calendar days. */
export const addDays = (value: DateTime.Utc, amount: number): DateTime.Utc =>
  DateTime.add({ days: amount })(value);

/** The month's last day, used to clamp a day-of-month move. */
export const lastDayOfMonth = (value: DateTime.Utc): DateTime.Utc =>
  DateTime.add({ days: -1 })(addMonths(value, 1));

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

/** Parse the public ISO props; a malformed or absent bound is unbounded. */
export const boundsOf = (
  min?: string | null,
  max?: string | null,
): DayBounds => ({
  min: Option.flatMap(Option.fromNullishOr(min), parseIsoDay),
  max: Option.flatMap(Option.fromNullishOr(max), parseIsoDay),
});

/** Whether `day` may be selected: both bounds are inclusive. */
export const isAvailable = (day: DateTime.Utc, bounds: DayBounds): boolean => {
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
    onSome: (min) => (millis < DateTime.toEpochMillis(min) ? min : day),
  });
  return Option.match(bounds.max, {
    onNone: () => lower,
    onSome: (max) =>
      DateTime.toEpochMillis(lower) > DateTime.toEpochMillis(max) ? max : lower,
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
        onSome: (min) => current > DateTime.toEpochMillis(startOfMonth(min)),
      }),
    ),
    Match.when(1, () =>
      Option.match(bounds.max, {
        onNone: () => true,
        onSome: (max) => current < DateTime.toEpochMillis(startOfMonth(max)),
      }),
    ),
    Match.exhaustive,
  );
};
