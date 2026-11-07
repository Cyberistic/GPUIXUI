import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import {
  DATE_PICKER_CHOSEN_LABEL,
  DATE_PICKER_KEYS,
  DATE_PICKER_MAX,
  DATE_PICKER_MIN,
  DATE_PICKER_MONTH_LABEL,
  DATE_PICKER_NAV_ARROW,
  DATE_PICKER_PLACEHOLDER,
  DATE_PICKER_ROUTES,
  DATE_PICKER_TODAY,
  DATE_PICKER_TODAY_LABEL,
  DATE_PICKER_UNAVAILABLE,
  datePickerCell,
  formatDatePickerReadout,
  type DatePickerKey,
  type DatePickerRoute,
} from "./date-picker.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);
const probe = readFileSync(new URL("./scenarios.tsx", import.meta.url), "utf8");

const day = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

const iso = (value: DateTime.Utc): string => DateTime.formatIsoDateUtc(value);

const min = day(DATE_PICKER_MIN);
const max = day(DATE_PICKER_MAX);

const STEP: Record<
  DatePickerKey,
  (value: DateTime.Utc, weekDay: number) => DateTime.Utc
> = {
  right: (value) => DateTime.add({ days: 1 })(value),
  left: (value) => DateTime.add({ days: -1 })(value),
  down: (value) => DateTime.add({ days: 7 })(value),
  up: (value) => DateTime.add({ days: -7 })(value),

  home: (value, weekDay) => DateTime.add({ days: 1 - weekDay })(value),
  end: (value, weekDay) => DateTime.add({ days: 7 - weekDay })(value),
};

const step = (from: string, key: DatePickerKey): DateTime.Utc =>
  STEP[key](day(from), DateTime.toPartsUtc(day(from)).weekDay);

const landed = (route: DatePickerRoute): string => {
  const wanted = step(route.from, route.key);
  if (DateTime.isLessThan(wanted, min)) return iso(min);
  if (DateTime.isGreaterThan(wanted, max)) return iso(max);
  return iso(wanted);
};

const label = (value: string): string =>
  DateTime.format(day(value), {
    day: "numeric",
    month: "short",
    year: "numeric",
    locale: "en-US",
  });

const section = (): string => {
  const start = readme.indexOf("### `date-picker-lifecycle`");
  const end = readme.indexOf("\n### ", start + 1);
  return start === -1 ? "" : readme.slice(start, end === -1 ? undefined : end);
};

