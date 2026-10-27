/**
 * The calendar's arithmetic: civil `DateTime` maths, selection and the day grid.
 *
 * Nothing here renders and nothing here reads a clock, a locale or a calendar
 * library. A grid is always six rows of seven cells so a popover does not change
 * height between a short February and a long month; a cell outside the month is
 * `Some` when outside days are shown and `None` when they are not.
 *
 * Month and weekday labels are fixed English strings: the repository has no i18n
 * layer, and inventing a half-locale here would be a second source of truth.
 */

import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";

/** Which weekday a week starts on: Sunday (`0`) or Monday (`1`). */
export type WeekStart = 0 | 1;

/** A weekday as `DateTime` numbers it: `0` is Sunday. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The selection a calendar reports: one day, several, or a span. */
export type CalendarMode = "single" | "multiple" | "range";

/** How many months a calendar shows at once. */
export type MonthCount = 1 | 2;

/** How the caption row names the month: a label, or month and year dropdowns. */
export type CaptionLayout = "label" | "dropdown";

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

const SHORT_MONTHS: ReadonlyArray<string> = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
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

const monthName = (parts: DateTime.DateTime.Parts): string =>
  Option.getOrElse(Arr.get(MONTHS, parts.month - 1), () => String(parts.month));

const shortMonthName = (parts: DateTime.DateTime.Parts): string =>
  Option.getOrElse(Arr.get(SHORT_MONTHS, parts.month - 1), () =>
    String(parts.month),
  );

/** The weekday labels in the column order the grid uses. */
export const weekdayLabels = (weekStartsOn: WeekStart): ReadonlyArray<string> =>
  weekStartsOn === 1
    ? [...Arr.drop(WEEKDAYS, 1), ...Arr.take(WEEKDAYS, 1)]
    : WEEKDAYS;

/** `"October 2026"`. */
export const formatMonthLabel = (value: DateTime.Utc): string => {
  const parts = DateTime.toPartsUtc(value);
  return `${monthName(parts)} ${parts.year}`;
};

/** `"Oct"` for month `10`, whatever the year; the caption dropdown's rows. */
export const monthShortName = (month: number): string =>
  Option.getOrElse(Arr.get(SHORT_MONTHS, month - 1), () => String(month));

/** `"17 October 2026"`, the accessible name of a day cell. */
export const formatDayLabel = (value: DateTime.Utc): string => {
  const parts = DateTime.toPartsUtc(value);
  return `${parts.day} ${formatMonthLabel(value)}`;
};

/** `"Oct 17, 2026"`, the way a trigger prints one day. */
export const formatShortDay = (value: DateTime.Utc): string => {
  const parts = DateTime.toPartsUtc(value);
  return `${shortMonthName(parts)} ${parts.day}, ${parts.year}`;
};

/** One span of days, both ends inclusive; `to` is `null` until it is chosen. */
export interface DayRange {
  readonly from: string;
  readonly to: string | null;
}

/**
 * `"Oct 17 – Oct 20, 2026"` inside a year and
 * `"Dec 20, 2025 – Jan 4, 2026"` across one; a half-open range prints its start.
 */
export const formatRangeLabel = (range: DayRange): string => {
  const from = parseIsoDay(range.from);
  const to = Option.flatMap(Option.fromNullishOr(range.to), parseIsoDay);
  return Option.match(to, {
    onNone: () =>
      Option.match(from, {
        onNone: () => range.from,
        onSome: formatShortDay,
      }),
    onSome: (end) => {
      const start = Option.getOrNull(from);
      if (start === null) return formatShortDay(end);
      const startParts = DateTime.toPartsUtc(start);
      const endParts = DateTime.toPartsUtc(end);
      return startParts.year === endParts.year
        ? `${shortMonthName(startParts)} ${startParts.day} – ${shortMonthName(endParts)} ${endParts.day}, ${endParts.year}`
        : `${formatShortDay(start)} – ${formatShortDay(end)}`;
    },
  });
};

/** The first moment of the month, in UTC. */
export const startOfMonth = (value: DateTime.Utc): DateTime.Utc =>
  DateTime.startOf("month")(value);

