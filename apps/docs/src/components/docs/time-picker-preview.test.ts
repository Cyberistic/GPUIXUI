import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  addMinutes,
  clearTime,
  composeValue,
  describeValue,
  digitsOf,
  editSegment,
  emptyTime,
  formatTime,
  hasTime,
  normalizeStep,
  padOnBlur,
  parseTime,
  segmentText,
  stepSegment,
  timeText,
  type TimeState,
} from "./time-picker-preview";

/**
 * The Time picker preview's clock.
 *
 * A preview field is only honest if it is the field the component paints: two
 * segments, the last two typed digits, an immediate clamp above the segment's
 * maximum, a value composed from one typed segment with the other read as zero,
 * a blur that pads both, and one clock behind the arrows that carries at the
 * hour and wraps at midnight. The first cases pin that model; the last reads the
 * native clock, the painter and the preview style sheet, so a moved constant
 * cannot leave the drawing teaching the previous control.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const nativeClock = read(
  "../../../../../packages/components/src/time-picker/time.ts",
);

const nativePicker = read(
  "../../../../../packages/components/src/time-picker.tsx",
);

/** The declarations of the first `selector { … }` block in a style sheet. */
const block = (css: string, selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

describe("the clock", () => {
  it("carries at the hour and wraps across midnight in both directions", () => {
    expect(addMinutes({ hours: 9, minutes: 59 }, 1)).toEqual({
      hours: 10,
      minutes: 0,
    });
    expect(addMinutes({ hours: 10, minutes: 0 }, -1)).toEqual({
      hours: 9,
      minutes: 59,
    });
    expect(addMinutes({ hours: 23, minutes: 59 }, 1)).toEqual({
      hours: 0,
      minutes: 0,
    });
    expect(addMinutes({ hours: 0, minutes: 0 }, -1)).toEqual({
      hours: 23,
      minutes: 59,
    });
    // A whole day is the same time of day, in either direction.
    expect(addMinutes({ hours: 9, minutes: 30 }, 1440)).toEqual({
      hours: 9,
      minutes: 30,
    });
    expect(addMinutes({ hours: 9, minutes: 30 }, -1440)).toEqual({
      hours: 9,
      minutes: 30,
    });
    // The native clock is the same modulus, not a second implementation.
    expect(nativeClock).toContain("% 1440");
    expect(nativeClock).toContain("+ 1440) % 1440");
  });

  it("round-trips every minute of the day", () => {
    const minutes = Array.from({ length: 1440 }, (_, minute) => ({
      hours: Math.floor(minute / 60),
      minutes: minute % 60,
    }));

    expect(minutes.length).toBe(1440);
    expect(
      minutes.filter(
        (time) => parseTime(formatTime(time))?.hours !== time.hours,
      ),
    ).toEqual([]);
    expect(
      minutes.filter(
        (time) => parseTime(formatTime(time))?.minutes !== time.minutes,
      ),
    ).toEqual([]);
    // The formatted text is canonical: two digits, no shorthand.
    expect(minutes.map((time) => formatTime(time).length)).toEqual(
      Array.from({ length: 1440 }, () => 5),
    );
    expect(formatTime({ hours: 0, minutes: 7 })).toBe("00:07");
  });

  it("reads only a canonical value, never a lenient one", () => {
    expect(parseTime("23:59")).toEqual({ hours: 23, minutes: 59 });
    expect(parseTime("00:00")).toEqual({ hours: 0, minutes: 0 });
    expect(parseTime("9:30")).toBeNull();
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("12:60")).toBeNull();
    expect(parseTime("09:30:00")).toBeNull();
    expect(parseTime("not a time")).toBeNull();
    // A malformed controlled value paints an empty field, like the component.
    expect(timeText("9:30")).toEqual({ hours: "", minutes: "" });
    expect(segmentText("09:30", "hours")).toBe("09");
    expect(segmentText("09:30", "minutes")).toBe("30");
    expect(segmentText(null, "hours")).toBe("");
  });
});

