/**
 * The month grid.
 *
 * The bugs these guard: a leap-year February rendered as 28 days; a month that
 * starts mid-week rendered the previous month's days as if they belonged to it;
 * the grid changing height between months; `addMonths` walking off the end of
 * a year; a bound treated as exclusive (dropping the first and last legal day);
 * a malformed bound crashing instead of being ignored; movement past a bound
 * landing on an unavailable day; the month controls browsing past the bound's
 * month; and `min` after `max` still allowing a selection.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import {
  addMonths,
  boundsOf,
  canBrowseMonth,
  clampToBounds,
  formatDayLabel,
  formatIsoDay,
  formatMonthLabel,
  isAvailable,
  isSameDay,
  lastDayOfMonth,
  monthGrid,
  parseIsoDay,
  startOfMonth,
  unbounded,
  weekdayLabels,
} from "./calendar.js";

/** A parsed day, or a broken fixture. */
const day = (iso: string): DateTime.Utc =>
  Option.getOrElse(parseIsoDay(iso), () => {
    throw new Error(`fixture: ${iso} is not a day`);
  });

const days = (
  grid: ReadonlyArray<ReadonlyArray<Option.Option<DateTime.Utc>>>,
): ReadonlyArray<DateTime.Utc> => Arr.getSomes(Arr.flatten(grid));

const leadingBlanks = (
  grid: ReadonlyArray<ReadonlyArray<Option.Option<DateTime.Utc>>>,
): number => {
  const firstWeek = Arr.head(grid);
  if (Option.isNone(firstWeek)) return 0;
  return Arr.findFirstIndex(firstWeek.value, (cell) =>
    Option.isSome(cell),
  ).pipe(Option.getOrElse(() => 7));
};

describe("monthGrid", () => {
  it("renders a leap February with 29 days and a common one with 28", () => {
    expect(days(monthGrid(day("2024-02-10"), 1))).toHaveLength(29);
    expect(days(monthGrid(day("2025-02-10"), 1))).toHaveLength(28);
  });

  it("follows the week start when the month begins mid-week", () => {
    // 1 October 2026 is a Thursday.
    expect(leadingBlanks(monthGrid(day("2026-10-15"), 1))).toBe(3);
    expect(leadingBlanks(monthGrid(day("2026-10-15"), 0))).toBe(4);
  });

  it("starts at the first cell when the month begins on the week start", () => {
    // 1 June 2026 is a Monday.
    expect(leadingBlanks(monthGrid(day("2026-06-15"), 1))).toBe(0);
  });

  it("always has six rows of seven cells", () => {
    const grid = monthGrid(day("2026-02-01"), 1);
    expect(grid).toHaveLength(6);
    expect(Arr.every(grid, (week) => week.length === 7)).toBe(true);
    expect(days(grid)).toHaveLength(28);
  });

  it("contains every day of the month exactly once and nothing else", () => {
    const grid = monthGrid(day("2026-08-01"), 0);
    const rendered = Arr.map(days(grid), formatIsoDay);

    expect(rendered).toHaveLength(31);
    expect(Arr.dedupe(rendered)).toHaveLength(31);
    expect(Arr.every(rendered, (value) => value.startsWith("2026-08-"))).toBe(
      true,
    );
    expect(rendered[0]).toBe("2026-08-01");
    expect(Arr.last(rendered)).toEqual(Option.some("2026-08-31"));
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
});
