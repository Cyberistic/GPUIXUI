/**
 * The calendar's arithmetic.
 *
 * The bugs these guard: a leap-year February rendered as 28 days; a month that
 * starts mid-week rendered the previous month's days as if they belonged to it;
 * the grid changing height between months; `addMonths` walking off the end of a
 * year; a bound treated as exclusive (dropping the first and last legal day); a
 * malformed bound crashing instead of being ignored; movement past a bound
 * landing on an unavailable day; the month controls browsing past the bound's
 * month; `min` after `max` still allowing a selection; a span painted from its
 * ends alone (the middle days left unpainted); a completed range restarting at
 * the wrong edge; a stored value read as a day the parser would normalise; and
 * `PageDown` losing the day-of-month in a shorter month.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import {
  addDays,
  addMonths,
  boundsOf,
  boundsOfMatchers,
  calendarLabel,
  canBrowseMonth,
  clampToBounds,
  dayAriaLabel,
  dayInMonth,
  describeSelection,
  formatDayLabel,
  formatIsoDay,
  formatMonthLabel,
  formatMonthShort,
  formatRangeLabel,
  formatSelectionLabel,
  formatShortDay,
  hasSelection,
  isAvailable,
  isDayAvailable,
  isDisabled,
  isSameDay,
  lastDayOfMonth,
  monthGrid,
  monthShortName,
  monthWindow,
  moveDay,
  nextDay,
  nextRange,
  nextSelection,
  paintOf,
  parseIsoDay,
  rangeContains,
  rangeOf,
  startOfMonth,
  todayUtc,
  toggleDay,
  unbounded,
  visibleMonth,
  weekdayLabels,
  windowEnd,
  windowStart,
  yearRange,
  type DayRange,
  type MoveOptions,
  type Selection,
} from "./logic.js";

/** A parsed day, or a broken fixture. */
const day = (iso: string): DateTime.Utc =>
  Option.getOrElse(parseIsoDay(iso), () => {
    throw new Error(`fixture: ${iso} is not a day`);
  });

const iso = (value: DateTime.Utc): string => formatIsoDay(value);

const days = (
  grid: ReadonlyArray<ReadonlyArray<Option.Option<DateTime.Utc>>>,
): ReadonlyArray<DateTime.Utc> => Arr.getSomes(Arr.flatten(grid));

const leadingBlanks = (
  grid: ReadonlyArray<ReadonlyArray<Option.Option<DateTime.Utc>>>,
): number => {
  const firstWeek = Arr.head(grid);
  if (Option.isNone(firstWeek)) return 0;
  return Arr.findFirstIndex(firstWeek.value, Option.isSome).pipe(
    Option.getOrElse(() => 7),
  );
};

/** The window a movement is bound to: October 2026 alone. */
const october: MoveOptions = {
  weekStartsOn: 1,
  viewMonth: startOfMonth(day("2026-10-17")),
  months: 1,
  showOutsideDays: false,
  bounds: unbounded,
  matchers: undefined,
  fromYear: 2020,
  toYear: 2030,
};

describe("monthGrid", () => {
  it("renders a leap February with 29 days and a common one with 28", () => {
    expect(days(monthGrid(day("2024-02-10"), 1, false))).toHaveLength(29);
    expect(days(monthGrid(day("2025-02-10"), 1, false))).toHaveLength(28);
  });

  it("follows the week start when the month begins mid-week", () => {
    // 1 October 2026 is a Thursday.
    expect(leadingBlanks(monthGrid(day("2026-10-15"), 1, false))).toBe(3);
    expect(leadingBlanks(monthGrid(day("2026-10-15"), 0, false))).toBe(4);
  });

  it("starts at the first cell when the month begins on the week start", () => {
    // 1 June 2026 is a Monday.
    expect(leadingBlanks(monthGrid(day("2026-06-15"), 1, false))).toBe(0);
  });

  it("always has six rows of seven cells", () => {
    const grid = monthGrid(day("2026-02-01"), 1, false);
    expect(grid).toHaveLength(6);
    expect(Arr.every(grid, (week) => week.length === 7)).toBe(true);
    expect(days(grid)).toHaveLength(28);
  });

  it("paints the neighbouring days only when outside days are shown", () => {
    const shown = Arr.map(days(monthGrid(day("2026-10-01"), 1)), iso);
    const hidden = Arr.map(
      days(monthGrid(day("2026-10-01"), 1, false)),
      iso,
    );

    // October opens on a Thursday and closes on a Saturday: the Monday-start
    // grid runs 28 September – 8 November.
    expect(shown[0]).toBe("2026-09-28");
    expect(shown[41]).toBe("2026-11-08");
    expect(Arr.length(shown)).toBe(42);
    expect(hidden[0]).toBe("2026-10-01");
    expect(Arr.last(hidden)).toEqual(Option.some("2026-10-31"));
    expect(Arr.length(hidden)).toBe(31);
  });
});

