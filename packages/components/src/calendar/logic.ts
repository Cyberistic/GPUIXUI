import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";

export type WeekStart = 0 | 1;

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CalendarMode = "single" | "multiple" | "range";

export type MonthCount = 1 | 2;

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

export const weekdayLabels = (weekStartsOn: WeekStart): ReadonlyArray<string> =>
  weekStartsOn === 1
    ? [...Arr.drop(WEEKDAYS, 1), ...Arr.take(WEEKDAYS, 1)]
    : WEEKDAYS;

export const formatMonthLabel = (value: DateTime.Utc): string => {
  const parts = DateTime.toPartsUtc(value);
  return `${monthName(parts)} ${parts.year}`;
};

export const monthShortName = (month: number): string =>
  Option.getOrElse(Arr.get(SHORT_MONTHS, month - 1), () => String(month));

export const formatDayLabel = (value: DateTime.Utc): string => {
  const parts = DateTime.toPartsUtc(value);
  return `${parts.day} ${formatMonthLabel(value)}`;
};

export const formatShortDay = (value: DateTime.Utc): string => {
  const parts = DateTime.toPartsUtc(value);
  return `${shortMonthName(parts)} ${parts.day}, ${parts.year}`;
};

export interface DayRange {
  readonly from: string;
  readonly to: string | null;
}

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

export const startOfMonth = (value: DateTime.Utc): DateTime.Utc =>
  DateTime.startOf("month")(value);

export const addMonths = (value: DateTime.Utc, amount: number): DateTime.Utc =>
  DateTime.add({ months: amount })(startOfMonth(value));

export const addDays = (value: DateTime.Utc, amount: number): DateTime.Utc =>
  DateTime.add({ days: amount })(value);

export const lastDayOfMonth = (value: DateTime.Utc): DateTime.Utc =>
  DateTime.add({ days: -1 })(addMonths(value, 1));

export const isSameDay = (left: DateTime.Utc, right: DateTime.Utc): boolean => {
  const a = DateTime.toPartsUtc(left);
  const b = DateTime.toPartsUtc(right);
  return a.year === b.year && a.month === b.month && a.day === b.day;
};

export const formatIsoDay = (value: DateTime.Utc): string =>
  DateTime.formatIsoDateUtc(value);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const parseIsoDay = (value: string): Option.Option<DateTime.Utc> =>
  pipe(
    ISO_DAY.test(value) ? Option.some(value) : Option.none(),
    Option.flatMap((day) => DateTime.make(`${day}T00:00:00.000Z`)),
    Option.filter((parsed) => DateTime.formatIsoDateUtc(parsed) === value),
    Option.map((parsed) => DateTime.startOf("day")(parsed)),
  );

export const todayUtc = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.startOf("day")(now);

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

export const monthWindow = (
  viewMonth: DateTime.Utc,
  count: MonthCount,
): ReadonlyArray<DateTime.Utc> =>
  Arr.map(Arr.range(0, count - 1), (index) => addMonths(viewMonth, index));

export const windowStart = (viewMonth: DateTime.Utc): DateTime.Utc =>
  startOfMonth(viewMonth);

export const windowEnd = (
  viewMonth: DateTime.Utc,
  count: MonthCount,
): DateTime.Utc => lastDayOfMonth(addMonths(viewMonth, count - 1));

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

const gridStart = (
  month: DateTime.Utc,
  weekStartsOn: WeekStart,
): DateTime.Utc => {
  const start = startOfMonth(month);
  const offset = (DateTime.toPartsUtc(start).weekDay - weekStartsOn + 7) % 7;
  return addDays(start, -offset);
};

const gridEnd = (month: DateTime.Utc, weekStartsOn: WeekStart): DateTime.Utc =>
  addDays(gridStart(month, weekStartsOn), 41);

export interface DayBounds {
  readonly min: Option.Option<DateTime.Utc>;
  readonly max: Option.Option<DateTime.Utc>;
}