/** Add calendar months to the first of a month; day one never overflows. */
export const addMonths = (value: DateTime.Utc, amount: number): DateTime.Utc =>
  DateTime.add({ months: amount })(startOfMonth(value));

/** Add calendar days. */
export const addDays = (value: DateTime.Utc, amount: number): DateTime.Utc =>
  DateTime.add({ days: amount })(value);

/** The month's last day, used to clamp a day-of-month move. */
export const lastDayOfMonth = (value: DateTime.Utc): DateTime.Utc =>
  DateTime.add({ days: -1 })(addMonths(value, 1));

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

/** Today at UTC midnight, the fallback for an absent `today` prop. */
export const todayUtc = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.startOf("day")(now);

/**
 * Six weeks of seven cells for `month`.
 *
 * `Some` is a day the grid paints; `None` is a blank cell before the first or
 * after the last day of the month. With `showOutsideDays` the leading and
 * trailing cells carry their own days, as `react-day-picker` does.
 */
export const monthGrid = (
  month: DateTime.Utc,
  weekStartsOn: WeekStart,
  showOutsideDays = true,
): ReadonlyArray<ReadonlyArray<Option.Option<DateTime.Utc>>> => {
  const start = startOfMonth(month);
  const monthParts = DateTime.toPartsUtc(start);
  const offset = (monthParts.weekDay - weekStartsOn + 7) % 7;
  const firstCell = addDays(start, -offset);

  const cell = (index: number): Option.Option<DateTime.Utc> => {
    const day = addDays(firstCell, index);
    const parts = DateTime.toPartsUtc(day);
    const own =
      parts.year === monthParts.year && parts.month === monthParts.month;
    return own || showOutsideDays ? Option.some(day) : Option.none();
  };

  return Arr.map(Arr.range(0, 5), (week) =>
    Arr.map(Arr.range(0, 6), (day) => cell(week * 7 + day)),
  );
};

/** The months a calendar paints, starting at `viewMonth`. */
export const monthWindow = (
  viewMonth: DateTime.Utc,
  count: MonthCount,
): ReadonlyArray<DateTime.Utc> =>
  Arr.map(Arr.range(0, count - 1), (index) => addMonths(viewMonth, index));

/** The first day the painted window covers. */
export const windowStart = (viewMonth: DateTime.Utc): DateTime.Utc =>
  startOfMonth(viewMonth);

/** The last day the painted window covers. */
export const windowEnd = (
  viewMonth: DateTime.Utc,
  count: MonthCount,
): DateTime.Utc => lastDayOfMonth(addMonths(viewMonth, count - 1));

/**
 * The first month a window must start at so `day` is painted: a day already in
 * the window leaves it alone.
 */
export const visibleMonth = (
  viewMonth: DateTime.Utc,
  count: MonthCount,
  day: DateTime.Utc,
): DateTime.Utc => {
  const millis = DateTime.toEpochMillis(day);
  if (millis < DateTime.toEpochMillis(windowStart(viewMonth)))
    return startOfMonth(day);
  if (millis > DateTime.toEpochMillis(windowEnd(viewMonth, count)))
    return addMonths(startOfMonth(day), -(count - 1));
  return startOfMonth(viewMonth);
};

/** The first cell of `month`'s grid, which may belong to the month before it. */
const gridStart = (
  month: DateTime.Utc,
  weekStartsOn: WeekStart,
): DateTime.Utc => {
  const start = startOfMonth(month);
  const offset = (DateTime.toPartsUtc(start).weekDay - weekStartsOn + 7) % 7;
  return addDays(start, -offset);
};

/** The last cell of `month`'s six-row grid, which may belong to the month after. */
const gridEnd = (month: DateTime.Utc, weekStartsOn: WeekStart): DateTime.Utc =>
  addDays(gridStart(month, weekStartsOn), 41);

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

/** Parse public ISO bound props; a malformed or absent bound is unbounded. */
export const boundsOf = (
  min?: string | null,
  max?: string | null,
): DayBounds => ({
  min: Option.flatMap(Option.fromNullishOr(min), parseIsoDay),
  max: Option.flatMap(Option.fromNullishOr(max), parseIsoDay),
});

