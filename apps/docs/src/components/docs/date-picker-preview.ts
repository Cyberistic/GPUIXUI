/**
 * The calendar rules the Date picker preview runs on.
 *
 * The shipped grid (`packages/components/src/date-picker/calendar.ts`) is civil
 * arithmetic over Effect's `DateTime`: no `Date`, no `Intl`, no locale lookup.
 * This module is the same model, small enough to read and with no runtime
 * dependency, so the browser preview and the native grid cannot disagree about
 * which column a month starts in, how many rows it paints, or where an arrow key
 * lands when the day sits on a bound.
 *
 * Days are `YYYY-MM-DD` strings and months are `YYYY-MM` strings. **`parseDay`
 * is the only entry for untrusted input**; every other function takes a day it
 * has already validated, so it reads the string's own fields instead of
 * re-checking them. Weeks start on Sunday (`0`) or Monday (`1`); every movement
 * is clamped to the inclusive `min`/`max` bounds, exactly like the component.
 *
 * `null` is the "no value" of the browser boundary (a blank grid cell, an
 * unset bound), not of the native API, which models absence as `Option`. The
 * docs site is a web app with no Effect runtime of its own, so a preview module
 * stays plain TypeScript rather than pulling the runtime in for a drawing.
 */

/** A calendar day, `YYYY-MM-DD`. */
export type IsoDay = string;

/** A calendar month, `YYYY-MM`. */
export type IsoMonth = string;

/** Which weekday a week starts on: Sunday (`0`) or Monday (`1`). */
export type WeekStart = 0 | 1;

/** Inclusive day bounds; a `null` side is unbounded. */
export interface DayBounds {
  readonly min: IsoDay | null;
  readonly max: IsoDay | null;
}

/** The keys the grid owns. Anything else is left to the page. */
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

/** Sunday-first; the grid rotates this for a Monday start. */
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

/** Days since 1970-01-01 for a civil date (Howard Hinnant's algorithm). */
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

/** The civil date of an epoch day. */
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

/** Days since the epoch for a day `parseDay` accepted. */
export const epochDay = (day: IsoDay): number =>
  daysFromCivil(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)),
    Number(day.slice(8, 10)),
  );

/**
 * Parse a `YYYY-MM-DD` day. A malformed or out-of-range date — including one a
 * lenient parser would normalise, such as `2026-02-30` — is `null`.
 */
export const parseDay = (value: string): IsoDay | null => {
  const match = DAY.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return isoOf(daysFromCivil(year, month, day)) === value ? value : null;
};

/** The month a day belongs to, `YYYY-MM`. */
export const monthOf = (day: IsoDay): IsoMonth => day.slice(0, 7);

/** The first day of the month a day belongs to. */
export const firstOfMonth = (day: IsoDay): IsoDay => `${monthOf(day)}-01`;

/** The day-of-month a validated day carries. */
export const dayOfMonth = (day: IsoDay): number => Number(day.slice(8, 10));

/** `0` for Sunday through `6` for Saturday. */
export const weekdayOf = (day: IsoDay): number =>
  ((epochDay(day) % 7) + 7 + 4) % 7;

/** A day moved by whole calendar days. */
export const addDays = (day: IsoDay, amount: number): IsoDay =>
  isoOf(epochDay(day) + amount);

/** A month moved by whole calendar months; always the first of a month. */
export const addMonths = (month: IsoMonth, amount: number): IsoMonth => {
  const months = Number(month.slice(5, 7)) - 1 + amount;
  const year = Number(month.slice(0, 4)) + Math.floor(months / 12);
  const index = ((months % 12) + 12) % 12;
  return `${String(year).padStart(4, "0")}-${pad(index + 1)}`;
};

/** The month's last day. */
export const lastDayOfMonth = (month: IsoMonth): IsoDay =>
  addDays(`${addMonths(month, 1)}-01`, -1);

/** How many days the month has. */
export const daysInMonth = (month: IsoMonth): number =>
  dayOfMonth(lastDayOfMonth(month));