export const unbounded: DayBounds = {
  min: Option.none(),
  max: Option.none(),
};

export const boundsOf = (
  min?: string | null,
  max?: string | null,
): DayBounds => ({
  min: Option.flatMap(Option.fromNullishOr(min), parseIsoDay),
  max: Option.flatMap(Option.fromNullishOr(max), parseIsoDay),
});

export interface DayMatchers {
  readonly before?: string;

  readonly after?: string;

  readonly range?: {
    readonly from?: string;
    readonly to?: string;
  };

  readonly weekdays?: ReadonlyArray<DayOfWeek>;

  readonly filter?: (day: string) => boolean;
}

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

export const isDayAvailable = (
  day: DateTime.Utc,
  bounds: DayBounds,
  matchers: DayMatchers | undefined,
): boolean => isAvailable(day, bounds) && !isDisabled(day, matchers);

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

export type MoveKey =
  | "left"
  | "right"
  | "up"
  | "down"
  | "home"
  | "end"
  | "page-up"
  | "page-down";

export interface Move {
  readonly key: MoveKey;
  readonly year?: boolean;
}

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

export const moveDay = (
  from: DateTime.Utc,
  move: Move,
  options: MoveOptions,
): DateTime.Utc => {
  const raw =
    move.year === true
      ? clampYear(stepOf(from, move, options), options.fromYear, options.toYear)
      : stepOf(from, move, options);

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

export const yearRange = (
  fromYear: number,
  toYear: number,
): ReadonlyArray<number> =>
  fromYear <= toYear ? Arr.range(fromYear, toYear) : Arr.empty();

export type Selection =
  | { readonly mode: "single"; readonly day: string | null }
  | { readonly mode: "multiple"; readonly days: ReadonlyArray<string> }
  | { readonly mode: "range"; readonly range: DayRange | null };

export const singleSelection = (day: string | null): Selection => ({
  mode: "single",
  day,
});

export const multipleSelection = (days: ReadonlyArray<string>): Selection => ({
  mode: "multiple",
  days,
});

export const rangeSelection = (range: DayRange | null): Selection => ({
  mode: "range",
  range,
});

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

export const nextRange = (range: DayRange | null, day: string): DayRange =>
  range === null || range.to !== null || day < range.from
    ? { from: day, to: null }
    : { from: range.from, to: day };

export const nextDay = (current: string | null, day: string): string | null =>
  current === day ? null : day;

export const toggleDay = (
  days: ReadonlyArray<string>,
  day: string,
): ReadonlyArray<string> =>
  Arr.contains(day)(days)
    ? Arr.filter(days, (held) => held !== day)
    : [...days, day];

export const dayInMonth = (
  value: DateTime.Utc,
  month: DateTime.Utc,
): DateTime.Utc => {
  const parts = DateTime.toPartsUtc(value);
  const target = startOfMonth(month);
  const last = DateTime.toPartsUtc(lastDayOfMonth(target)).day;
  return addDays(target, Math.min(parts.day, last) - 1);
};

export type DayPaint =
  | "none"
  | "selected"
  | "range-start"
  | "range-middle"
  | "range-end";

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

export const isPainted = (paint: DayPaint): boolean =>
  paint === "selected" || paint === "range-start" || paint === "range-end";

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

export const calendarLabel = (label: string, selection: Selection): string =>
  `${label}, ${describeSelection(selection)}`;

export const hasSelection = (selection: Selection): boolean =>
  Match.value(selection).pipe(
    Match.when({ mode: "single" }, (current) => current.day !== null),
    Match.when({ mode: "multiple" }, (current) => current.days.length > 0),
    Match.when({ mode: "range" }, (current) => current.range !== null),
    Match.exhaustive,
  );

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

export const isOutsideMonth = (
  day: DateTime.Utc,
  month: DateTime.Utc,
): boolean => !isSameDay(startOfMonth(day), startOfMonth(month));

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
