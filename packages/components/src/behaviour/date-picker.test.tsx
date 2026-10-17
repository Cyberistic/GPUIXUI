/**
 * DatePicker behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a popover that opens without focusing a day; a selection
 * that reports a `DateTime` or a locale string instead of the ISO day; a
 * controlled value that changes without the consumer; arrow keys that move the
 * highlight without moving real focus; PageDown that changes the selected day;
 * Escape that does not return focus to the trigger; and a selected day painted
 * from a constant instead of the theme.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";
import { DatePicker } from "../date-picker.js";

const Picker = ({
  value,
  defaultValue,
  onValueChange,
  disabled,
}: {
  readonly value?: string | null;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string | null) => void;
  readonly disabled?: boolean;
}) => (
  <div style={{ width: 420, padding: 40 }}>
    <DatePicker
      today="2026-10-17"
      label="Due date"
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    />
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

  it("selects an ISO day, closes and updates the trigger", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Picker onValueChange={onValueChange} />);

    open(picker);
    clickCentreOf(picker, "date-day-2026-10-20");

    expect(onValueChange).toHaveBeenCalledWith("2026-10-20");
    expect(picker.renderer.findByTestId("date-picker-content")).toBeUndefined();
    expect(picker.renderer.getAllText()).toContain("20 October 2026");
    expect(picker.renderer.getAllText()).not.toContain("Pick a date");

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

    expect(picker.renderer.findByTestId("date-picker-content")).toBeUndefined();

    picker.unmount();
  });
});