/**
 * The days a calendar refuses, in `react-day-picker`'s matcher vocabulary: a day
 * before `before` or after `after`, a day inside `range`, a weekday listed in
 * `weekdays`, or a day `filter` answers `true` for.
 */
export interface DayMatchers {
  /** Every day strictly before this ISO day is disabled. */
  readonly before?: string;
  /** Every day strictly after this ISO day is disabled. */
  readonly after?: string;
  /** Every day inside this span, both ends inclusive, is disabled. */
  readonly range?: {
    readonly from?: string;
    readonly to?: string;
  };
  /** Weekdays that are never selectable, `0` being Sunday. */
  readonly weekdays?: ReadonlyArray<DayOfWeek>;
  /** A caller's own rule: `true` disables the day. */
  readonly filter?: (day: string) => boolean;
}

/**
 * The inclusive bounds the matchers imply.
 *
 * A calendar's arrows, paging and month controls are bounded by these, so a
 * `before` matcher also stops the narration at the first legal month.
 */
export const boundsOfMatchers = (
  matchers: DayMatchers | undefined,
): DayBounds => {
  const shift = (end: "before" | "after") =>
    Option.flatMap(
      Option.fromNullishOr(
        end === "before" ? matchers?.before : matchers?.after,
      ),
      (iso) =>
        Option.map(parseIsoDay(iso), (day) =>
          addDays(day, end === "before" ? 1 : -1),
        ),
    );
  return { min: shift("before"), max: shift("after") };
};

/** Whether `day` is inside the bounds; both are inclusive. */
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

/** Whether a matcher refuses `day`, ignoring the bounds it also implies. */
export const isDisabled = (
  day: DateTime.Utc,
  matchers: DayMatchers | undefined,
): boolean => {
  if (matchers === undefined) return false;
  const iso = formatIsoDay(day);
  const millis = DateTime.toEpochMillis(day);
  const edge = (value: string | undefined): Option.Option<number> =>
    Option.map(
      Option.flatMap(Option.fromNullishOr(value), parseIsoDay),
      DateTime.toEpochMillis,
    );
  const atOrAfter = (bound: Option.Option<number>): boolean =>
    Option.match(bound, {
      onNone: () => true,
      onSome: (value) => millis >= value,
    });
  const atOrBefore = (bound: Option.Option<number>): boolean =>
    Option.match(bound, {
      onNone: () => true,
      onSome: (value) => millis <= value,
    });
  const inSpan =
    matchers.range !== undefined &&
    atOrAfter(edge(matchers.range.from)) &&
    atOrBefore(edge(matchers.range.to));
  return (
    Option.exists(edge(matchers.before), (before) => millis < before) ||
    Option.exists(edge(matchers.after), (after) => millis > after) ||
    inSpan ||
    Arr.contains(DateTime.toPartsUtc(day).weekDay as DayOfWeek)(
      matchers.weekdays ?? [],
    ) ||
    (matchers.filter !== undefined && matchers.filter(iso))
  );
};

/** A day the calendar paints: refused by a matcher or outside the bounds. */
export const isDayAvailable = (
  day: DateTime.Utc,
  bounds: DayBounds,
  matchers: DayMatchers | undefined,
): boolean => isAvailable(day, bounds) && !isDisabled(day, matchers);

/** `day` moved inside the bounds; an unbounded side leaves it unchanged. */
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

/** The movement keys a calendar answers. */
export type MoveKey =
  | "left"
  | "right"
  | "up"
  | "down"
  | "home"
  | "end"
  | "page-up"
  | "page-down";

/** One movement: the key, and whether Shift turns a page into a year. */
export interface Move {
  readonly key: MoveKey;
  readonly year?: boolean;
}

/** How a calendar decides where a movement lands. */
export interface MoveOptions {
  readonly weekStartsOn: WeekStart;
  readonly viewMonth: DateTime.Utc;
  readonly months: MonthCount;
  readonly showOutsideDays: boolean;
  readonly bounds: DayBounds;
  readonly matchers: DayMatchers | undefined;
  readonly fromYear: number;
  readonly toYear: number;
}

