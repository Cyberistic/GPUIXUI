import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  addMonths,
  boundsOf,
  canBrowseMonth,
  clampToBounds,
  dayLabel,
  daysInMonth,
  describeValue,
  formatRange,
  formatValue,
  isAvailable,
  isoDayOf,
  lastDayOfMonth,
  monthGrid,
  monthWindow,
  nextRange,
  rangePaint,
  monthLabel,
  moveFocus,
  parseDay,
  weekdayLabels,
  weekdayOf,
  windowMonth,
  type DayBounds,
  type IsoDay,
} from "./date-picker-preview";

const native = readFileSync(
  new URL(
    "../../../../../packages/components/src/calendar/logic.ts",
    import.meta.url,
  ),
  "utf8",
);

const unbounded: DayBounds = { min: null, max: null };

describe("the month grid", () => {
  it("is six rows of seven cells, with the month's own days in place", () => {
    const grid = monthGrid("2026-10", 1);
    const cells = grid.flat();

    expect(grid.length).toBe(6);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(cells.length).toBe(42);

    expect(cells.slice(0, 3)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
    ]);
    expect(cells[3]).toBe("2026-10-01");
    expect(cells).toContain("2026-11-01");

    const own = monthGrid("2026-10", 1, false).flat();
    expect(own.slice(0, 3)).toEqual([null, null, null]);
    expect(own.filter((cell) => cell !== null).length).toBe(31);
    expect(own).not.toContain("2026-11-01");
  });

  it("shifts the first column with the week start", () => {
    expect(monthGrid("2026-10", 1).flat().indexOf("2026-10-01")).toBe(3);
    expect(monthGrid("2026-10", 0).flat().indexOf("2026-10-01")).toBe(4);
    expect(weekdayLabels(1)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(weekdayLabels(0)[0]).toBe("Sun");
  });

  it("keeps a short February and a leap February the same height", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(lastDayOfMonth("2028-02")).toBe("2028-02-29");
    expect(lastDayOfMonth("2026-12")).toBe("2026-12-31");

    expect(monthGrid("2026-02", 1, false).flat().filter(Boolean).length).toBe(
      28,
    );
    expect(monthGrid("2028-02", 1, false).flat().filter(Boolean).length).toBe(
      29,
    );
    expect(monthGrid("2026-02", 1).flat().length).toBe(42);
  });

  it("names months and days the way the native calendar does", () => {
    const nativeMonths = [
      ...native
        .slice(
          native.indexOf("const MONTHS"),
          native.indexOf("const SHORT_MONTHS"),
        )
        .matchAll(/"([A-Z][a-z]+)"/g),
    ].map((match) => match[1]);
    expect(nativeMonths).toHaveLength(12);
    expect(nativeMonths[9]).toBe("October");
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(dayLabel("2026-10-17")).toBe("17 October 2026");
    expect(weekdayOf("2026-10-17")).toBe(6);

    expect(native).toContain("Arr.range(0, 5)");
    expect(native).toContain("Arr.range(0, 6)");

    expect(native).toContain("showOutsideDays = true");
  });
});

describe("the bounds", () => {
  const bounds = boundsOf("2026-10-12", "2026-11-20");

  it("treats both bounds as inclusive and a malformed bound as absent", () => {
    expect(bounds.min).toBe("2026-10-12");
    expect(bounds.max).toBe("2026-11-20");
    expect(isAvailable("2026-10-12", bounds)).toBe(true);
    expect(isAvailable("2026-10-11", bounds)).toBe(false);
    expect(isAvailable("2026-11-20", bounds)).toBe(true);
    expect(isAvailable("2026-11-21", bounds)).toBe(false);
    expect(boundsOf("not-a-day", undefined)).toEqual({ min: null, max: null });
  });

  it("stops month browsing at the bound's own month", () => {
    expect(canBrowseMonth("2026-10", -1, bounds)).toBe(false);
    expect(canBrowseMonth("2026-10", 1, bounds)).toBe(true);
    expect(canBrowseMonth("2026-11", 1, bounds)).toBe(false);
    expect(canBrowseMonth("2026-11", -1, bounds)).toBe(true);
    expect(canBrowseMonth("2026-10", -1, unbounded)).toBe(true);
  });

  it("clamps a moved day to the bounds, and an inverted pair to its upper side", () => {
    expect(clampToBounds("2026-10-05", bounds)).toBe("2026-10-12");
    expect(clampToBounds("2026-12-01", bounds)).toBe("2026-11-20");
    expect(clampToBounds("2026-10-17", bounds)).toBe("2026-10-17");

    const inverted = boundsOf("2026-12-01", "2026-11-01");
    expect(clampToBounds("2026-10-01", inverted)).toBe("2026-11-01");
    expect(
      Array.from({ length: 31 }, (_, index) =>
        isAvailable(`2026-10-${String(index + 1).padStart(2, "0")}`, inverted),
      ).every((available) => !available),
    ).toBe(true);
  });
});