describe("the date-picker fixture", () => {
  it("keeps the route cumulative: each row starts where the last ended", () => {
    expect(
      Arr.head(DATE_PICKER_ROUTES).pipe(Option.map((r) => r.from)),
    ).toEqual(Option.some(DATE_PICKER_TODAY));
    Arr.forEach(DATE_PICKER_ROUTES, (route, index) => {
      const previous = Arr.get(DATE_PICKER_ROUTES, index - 1);
      if (Option.isNone(previous)) return;
      expect(`${previous.value.to} -> ${route.from}`).toBe(
        `${previous.value.to} -> ${previous.value.to}`,
      );
    });
  });

  it("drives only keys the probe declares, each with its own caption", () => {
    Arr.forEach(DATE_PICKER_ROUTES, (route) => {
      expect(DATE_PICKER_KEYS).toContain(route.key);
    });
    expect(Arr.map(DATE_PICKER_ROUTES, (route) => route.caption)).toEqual(
      Arr.dedupe(Arr.map(DATE_PICKER_ROUTES, (route) => route.caption)),
    );
  });

  it("derives every landing day from the calendar, then the bounds", () => {
    Arr.forEach(DATE_PICKER_ROUTES, (route) => {
      expect(`${route.caption}: ${landed(route)}`).toBe(
        `${route.caption}: ${route.to}`,
      );
    });

    const clamped = Arr.filter(
      DATE_PICKER_ROUTES,
      (route) => iso(step(route.from, route.key)) !== route.to,
    );
    expect(Arr.map(clamped, (route) => route.caption)).toEqual([
      "a week past the last bound lands on it",
      "a day past the last bound stays on it",
    ]);
  });

  it("pins a month whose neighbours hold no selectable day", () => {
    const month = DateTime.startOf("month")(day(DATE_PICKER_TODAY));
    expect(iso(month)).toBe("2026-03-01");

    expect(DateTime.isGreaterThan(min, month)).toBe(true);
    expect(DateTime.isLessThan(max, DateTime.add({ months: 1 })(month))).toBe(
      true,
    );

    expect(iso(day(DATE_PICKER_UNAVAILABLE)) > DATE_PICKER_MAX).toBe(true);
    expect(DATE_PICKER_UNAVAILABLE.startsWith("2026-03-")).toBe(true);

    expect(DATE_PICKER_NAV_ARROW).toBe(
      iso(DateTime.add({ days: 1 })(day(DATE_PICKER_TODAY))),
    );
    expect(DateTime.isGreaterThan(day(DATE_PICKER_NAV_ARROW), min)).toBe(true);
    expect(DateTime.isLessThan(day(DATE_PICKER_NAV_ARROW), max)).toBe(true);
  });

  it("holds the labels it prints to the calendar's English format", () => {
    expect(label(DATE_PICKER_TODAY)).toBe(DATE_PICKER_TODAY_LABEL);
    expect(label(DATE_PICKER_MAX)).toBe(DATE_PICKER_CHOSEN_LABEL);
    expect(
      DateTime.format(day(DATE_PICKER_TODAY), {
        month: "long",
        year: "numeric",
        locale: "en-GB",
      }),
    ).toBe(DATE_PICKER_MONTH_LABEL);
    expect(DATE_PICKER_PLACEHOLDER).toBe("Pick a date");
  });

  it("prints the value and the change count, and names each cell", () => {
    expect(formatDatePickerReadout({ value: null, changes: 0 })).toBe(
      "value=none changes=0",
    );
    expect(
      formatDatePickerReadout({ value: DATE_PICKER_MAX, changes: 1 }),
    ).toBe(`value=${DATE_PICKER_MAX} changes=1`);
    expect(datePickerCell(DATE_PICKER_MAX)).toBe(`date-day-${DATE_PICKER_MAX}`);
  });

  it("holds the probe to the table it asserts against", () => {
    expect(probe).toContain("DATE_PICKER_ROUTES");
    expect(probe).toContain("datePickerCell(route.to)");
    expect(probe).toContain("formatDatePickerReadout");

    expect(probe).toContain("DATE_PICKER_UNAVAILABLE");
    expect(probe).toContain("DATE_PICKER_MONTH_LABEL");

    expect(probe).toContain("DATE_PICKER_EMPTY_TRIGGER");
    expect(probe).toContain("datePickerCell(DATE_PICKER_TODAY)");
    expect(probe).toContain("datePickerCell(DATE_PICKER_NAV_ARROW)");
  });

  it("refuses the anchor and the dead keyboard the component repaired", () => {
    expect(probe).not.toContain("month's first day");
    expect(probe).not.toContain("nowhere to go");
    expect(probe).not.toContain("DATE_PICKER_EMPTY_ANCHOR");
    const text = section().replace(/\s+/g, " ");
    expect(text).not.toContain("month's first day");
    expect(text).not.toContain("nowhere to go");

    expect(text).toContain("day it calls today");
    expect(text).toContain("nav row");
  });

  it("prints every measured row in its section", () => {
    const text = section().replace(/\s+/g, " ");
    expect(text).not.toBe("");
    Arr.forEach(DATE_PICKER_ROUTES, (route) => {
      expect(text).toContain(route.caption);
      expect(text).toContain(datePickerCell(route.to));
    });
    expect(text).toContain(DATE_PICKER_MONTH_LABEL);
    expect(text).toContain(DATE_PICKER_PLACEHOLDER);
    expect(text).toContain(DATE_PICKER_CHOSEN_LABEL);
  });
});