/** The day a movement steps to before availability is considered. */
const stepOf = (
  from: DateTime.Utc,
  move: Move,
  options: MoveOptions,
): DateTime.Utc => {
  const parts = DateTime.toPartsUtc(from);
  const offset = (parts.weekDay - options.weekStartsOn + 7) % 7;
  const inMonth = (amount: number): DateTime.Utc => {
    const target = addMonths(from, amount);
    const last = DateTime.toPartsUtc(lastDayOfMonth(target)).day;
    return addDays(startOfMonth(target), Math.min(parts.day, last) - 1);
  };
  return Match.value(move.key).pipe(
    Match.when("left", () => addDays(from, -1)),
    Match.when("right", () => addDays(from, 1)),
    Match.when("up", () => addDays(from, -7)),
    Match.when("down", () => addDays(from, 7)),
    Match.when("home", () => addDays(from, -offset)),
    Match.when("end", () => addDays(from, 6 - offset)),
    Match.when("page-up", () => inMonth(move.year === true ? -12 : -1)),
    Match.when("page-down", () => inMonth(move.year === true ? 12 : 1)),
    Match.exhaustive,
  );
};

/**
 * The day moved into the calendar's year window, keeping month and day where
 * the target year has them.
 */
const clampYear = (
  day: DateTime.Utc,
  fromYear: number,
  toYear: number,
): DateTime.Utc => {
  const parts = DateTime.toPartsUtc(day);
  const year = Math.min(Math.max(parts.year, fromYear), toYear);
  if (year === parts.year) return day;
  const first = DateTime.make(
    `${String(year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-01T00:00:00.000Z`,
  );
  return Option.match(first, {
    onNone: () => day,
    onSome: (month) =>
      addDays(
        month,
        Math.min(parts.day, DateTime.toPartsUtc(lastDayOfMonth(month)).day) - 1,
      ),
  });
};

/**
 * Where a movement lands.
 *
 * The move never leaves the painted window: an arrow clamps at the window's
 * edge, and `Home`/`End` clamp at the month's own first or last day when
 * outside days are hidden. A refused day is stepped over in the movement's own
 * direction, so an arrow never lands on a day the calendar would not accept; an
 * edge with no legal day leaves the focus where it was.
 */
export const moveDay = (
  from: DateTime.Utc,
  move: Move,
  options: MoveOptions,
): DateTime.Utc => {
  const raw =
    move.year === true
      ? clampYear(stepOf(from, move, options), options.fromYear, options.toYear)
      : stepOf(from, move, options);
  // A page is what moves the window; an arrow is what must stay inside it. The
  // paging window is the month the *bounded* target lands in, so a page that
  // clamps onto `max` is searched in the month `max` belongs to.
  const bounded = clampToBounds(raw, options.bounds);
  const paging = move.key === "page-up" || move.key === "page-down";
  const windowFirst = paging ? startOfMonth(bounded) : options.viewMonth;
  const windowLast = paging
    ? startOfMonth(bounded)
    : addMonths(options.viewMonth, options.months - 1);
  const ownFirst = paging ? startOfMonth(bounded) : startOfMonth(from);
  const ownLast = paging ? lastDayOfMonth(bounded) : lastDayOfMonth(from);
  const lower = options.showOutsideDays
    ? gridStart(windowFirst, options.weekStartsOn)
    : ownFirst;
  const upper = options.showOutsideDays
    ? gridEnd(windowLast, options.weekStartsOn)
    : ownLast;
  const clamp = (day: DateTime.Utc): DateTime.Utc => {
    const millis = DateTime.toEpochMillis(day);
    if (millis < DateTime.toEpochMillis(lower)) return lower;
    if (millis > DateTime.toEpochMillis(upper)) return upper;
    return day;
  };
  const target = clamp(bounded);
  const direction =
    DateTime.toEpochMillis(target) < DateTime.toEpochMillis(from) ? -1 : 1;
  const inside = (day: DateTime.Utc): boolean => {
    const millis = DateTime.toEpochMillis(day);
    return (
      millis >= DateTime.toEpochMillis(lower) &&
      millis <= DateTime.toEpochMillis(upper)
    );
  };
  const search = (steps: number): DateTime.Utc => {
    const candidate = addDays(target, steps * direction);
    return steps > 84 || !inside(candidate)
      ? from
      : isDayAvailable(candidate, options.bounds, options.matchers)
        ? candidate
        : search(steps + 1);
  };
  return isDayAvailable(target, options.bounds, options.matchers)
    ? target
    : search(0);
};

