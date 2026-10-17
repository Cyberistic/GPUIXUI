/**
 * `Meter` — a measurement in a range, not a task's progress.
 *
 * The bug to guard is the one that made this a separate component: a value
 * outside its range must clamp instead of painting outside the track, and the
 * announced value must be the measurement (not the percentage the fill uses).
 * A meter is status, so it must also never become a tab stop or take a handler.
 */

import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderMeter } from "./Meter.js";
import {
  elementChildren,
  expectSome,
  hostProp,
  hostStyleString,
  hostTag,
} from "./testing/element.js";

const stringIn = (element: ReactElement, name: string): string =>
  expectSome(hostStyleString(element, name));

describe("Meter", () => {
  it("is a named meter that announces the measurement", () => {
    const element = renderMeter({ value: 62, label: "Disk usage" }, testTheme);
    expect(expectSome(hostTag(element))).toBe("div");
    expect(expectSome(hostProp(element, "role"))).toBe("meter");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Disk usage");
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("62");
    expect(hostProp(element, "aria-valuenow")).toStrictEqual(Option.none());
  });

  it("fills by the value's place in the range, not by the raw value", () => {
    const element = renderMeter({ value: 25, min: 0, max: 50 }, testTheme);
    const fill =
      elementChildren(element)[0] ?? expect.fail("the meter has no fill");
    expect(stringIn(fill, "width")).toBe("50%");
    expect(stringIn(element, "backgroundColor")).toBe(testTheme.colors.muted);
  });

  it("clamps a measurement outside its range instead of painting past the end", () => {
    const element = renderMeter({ value: 75, min: 0, max: 50 }, testTheme);
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("50");
  });

  it("announces a formatted measurement when given one", () => {
    const element = renderMeter(
      { value: 12, max: 16, formatValue: (value) => `${value} of 16` },
      testTheme,
    );
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("12 of 16");
  });

  it("is status, so it is never a tab stop and never takes a handler", () => {
    const element = renderMeter({ value: 10 }, testTheme);
    expect(hostProp(element, "tabIndex")).toStrictEqual(Option.none());
    expect(hostProp(element, "onClick")).toStrictEqual(Option.none());
    expect(hostProp(element, "onKeyDown")).toStrictEqual(Option.none());
  });
});
