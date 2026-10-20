/**
 * The month grid behind DatePicker: pure `DateTime` arithmetic, no `Date`, no
 * `Intl`, no locale lookup.
 *
 * A grid is always six rows of seven real days so the popover does not change
 * height between a short February and a long month. Leading and trailing cells
 * belong to the adjacent months and carry `inMonth: false`; the calendar paints
 * them muted and lets them be chosen, so no cell is dead.
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
  /** The grid's description when the range leaves no day to choose. */
  readonly noAvailableDays: string;
  /** The previous-month control's accessible name. */
  readonly previousMonth: string;
  /** The next-month control's accessible name. */
  readonly nextMonth: string;
  /** The chooser's previous-year control name. */
  readonly previousYear: string;
  /** The chooser's next-year control name. */
  readonly nextYear: string;
  /** The month grid's name, and the day header's month-chooser control. */
  readonly chooseMonth: string;
  /** The chooser's control that returns to the day grid. */
  readonly showDays: string;
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
  noAvailableDays: "No available dates",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  previousYear: "Previous year",
  nextYear: "Next year",
  chooseMonth: "Choose month",
  showDays: "Show days",
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
  noAvailableDays:
    overrides?.noAvailableDays ?? defaultCalendarLabels.noAvailableDays,
  previousMonth:
    overrides?.previousMonth ?? defaultCalendarLabels.previousMonth,
  nextMonth: overrides?.nextMonth ?? defaultCalendarLabels.nextMonth,
  previousYear: overrides?.previousYear ?? defaultCalendarLabels.previousYear,
  nextYear: overrides?.nextYear ?? defaultCalendarLabels.nextYear,
  chooseMonth: overrides?.chooseMonth ?? defaultCalendarLabels.chooseMonth,
  showDays: overrides?.showDays ?? defaultCalendarLabels.showDays,
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

/** `"2026"`, the chooser header's label. */
export const formatYearLabel = (value: DateTime.Utc): string =>
  String(DateTime.toPartsUtc(value).year);

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

/** The first moment of the year, in UTC. */
export const startOfYear = (value: DateTime.Utc): DateTime.Utc =>
  DateTime.startOf("year")(value);

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

/** One grid cell: a real day, and whether it belongs to the viewed month. */
export interface CalendarCell {
  readonly day: DateTime.Utc;
  readonly inMonth: boolean;
}

/**
 * Six weeks of seven real days for `month`. The leading and trailing days
 * belong to the adjacent months and carry `inMonth: false`.
 */
export const monthGrid = (
  month: DateTime.Utc,
  weekStartsOn: WeekStart,
): ReadonlyArray<ReadonlyArray<CalendarCell>> => {
  const start = startOfMonth(month);
  const monthParts = DateTime.toPartsUtc(start);
  const offset = (monthParts.weekDay - weekStartsOn + 7) % 7;
  const firstCell = DateTime.add({ days: -offset })(start);

  const cell = (index: number): CalendarCell => {
    const day = DateTime.add({ days: index })(firstCell);
    const parts = DateTime.toPartsUtc(day);
    return {
      day,
      inMonth:
        parts.year === monthParts.year && parts.month === monthParts.month,
    };
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

/**
 * Whether any day in the inclusive span `[first, last]` satisfies both bounds.
 * A reversed range names no day at all: clamping the span into each bound
 * separately would otherwise report a month that contains `max` **and** a day
 * after `min` as available (plan 773).
 */
const spanAvailable = (
  first: DateTime.Utc,
  last: DateTime.Utc,
  bounds: DayBounds,
): boolean => {
  const start = Option.match(bounds.min, {
    onNone: () => first,
    onSome: (min) =>
      DateTime.toEpochMillis(first) < DateTime.toEpochMillis(min) ? min : first,
  });
  const end = Option.match(bounds.max, {
    onNone: () => last,
    onSome: (max) =>
      DateTime.toEpochMillis(last) > DateTime.toEpochMillis(max) ? max : last,
  });
  return DateTime.toEpochMillis(start) <= DateTime.toEpochMillis(end);
};

/** Whether any day of `value`'s month lies inside the bounds. */
export const isMonthAvailable = (
  value: DateTime.Utc,
  bounds: DayBounds,
): boolean => spanAvailable(startOfMonth(value), lastDayOfMonth(value), bounds);

/** Whether any day of `value`'s year lies inside the bounds. */
export const isYearAvailable = (
  value: DateTime.Utc,
  bounds: DayBounds,
): boolean => {
  const first = startOfYear(value);
  return spanAvailable(first, lastDayOfMonth(addMonths(first, 11)), bounds);
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

/**
 * The day a grid may take its tab stop on: `day` clamped into the bounds, kept
 * only while it is actually available. A range with nothing available — a
 * reversed `min`/`max` — names no tab stop at all, so the grid cannot trap
 * focus on a cell that cannot be chosen (plan 773).
 */
export const tabStopOf = (
  day: DateTime.Utc,
  bounds: DayBounds,
): Option.Option<DateTime.Utc> =>
  Option.liftPredicate(clampToBounds(day, bounds), (clamped) =>
    isAvailable(clamped, bounds),
  );

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

/** The day to focus after the chooser picks `month`: `from`'s day-of-month,
 *  clamped to the month's length and then to the bounds. */
export const dayInMonth = (
  from: DateTime.Utc,
  month: DateTime.Utc,
  bounds: DayBounds,
): DateTime.Utc => {
  const lastDay = DateTime.toPartsUtc(lastDayOfMonth(month)).day;
  const day = Math.min(DateTime.toPartsUtc(from).day, lastDay);
  return clampToBounds(addDays(startOfMonth(month), day - 1), bounds);
};

/** Whether stepping `direction` year from `viewMonth` lands inside the bounds. */
export const canBrowseYear = (
  viewMonth: DateTime.Utc,
  direction: -1 | 1,
  bounds: DayBounds,
): boolean => isYearAvailable(addMonths(viewMonth, direction * 12), bounds);

/** The indices of the months that can be chosen, January first. */
const availableMonthIndices = (
  available: ReadonlyArray<boolean>,
): ReadonlyArray<number> =>
  Arr.filter(Arr.range(0, 11), (index) => available[index] === true);

/** The next available month from `from` by `step`; `from` when the step leaves
 *  the year. Never wraps: the chooser shows one year. */
export const stepMonth = (
  from: number,
  step: number,
  available: ReadonlyArray<boolean>,
): number => {
  const indices = availableMonthIndices(available);
  return step > 0
    ? Option.getOrElse(
        Arr.findFirst(indices, (index) => index >= from + step),
        () => from,
      )
    : Option.getOrElse(
        Arr.findLast(indices, (index) => index <= from + step),
        () => from,
      );
};

/** The available month nearest `from`, preferring a later month on a tie. */
export const nearestAvailableMonth = (
  from: number,
  available: ReadonlyArray<boolean>,
): number => {
  const indices = availableMonthIndices(available);
  return Option.getOrElse(
    Option.firstSomeOf([
      Arr.findFirst(indices, (index) => index >= from),
      Arr.findLast(indices, (index) => index <= from),
    ]),
    () => from,
  );
};
