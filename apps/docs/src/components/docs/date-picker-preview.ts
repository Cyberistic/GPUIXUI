import * as Arr from "effect/Array";

export type IsoDay = string;

export type IsoMonth = string;

export type WeekStart = 0 | 1;

export interface DayBounds {
  readonly min: IsoDay | null;
  readonly max: IsoDay | null;
}

export type GridKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "Home"
  | "End"
  | "PageUp"
  | "PageDown";

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

const WEEKDAYS: ReadonlyArray<string> = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number): string => String(value).padStart(2, "0");

const daysFromCivil = (year: number, month: number, day: number): number => {
  const shifted = month <= 2 ? year - 1 : year;
  const era = Math.floor(shifted / 400);
  const yearOfEra = shifted - era * 400;
  const dayOfYear =
    Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146097 + dayOfEra - 719468;
};

const civilFromDays = (
  epoch: number,
): { readonly year: number; readonly month: number; readonly day: number } => {
  const shifted = epoch + 719468;
  const era = Math.floor(shifted / 146097);
  const dayOfEra = shifted - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra -
    (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthIndex = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthIndex + 2) / 5) + 1;
  const month = monthIndex + (monthIndex < 10 ? 3 : -9);
  return { year: year + (month <= 2 ? 1 : 0), month, day };
};

const isoOf = (epoch: number): IsoDay => {
  const { year, month, day } = civilFromDays(epoch);
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
};

export const epochDay = (day: IsoDay): number =>
  daysFromCivil(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)),
    Number(day.slice(8, 10)),
  );

export const parseDay = (value: string): IsoDay | null => {
  const match = DAY.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return isoOf(daysFromCivil(year, month, day)) === value ? value : null;
};

export const monthOf = (day: IsoDay): IsoMonth => day.slice(0, 7);

export const firstOfMonth = (day: IsoDay): IsoDay => `${monthOf(day)}-01`;

export const dayOfMonth = (day: IsoDay): number => Number(day.slice(8, 10));

export const weekdayOf = (day: IsoDay): number =>
  ((epochDay(day) % 7) + 7 + 4) % 7;

export const addDays = (day: IsoDay, amount: number): IsoDay =>
  isoOf(epochDay(day) + amount);

export const addMonths = (month: IsoMonth, amount: number): IsoMonth => {
  const months = Number(month.slice(5, 7)) - 1 + amount;
  const year = Number(month.slice(0, 4)) + Math.floor(months / 12);
  const index = ((months % 12) + 12) % 12;
  return `${String(year).padStart(4, "0")}-${pad(index + 1)}`;
};

export const lastDayOfMonth = (month: IsoMonth): IsoDay =>
  addDays(`${addMonths(month, 1)}-01`, -1);

export const daysInMonth = (month: IsoMonth): number =>
  dayOfMonth(lastDayOfMonth(month));

export const weekdayLabels = (weekStartsOn: WeekStart): ReadonlyArray<string> =>
  weekStartsOn === 1 ? [...WEEKDAYS.slice(1), WEEKDAYS[0] ?? ""] : WEEKDAYS;

export const monthGrid = (
  month: IsoMonth,
  weekStartsOn: WeekStart,
  showOutsideDays = true,
): ReadonlyArray<ReadonlyArray<IsoDay | null>> => {
  const offset = (weekdayOf(`${month}-01`) - weekStartsOn + 7) % 7;
  const count = daysInMonth(month);
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, column) => {
      const index = week * 7 + column - offset;
      if (index < 0 || index >= count) {
        return showOutsideDays ? addDays(`${month}-01`, index) : null;
      }
      return `${month}-${pad(index + 1)}`;
    }),
  );
};

export const isoDayOf = (date: Date): IsoDay =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const MONTH_NAMES: ReadonlyArray<string> = MONTHS;

export const monthNumber = (month: IsoMonth): number =>
  Number(month.slice(5, 7));

export const yearOfMonth = (month: IsoMonth): number =>
  Number(month.slice(0, 4));

export const yearChoices = (
  fromYear: number,
  toYear: number,
): ReadonlyArray<number> =>
  fromYear <= toYear ? Arr.range(fromYear, toYear) : [];

export const monthLabel = (month: IsoMonth): string =>
  `${MONTHS[Number(month.slice(5, 7)) - 1] ?? month.slice(5, 7)} ${month.slice(0, 4)}`;

export const dayLabel = (day: IsoDay): string =>
  `${dayOfMonth(day)} ${monthLabel(monthOf(day))}`;

const SHORT_MONTHS: ReadonlyArray<string> = MONTHS.map((name) =>
  name.slice(0, 3),
);

