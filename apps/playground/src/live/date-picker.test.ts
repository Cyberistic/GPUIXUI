/**
 * Guards the fixture `date-picker-lifecycle` measures the shipped `DatePicker`
 * with.
 *
 * The probe asserts a focused cell after every key, so a table of iso strings
 * typed by hand is exactly the kind of claim that stays green while describing
 * the wrong week. Every route is re-derived here from `effect/DateTime` — the
 * key's own step, then the bounds' clamp — and the day labels are derived again
 * from `Intl` in UTC, so a mistyped month or a route that starts on the wrong
 * weekday fails by name. The month the probe pins is checked to be one where
 * both neighbouring months contain no selectable day, which is the premise the
 * "the month control refuses" check rests on.
 *
 * `node:fs` is deliberate, as in `registry.test.ts` and `button.test.ts`: this is
 * a check over the repository's own Markdown, not a runtime path.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import {
  DATE_PICKER_CHOSEN_LABEL,
  DATE_PICKER_EMPTY_ANCHOR,
  DATE_PICKER_KEYS,
  DATE_PICKER_MAX,
  DATE_PICKER_MIN,
  DATE_PICKER_MONTH_LABEL,
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

/** A parsed day; the fixture's iso strings are constants, so this cannot miss. */
const day = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

const iso = (value: DateTime.Utc): string => DateTime.formatIsoDateUtc(value);

const min = day(DATE_PICKER_MIN);
const max = day(DATE_PICKER_MAX);

/** The day one key asks for, before any bound is applied. */
const STEP: Record<
  DatePickerKey,
  (value: DateTime.Utc, weekDay: number) => DateTime.Utc
> = {
  right: (value) => DateTime.add({ days: 1 })(value),
  left: (value) => DateTime.add({ days: -1 })(value),
  down: (value) => DateTime.add({ days: 7 })(value),
  up: (value) => DateTime.add({ days: -7 })(value),
  // `weekStartsOn` defaults to Monday and Effect's `weekDay` is 1-based from
  // Monday, so the two edges of the row are its Monday and its Sunday.
  home: (value, weekDay) => DateTime.add({ days: 1 - weekDay })(value),
  end: (value, weekDay) => DateTime.add({ days: 7 - weekDay })(value),
};

const step = (from: string, key: DatePickerKey): DateTime.Utc =>
  STEP[key](day(from), DateTime.toPartsUtc(day(from)).weekDay);

/** The day a move lands on: the key's step, clamped into the bounds. */
const landed = (route: DatePickerRoute): string => {
  const wanted = step(route.from, route.key);
  if (DateTime.isLessThan(wanted, min)) return iso(min);
  if (DateTime.isGreaterThan(wanted, max)) return iso(max);
  return iso(wanted);
};

/** The English label the component's `formatDayLabel` prints. */
const label = (value: string): string =>
  DateTime.format(day(value), {
    day: "numeric",
    month: "long",
    year: "numeric",
    locale: "en-GB",
  });

/** The `date-picker-lifecycle` section, without the headings after it. */
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
    // The clamped rows are the ones that prove the bounds: 22 March + 7 is 29
    // March, past the 27th, and a day past the last bound stays there.
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
    // Both bounds inside the month: browsing either way leaves the available
    // range behind, which is the premise of the "control refuses" check.
    expect(DateTime.isGreaterThan(min, month)).toBe(true);
    expect(DateTime.isLessThan(max, DateTime.add({ months: 1 })(month))).toBe(
      true,
    );
    // The unavailable control is in the painted grid (its last week starts on
    // the 30th) and after the last bound.
    expect(iso(day(DATE_PICKER_UNAVAILABLE)) > DATE_PICKER_MAX).toBe(true);
    expect(DATE_PICKER_UNAVAILABLE.startsWith("2026-03-")).toBe(true);
    // The empty picker's measured anchor is the month's first day, and it is
    // before `min` — which is why the check that pins it says the first Enter a
    // keyboard reader presses on a fresh calendar is refused.
    expect(DATE_PICKER_EMPTY_ANCHOR).toBe(iso(month));
    expect(DateTime.isLessThan(day(DATE_PICKER_EMPTY_ANCHOR), min)).toBe(true);
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
    // The route is driven from the fixture, so a row cannot be one the window
    // never receives.
    expect(probe).toContain("DATE_PICKER_ROUTES");
    expect(probe).toContain("datePickerCell(route.to)");
    expect(probe).toContain("formatDatePickerReadout");
    // The bound controls the route's last rows rely on.
    expect(probe).toContain("DATE_PICKER_UNAVAILABLE");
    expect(probe).toContain("DATE_PICKER_MONTH_LABEL");
    // The empty instance is a second mount, so its first-open anchor is
    // measured rather than inherited from the driven picker.
    expect(probe).toContain("DATE_PICKER_EMPTY_TRIGGER");
    expect(probe).toContain("datePickerCell(DATE_PICKER_EMPTY_ANCHOR)");
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