/** The weekday labels in the column order the grid uses. */
export const weekdayLabels = (weekStartsOn: WeekStart): ReadonlyArray<string> =>
  weekStartsOn === 1 ? [...WEEKDAYS.slice(1), WEEKDAYS[0] ?? ""] : WEEKDAYS;

/**
 * Six weeks of seven cells for `month`. A cell is the day it paints, or `null`
 * for the blanks before the first and after the last day — the shipped grid
 * shows no adjacent-month days, so a grid is always 42 cells tall.
 */
export const monthGrid = (
  month: IsoMonth,
  weekStartsOn: WeekStart,
): ReadonlyArray<ReadonlyArray<IsoDay | null>> => {
  const offset = (weekdayOf(`${month}-01`) - weekStartsOn + 7) % 7;
  const count = daysInMonth(month);
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, column) => {
      const index = week * 7 + column - offset + 1;
      return index < 1 || index > count ? null : `${month}-${pad(index)}`;
    }),
  );
};

/** `"October 2026"`. */
export const monthLabel = (month: IsoMonth): string =>
  `${MONTHS[Number(month.slice(5, 7)) - 1] ?? month.slice(5, 7)} ${month.slice(0, 4)}`;

/** `"17 October 2026"`, the accessible name of a day cell. */
export const dayLabel = (day: IsoDay): string =>
  `${dayOfMonth(day)} ${monthLabel(monthOf(day))}`;

/** Parse the public bound props; an absent or malformed side is unbounded. */
export const boundsOf = (
  min?: string | null,
  max?: string | null,
): DayBounds => ({
  min: min === undefined || min === null ? null : parseDay(min),
  max: max === undefined || max === null ? null : parseDay(max),
});

/** Whether the day may be chosen: both bounds are inclusive. */
export const isAvailable = (day: IsoDay, bounds: DayBounds): boolean => {
  const value = epochDay(day);
  return (
    (bounds.min === null || value >= epochDay(bounds.min)) &&
    (bounds.max === null || value <= epochDay(bounds.max))
  );
};

/** The day moved inside the bounds; an unbounded side leaves it unchanged. */
export const clampToBounds = (day: IsoDay, bounds: DayBounds): IsoDay => {
  const lower =
    bounds.min !== null && epochDay(day) < epochDay(bounds.min)
      ? bounds.min
      : day;
  return bounds.max !== null && epochDay(lower) > epochDay(bounds.max)
    ? bounds.max
    : lower;
};

/** Whether the previous (`-1`) or next (`1`) month is browseable. */
export const canBrowseMonth = (
  month: IsoMonth,
  direction: -1 | 1,
  bounds: DayBounds,
): boolean =>
  direction === -1
    ? bounds.min === null || month > monthOf(bounds.min)
    : bounds.max === null || month < monthOf(bounds.max);

/**
 * Where a key moves the focused day.
 *
 * Arrow keys step a day or a week, `Home`/`End` jump to the week's edges in the
 * grid's own week order, and `PageUp`/`PageDown` keep the day-of-month unless
 * the new month is shorter — a 31st is February's last day, never March's third.
 * Every result is clamped to the bounds.
 */
export const moveFocus = (
  from: IsoDay,
  key: GridKey,
  weekStartsOn: WeekStart,
  bounds: DayBounds,
): IsoDay => {
  const weekOffset = (weekdayOf(from) - weekStartsOn + 7) % 7;
  const reach = (day: IsoDay): IsoDay => clampToBounds(day, bounds);

  /** The same day-of-month in an adjacent month, clamped to its last day. */
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

/** The trigger's label: the chosen day, or the placeholder while none is set. */
export const formatValue = (
  value: IsoDay | null,
  placeholder: string,
): string => (value === null ? placeholder : dayLabel(value));

/** The readout under a preview: the value the control would report. */
export const describeValue = (value: IsoDay | null): string =>
  value === null
    ? "No date selected — the field reports null."
    : `Value: ${value}`;
