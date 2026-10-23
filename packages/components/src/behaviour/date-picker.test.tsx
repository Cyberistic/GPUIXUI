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
 * appearing without a value or without `clearable`; and a picker the caller
 * disables while its calendar is open still selecting a day or clearing.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import {
  clickCentreOf,
  focusedTestId,
  pressKey,
  waitFor,
} from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";
import {
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
} from "../date-picker.js";

const Picker = ({
  value,
  defaultValue,
  onValueChange,
  disabled,
  min,
  max,
  clearable,
  triggerPlaceholder,
  showCalendar = true,
}: {
  readonly value?: string | null;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string | null) => void;
  readonly disabled?: boolean;
  readonly min?: string;
  readonly max?: string;
  readonly clearable?: boolean;
  readonly triggerPlaceholder?: string;
  readonly showCalendar?: boolean;
}) => (
  <div style={{ width: 420, padding: 40 }}>
    <DatePicker
      today="2026-10-17"
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      min={min}
      max={max}
      clearable={clearable}
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
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-17"));

    picker.unmount();
  });

  it("runs the trigger's action on Enter and opens the picker", () => {
    const onActivate = vi.fn();
    const onClick = vi.fn();
    const picker = renderComponent(
      <div style={{ width: 420, padding: 40 }}>
        <DatePicker today="2026-10-17">
          <DatePickerTrigger
            label="Due date"
            onActivate={onActivate}
            onClick={onClick}
          />
          <DatePickerContent>
            <DatePickerCalendar />
          </DatePickerContent>
        </DatePicker>
      </div>,
    );
    picker.renderer.focusElement(
      picker.renderer.findByTestId("date-picker-trigger")?.id ?? -1,
    );

    pressKey(picker, "enter");

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    expect(picker.renderer.findByTestId("date-picker-content")).toBeDefined();

    picker.unmount();
  });

  it("keeps the deprecated onClick as the action's alias", () => {
    const onClick = vi.fn();
    const picker = renderComponent(
      <div style={{ width: 420, padding: 40 }}>
        <DatePicker today="2026-10-17">
          <DatePickerTrigger label="Due date" onClick={onClick} />
          <DatePickerContent>
            <DatePickerCalendar />
          </DatePickerContent>
        </DatePicker>
      </div>,
    );
    picker.renderer.focusElement(
      picker.renderer.findByTestId("date-picker-trigger")?.id ?? -1,
    );

    pressKey(picker, "enter");

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(picker.renderer.findByTestId("date-picker-content")).toBeDefined();

    picker.unmount();
  });

  it("selects an ISO day, closes and updates the trigger", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Picker onValueChange={onValueChange} />);

    open(picker);
    clickCentreOf(picker, "date-day-2026-10-20");

    expect(onValueChange).toHaveBeenCalledWith("2026-10-20");
    await waitFor(() =>
      expect(
        picker.renderer.findByTestId("date-picker-content"),
      ).toBeUndefined(),
    );
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

  it("closes on Escape and returns focus to the trigger", async () => {
    const picker = renderComponent(<Picker defaultValue="2026-10-17" />);
    open(picker);

    picker.renderer.simulateKeystrokes("escape");

    await waitFor(() =>
      expect(
        picker.renderer.findByTestId("date-picker-content"),
      ).toBeUndefined(),
    );
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

  it("does not open when disabled", async () => {
    const picker = renderComponent(<Picker disabled />);

    open(picker);

    await waitFor(() =>
      expect(
        picker.renderer.findByTestId("date-picker-content"),
      ).toBeUndefined(),
    );

    picker.unmount();
  });

  it("closes with a picker the caller disables while its calendar is open", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker
        defaultValue="2026-10-17"
        clearable
        onValueChange={onValueChange}
      />,
    );
    open(picker);

    expect(picker.renderer.findByTestId("date-day-2026-10-20")).toBeDefined();
    picker.rerender(
      <Picker
        defaultValue="2026-10-17"
        clearable
        disabled
        onValueChange={onValueChange}
      />,
    );

    await waitFor(() =>
      expect(
        picker.renderer.findByTestId("date-picker-content"),
      ).toBeUndefined(),
    );
    expect(onValueChange).not.toHaveBeenCalled();
    expect(picker.renderer.getAllText()).toContain("17 October 2026");

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

  it("anchors an empty calendar on the day it calls today", () => {
    // The bug: the open effect set the anchor and the same commit's focus effect
    // read the *previous* state, so an empty picker focused the first of the
    // month while the component documents today (`date-picker-lifecycle` read
    // `date-day-2026-03-01` against the anchor's `-11`).
    const picker = renderComponent(<Picker />);
    open(picker);

    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-17"));
    expect(picker.renderer.findByText("October 2026")).toBeDefined();

    picker.unmount();
  });

  it("keeps the calendar's keys working from a month control", () => {
    // The bug: the grid owned `onKeyDown`, and the month controls are its
    // siblings, so a key delivered to a month button never reached the calendar.
    // The runtime focuses the element a pointer pressed even when it is
    // disabled (`date-picker-lifecycle` measured `date-next` holding the focus
    // at its bound), so every later arrow moved nothing.
    const picker = renderComponent(
      <Picker defaultValue="2026-10-17" min="2026-10-01" max="2026-10-31" />,
    );
    open(picker);

    const next = picker.renderer.findByTestId("date-next");
    expect(next?.customProps?.tabIndex).toBe(-1);

    picker.renderer.focusElement(next?.id ?? -1);
    expect(focusedTestId(picker)).toEqual(Option.some("date-next"));

    picker.renderer.simulateKeystrokes("right");

    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-18"));

    picker.unmount();
  });

  it("clears the selection, closes and returns focus to the trigger", async () => {
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
    await waitFor(() =>
      expect(
        picker.renderer.findByTestId("date-picker-content"),
      ).toBeUndefined(),
    );
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
});