/** The years a dropdown offers, bounded by the calendar's own limits. */
export const yearRange = (
  fromYear: number,
  toYear: number,
): ReadonlyArray<number> =>
  fromYear <= toYear ? Arr.range(fromYear, toYear) : Arr.empty();

/** The selection a calendar holds, one variant per mode. */
export type Selection =
  | { readonly mode: "single"; readonly day: string | null }
  | { readonly mode: "multiple"; readonly days: ReadonlyArray<string> }
  | { readonly mode: "range"; readonly range: DayRange | null };

/** A single-day selection. */
export const singleSelection = (day: string | null): Selection => ({
  mode: "single",
  day,
});

/** A several-days selection. */
export const multipleSelection = (days: ReadonlyArray<string>): Selection => ({
  mode: "multiple",
  days,
});

/** A span selection. */
export const rangeSelection = (range: DayRange | null): Selection => ({
  mode: "range",
  range,
});

/** A stored selection read as a range; a malformed side is absence. */
export const rangeOf = (value: unknown): DayRange | null => {
  if (typeof value !== "object" || value === null) return null;
  const source = value as { readonly from?: unknown; readonly to?: unknown };
  if (!P.isString(source.from) || Option.isNone(parseIsoDay(source.from)))
    return null;
  return {
    from: source.from,
    to:
      P.isString(source.to) && Option.isSome(parseIsoDay(source.to))
        ? source.to
        : null,
  };
};

/** Whether `day` is inside a range, both ends inclusive. */
export const rangeContains = (range: DayRange | null, day: string): boolean => {
  if (range === null) return false;
  const millis = Option.match(parseIsoDay(day), {
    onNone: () => null,
    onSome: DateTime.toEpochMillis,
  });
  const start = Option.match(parseIsoDay(range.from), {
    onNone: () => null,
    onSome: DateTime.toEpochMillis,
  });
  const end = Option.match(Option.fromNullishOr(range.to), {
    onNone: () => start,
    onSome: (iso) =>
      Option.match(parseIsoDay(iso), {
        onNone: () => start,
        onSome: DateTime.toEpochMillis,
      }),
  });
  return millis !== null && start !== null && end !== null
    ? millis >= start && millis <= end
    : false;
};

/** The next range after a press: a completed span starts again. */
export const nextRange = (range: DayRange | null, day: string): DayRange =>
  range === null || range.to !== null || day < range.from
    ? { from: day, to: null }
    : { from: range.from, to: day };

/** One day of a single selection: pressing the chosen day clears it. */
export const nextDay = (current: string | null, day: string): string | null =>
  current === day ? null : day;

/** One day of a several-days selection: a press toggles it. */
export const toggleDay = (
  days: ReadonlyArray<string>,
  day: string,
): ReadonlyArray<string> =>
  Arr.contains(day)(days)
    ? Arr.filter(days, (held) => held !== day)
    : [...days, day];

/** The same day-of-month inside `month`, clamped to that month's length. */
export const dayInMonth = (
  value: DateTime.Utc,
  month: DateTime.Utc,
): DateTime.Utc => {
  const parts = DateTime.toPartsUtc(value);
  const target = startOfMonth(month);
  const last = DateTime.toPartsUtc(lastDayOfMonth(target)).day;
  return addDays(target, Math.min(parts.day, last) - 1);
};

/** How a cell is painted: the primary end of a range, its middle, or neither. */
export type DayPaint =
  | "none"
  | "selected"
  | "range-start"
  | "range-middle"
  | "range-end";

