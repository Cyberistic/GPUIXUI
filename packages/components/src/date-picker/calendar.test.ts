/**
 * The month grid.
 *
 * The bugs these guard: a leap-year February rendered as 28 days; a month that
 * starts mid-week rendered the previous month's days as if they belonged to it;
 * the grid changing height between months; `addMonths` walking off the end of
 * a year; a bound treated as exclusive (dropping the first and last legal day);
 * a malformed bound crashing instead of being ignored; movement past a bound
 * landing on an unavailable day; the month controls browsing past the bound's
 * month; `min` after `max` still allowing a selection; and a calendar that only
 * spoke English, because its labels were constants rather than the caller's.
 *
 * Plan 546 adds the month chooser: a month is available only when one of its
 * days is inside the bounds, a year stepper must not enter a year with no
 * available month, a chosen month keeps the day-of-month (clamped to the month's
 * length), and keyboard month movement must not wrap into another year.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import {
  addMonths,
  boundsOf,
  canBrowseMonth,
  canBrowseYear,
  clampToBounds,
  dayInMonth,
  defaultCalendarLabels,
  formatDayLabel,
  formatIsoDay,
  formatMonthLabel,
  formatYearLabel,
  isAvailable,
  isMonthAvailable,
  isSameDay,
  isYearAvailable,
  lastDayOfMonth,
  monthGrid,
  nearestAvailableMonth,
  parseIsoDay,
  resolveCalendarLabels,
  startOfMonth,
  startOfYear,
  stepMonth,
  tabStopOf,
  unbounded,
  weekdayLabels,
  type CalendarCell,
} from "./calendar.js";

/** A parsed day, or a broken fixture. */
const day = (iso: string): DateTime.Utc =>
  Option.getOrElse(parseIsoDay(iso), () => {
    throw new Error(`fixture: ${iso} is not a day`);
  });

const cells = (
  grid: ReadonlyArray<ReadonlyArray<CalendarCell>>,
): ReadonlyArray<CalendarCell> => Arr.flatten(grid);

const days = (
  grid: ReadonlyArray<ReadonlyArray<CalendarCell>>,
): ReadonlyArray<DateTime.Utc> => Arr.map(cells(grid), (cell) => cell.day);

const monthDays = (
  grid: ReadonlyArray<ReadonlyArray<CalendarCell>>,
): ReadonlyArray<DateTime.Utc> =>
  Arr.map(
    Arr.filter(cells(grid), (cell) => cell.inMonth),
    (cell) => cell.day,
  );

const leadingOutside = (
  grid: ReadonlyArray<ReadonlyArray<CalendarCell>>,
): number => {
  const firstWeek = Arr.head(grid);
  if (Option.isNone(firstWeek)) return 0;
  return Arr.findFirstIndex(firstWeek.value, (cell) => cell.inMonth).pipe(
    Option.getOrElse(() => 7),
  );
};

describe("monthGrid", () => {
  it("marks a leap February with 29 days and a common one with 28", () => {
    expect(monthDays(monthGrid(day("2024-02-10"), 1))).toHaveLength(29);
    expect(monthDays(monthGrid(day("2025-02-10"), 1))).toHaveLength(28);
  });

  it("follows the week start when the month begins mid-week", () => {
    // 1 October 2026 is a Thursday.
    expect(leadingOutside(monthGrid(day("2026-10-15"), 1))).toBe(3);
    expect(leadingOutside(monthGrid(day("2026-10-15"), 0))).toBe(4);
  });

  it("starts at the first cell when the month begins on the week start", () => {
    // 1 June 2026 is a Monday.
    expect(leadingOutside(monthGrid(day("2026-06-15"), 1))).toBe(0);
  });

  it("always has six rows of seven real days", () => {
    const grid = monthGrid(day("2026-02-01"), 1);
    expect(grid).toHaveLength(6);
    expect(Arr.every(grid, (week) => week.length === 7)).toBe(true);
    expect(days(grid)).toHaveLength(42);
    expect(monthDays(grid)).toHaveLength(28);
  });

  it("contains every day of the month exactly once and marks the rest adjacent", () => {
    const grid = monthGrid(day("2026-08-01"), 0);
    const rendered = Arr.map(monthDays(grid), formatIsoDay);

    expect(rendered).toHaveLength(31);
    expect(Arr.dedupe(rendered)).toHaveLength(31);
    expect(Arr.every(rendered, (value) => value.startsWith("2026-08-"))).toBe(
      true,
    );
    expect(rendered[0]).toBe("2026-08-01");
    expect(Arr.last(rendered)).toEqual(Option.some("2026-08-31"));
  });

  it("draws real neighbouring days on either side of the month", () => {
    // August 2026 begins on a Saturday, so a Sunday-first week opens on 26 July
    // and the sixth week runs into September.
    const grid = monthGrid(day("2026-08-15"), 0);
    const all = days(grid);

    expect(Option.map(Arr.head(all), formatIsoDay)).toEqual(
      Option.some("2026-07-26"),
    );
    expect(Option.map(Arr.last(all), formatIsoDay)).toEqual(
      Option.some("2026-09-05"),
    );
    const differences = Arr.map(
      Arr.zip(all, Arr.drop(all, 1)),
      ([previous, next]) =>
        DateTime.toEpochMillis(next) - DateTime.toEpochMillis(previous),
    );
    expect(Arr.every(differences, (value) => value === 86_400_000)).toBe(true);
  });
});

