/**
 * DatePicker behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a popover that opens without focusing a day; a selection
 * that reports a `DateTime` or a locale string instead of the ISO day; a
 * controlled value that changes without the consumer; arrow keys that move the
 * highlight without moving real focus; PageDown that changes the selected day;
 * Escape that does not return focus to the trigger; a selected day painted
 * from a constant instead of the theme; a click on an out-of-range day producing
 * a value; arrow keys walking past `min`/`max`; the month controls browsing past
 * the bound; a picked day that cannot be cleared from the surface; Clear
 * appearing without a value or without `clearable`; and the labels: a calendar
 * that only spoke English, or a partial `labels` object that wiped the defaults.
 *
 * Plan 546 adds the month chooser, so these cases also guard: the month label
 * not opening a chooser; a chooser choice writing the value instead of only the
 * view; a 31st disappearing when the chosen month is shorter; a year stepper
 * entering a year with no available month; a chooser month outside the bounds
 * still navigating; and keyboard movement wrapping into another year.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import {
  clickCentreOf,
  finishMotion,
  focusedTestId,
  isShown,
} from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";
import {
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
  type CalendarLabels,
} from "../date-picker.js";

const Picker = ({
  value,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen,
  onOpenChange,
  disabled,
  min,
  max,
  clearable,
  triggerPlaceholder,
  labels,
  showCalendar = true,
}: {
  readonly value?: string | null;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string | null) => void;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly disabled?: boolean;
  readonly min?: string;
  readonly max?: string;
  readonly clearable?: boolean;
  readonly triggerPlaceholder?: string;
  readonly labels?: Partial<CalendarLabels>;
  readonly showCalendar?: boolean;
}) => (
  <div style={{ width: 420, padding: 40 }}>
    <DatePicker
      today="2026-10-17"
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      open={openProp}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      disabled={disabled}
      min={min}
      max={max}
      clearable={clearable}
      labels={labels}
    >
      <DatePickerTrigger
        label="Due date"
        {...(triggerPlaceholder === undefined
          ? {}
          : { placeholder: triggerPlaceholder })}
      />
      <DatePickerContent>
        {showCalendar ? <DatePickerCalendar /> : null}
      </DatePickerContent>
    </DatePicker>
  </div>
);

const open = (picker: ReturnType<typeof renderComponent>): void => {
  clickCentreOf(picker, "date-picker-trigger");
};

describe("DatePicker", () => {
  it("opens on the selected month and focuses a day", () => {
    const picker = renderComponent(<Picker defaultValue="2026-10-17" />);

    expect(picker.renderer.getAllText()).toContain("17 October 2026");

    open(picker);

    expect(picker.renderer.findByTestId("date-month")).toBeDefined();
    expect(picker.renderer.findByText("October 2026")).toBeDefined();
    expect(picker.renderer.findByType("svg")).toHaveLength(3);
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-17"));

    picker.unmount();
  });

  it("opens with no value on today, not the month head", () => {
    const picker = renderComponent(<Picker />);

    open(picker);

    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-17"));

    picker.unmount();
  });

  it("opens from defaultOpen without a trigger press", () => {
    const picker = renderComponent(
      <Picker defaultOpen defaultValue="2026-10-17" />,
    );

    expect(picker.renderer.findByTestId("date-picker-content")).toBeDefined();
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-17"));

    picker.unmount();
  });

  it("reports an open request without opening while controlled closed", () => {
    const onOpenChange = vi.fn();
    const picker = renderComponent(
      <Picker open={false} onOpenChange={onOpenChange} />,
    );

    open(picker);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    finishMotion(picker);
    expect(picker.renderer.findByTestId("date-picker-content")).toBeUndefined();

    picker.rerender(<Picker open onOpenChange={onOpenChange} />);
    expect(picker.renderer.findByTestId("date-picker-content")).toBeDefined();

    picker.unmount();
  });

  it("leaves a controlled open surface painted until the caller closes it", () => {
    const onOpenChange = vi.fn();
    const picker = renderComponent(
      <Picker open defaultValue="2026-10-17" onOpenChange={onOpenChange} />,
    );

    expect(picker.renderer.findByTestId("date-picker-content")).toBeDefined();

    picker.renderer.simulateKeystrokes("escape");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(picker.renderer.findByTestId("date-picker-content")).toBeDefined();

    picker.rerender(
      <Picker
        open={false}
        defaultValue="2026-10-17"
        onOpenChange={onOpenChange}
      />,
    );
    finishMotion(picker);
    expect(picker.renderer.findByTestId("date-picker-content")).toBeUndefined();
    expect(focusedTestId(picker)).toEqual(Option.some("date-picker-trigger"));

    picker.unmount();
  });

  it("opens on the first selectable day when today is before min", () => {
    const picker = renderComponent(<Picker min="2026-10-17" />);

    open(picker);

    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-17"));

    picker.renderer.simulateKeystrokes("right");
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-18"));

    picker.unmount();
  });

  it("selects an ISO day, closes and updates the trigger", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Picker onValueChange={onValueChange} />);

    open(picker);
    clickCentreOf(picker, "date-day-2026-10-20");

    expect(onValueChange).toHaveBeenCalledWith("2026-10-20");
    finishMotion(picker);
    expect(picker.renderer.findByTestId("date-picker-content")).toBeUndefined();
    expect(picker.renderer.getAllText()).toContain("20 October 2026");
    expect(picker.renderer.getAllText()).not.toContain("Pick a date");
    expect(focusedTestId(picker)).toEqual(Option.some("date-picker-trigger"));

    picker.unmount();
  });

  it("keeps a controlled trigger on the consumer's value", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker value="2026-10-17" onValueChange={onValueChange} />,
    );

    open(picker);
    clickCentreOf(picker, "date-day-2026-10-20");

    expect(onValueChange).toHaveBeenCalledWith("2026-10-20");
    expect(picker.renderer.getAllText()).toContain("17 October 2026");
    expect(picker.renderer.getAllText()).not.toContain("20 October 2026");

    picker.unmount();
  });

  it("moves real focus by day, by week, and to the week's edges", () => {
    const picker = renderComponent(<Picker defaultValue="2026-10-17" />);
    open(picker);

    picker.renderer.simulateKeystrokes("right");
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-18"));

    picker.renderer.simulateKeystrokes("down");
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-25"));

    // 25 October 2026 is a Sunday; Monday-first week is 19–25.
    picker.renderer.simulateKeystrokes("home");
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-19"));

    picker.renderer.simulateKeystrokes("end");
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-25"));

    picker.unmount();
  });

  it("browses months with PageDown without changing the value", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker defaultValue="2026-10-17" onValueChange={onValueChange} />,
    );
    open(picker);

    picker.renderer.simulateKeystrokes("pagedown");

    expect(picker.renderer.findByText("November 2026")).toBeDefined();
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-11-17"));
    expect(picker.renderer.getAllText()).toContain("17 October 2026");
    expect(onValueChange).not.toHaveBeenCalled();

    picker.unmount();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    const picker = renderComponent(<Picker defaultValue="2026-10-17" />);
    open(picker);

    picker.renderer.simulateKeystrokes("escape");

    finishMotion(picker);
    expect(picker.renderer.findByTestId("date-picker-content")).toBeUndefined();
    expect(focusedTestId(picker)).toEqual(Option.some("date-picker-trigger"));

    picker.unmount();
  });

  it("points the next-month control at the following month", () => {
    const picker = renderComponent(<Picker defaultValue="2026-10-17" />);
    open(picker);

    clickCentreOf(picker, "date-next");

    expect(picker.renderer.findByText("November 2026")).toBeDefined();
    clickCentreOf(picker, "date-day-2026-11-03");

    expect(picker.renderer.getAllText()).toContain("3 November 2026");

    picker.unmount();
  });

  it("selects a day from an adjacent month in the grid", () => {
    // Guards the blank-cell grid: before outside days existed, 31 October was
    // not rendered in November and this choice was impossible.
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker defaultValue="2026-10-17" onValueChange={onValueChange} />,
    );
    open(picker);
    clickCentreOf(picker, "date-next");

    expect(picker.renderer.findByTestId("date-day-2026-10-31")).toBeDefined();
    clickCentreOf(picker, "date-day-2026-10-31");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("2026-10-31");
    expect(picker.renderer.getAllText()).toContain("31 October 2026");
    finishMotion(picker);
    expect(picker.renderer.findByTestId("date-picker-content")).toBeUndefined();

    picker.unmount();
  });

  it("paints adjacent days muted and in-month days in the foreground", () => {
    // Guards the grid's two kinds of day: adjacent days are real choices and
    // must not look like disabled or missing cells.
    const picker = renderComponent(
      <Picker defaultValue="2026-10-17" />,
      "dark",
    );
    open(picker);

    expect(
      picker.renderer.findByTestId("date-day-2026-09-28")?.style.color,
    ).toBe(darkTheme.colors.mutedForeground);
    expect(
      picker.renderer.findByTestId("date-day-2026-10-18")?.style.color,
    ).toBe(darkTheme.colors.foreground);

    picker.unmount();
  });

  it("refuses an out-of-bounds adjacent day and announces it", () => {
    // Guards the bounds crossing into the adjacent month: the extra days must
    // obey min/max exactly like the month's own days.
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker
        defaultValue="2026-11-15"
        min="2026-11-01"
        onValueChange={onValueChange}
      />,
    );
    open(picker);

    expect(
      picker.renderer.findByTestId("date-day-2026-10-31")?.customProps?.[
        "aria-label"
      ],
    ).toBe("31 October 2026, unavailable");

    clickCentreOf(picker, "date-day-2026-10-31");

    expect(onValueChange).not.toHaveBeenCalled();
    expect(picker.renderer.findByTestId("date-picker-content")).toBeDefined();

    picker.unmount();
  });

  it("paints the selected day with the primary role in both themes", () => {
    const assertTheme = (theme: TestTheme, primary: string): void => {
      const picker = renderComponent(
        <Picker defaultValue="2026-10-17" />,
        theme,
      );
      open(picker);

      expect(
        picker.renderer.findByTestId("date-day-2026-10-17")?.style
          .backgroundColor,
      ).toBe(primary);

      picker.unmount();
    };

    assertTheme("dark", darkTheme.colors.primary);
    assertTheme("light", lightTheme.colors.primary);
  });

  it("does not open when disabled", () => {
    const picker = renderComponent(<Picker disabled />);

    open(picker);

    finishMotion(picker);
    expect(picker.renderer.findByTestId("date-picker-content")).toBeUndefined();

    picker.unmount();
  });

  it("refuses an unavailable day and announces it as such", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker min="2026-10-17" onValueChange={onValueChange} />,
    );
    open(picker);

    expect(
      picker.renderer.findByTestId("date-day-2026-10-16")?.customProps?.[
        "aria-label"
      ],
    ).toBe("16 October 2026, unavailable");

    clickCentreOf(picker, "date-day-2026-10-16");

    expect(onValueChange).not.toHaveBeenCalled();
    expect(picker.renderer.findByTestId("date-picker-content")).toBeDefined();
    expect(picker.renderer.getAllText()).toContain("Pick a date");

    picker.unmount();
  });

  it("clamps arrow movement at the lower bound", () => {
    const picker = renderComponent(
      <Picker defaultValue="2026-10-18" min="2026-10-17" />,
    );
    open(picker);

    picker.renderer.simulateKeystrokes("left");
    picker.renderer.simulateKeystrokes("left");

    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-17"));
    expect(picker.renderer.getAllText()).toContain("18 October 2026");
    expect(picker.renderer.getAllText()).not.toContain("17 October 2026");

    picker.unmount();
  });

  it("stops month browsing at the bound's month", () => {
    const picker = renderComponent(
      <Picker defaultValue="2026-10-17" min="2026-10-17" />,
    );
    open(picker);

    expect(
      picker.renderer.findByTestId("date-prev")?.customProps?.tabIndex,
    ).toBe(-1);

    clickCentreOf(picker, "date-prev");

    expect(picker.renderer.findByText("October 2026")).toBeDefined();

    picker.unmount();
  });

  it("clears the selection, closes and returns focus to the trigger", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker
        defaultValue="2026-10-17"
        clearable
        onValueChange={onValueChange}
      />,
    );
    open(picker);

    clickCentreOf(picker, "date-clear");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(null);
    finishMotion(picker);
    expect(picker.renderer.findByTestId("date-picker-content")).toBeUndefined();
    expect(picker.renderer.getAllText()).toContain("Pick a date");
    expect(focusedTestId(picker)).toEqual(Option.some("date-picker-trigger"));

    picker.unmount();
  });

  it("offers Clear only when asked for and only with a selection", () => {
    const empty = renderComponent(<Picker clearable />);
    open(empty);
    expect(empty.renderer.findByTestId("date-clear")).toBeUndefined();
    empty.unmount();

    const notClearable = renderComponent(<Picker defaultValue="2026-10-17" />);
    open(notClearable);
    expect(notClearable.renderer.findByTestId("date-clear")).toBeUndefined();
    notClearable.unmount();
  });

  it("takes the trigger's placeholder and name from the part", () => {
    const picker = renderComponent(
      <Picker triggerPlaceholder="Choose a day" />,
    );

    expect(picker.renderer.getAllText()).toContain("Choose a day");
    expect(
      picker.renderer.findByTestId("date-picker-trigger")?.customProps?.[
        "aria-label"
      ],
    ).toBe("Due date");

    picker.unmount();
  });

  it("opens an empty surface when the calendar part is not composed", () => {
    const picker = renderComponent(<Picker showCalendar={false} />);

    open(picker);

    expect(picker.renderer.findByTestId("date-picker-content")).toBeDefined();
    expect(picker.renderer.findByTestId("date-month")).toBeUndefined();
    expect(picker.renderer.findByTestId("date-day-2026-10-17")).toBeUndefined();

    picker.unmount();
  });

  it("paints the caller's labels in the trigger, header and controls", () => {
    const picker = renderComponent(
      <Picker
        defaultValue="2026-10-17"
        min="2026-10-17"
        clearable
        labels={{
          months: [
            "Januar",
            "Februar",
            "Mart",
            "April",
            "Maj",
            "Jun",
            "Jul",
            "Avgust",
            "Septembar",
            "Oktobar",
            "Novembar",
            "Decembar",
          ],
          weekdays: ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"],
          unavailable: "nedostupno",
          previousMonth: "Prethodni mesec",
          nextMonth: "Sledeći mesec",
          clear: "Obriši",
        }}
      />,
    );

    expect(picker.renderer.getAllText()).toContain("17 Oktobar 2026");

    open(picker);

    expect(picker.renderer.findByText("Oktobar 2026")).toBeDefined();
    expect(picker.renderer.getAllText()).toContain("Ned");
    expect(
      picker.renderer.findByTestId("date-day-2026-10-16")?.customProps?.[
        "aria-label"
      ],
    ).toBe("16 Oktobar 2026, nedostupno");
    expect(
      picker.renderer.findByTestId("date-prev")?.customProps,
    ).toMatchObject({
      "aria-label": "Prethodni mesec",
    });
    expect(
      picker.renderer.findByTestId("date-next")?.customProps,
    ).toMatchObject({
      "aria-label": "Sledeći mesec",
    });
    expect(picker.renderer.getAllText()).toContain("Obriši");

    picker.unmount();
  });

  it("keeps the default labels when only one string is overridden", () => {
    const picker = renderComponent(
      <Picker
        defaultValue="2026-10-17"
        clearable
        labels={{ clear: "Dismiss" }}
      />,
    );

    open(picker);

    expect(picker.renderer.findByText("October 2026")).toBeDefined();
    expect(picker.renderer.getAllText()).toContain("Sun");
    expect(picker.renderer.getAllText()).toContain("Dismiss");
    expect(picker.renderer.getAllText()).not.toContain("Clear");

    picker.unmount();
  });

  it("opens a month chooser from the header", () => {
    const picker = renderComponent(<Picker defaultValue="2026-10-17" />);

    open(picker);
    clickCentreOf(picker, "date-month");

    expect(isShown(picker, "date-month-0")).toBe(true);
    expect(isShown(picker, "date-month-11")).toBe(true);
    expect(isShown(picker, "date-day-2026-10-17")).toBe(false);
    expect(
      picker.renderer.findByTestId("date-month-9")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(true);
    expect(focusedTestId(picker)).toEqual(Option.some("date-month-9"));

    picker.unmount();
  });

  it("chooses a month without changing the value and keeps the day", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker defaultValue="2026-10-17" onValueChange={onValueChange} />,
    );

    open(picker);
    clickCentreOf(picker, "date-month");
    clickCentreOf(picker, "date-month-3");

    expect(isShown(picker, "date-day-2026-04-17")).toBe(true);
    expect(picker.renderer.getAllText()).toContain("April 2026");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-04-17"));

    picker.unmount();
  });

  it("clamps the day when the chosen month is shorter", () => {
    const picker = renderComponent(<Picker defaultValue="2026-01-31" />);

    open(picker);
    clickCentreOf(picker, "date-month");
    clickCentreOf(picker, "date-month-1");

    expect(isShown(picker, "date-day-2026-02-28")).toBe(true);
    expect(picker.renderer.getAllText()).toContain("31 January 2026");

    picker.unmount();
  });

  it("steps years from the chooser", () => {
    const picker = renderComponent(<Picker defaultValue="2026-10-17" />);

    open(picker);
    clickCentreOf(picker, "date-month");
    clickCentreOf(picker, "date-prev-year");
    clickCentreOf(picker, "date-month-0");

    expect(isShown(picker, "date-day-2025-01-17")).toBe(true);

    clickCentreOf(picker, "date-month");
    clickCentreOf(picker, "date-next-year");
    clickCentreOf(picker, "date-next-year");
    clickCentreOf(picker, "date-month-0");

    expect(isShown(picker, "date-day-2027-01-17")).toBe(true);

    picker.unmount();
  });

  it("keeps unavailable months and years inert", () => {
    const picker = renderComponent(
      <Picker min="2026-03-10" max="2026-08-20" />,
    );

    open(picker);
    clickCentreOf(picker, "date-month");

    expect(
      picker.renderer.findByTestId("date-month-0")?.customProps?.["aria-label"],
    ).toBe("January 2026, unavailable");
    expect(
      picker.renderer.findByTestId("date-prev-year")?.customProps?.tabIndex,
    ).toBe(-1);
    expect(
      picker.renderer.findByTestId("date-next-year")?.customProps?.tabIndex,
    ).toBe(-1);

    clickCentreOf(picker, "date-month-0");

    expect(isShown(picker, "date-month-0")).toBe(true);

    picker.unmount();
  });

  it("returns to the day grid from the year label", () => {
    const picker = renderComponent(<Picker defaultValue="2026-10-17" />);

    open(picker);
    clickCentreOf(picker, "date-month");
    clickCentreOf(picker, "date-month");

    expect(isShown(picker, "date-day-2026-10-17")).toBe(true);
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-17"));

    picker.unmount();
  });

  it("moves and selects a month from the keyboard", () => {
    const picker = renderComponent(<Picker defaultValue="2026-10-17" />);

    open(picker);
    clickCentreOf(picker, "date-month");

    picker.renderer.simulateKeystrokes("right");
    expect(focusedTestId(picker)).toEqual(Option.some("date-month-10"));

    picker.renderer.simulateKeystrokes("down");
    expect(focusedTestId(picker)).toEqual(Option.some("date-month-10"));

    picker.renderer.simulateKeystrokes("home");
    expect(focusedTestId(picker)).toEqual(Option.some("date-month-0"));

    picker.renderer.simulateKeystrokes("end");
    expect(focusedTestId(picker)).toEqual(Option.some("date-month-11"));

    picker.renderer.simulateKeystrokes("enter");

    expect(isShown(picker, "date-day-2026-12-17")).toBe(true);
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-12-17"));

    picker.unmount();
  });

  it("names the chooser controls from the caller's labels", () => {
    const picker = renderComponent(
      <Picker
        defaultValue="2026-10-17"
        labels={{
          previousYear: "Prošla godina",
          nextYear: "Sledeća godina",
          chooseMonth: "Izaberi mesec",
          showDays: "Prikaži dane",
        }}
      />,
    );

    open(picker);

    expect(
      picker.renderer.findByTestId("date-month")?.customProps,
    ).toMatchObject({ "aria-label": "Izaberi mesec" });

    clickCentreOf(picker, "date-month");

    expect(
      picker.renderer.findByTestId("date-prev-year")?.customProps,
    ).toMatchObject({ "aria-label": "Prošla godina" });
    expect(
      picker.renderer.findByTestId("date-next-year")?.customProps,
    ).toMatchObject({ "aria-label": "Sledeća godina" });
    expect(
      picker.renderer.findByTestId("date-month")?.customProps,
    ).toMatchObject({ "aria-label": "Prikaži dane" });

    picker.unmount();
  });
});
