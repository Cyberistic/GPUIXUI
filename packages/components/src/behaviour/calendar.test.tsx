/**
 * Calendar behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: two cells claiming the roving tab stop; an arrow that
 * paints a highlight without moving real focus; `Home`/`End` read as the page's
 * edges instead of the week's; `PageDown` changing the selected day; a `Shift`
 * page that moves a month instead of a year; `Enter`/`Space` not selecting the
 * focused day; a disabled day taking a press; an arrow landing on a disabled
 * day; Escape not reaching the owner that opened the surface; a span painted
 * only at its ends; a second month never painted; a caption dropdown that moves
 * the label but not the grid; and a selected day painted from a constant instead
 * of the theme's `primary` role.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import {
  clickCentreOf,
  focusedTestId,
  pressKey,
  sizeOf,
} from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";
import { Calendar } from "../calendar.js";
import type {
  MultipleCalendarProps,
  RangeCalendarProps,
  SingleCalendarProps,
} from "../calendar.js";
import type { ReactNode } from "react";

/** The room a calendar needs, and the day every case calls today. */
const Frame = ({ children }: { readonly children: ReactNode }) => (
  <div style={{ width: 720, padding: 40 }}>{children}</div>
);

/** A one-day calendar, with today fixed so the paint is stable. */
const single = (
  props: Omit<SingleCalendarProps, "mode" | "today"> = {},
): ReturnType<typeof renderComponent> =>
  renderComponent(
    <Frame>
      <Calendar today="2026-10-17" {...props} />
    </Frame>,
  );

/** A span calendar. */
const range = (
  props: Omit<RangeCalendarProps, "mode" | "today"> = {},
): ReturnType<typeof renderComponent> =>
  renderComponent(
    <Frame>
      <Calendar mode="range" today="2026-10-17" {...props} />
    </Frame>,
  );

/** A several-days calendar. */
const several = (
  props: Omit<MultipleCalendarProps, "mode" | "today"> = {},
): ReturnType<typeof renderComponent> =>
  renderComponent(
    <Frame>
      <Calendar mode="multiple" today="2026-10-17" {...props} />
    </Frame>,
  );

/** Put real focus on a day cell, the way Tab or a press would. */
const focusDay = (root: ReturnType<typeof single>, iso: string): void => {
  const cell = root.renderer.findByTestId(`date-day-${iso}`);
  if (cell === undefined) throw new Error(`behaviour: no cell for ${iso}`);
  root.renderer.focusElement(cell.id);
};

describe("the month grid", () => {
  it("paints the month, the weekday header and today", () => {
    const root = single();
    expect(root.renderer.findByTestId("date-month")).toBeDefined();
    expect(root.renderer.findByText("October 2026")).toBeDefined();
    expect(root.renderer.getAllText()).toContain("Mon");
    // Today is marked by the theme's primary edge, not a constant.
    expect(
      root.renderer.findByTestId("date-day-2026-10-17")?.style.borderColor,
    ).toBe(darkTheme.colors.primary);
    expect(sizeOf(root, "date-day-2026-10-17")).toEqual(
      Option.some({ width: 34, height: 34 }),
    );
    root.unmount();
  });

  it("paints two months side by side and keeps one tab stop", () => {
    const root = single({ numberOfMonths: 2 });
    expect(root.renderer.getAllText()).toContain("October 2026");
    expect(root.renderer.getAllText()).toContain("November 2026");
    expect(root.renderer.findByTestId("date-month-1")).toBeDefined();

    // The roving stop is one cell, on the focused day.
    const stops = ["2026-10-17", "2026-10-18", "2026-11-01"].map(
      (iso) =>
        root.renderer.findByTestId(`date-day-${iso}`)?.customProps?.tabIndex,
    );
    expect(stops).toEqual([0, -1, -1]);
    root.unmount();
  });

  it("paints outside days by default, and only when asked otherwise", () => {
    // shadcn's Calendar paints the neighbouring months unless told not to.
    const byDefault = single();
    expect(
      byDefault.renderer.findByTestId("date-day-2026-09-28"),
    ).toBeDefined();
    byDefault.unmount();

    const withOutside = single({ showOutsideDays: true });
    expect(
      withOutside.renderer.findByTestId("date-day-2026-09-28"),
    ).toBeDefined();
    withOutside.unmount();

    const clean = single({ showOutsideDays: false });
    expect(clean.renderer.findByTestId("date-day-2026-09-28")).toBeUndefined();
    expect(clean.renderer.findByTestId("date-day-2026-10-01")).toBeDefined();
    clean.unmount();
  });
});