describe("the window", () => {
  it("leaves a painted day alone and pulls the window to one outside it", () => {
    expect(monthWindow("2026-10", 2)).toEqual(["2026-10", "2026-11"]);
    expect(windowMonth("2026-10", 2, "2026-11-20")).toBe("2026-10");
    expect(windowMonth("2026-10", 2, "2026-12-02")).toBe("2026-11");
    expect(windowMonth("2026-10", 2, "2026-08-02")).toBe("2026-08");
  });
});

describe("the span", () => {
  it("paints its ends and its middle, and starts a new span on a press", () => {
    const range = { from: "2026-10-17", to: "2026-10-20" };
    expect(rangePaint(range, "2026-10-17")).toBe("start");
    expect(rangePaint(range, "2026-10-18")).toBe("middle");
    expect(rangePaint(range, "2026-10-20")).toBe("end");
    expect(rangePaint(range, "2026-10-21")).toBeNull();
    expect(
      rangePaint({ from: "2026-10-17", to: null }, "2026-10-18"),
    ).toBeNull();

    expect(nextRange(null, "2026-10-20")).toEqual({
      from: "2026-10-20",
      to: null,
    });
    expect(nextRange({ from: "2026-10-17", to: null }, "2026-10-20")).toEqual({
      from: "2026-10-17",
      to: "2026-10-20",
    });
    expect(nextRange(range, "2026-11-02")).toEqual({
      from: "2026-11-02",
      to: null,
    });
  });
});

describe("the keys", () => {
  const key = (from: IsoDay, pressed: Parameters<typeof moveFocus>[1]) =>
    moveFocus(from, pressed, 1, unbounded);

  it("steps a day and a week from the focused cell", () => {
    expect(key("2026-10-17", "ArrowLeft")).toBe("2026-10-16");
    expect(key("2026-10-17", "ArrowRight")).toBe("2026-10-18");
    expect(key("2026-10-17", "ArrowUp")).toBe("2026-10-10");
    expect(key("2026-10-17", "ArrowDown")).toBe("2026-10-24");

    expect(key("2026-10-01", "ArrowLeft")).toBe("2026-09-30");
  });

  it("jumps to the week's edges in the grid's own week order", () => {
    expect(key("2026-10-17", "Home")).toBe("2026-10-12");
    expect(key("2026-10-17", "End")).toBe("2026-10-18");
    expect(moveFocus("2026-10-17", "Home", 0, unbounded)).toBe("2026-10-11");
    expect(moveFocus("2026-10-17", "End", 0, unbounded)).toBe("2026-10-17");
  });

  it("keeps the day-of-month across months unless the month is shorter", () => {
    expect(key("2026-10-17", "PageDown")).toBe("2026-11-17");
    expect(key("2026-10-17", "PageUp")).toBe("2026-09-17");
    expect(key("2026-01-31", "PageDown")).toBe("2026-02-28");
    expect(key("2026-03-31", "PageDown")).toBe("2026-04-30");
    expect(key("2027-12-15", "PageDown")).toBe("2028-01-15");
    expect(key("2028-02-29", "PageDown")).toBe("2028-03-29");
  });

  it("clamps every move to the bounds instead of stepping onto a dead day", () => {
    const bounds = boundsOf("2026-10-12", "2026-11-20");
    expect(moveFocus("2026-10-12", "ArrowLeft", 1, bounds)).toBe("2026-10-12");
    expect(moveFocus("2026-11-20", "ArrowDown", 1, bounds)).toBe("2026-11-20");
    expect(moveFocus("2026-11-01", "PageDown", 1, bounds)).toBe("2026-11-20");
    expect(moveFocus("2026-10-30", "End", 1, bounds)).toBe("2026-11-01");
  });
});

describe("the value", () => {
  it("rejects a day the parser would normalise", () => {
    expect(parseDay("2026-10-17")).toBe("2026-10-17");
    expect(parseDay("2026-02-30")).toBeNull();
    expect(parseDay("2026-13-01")).toBeNull();
    expect(parseDay("2026-00-10")).toBeNull();
    expect(parseDay("17 October 2026")).toBeNull();
    expect(parseDay("2026-2-07")).toBeNull();
  });

  it("reads a month across a year edge", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-06", 18)).toBe("2027-12");
    expect(addMonths("2026-06", -18)).toBe("2024-12");
  });

  it("labels the field and reports the value the component would emit", () => {
    expect(formatValue(null, "Pick a date")).toBe("Pick a date");

    expect(formatValue("2026-10-17", "Pick a date")).toBe("Oct 17, 2026");
    expect(formatRange(null, "Pick a date")).toBe("Pick a date");
    expect(formatRange({ from: "2026-01-20", to: "2026-02-04" }, "x")).toBe(
      "Jan 20 – Feb 4, 2026",
    );
    expect(formatRange({ from: "2026-01-20", to: null }, "x")).toBe(
      "Jan 20, 2026",
    );
    expect(describeValue(null)).toContain("null");
    expect(describeValue("2026-10-17")).toBe("Value: 2026-10-17");
  });
});

describe("isoDayOf", () => {
  it("names the local day, not the UTC one", () => {
    const local = new Date(2026, 9, 29, 0, 30);
    expect(isoDayOf(local)).toBe("2026-10-29");
  });

  it("pads a single-digit month and day", () => {
    expect(isoDayOf(new Date(1970, 0, 5, 12))).toBe("1970-01-05");
  });
});