describe("month arithmetic", () => {
  it("clears the time when starting a month", () => {
    const start = startOfMonth(day("2026-10-17"));
    expect(DateTime.toPartsUtc(start)).toMatchObject({
      year: 2026,
      month: 10,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  });

  it("crosses a year boundary in both directions", () => {
    expect(formatIsoDay(addMonths(day("2026-01-15"), -1))).toBe("2025-12-01");
    expect(formatIsoDay(addMonths(day("2026-12-15"), 1))).toBe("2027-01-01");
    expect(formatIsoDay(addMonths(day("2026-12-15"), 13))).toBe("2028-01-01");
  });

  it("finds the last day of a month without a Date", () => {
    expect(formatIsoDay(lastDayOfMonth(day("2024-02-10")))).toBe("2024-02-29");
    expect(formatIsoDay(lastDayOfMonth(day("2025-02-10")))).toBe("2025-02-28");
    expect(formatIsoDay(lastDayOfMonth(day("2026-08-10")))).toBe("2026-08-31");
  });
});

describe("day identity and labels", () => {
  it("compares calendar days and ignores the time", () => {
    expect(isSameDay(day("2026-10-17"), day("2026-10-17"))).toBe(true);
    expect(isSameDay(day("2026-10-17"), day("2026-10-18"))).toBe(false);
  });

  it("formats the month and day labels", () => {
    expect(formatMonthLabel(day("2026-10-17"))).toBe("October 2026");
    expect(formatDayLabel(day("2026-10-17"))).toBe("17 October 2026");
  });

  it("labels the week in the chosen order", () => {
    expect(weekdayLabels(0)).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);
    expect(weekdayLabels(1)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });
});

describe("caller labels", () => {
  it("defaults to the English strings", () => {
    const labels = resolveCalendarLabels();
    expect(labels.months[9]).toBe("October");
    expect(labels.weekdays[0]).toBe("Sun");
    expect(labels.unavailable).toBe("unavailable");
    expect(labels.noAvailableDays).toBe("No available dates");
    expect(labels.previousMonth).toBe("Previous month");
    expect(labels.nextMonth).toBe("Next month");
    expect(labels.previousYear).toBe("Previous year");
    expect(labels.nextYear).toBe("Next year");
    expect(labels.chooseMonth).toBe("Choose month");
    expect(labels.showDays).toBe("Show days");
    expect(labels.clear).toBe("Clear");
    expect(labels.months).toBe(defaultCalendarLabels.months);
  });

  it("keeps every other default when one field is overridden", () => {
    const labels = resolveCalendarLabels({ clear: "Dismiss" });
    expect(labels.clear).toBe("Dismiss");
    expect(labels.months).toBe(defaultCalendarLabels.months);
    expect(labels.weekdays).toBe(defaultCalendarLabels.weekdays);
    expect(labels.unavailable).toBe("unavailable");
  });

  it("formats the month and day with the caller's names", () => {
    const labels = resolveCalendarLabels({
      months: [
        "januar",
        "februar",
        "mars",
        "april",
        "mai",
        "juni",
        "juli",
        "august",
        "september",
        "oktober",
        "november",
        "desember",
      ],
    });
    expect(formatMonthLabel(day("2026-10-17"), labels)).toBe("oktober 2026");
    expect(formatDayLabel(day("2026-10-17"), labels)).toBe("17 oktober 2026");
  });

  it("rotates the caller's weekdays in the chosen order", () => {
    const labels = resolveCalendarLabels({
      weekdays: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    });
    expect(weekdayLabels(1, labels)).toEqual([
      "Mo",
      "Di",
      "Mi",
      "Do",
      "Fr",
      "Sa",
      "So",
    ]);
    expect(weekdayLabels(0, labels)[0]).toBe("So");
  });
});

describe("parseIsoDay", () => {
  it("round-trips a valid day", () => {
    const parsed = parseIsoDay("2026-10-17");
    expect(Option.map(parsed, formatIsoDay)).toEqual(Option.some("2026-10-17"));
  });

  it("rejects malformed and impossible days", () => {
    expect(Option.isNone(parseIsoDay("17/10/2026"))).toBe(true);
    expect(Option.isNone(parseIsoDay("2026-13-01"))).toBe(true);
    expect(Option.isNone(parseIsoDay("2026-02-30"))).toBe(true);
    expect(Option.isNone(parseIsoDay("2026-2-3"))).toBe(true);
  });
});

describe("day bounds", () => {
  it("parses both bounds and ignores malformed or absent ones", () => {
    const parsed = boundsOf("2026-10-17", "2026-12-31");
    expect(Option.map(parsed.min, formatIsoDay)).toEqual(
      Option.some("2026-10-17"),
    );
    expect(Option.map(parsed.max, formatIsoDay)).toEqual(
      Option.some("2026-12-31"),
    );

    const malformed = boundsOf("not-a-day", "2026-02-30");
    expect(Option.isNone(malformed.min)).toBe(true);
    expect(Option.isNone(malformed.max)).toBe(true);

    expect(boundsOf()).toEqual(unbounded);
    expect(boundsOf(null, undefined)).toEqual(unbounded);
  });

  it("treats both bounds as inclusive and everything outside as unavailable", () => {
    const bounds = boundsOf("2026-10-17", "2026-10-20");
    expect(isAvailable(day("2026-10-17"), bounds)).toBe(true);
    expect(isAvailable(day("2026-10-20"), bounds)).toBe(true);
    expect(isAvailable(day("2026-10-18"), bounds)).toBe(true);
    expect(isAvailable(day("2026-10-16"), bounds)).toBe(false);
    expect(isAvailable(day("2026-10-21"), bounds)).toBe(false);
    expect(isAvailable(day("1900-01-01"), unbounded)).toBe(true);
  });

  it("clamps a day into the bounds and leaves one inside alone", () => {
    const bounds = boundsOf("2026-10-17", "2026-10-20");
    expect(formatIsoDay(clampToBounds(day("2026-10-01"), bounds))).toBe(
      "2026-10-17",
    );
    expect(formatIsoDay(clampToBounds(day("2026-10-18"), bounds))).toBe(
      "2026-10-18",
    );
    expect(formatIsoDay(clampToBounds(day("2026-11-01"), bounds))).toBe(
      "2026-10-20",
    );
    expect(formatIsoDay(clampToBounds(day("2026-10-18"), unbounded))).toBe(
      "2026-10-18",
    );
  });

  it("stops month browsing at the bound's month", () => {
    const bounds = boundsOf("2026-10-17", "2026-12-05");
    expect(canBrowseMonth(day("2026-10-17"), -1, bounds)).toBe(false);
    expect(canBrowseMonth(day("2026-11-01"), -1, bounds)).toBe(true);
    expect(canBrowseMonth(day("2026-12-01"), 1, bounds)).toBe(false);
    expect(canBrowseMonth(day("2026-11-01"), 1, bounds)).toBe(true);
    expect(canBrowseMonth(day("2026-10-17"), -1, unbounded)).toBe(true);
    expect(canBrowseMonth(day("2026-10-17"), 1, unbounded)).toBe(true);
  });

  it("makes every day unavailable when min is after max", () => {
    const inverted = boundsOf("2026-12-31", "2026-01-01");
    expect(Option.isSome(inverted.min)).toBe(true);
    expect(Option.isSome(inverted.max)).toBe(true);
    expect(isAvailable(day("2026-06-15"), inverted)).toBe(false);
  });

  /**
   * The bug these guard (plan 773): the grid took its tab stop from the clamped
   * day even when that day was unavailable, so an inverted range focused an
   * inert cell no arrow key could leave.
   */
  it("keeps an available day as the tab stop", () => {
    const bounds = boundsOf("2026-10-17", "2026-10-20");
    expect(
      Option.map(tabStopOf(day("2026-10-18"), bounds), formatIsoDay),
    ).toEqual(Option.some("2026-10-18"));
    expect(
      Option.map(tabStopOf(day("2026-10-01"), bounds), formatIsoDay),
    ).toEqual(Option.some("2026-10-17"));
  });

  it("keeps the candidate when the range is unbounded", () => {
    expect(
      Option.map(tabStopOf(day("2026-10-18"), unbounded), formatIsoDay),
    ).toEqual(Option.some("2026-10-18"));
  });

  it("gives an inverted range no tab stop", () => {
    const inverted = boundsOf("2026-06-10", "2026-06-01");
    expect(Option.isNone(tabStopOf(day("2026-06-01"), inverted))).toBe(true);
    expect(Option.isNone(tabStopOf(day("2026-05-20"), inverted))).toBe(true);
  });
});

describe("month chooser", () => {
  it("marks a month available when an interior day is inside the bounds", () => {
    const bounds = boundsOf("2026-03-10", "2026-03-20");
    expect(isMonthAvailable(day("2026-03-01"), bounds)).toBe(true);
    expect(isMonthAvailable(day("2026-02-01"), bounds)).toBe(false);
    expect(isMonthAvailable(day("2026-04-01"), bounds)).toBe(false);
    expect(isMonthAvailable(day("2026-04-01"), unbounded)).toBe(true);
  });

  it("gives an inverted range no available month or year", () => {
    const inverted = boundsOf("2026-06-10", "2026-06-01");
    expect(isMonthAvailable(day("2026-06-01"), inverted)).toBe(false);
    expect(isMonthAvailable(day("2026-05-01"), inverted)).toBe(false);
    expect(isYearAvailable(day("2026-01-01"), inverted)).toBe(false);
  });

  it("browses a year that only touches the bounds, in both directions", () => {
    const narrow = boundsOf("2026-03-10", "2026-07-20");
    expect(isYearAvailable(day("2026-01-01"), narrow)).toBe(true);
    expect(isYearAvailable(day("2025-01-01"), narrow)).toBe(false);
    expect(isYearAvailable(day("2027-01-01"), narrow)).toBe(false);
    expect(canBrowseYear(day("2026-05-01"), -1, narrow)).toBe(false);
    expect(canBrowseYear(day("2026-05-01"), 1, narrow)).toBe(false);

    const wide = boundsOf("2024-12-31", "2026-01-01");
    expect(isYearAvailable(day("2025-01-01"), wide)).toBe(true);
    expect(canBrowseYear(day("2025-05-01"), -1, wide)).toBe(true);
    expect(canBrowseYear(day("2025-05-01"), 1, wide)).toBe(true);
    expect(canBrowseYear(day("2026-05-01"), 1, wide)).toBe(false);
    expect(canBrowseYear(day("2026-05-01"), -1, unbounded)).toBe(true);
  });

  it("keeps the day of the month and clamps it into the chosen month", () => {
    expect(
      formatIsoDay(dayInMonth(day("2026-10-17"), day("2026-04-01"), unbounded)),
    ).toBe("2026-04-17");
    expect(
      formatIsoDay(dayInMonth(day("2026-01-31"), day("2026-02-01"), unbounded)),
    ).toBe("2026-02-28");
    expect(
      formatIsoDay(dayInMonth(day("2024-01-31"), day("2024-02-01"), unbounded)),
    ).toBe("2024-02-29");
    expect(
      formatIsoDay(dayInMonth(day("2026-01-31"), day("2026-04-01"), unbounded)),
    ).toBe("2026-04-30");
    expect(
      formatIsoDay(
        dayInMonth(
          day("2026-10-17"),
          day("2026-01-01"),
          boundsOf("2026-02-10", "2026-03-03"),
        ),
      ),
    ).toBe("2026-02-10");
  });

  it("steps over unavailable months and never wraps the year", () => {
    const sparse = Arr.makeBy(12, (index) => index === 1 || index === 3);
    expect(stepMonth(1, 1, sparse)).toBe(3);
    expect(stepMonth(3, -1, sparse)).toBe(1);
    expect(stepMonth(3, 3, sparse)).toBe(3);
    expect(stepMonth(11, 1, sparse)).toBe(11);
    expect(stepMonth(0, -1, sparse)).toBe(0);
    expect(nearestAvailableMonth(0, sparse)).toBe(1);
    expect(nearestAvailableMonth(2, sparse)).toBe(3);
    expect(nearestAvailableMonth(11, sparse)).toBe(3);
    expect(
      nearestAvailableMonth(
        5,
        Arr.makeBy(12, () => false),
      ),
    ).toBe(5);
    expect(
      nearestAvailableMonth(
        3,
        Arr.makeBy(12, () => true),
      ),
    ).toBe(3);
  });

  it("prefers the later month on a tie", () => {
    const available = Arr.makeBy(12, (index) => index === 2 || index === 4);
    expect(nearestAvailableMonth(3, available)).toBe(4);
  });

  it("formats the year and starts it on 1 January", () => {
    expect(formatYearLabel(day("2026-10-17"))).toBe("2026");
    expect(formatIsoDay(startOfYear(day("2026-10-17")))).toBe("2026-01-01");
  });
});