describe("one edit", () => {
  const typed = (state: TimeState, text: string) =>
    editSegment(state, "hours", text);

  it("keeps the last two digits and clamps above the segment's maximum", () => {
    expect(digitsOf("9")).toBe("9");
    expect(digitsOf("129")).toBe("29");
    expect(digitsOf("09:30")).toBe("30");
    expect(digitsOf("a")).toBe("");

    const hours = typed(emptyTime(), "99");
    // The text clamps in the same edit, so the two cannot disagree.
    expect(hours.hours).toBe("23");
    expect(hours.value).toBe("23:00");
    const minutes = editSegment(emptyTime(), "minutes", "99");
    expect(minutes.minutes).toBe("59");
    expect(minutes.value).toBe("00:59");
  });

  it("completes the value from one typed segment and clears on an erased one", () => {
    const hours = typed(emptyTime(), "9");
    // The untouched segment shows no digits; the value reads it as zero.
    expect(hours).toEqual({ hours: "9", minutes: "", value: "09:00" });

    const both = editSegment(hours, "minutes", "30");
    expect(both).toEqual({ hours: "9", minutes: "30", value: "09:30" });

    // Erasing one segment clears the whole time, including the other segment.
    expect(editSegment(both, "minutes", "")).toEqual(emptyTime());
    expect(composeValue("", "")).toBeNull();
    expect(composeValue("", "30")).toBe("00:30");
    expect(composeValue("9", "")).toBe("09:00");
  });

  it("pads both segments on blur, and a blank one becomes zero", () => {
    const typedHours = padOnBlur({
      hours: "9",
      minutes: "",
      value: "09:00",
    });
    expect(typedHours).toEqual({ hours: "09", minutes: "00", value: "09:00" });
    // A padded value cannot move on a second blur.
    expect(padOnBlur(typedHours)).toEqual(typedHours);

    const empty = emptyTime();
    expect(padOnBlur(empty)).toEqual(empty);
  });

  it("clears to null and reports it, with no half-erased state", () => {
    const cleared = clearTime();

    expect(cleared).toEqual({ hours: "", minutes: "", value: null });
    expect(hasTime(cleared)).toBe(false);
    expect(describeValue(cleared.value)).toContain("null");
    expect(describeValue("09:30")).toBe("Value: 09:30");
  });
});

describe("the arrow keys", () => {
  it("step hours by a whole hour and minutes by the normalised step", () => {
    const set = { hours: "09", minutes: "30", value: "09:30" };

    expect(stepSegment(set, "hours", 1).value).toBe("10:30");
    expect(stepSegment(set, "hours", -1).value).toBe("08:30");
    expect(stepSegment(set, "minutes", 1).value).toBe("09:31");
    expect(stepSegment(set, "minutes", 1, 15).value).toBe("09:45");
    expect(stepSegment(set, "minutes", -1, 15).value).toBe("09:15");
    // Hours ignore the minute step: a whole hour, not 15 minutes.
    expect(stepSegment(set, "hours", 1, 15).value).toBe("10:30");
    // Padding happens inside the step, so the text is canonical after a key.
    expect(stepSegment(set, "minutes", 1)).toEqual({
      hours: "09",
      minutes: "31",
      value: "09:31",
    });
  });

  it("step from midnight when the field is empty, and wrap at both ends", () => {
    const empty = emptyTime();

    expect(stepSegment(empty, "minutes", 1).value).toBe("00:01");
    expect(stepSegment(empty, "hours", 1).value).toBe("01:00");
    expect(stepSegment(empty, "minutes", -1).value).toBe("23:59");
    expect(stepSegment(empty, "hours", -1).value).toBe("23:00");

    const last = { hours: "23", minutes: "59", value: "23:59" };
    expect(stepSegment(last, "minutes", 1).value).toBe("00:00");
    expect(stepSegment(last, "minutes", 1, 15).value).toBe("00:14");
  });

  it("normalises the minute step the way the native field does", () => {
    expect(normalizeStep(undefined)).toBe(1);
    expect(normalizeStep(Number.NaN)).toBe(1);
    expect(normalizeStep(Number.POSITIVE_INFINITY)).toBe(1);
    expect(normalizeStep(0)).toBe(1);
    expect(normalizeStep(-15)).toBe(1);
    expect(normalizeStep(1)).toBe(1);
    expect(normalizeStep(15)).toBe(15);
    expect(normalizeStep(15.9)).toBe(15);
    expect(normalizeStep(60)).toBe(59);
    // The native module owns the same rule; a change there must move here.
    expect(nativeClock).toContain(
      "Math.min(59, Math.max(1, Math.floor(step)))",
    );
  });
});

describe("the field the preview draws", () => {
  it("takes its fixed geometry from the painter and its height from the theme", () => {
    // A segment is 26px and the clear control is the shared 24px target around
    // the recipe's drawing; the field height is the density's `md` step, so the
    // platform switch must resize it.
    expect(nativePicker).toContain("const SEGMENT_WIDTH = 26;");
    expect(nativePicker).toContain("width: targetSize.minimum");
    expect(nativePicker).toContain("height: targetSize.minimum");
    expect(nativePicker).toContain('height: controlHeight(theme, "md")');

    const css = read("../../styles/demos.css");
    expect(block(css, ".gx-time-field")).toContain("var(--control-height-md)");
    expect(block(css, ".gx-time-field")).toContain("background: var(--input)");
    expect(block(css, ".gx-time-segment")).toContain("width: 26px");
    expect(block(css, ".gx-time-clear")).toContain("var(--target-size)");
    expect(block(css, ".gx-time-clear")).not.toContain("width: 18px");
  });

  it("mirrors the component's disabled field, which is read-only and unannounced", () => {
    // 0.11.0 publishes no `aria-disabled`, so the shipped control's disabled
    // state is `readOnly`, a dimmed field and removed tab stops. A preview that
    // greyed a disabled input instead would teach the wrong contract.
    expect(nativePicker).toContain("readOnly: disabled");
    expect(nativePicker).toContain("tabIndex: disabled ? -1 : 0");
    expect(nativePicker).toContain("opacity: disabled ? 0.5 : 1");
    expect(nativePicker).toContain("if (!clearable || !hasValue || disabled)");
  });
});