/** The paint `day` takes in the current selection. */
export const paintOf = (selection: Selection, day: string): DayPaint => {
  if (selection.mode === "single")
    return selection.day === day ? "selected" : "none";
  if (selection.mode === "multiple")
    return Arr.contains(day)(selection.days) ? "selected" : "none";
  const range = selection.range;
  if (range === null) return "none";
  if (range.from === day) return "range-start";
  if (range.to === day) return "range-end";
  return rangeContains(range, day) ? "range-middle" : "none";
};

/** Whether a paint fills the cell with the selection role. */
export const isPainted = (paint: DayPaint): boolean =>
  paint === "selected" || paint === "range-start" || paint === "range-end";

/** The day's accessible name, including the state a reader cannot see. */
export const dayAriaLabel = (
  day: DateTime.Utc,
  paint: DayPaint,
  available: boolean,
): string => {
  const name = formatDayLabel(day);
  const state = Match.value(paint).pipe(
    Match.when("selected", () => ", selected"),
    Match.when("range-start", () => ", range start"),
    Match.when("range-middle", () => ", in range"),
    Match.when("range-end", () => ", range end"),
    Match.orElse(() => ""),
  );
  return `${name}${state}${available ? "" : ", unavailable"}`;
};

/** The grid's accessible name: what the selection currently is. */
export const describeSelection = (selection: Selection): string => {
  if (selection.mode === "single")
    return Option.match(
      Option.flatMap(Option.fromNullishOr(selection.day), parseIsoDay),
      {
        onNone: () => "no day selected",
        onSome: (day) => `${formatDayLabel(day)} selected`,
      },
    );
  if (selection.mode === "multiple")
    return selection.days.length === 0
      ? "no days selected"
      : `${selection.days.length} selected`;
  return selection.range === null
    ? "no range selected"
    : `range ${formatRangeLabel(selection.range)}`;
};

/** The grid's accessible name: its label, then the selection. */
export const calendarLabel = (label: string, selection: Selection): string =>
  `${label}, ${describeSelection(selection)}`;

/** Whether the selection holds anything a Clear row could remove. */
export const hasSelection = (selection: Selection): boolean =>
  Match.value(selection).pipe(
    Match.when({ mode: "single" }, (current) => current.day !== null),
    Match.when({ mode: "multiple" }, (current) => current.days.length > 0),
    Match.when({ mode: "range" }, (current) => current.range !== null),
    Match.exhaustive,
  );

/** What a trigger paints: the selection, or the placeholder while it is empty. */
export const formatSelectionLabel = (
  selection: Selection,
  placeholder: string,
): string => {
  if (!hasSelection(selection)) return placeholder;
  return Match.value(selection).pipe(
    Match.when({ mode: "single" }, (current) =>
      Option.match(
        Option.flatMap(Option.fromNullishOr(current.day), parseIsoDay),
        { onNone: () => placeholder, onSome: formatShortDay },
      ),
    ),
    Match.when({ mode: "multiple" }, (current) =>
      current.days.length === 1
        ? formatSelectionLabel(
            singleSelection(current.days[0] ?? null),
            placeholder,
          )
        : `${current.days.length} days`,
    ),
    Match.when({ mode: "range" }, (current) =>
      current.range === null ? placeholder : formatRangeLabel(current.range),
    ),
    Match.exhaustive,
  );
};

/** Whether a day belongs to the month it is painted under. */
export const isOutsideMonth = (
  day: DateTime.Utc,
  month: DateTime.Utc,
): boolean => !isSameDay(startOfMonth(day), startOfMonth(month));

/** The key name a runtime event carries for a movement, or `None`. */
export const moveKeyOf = (key: string): Option.Option<MoveKey> =>
  Match.value(key).pipe(
    Match.when("left", () => Option.some("left" as const)),
    Match.when("right", () => Option.some("right" as const)),
    Match.when("up", () => Option.some("up" as const)),
    Match.when("down", () => Option.some("down" as const)),
    Match.when("home", () => Option.some("home" as const)),
    Match.when("end", () => Option.some("end" as const)),
    Match.when("pageup", () => Option.some("page-up" as const)),
    Match.when("pagedown", () => Option.some("page-down" as const)),
    Match.orElse(() => Option.none()),
  );