describe("month arithmetic", () => {
  it("clears the time when starting a month", () => {
    expect(
      DateTime.toPartsUtc(startOfMonth(day("2026-10-17"))),
    ).toMatchObject({
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
    expect(iso(addMonths(day("2026-01-15"), -1))).toBe("2025-12-01");
    expect(iso(addMonths(day("2026-12-15"), 1))).toBe("2027-01-01");
    expect(iso(addMonths(day("2026-12-15"), 13))).toBe("2028-01-01");
  });

  it("finds the last day of a month without a Date", () => {
    expect(iso(lastDayOfMonth(day("2024-02-10")))).toBe("2024-02-29");
    expect(iso(lastDayOfMonth(day("2025-02-10")))).toBe("2025-02-28");
    expect(iso(lastDayOfMonth(day("2026-08-10")))).toBe("2026-08-31");
  });

  it("clamps the day-of-month into a shorter month", () => {
    expect(iso(dayInMonth(day("2026-01-31"), day("2026-02-01")))).toBe(
      "2026-02-28",
    );
    expect(iso(dayInMonth(day("2026-10-17"), day("2026-11-01")))).toBe(
      "2026-11-17",
    );
  });

  it("windows one or two months and pulls the window to a day", () => {
    expect(Arr.map(monthWindow(day("2026-10-17"), 2), formatMonthLabel)).toEqual(
      ["October 2026", "November 2026"],
    );
    expect(iso(windowStart(day("2026-10-17")))).toBe("2026-10-01");
    expect(iso(windowEnd(day("2026-10-17"), 2))).toBe("2026-11-30");
    // A day already in the window leaves it alone.
    expect(iso(visibleMonth(day("2026-10-01"), 2, day("2026-11-20")))).toBe(
      "2026-10-01",
    );
    // A day past it pulls the window up, keeping it full.
    expect(iso(visibleMonth(day("2026-10-01"), 2, day("2026-12-20")))).toBe(
      "2026-11-01",
    );
    expect(iso(visibleMonth(day("2026-10-01"), 2, day("2026-08-20")))).toBe(
      "2026-08-01",
    );
  });
});

describe("day identity and labels", () => {
  it("compares calendar days and ignores the time", () => {
    expect(isSameDay(day("2026-10-17"), day("2026-10-17"))).toBe(true);
    expect(isSameDay(day("2026-10-17"), day("2026-10-18"))).toBe(false);
  });

  it("formats the labels a trigger and a grid paint", () => {
    expect(formatMonthLabel(day("2026-10-17"))).toBe("October 2026");
    expect(formatMonthShort(day("2026-10-17"))).toBe("Oct");
    expect(monthShortName(3)).toBe("Mar");
    expect(formatDayLabel(day("2026-10-17"))).toBe("17 October 2026");
    // shadcn's trigger label: `"Oct 17, 2026"`.
    expect(formatShortDay(day("2026-10-17"))).toBe("Oct 17, 2026");
    expect(todayUtc(DateTime.makeUnsafe("2026-10-17T15:04:05.000Z"))).toEqual(
      day("2026-10-17"),
    );
  });

  it("prints a range inside one year once, and across years twice", () => {
    expect(formatRangeLabel({ from: "2026-01-20", to: "2026-02-04" })).toBe(
      "Jan 20 – Feb 4, 2026",
    );
    expect(formatRangeLabel({ from: "2026-01-20", to: null })).toBe(
      "Jan 20, 2026",
    );
    expect(formatRangeLabel({ from: "2025-12-20", to: "2026-01-04" })).toBe(
      "Dec 20, 2025 – Jan 4, 2026",
    );
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

  it("names the years a dropdown offers in order", () => {
    expect(yearRange(2026, 2028)).toEqual([2026, 2027, 2028]);
    expect(yearRange(2028, 2026)).toEqual([]);
  });
});

describe("parseIsoDay", () => {
  it("round-trips a valid day", () => {
    expect(Option.map(parseIsoDay("2026-10-17"), formatIsoDay)).toEqual(
      Option.some("2026-10-17"),
    );
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

  it("reads matchers exclusive of the edge day", () => {
    // react-day-picker's vocabulary: everything *before* the day is disabled.
    const bounds = boundsOfMatchers({ before: "2026-10-12", after: "2026-10-20" });
    expect(Option.map(bounds.min, iso)).toEqual(Option.some("2026-10-13"));
    expect(Option.map(bounds.max, iso)).toEqual(Option.some("2026-10-19"));
    expect(iso(clampToBounds(day("2026-10-01"), bounds))).toBe("2026-10-13");
    expect(iso(clampToBounds(day("2026-11-01"), bounds))).toBe("2026-10-19");
  });

  it("refuses a weekday, a span and a caller's predicate", () => {
    const weekends = { weekdays: [0, 6] as const };
    expect(isDisabled(day("2026-10-17"), weekends)).toBe(true);
    expect(isDisabled(day("2026-10-19"), weekends)).toBe(false);

    expect(
      isDisabled(day("2026-10-15"), {
        range: { from: "2026-10-12", to: "2026-10-16" },
      }),
    ).toBe(true);
    expect(
      isDisabled(day("2026-10-17"), {
        range: { from: "2026-10-12", to: "2026-10-16" },
      }),
    ).toBe(false);
    // An open side of a disabled span reaches to the calendar's edge.
    expect(
      isDisabled(day("2026-11-01"), { range: { from: "2026-10-12" } }),
    ).toBe(true);
    expect(
      isDisabled(day("2026-10-01"), { range: { to: "2026-10-12" } }),
    ).toBe(true);

    expect(
      isDisabled(day("2026-10-17"), { filter: (value) => value.endsWith("17") }),
    ).toBe(true);
    expect(
      isDisabled(day("2026-10-18"), { filter: (value) => value.endsWith("17") }),
    ).toBe(false);
    expect(isDisabled(day("2026-10-18"), undefined)).toBe(false);
  });

  it("combines bounds and matchers in one availability answer", () => {
    const bounds = boundsOf("2026-10-12", "2026-10-30");
    const weekends = { weekdays: [0, 6] as const };
    expect(isDayAvailable(day("2026-10-17"), bounds, weekends)).toBe(false);
    expect(isDayAvailable(day("2026-10-19"), bounds, weekends)).toBe(true);
    expect(isDayAvailable(day("2026-11-02"), bounds, weekends)).toBe(false);
  });

  it("clamps a day into the bounds and leaves one inside alone", () => {
    const bounds = boundsOf("2026-10-17", "2026-10-20");
    expect(iso(clampToBounds(day("2026-10-01"), bounds))).toBe("2026-10-17");
    expect(iso(clampToBounds(day("2026-10-18"), bounds))).toBe("2026-10-18");
    expect(iso(clampToBounds(day("2026-11-01"), bounds))).toBe("2026-10-20");
    expect(iso(clampToBounds(day("2026-10-18"), unbounded))).toBe("2026-10-18");
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

describe("moveDay", () => {
  const move = (
    from: string,
    key:
      | "left"
      | "right"
      | "up"
      | "down"
      | "home"
      | "end"
      | "page-up"
      | "page-down",
    options = october,
    year = false,
  ) => iso(moveDay(day(from), { key, year }, options));

  it("steps a day and a week, and stops at the month when outside days are off", () => {
    expect(move("2026-10-17", "left")).toBe("2026-10-16");
    expect(move("2026-10-17", "right")).toBe("2026-10-18");
    expect(move("2026-10-17", "up")).toBe("2026-10-10");
    expect(move("2026-10-17", "down")).toBe("2026-10-24");
    // The 1st has no earlier day in its own month.
    expect(move("2026-10-01", "left")).toBe("2026-10-01");
    // With outside days shown, the same press lands on September's last day.
    expect(
      move("2026-10-01", "left", { ...october, showOutsideDays: true }),
    ).toBe("2026-09-30");
  });

  it("jumps to the week's edges in the grid's own week order", () => {
    // 17 October 2026 is a Saturday, so a Monday-start week is 12–18.
    expect(move("2026-10-17", "home")).toBe("2026-10-12");
    expect(move("2026-10-17", "end")).toBe("2026-10-18");
    expect(
      move("2026-10-17", "home", { ...october, weekStartsOn: 0 }),
    ).toBe(
      "2026-10-11",
    );
  });

  it("pages months and years without losing the day-of-month", () => {
    expect(move("2026-10-17", "page-down")).toBe("2026-11-17");
    expect(move("2026-10-17", "page-up")).toBe("2026-09-17");
    expect(move("2026-01-31", "page-down")).toBe("2026-02-28");
    expect(move("2026-03-31", "page-down")).toBe("2026-04-30");
    expect(move("2026-10-17", "page-down", october, true)).toBe("2027-10-17");
    expect(move("2026-10-17", "page-up", october, true)).toBe("2025-10-17");
  });

  it("keeps a year jump inside fromYear/toYear", () => {
    expect(
      move("2026-10-17", "page-up", { ...october, fromYear: 2026 }, true),
    ).toBe("2026-10-17");
    expect(
      move("2026-10-17", "page-down", { ...october, toYear: 2026 }, true),
    ).toBe("2026-10-17");
  });

  it("clamps to the bounds and skips a refused day", () => {
    const bounds = boundsOf("2026-10-12", "2026-10-20");
    expect(move("2026-10-12", "left", { ...october, bounds })).toBe(
      "2026-10-12",
    );
    const weekends = { ...october, matchers: { weekdays: [0, 6] as const } };
    // 17 October is a Saturday: the next legal day is Monday the 19th.
    expect(move("2026-10-17", "left", weekends)).toBe("2026-10-16");
    expect(move("2026-10-16", "right", weekends)).toBe("2026-10-19");
    // A whole month refused leaves the focus where it was.
    expect(
      move("2026-10-17", "right", {
        ...october,
        matchers: { filter: () => true },
      }),
    ).toBe("2026-10-17");
  });
});

describe("selection", () => {
  it("toggles one day, several days, and starts a range on a press", () => {
    expect(nextDay("2026-10-17", "2026-10-17")).toBeNull();
    expect(nextDay("2026-10-17", "2026-10-18")).toBe("2026-10-18");
    expect(toggleDay([], "2026-10-17")).toEqual(["2026-10-17"]);
    expect(toggleDay(["2026-10-17", "2026-10-18"], "2026-10-17")).toEqual([
      "2026-10-18",
    ]);
    expect(nextRange(null, "2026-10-20")).toEqual({
      from: "2026-10-20",
      to: null,
    });
    expect(nextRange({ from: "2026-10-20", to: null }, "2026-10-24")).toEqual({
      from: "2026-10-20",
      to: "2026-10-24",
    });
    // A press before the start restarts there.
    expect(nextRange({ from: "2026-10-20", to: null }, "2026-10-10")).toEqual({
      from: "2026-10-10",
      to: null,
    });
    // A completed range starts again on the next press.
    expect(
      nextRange({ from: "2026-10-20", to: "2026-10-24" }, "2026-11-02"),
    ).toEqual({ from: "2026-11-02", to: null });
  });

  it("reports the next selection per mode", () => {
    const single: Selection = { mode: "single", day: "2026-10-17" };
    expect(nextSelection(single, "2026-10-17")).toEqual({
      mode: "single",
      day: null,
    });

    const multiple: Selection = {
      mode: "multiple",
      days: ["2026-10-17"],
    };
    expect(nextSelection(multiple, "2026-10-18")).toEqual({
      mode: "multiple",
      days: ["2026-10-17", "2026-10-18"],
    });

    const range: Selection = {
      mode: "range",
      range: { from: "2026-10-17", to: null },
    };
    expect(nextSelection(range, "2026-10-20")).toEqual({
      mode: "range",
      range: { from: "2026-10-17", to: "2026-10-20" },
    });
  });

  it("paints the ends and the middle of a range, and single days", () => {
    const range: Selection = {
      mode: "range",
      range: { from: "2026-10-17", to: "2026-10-20" },
    };
    expect(paintOf(range, "2026-10-17")).toBe("range-start");
    expect(paintOf(range, "2026-10-18")).toBe("range-middle");
    expect(paintOf(range, "2026-10-20")).toBe("range-end");
    expect(paintOf(range, "2026-10-21")).toBe("none");

    const open: Selection = {
      mode: "range",
      range: { from: "2026-10-17", to: null },
    };
    // A half-open range paints its start and nothing after it.
    expect(paintOf(open, "2026-10-17")).toBe("range-start");
    expect(paintOf(open, "2026-10-18")).toBe("none");

    expect(
      paintOf({ mode: "single", day: "2026-10-17" }, "2026-10-17"),
    ).toBe("selected");
    expect(
      paintOf({ mode: "multiple", days: ["2026-10-17"] }, "2026-10-17"),
    ).toBe("selected");
  });

  it("tests range containment inclusively", () => {
    const range: DayRange = { from: "2026-10-17", to: "2026-10-20" };
    expect(rangeContains(range, "2026-10-17")).toBe(true);
    expect(rangeContains(range, "2026-10-19")).toBe(true);
    expect(rangeContains(range, "2026-10-20")).toBe(true);
    expect(rangeContains(range, "2026-10-16")).toBe(false);
    expect(rangeContains(range, "2026-10-21")).toBe(false);
    expect(rangeContains(null, "2026-10-19")).toBe(false);
  });

  it("reads a stored range failsafe", () => {
    expect(rangeOf({ from: "2026-10-17", to: "2026-10-20" })).toEqual({
      from: "2026-10-17",
      to: "2026-10-20",
    });
    expect(rangeOf({ from: "2026-10-17" })).toEqual({
      from: "2026-10-17",
      to: null,
    });
    // A day the parser would normalise is absence, not a range.
    expect(rangeOf({ from: "2026-02-30", to: "2026-03-04" })).toBeNull();
    expect(rangeOf(null)).toBeNull();
    expect(rangeOf("2026-10-17")).toBeNull();
  });
});

describe("the names a calendar announces", () => {
  it("names a day with the state a reader cannot see", () => {
    expect(dayAriaLabel(day("2026-10-17"), "selected", true)).toBe(
      "17 October 2026, selected",
    );
    expect(dayAriaLabel(day("2026-10-17"), "range-middle", true)).toBe(
      "17 October 2026, in range",
    );
    expect(dayAriaLabel(day("2026-10-17"), "none", false)).toBe(
      "17 October 2026, unavailable",
    );
  });

  it("describes the selection on the grid and the trigger", () => {
    expect(describeSelection({ mode: "single", day: null })).toBe(
      "no day selected",
    );
    expect(describeSelection({ mode: "single", day: "2026-10-17" })).toBe(
      "17 October 2026 selected",
    );
    expect(
      describeSelection({
        mode: "range",
        range: { from: "2026-10-17", to: "2026-10-20" },
      }),
    ).toBe("range Oct 17 – Oct 20, 2026");
    expect(calendarLabel("Arrival", { mode: "single", day: null })).toBe(
      "Arrival, no day selected",
    );
  });

  it("formats a trigger label for both modes, falling back to the placeholder", () => {
    const placeholder = "Pick a date";
    expect(formatSelectionLabel({ mode: "single", day: null }, placeholder)).toBe(
      placeholder,
    );
    expect(
      formatSelectionLabel({ mode: "single", day: "2026-10-17" }, placeholder),
    ).toBe("Oct 17, 2026");
    expect(
      formatSelectionLabel(
        { mode: "range", range: { from: "2026-01-20", to: "2026-02-04" } },
        placeholder,
      ),
    ).toBe("Jan 20 – Feb 4, 2026");
    expect(
      formatSelectionLabel(
        { mode: "range", range: { from: "2026-01-20", to: null } },
        placeholder,
      ),
    ).toBe("Jan 20, 2026");
    expect(
      formatSelectionLabel({ mode: "range", range: null }, placeholder),
    ).toBe(placeholder);
  });

  it("knows whether there is anything to clear", () => {
    expect(hasSelection({ mode: "single", day: null })).toBe(false);
    expect(hasSelection({ mode: "single", day: "2026-10-17" })).toBe(true);
    expect(hasSelection({ mode: "multiple", days: [] })).toBe(false);
    expect(hasSelection({ mode: "range", range: null })).toBe(false);
    expect(
      hasSelection({ mode: "range", range: { from: "2026-10-17", to: null } }),
    ).toBe(true);
  });
});

describe("two-month windows", () => {
  it("keeps the focus in the window and moves it across the seam", () => {
    const two = { ...october, months: 2 as const };
    // November is painted beside October, so the day is not clamped away.
    expect(
      iso(moveDay(day("2026-10-31"), { key: "right" }, { ...two, showOutsideDays: true })),
    ).toBe("2026-11-01");
    // November's grid paints the first December days, so the arrow reaches
    // one; the window then follows the day it focused.
    expect(
      iso(moveDay(day("2026-11-30"), { key: "right" }, { ...two, showOutsideDays: true })),
    ).toBe("2026-12-01");
    expect(iso(visibleMonth(day("2026-10-01"), 2, day("2026-11-30")))).toBe(
      "2026-10-01",
    );
    expect(iso(visibleMonth(day("2026-10-01"), 2, day("2026-12-01")))).toBe(
      "2026-11-01",
    );
    expect(iso(addDays(day("2026-10-01"), 1))).toBe("2026-10-02");
  });
});