describe("the keyboard", () => {
  it("moves real focus by day and by week, clamped to the month", () => {
    const root = single({ showOutsideDays: false });
    focusDay(root, "2026-10-17");

    root.renderer.simulateKeystrokes("right");
    expect(focusedTestId(root)).toEqual(Option.some("date-day-2026-10-18"));

    root.renderer.simulateKeystrokes("down");
    expect(focusedTestId(root)).toEqual(Option.some("date-day-2026-10-25"));

    // 25 October 2026 is a Sunday; a Monday-first week is 19–25.
    root.renderer.simulateKeystrokes("home");
    expect(focusedTestId(root)).toEqual(Option.some("date-day-2026-10-19"));

    root.renderer.simulateKeystrokes("end");
    expect(focusedTestId(root)).toEqual(Option.some("date-day-2026-10-25"));

    // The 1st has no earlier day in the month when outside days are off.
    focusDay(root, "2026-10-01");
    root.renderer.simulateKeystrokes("left");
    expect(focusedTestId(root)).toEqual(Option.some("date-day-2026-10-01"));

    root.unmount();
  });

  it("leaves the month when adjacent days are painted", () => {
    const root = single({ showOutsideDays: true });
    focusDay(root, "2026-10-01");

    root.renderer.simulateKeystrokes("left");

    expect(focusedTestId(root)).toEqual(Option.some("date-day-2026-09-30"));
    root.unmount();
  });

  it("pages a month, and a year with Shift", () => {
    const root = single();
    focusDay(root, "2026-10-17");

    root.renderer.simulateKeystrokes("pagedown");
    expect(focusedTestId(root)).toEqual(Option.some("date-day-2026-11-17"));
    expect(root.renderer.findByText("November 2026")).toBeDefined();

    root.renderer.simulateKeystrokes("pageup");
    expect(focusedTestId(root)).toEqual(Option.some("date-day-2026-10-17"));

    root.renderer.simulateKeystrokes("shift-pagedown");
    expect(focusedTestId(root)).toEqual(Option.some("date-day-2027-10-17"));
    expect(root.renderer.findByText("October 2027")).toBeDefined();

    root.unmount();
  });

  it("selects the focused day on Enter and on Space", () => {
    const onSelect = vi.fn();
    const root = single({ onSelect });
    focusDay(root, "2026-10-20");

    pressKey(root, "enter");
    expect(onSelect).toHaveBeenCalledWith("2026-10-20");

    pressKey(root, "space");
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith("2026-10-20");

    root.unmount();
  });

  it("hands Escape to the surface that opened it", () => {
    const onDismiss = vi.fn();
    const root = single({ onDismiss });
    focusDay(root, "2026-10-17");

    pressKey(root, "escape");

    expect(onDismiss).toHaveBeenCalledTimes(1);
    root.unmount();
  });
});

