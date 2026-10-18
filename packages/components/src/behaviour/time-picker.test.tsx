/**
 * TimePicker behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: typing that never reached `onValueChange`; an hour typed
 * without a value on the minute side; text and value disagreeing after an
 * out-of-range digit; arrow keys that stopped at the hour or at midnight; blur
 * that left a one-digit segment; a clear control on an empty or non-clearable
 * field, or one that fired on Space key down instead of release; and a
 * controlled field that changed itself when the consumer said no.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import {
  TimePicker,
  TimePickerClear,
  TimePickerSegment,
  TimePickerSeparator,
} from "../time-picker.js";

const Time = ({
  value,
  defaultValue,
  onValueChange,
  minuteStep,
  clearable,
  disabled,
  minutesFirst = false,
  showClear = true,
}: {
  readonly value?: string | null;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string | null) => void;
  readonly minuteStep?: number;
  readonly clearable?: boolean;
  readonly disabled?: boolean;
  readonly minutesFirst?: boolean;
  readonly showClear?: boolean;
}) => (
  <div style={{ width: 360, padding: 40 }}>
    <TimePicker
      testId="time"
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      minuteStep={minuteStep}
      clearable={clearable}
      disabled={disabled}
    >
      {minutesFirst ? (
        <>
          <TimePickerSegment segment="minutes" />
          <TimePickerSeparator />
          <TimePickerSegment segment="hours" />
        </>
      ) : (
        <>
          <TimePickerSegment segment="hours" />
          <TimePickerSeparator />
          <TimePickerSegment segment="minutes" />
        </>
      )}
      {showClear ? <TimePickerClear /> : null}
    </TimePicker>
  </div>
);

/** Focus a segment, then send each character as a real key press. */
const typeIn = (
  root: ComponentTestRoot,
  segment: "hours" | "minutes",
  text: string,
): void => {
  const input = root.renderer.findByTestId(`time-${segment}`);
  root.renderer.focusElement(input?.id ?? -1);
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

const segmentValue = (
  root: ComponentTestRoot,
  segment: "hours" | "minutes",
): unknown => root.renderer.findByTestId(`time-${segment}`)?.customProps?.value;

describe("TimePicker", () => {
  it("reports a canonical time from typed hour digits", () => {
    const onValueChange = vi.fn();
    const time = renderComponent(<Time onValueChange={onValueChange} />);

    expect(time.renderer.findByTestId("time")?.customProps).toMatchObject({
      role: "group",
      "aria-label": "Time",
    });

    typeIn(time, "hours", "09");

    expect(onValueChange.mock.calls.at(-1)).toEqual(["09:00"]);
    expect(segmentValue(time, "hours")).toBe("09");
    expect(segmentValue(time, "minutes")).toBe("");

    time.unmount();
  });

  it("completes the value from the minute segment", () => {
    const onValueChange = vi.fn();
    const time = renderComponent(<Time onValueChange={onValueChange} />);

    typeIn(time, "hours", "9");
    typeIn(time, "minutes", "45");

    expect(onValueChange.mock.calls.at(-1)).toEqual(["09:45"]);
    // Moving focus out of the hour segment padded it before the minutes were edited.
    expect(segmentValue(time, "hours")).toBe("09");
    expect(segmentValue(time, "minutes")).toBe("45");

    time.unmount();
  });

  it("clamps out-of-range digits in both the text and the value", () => {
    const onValueChange = vi.fn();
    const time = renderComponent(<Time onValueChange={onValueChange} />);

    typeIn(time, "hours", "99");

    expect(onValueChange.mock.calls.at(-1)).toEqual(["23:00"]);
    expect(segmentValue(time, "hours")).toBe("23");

    time.unmount();
  });

  it("carries and wraps through the arrow keys", () => {
    const carried = vi.fn();
    const first = renderComponent(
      <Time defaultValue="09:59" onValueChange={carried} />,
    );

    const minutes = first.renderer.findByTestId("time-minutes");
    first.renderer.focusElement(minutes?.id ?? -1);
    first.renderer.simulateKeystrokes("up");

    expect(carried.mock.calls.at(-1)).toEqual(["10:00"]);
    expect(segmentValue(first, "minutes")).toBe("00");
    first.unmount();

    const wrapped = vi.fn();
    const second = renderComponent(
      <Time defaultValue="00:30" onValueChange={wrapped} />,
    );

    const hours = second.renderer.findByTestId("time-hours");
    second.renderer.focusElement(hours?.id ?? -1);
    second.renderer.simulateKeystrokes("down");

    expect(wrapped.mock.calls.at(-1)).toEqual(["23:30"]);
    second.unmount();
  });

  it("moves minutes by minuteStep and hours by a whole hour", () => {
    const onValueChange = vi.fn();
    const time = renderComponent(
      <Time
        defaultValue="09:50"
        minuteStep={15}
        onValueChange={onValueChange}
      />,
    );

    const minutes = time.renderer.findByTestId("time-minutes");
    time.renderer.focusElement(minutes?.id ?? -1);
    time.renderer.simulateKeystrokes("up");
    expect(onValueChange.mock.calls.at(-1)).toEqual(["10:05"]);

    const hours = time.renderer.findByTestId("time-hours");
    time.renderer.focusElement(hours?.id ?? -1);
    time.renderer.simulateKeystrokes("up");
    expect(onValueChange.mock.calls.at(-1)).toEqual(["11:05"]);

    time.unmount();
  });

  it("pads both segments when focus leaves the field", () => {
    const time = renderComponent(<Time />);

    typeIn(time, "hours", "9");
    expect(segmentValue(time, "hours")).toBe("9");

    const minutes = time.renderer.findByTestId("time-minutes");
    time.renderer.focusElement(minutes?.id ?? -1);

    expect(segmentValue(time, "hours")).toBe("09");
    expect(segmentValue(time, "minutes")).toBe("00");

    time.unmount();
  });

  it("offers clear only when asked for and only with a value", () => {
    const onValueChange = vi.fn();
    const filled = renderComponent(
      <Time defaultValue="09:30" clearable onValueChange={onValueChange} />,
    );

    expect(filled.renderer.findByType("svg")).toHaveLength(1);

    clickCentreOf(filled, "time-clear");

    expect(onValueChange.mock.calls.at(-1)).toEqual([null]);
    expect(segmentValue(filled, "hours")).toBe("");
    expect(segmentValue(filled, "minutes")).toBe("");
    expect(focusedTestId(filled)).toEqual(Option.some("time-hours"));
    filled.unmount();

    const empty = renderComponent(<Time clearable />);
    expect(empty.renderer.findByTestId("time-clear")).toBeUndefined();
    empty.unmount();

    const plain = renderComponent(<Time defaultValue="09:30" />);
    expect(plain.renderer.findByTestId("time-clear")).toBeUndefined();
    plain.unmount();

    const disabled = renderComponent(
      <Time defaultValue="09:30" clearable disabled />,
    );
    expect(disabled.renderer.findByTestId("time-clear")).toBeUndefined();
    expect(
      disabled.renderer.findByTestId("time-hours")?.customProps?.readOnly,
    ).toBe(true);
    disabled.unmount();
  });

  it("clears from the keyboard on Space release", () => {
    const onValueChange = vi.fn();
    const time = renderComponent(
      <Time defaultValue="09:30" clearable onValueChange={onValueChange} />,
    );
    const clearControl = time.renderer.findByTestId("time-clear");
    expect(clearControl).toBeDefined();
    if (clearControl === undefined) return;

    time.renderer.nativeSimulateKeyDown(clearControl.id, "space");
    expect(onValueChange).not.toHaveBeenCalled();

    time.renderer.nativeSimulateKeyUp(clearControl.id, "space");
    expect(onValueChange.mock.calls.at(-1)).toEqual([null]);

    time.unmount();
  });

  it("keeps a controlled field where the consumer put it", () => {
    const onValueChange = vi.fn();
    const time = renderComponent(
      <Time value="09:00" onValueChange={onValueChange} />,
    );

    typeIn(time, "hours", "3");

    expect(onValueChange.mock.calls.at(-1)).toEqual(["23:00"]);
    // The consumer did not adopt the value, so the display went back to 09.
    expect(segmentValue(time, "hours")).toBe("09");

    time.unmount();
  });

  it("lays the segments out where the caller put them", () => {
    const onValueChange = vi.fn();
    const time = renderComponent(
      <Time minutesFirst onValueChange={onValueChange} />,
    );

    const minutes = time.renderer.findByTestId("time-minutes");
    const hours = time.renderer.findByTestId("time-hours");
    const minuteBounds = time.renderer.getElementBounds(minutes?.id ?? -1);
    const hourBounds = time.renderer.getElementBounds(hours?.id ?? -1);

    expect(minuteBounds?.x).toBeLessThan(hourBounds?.x ?? 0);

    typeIn(time, "hours", "09");
    typeIn(time, "minutes", "30");

    expect(onValueChange.mock.calls.at(-1)).toEqual(["09:30"]);

    time.unmount();
  });

  it("renders no clear control when the part is not composed", () => {
    const time = renderComponent(
      <Time defaultValue="09:30" clearable showClear={false} />,
    );

    expect(time.renderer.findByTestId("time-clear")).toBeUndefined();

    time.unmount();
  });
});