const shortDayOfMonth = (day: IsoDay): string =>
  `${SHORT_MONTHS[Number(day.slice(5, 7)) - 1] ?? ""} ${dayOfMonth(day)}`;

export const shortDayLabel = (day: IsoDay): string =>
  `${shortDayOfMonth(day)}, ${day.slice(0, 4)}`;

export interface PreviewRange {
  readonly from: IsoDay;
  readonly to: IsoDay | null;
}

export type RangePaint = "start" | "middle" | "end" | null;

export const rangePaint = (
  range: PreviewRange | null,
  day: IsoDay,
): RangePaint => {
  if (range === null) return null;
  if (range.from === day) return "start";
  if (range.to === day) return "end";
  if (range.to === null) return null;
  const value = epochDay(day);
  return value > epochDay(range.from) && value < epochDay(range.to)
    ? "middle"
    : null;
};

export const nextRange = (
  range: PreviewRange | null,
  day: IsoDay,
): PreviewRange =>
  range === null || range.to !== null || day < range.from
    ? { from: day, to: null }
    : { from: range.from, to: day };

export const formatRange = (
  range: PreviewRange | null,
  placeholder: string,
): string => {
  if (range === null) return placeholder;
  if (range.to === null) return shortDayLabel(range.from);
  return range.from.slice(0, 4) === range.to.slice(0, 4)
    ? `${shortDayOfMonth(range.from)} – ${shortDayLabel(range.to)}`
    : `${shortDayLabel(range.from)} – ${shortDayLabel(range.to)}`;
};

export const monthWindow = (
  month: IsoMonth,
  count: 1 | 2,
): ReadonlyArray<IsoMonth> =>
  Array.from({ length: count }, (_, index) => addMonths(month, index));

export const windowMonth = (
  month: IsoMonth,
  count: 1 | 2,
  day: IsoDay,
): IsoMonth => {
  const target = monthOf(day);
  if (target < month) return target;
  const last = addMonths(month, count - 1);
  return target > last ? addMonths(target, -(count - 1)) : month;
};

export const boundsOf = (
  min?: string | null,
  max?: string | null,
): DayBounds => ({
  min: min === undefined || min === null ? null : parseDay(min),
  max: max === undefined || max === null ? null : parseDay(max),
});

export const isAvailable = (day: IsoDay, bounds: DayBounds): boolean => {
  const value = epochDay(day);
  return (
    (bounds.min === null || value >= epochDay(bounds.min)) &&
    (bounds.max === null || value <= epochDay(bounds.max))
  );
};

export const clampToBounds = (day: IsoDay, bounds: DayBounds): IsoDay => {
  const lower =
    bounds.min !== null && epochDay(day) < epochDay(bounds.min)
      ? bounds.min
      : day;
  return bounds.max !== null && epochDay(lower) > epochDay(bounds.max)
    ? bounds.max
    : lower;
};

export const canBrowseMonth = (
  month: IsoMonth,
  direction: -1 | 1,
  bounds: DayBounds,
): boolean =>
  direction === -1
    ? bounds.min === null || month > monthOf(bounds.min)
    : bounds.max === null || month < monthOf(bounds.max);

export const moveFocus = (
  from: IsoDay,
  key: GridKey,
  weekStartsOn: WeekStart,
  bounds: DayBounds,
): IsoDay => {
  const weekOffset = (weekdayOf(from) - weekStartsOn + 7) % 7;
  const reach = (day: IsoDay): IsoDay => clampToBounds(day, bounds);

  const inMonth = (month: IsoMonth, amount: -1 | 1): IsoDay => {
    const target = addMonths(month, amount);
    return `${target}-${pad(Math.min(dayOfMonth(from), daysInMonth(target)))}`;
  };

  const moves: Record<GridKey, () => IsoDay> = {
    ArrowLeft: () => reach(addDays(from, -1)),
    ArrowRight: () => reach(addDays(from, 1)),
    ArrowUp: () => reach(addDays(from, -7)),
    ArrowDown: () => reach(addDays(from, 7)),
    Home: () => reach(addDays(from, -weekOffset)),
    End: () => reach(addDays(from, 6 - weekOffset)),
    PageUp: () => reach(inMonth(monthOf(from), -1)),
    PageDown: () => reach(inMonth(monthOf(from), 1)),
  };

  return moves[key]();
};

export const formatValue = (
  value: IsoDay | null,
  placeholder: string,
): string => (value === null ? placeholder : shortDayLabel(value));

export const describeValue = (value: IsoDay | null): string =>
  value === null
    ? "No date selected — the field reports null."
    : `Value: ${value}`;