describe("the selection", () => {
  it("paints the chosen day with the primary role in both themes", () => {
    const assertTheme = (theme: TestTheme, primary: string): void => {
      const root = renderComponent(
        <Frame>
          <Calendar today="2026-10-17" selected="2026-10-17" />
        </Frame>,
        theme,
      );
      expect(
        root.renderer.findByTestId("date-day-2026-10-17")?.style
          .backgroundColor,
      ).toBe(primary);
      root.unmount();
    };

    assertTheme("dark", darkTheme.colors.primary);
    assertTheme("light", lightTheme.colors.primary);
  });

  it("paints a range's start, middle and end differently", () => {
    const root = range({
      selected: { from: "2026-10-17", to: "2026-10-20" },
    });

    expect(
      root.renderer.findByTestId("date-day-2026-10-17")?.style.backgroundColor,
    ).toBe(darkTheme.colors.primary);
    expect(
      root.renderer.findByTestId("date-day-2026-10-19")?.style.backgroundColor,
    ).toBe(darkTheme.colors.muted);
    expect(
      root.renderer.findByTestId("date-day-2026-10-20")?.style.backgroundColor,
    ).toBe(darkTheme.colors.primary);
    // A day after the range wears neither paint.
    expect(
      root.renderer.findByTestId("date-day-2026-10-21")?.style.backgroundColor,
    ).toBeUndefined();

    root.unmount();
  });

  it("reports a span as { from, to } after the second press", () => {
    const onSelect = vi.fn();
    const root = range({
      selected: { from: "2026-10-17", to: null },
      onSelect,
    });

    clickCentreOf(root, "date-day-2026-10-20");

    expect(onSelect).toHaveBeenCalledWith({
      from: "2026-10-17",
      to: "2026-10-20",
    });
    root.unmount();
  });

  it("toggles each day in multiple mode", () => {
    const onSelect = vi.fn();
    const root = several({
      selected: ["2026-10-17"],
      onSelect,
    });

    clickCentreOf(root, "date-day-2026-10-20");

    expect(onSelect).toHaveBeenCalledWith(["2026-10-17", "2026-10-20"]);
    root.unmount();
  });

  it("announces the focused day and the selection through the a11y tree", () => {
    const root = range({
      selected: { from: "2026-10-17", to: "2026-10-20" },
    });

    const start = root.renderer.findByTestId("date-day-2026-10-17");
    expect(start?.customProps?.["aria-label"]).toBe(
      "17 October 2026, range start",
    );
    expect(start?.customProps?.["aria-selected"]).toBe(true);
    expect(
      root.renderer.findByTestId("date-day-2026-10-19")?.customProps?.[
        "aria-label"
      ],
    ).toBe("19 October 2026, in range");
    // The grid carries the span, so a reader who reaches it hears the value.
    expect(
      root.renderer.findByTestId("date-day-2026-10-20")?.customProps?.[
        "aria-label"
      ],
    ).toBe("20 October 2026, range end");

    root.unmount();
  });
});

describe("the refused days", () => {
  it("paints a refused day as unavailable and refuses the press", () => {
    const onSelect = vi.fn();
    const root = single({
      disabled: { filter: (day) => day === "2026-10-20" },
      onSelect,
    });

    expect(
      root.renderer.findByTestId("date-day-2026-10-20")?.customProps?.[
        "aria-label"
      ],
    ).toBe("20 October 2026, unavailable");

    clickCentreOf(root, "date-day-2026-10-20");

    expect(onSelect).not.toHaveBeenCalled();
    root.unmount();
  });

  it("skips a refused day with the arrows instead of landing on it", () => {
    const root = single({ disabled: { weekdays: [0, 6] } });
    // 16 October 2026 is a Friday; the weekend is refused.
    focusDay(root, "2026-10-16");

    root.renderer.simulateKeystrokes("right");
    expect(focusedTestId(root)).toEqual(Option.some("date-day-2026-10-19"));

    root.renderer.simulateKeystrokes("left");
    expect(focusedTestId(root)).toEqual(Option.some("date-day-2026-10-16"));

    root.unmount();
  });
});

describe("the caption dropdown", () => {
  it("jumps the grid to the month and the year it names", () => {
    const root = single({ captionLayout: "dropdown" });
    expect(root.renderer.findByTestId("date-month")).toBeUndefined();
    expect(root.renderer.findByTestId("date-month-select")).toBeDefined();
    expect(root.renderer.findByTestId("date-month-year")).toBeDefined();

    clickCentreOf(root, "date-month-select");
    clickCentreOf(root, "date-month-month-3");
    // The dropdown names the month in two controls, so the grid is the evidence.
    expect(root.renderer.findByTestId("date-day-2026-03-01")).toBeDefined();
    expect(root.renderer.findByTestId("date-day-2026-10-17")).toBeUndefined();

    clickCentreOf(root, "date-month-year");
    clickCentreOf(root, "date-month-year-2028");
    expect(root.renderer.findByTestId("date-day-2028-03-01")).toBeDefined();

    root.unmount();
  });
});
