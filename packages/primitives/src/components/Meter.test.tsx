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
    // A blank label is absent and a padded one is trimmed (plan 026).
    expect(
      hostProp(
        renderMeter({ value: 1, label: "   " }, testTheme),
        "aria-label",
      ),
    ).toStrictEqual(Option.none());
    expect(
      expectSome(
        hostProp(
          renderMeter({ value: 1, label: "  Disk usage  " }, testTheme),
          "aria-label",
        ),
      ),
    ).toBe("Disk usage");
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

  it("clamps an infinite measurement to its own end of the range", () => {
    // The bug guarded (plan 637): the shared clamp read `+Infinity` as the
    // minimum, so a meter promised "full" announced `"0"` and painted `0%`,
    // while `Progress` painted the same value as `100%`.
    const high = renderMeter(
      { value: Number.POSITIVE_INFINITY, label: "Disk" },
      testTheme,
    );
    expect(expectSome(hostProp(high, "aria-valuetext"))).toBe("100");
    const highFill =
      elementChildren(high)[0] ?? expect.fail("the meter has no fill");
    expect(stringIn(highFill, "width")).toBe("100%");

    const low = renderMeter(
      { value: Number.NEGATIVE_INFINITY, label: "Disk" },
      testTheme,
    );
    expect(expectSome(hostProp(low, "aria-valuetext"))).toBe("0");
    const lowFill =
      elementChildren(low)[0] ?? expect.fail("the meter has no fill");
    expect(stringIn(lowFill, "width")).toBe("0%");
  });

  it("announces a formatted measurement when given one", () => {
    const element = renderMeter(
      { value: 12, max: 16, formatValue: (value) => `${value} of 16` },
      testTheme,
    );
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("12 of 16");
  });

  it("falls back to the value when the formatter says nothing", () => {
    // The bug guarded (plan 580): a formatter returning only whitespace erased
    // the announced measurement, so the meter had no value text at all even
    // though its documented default is `String(value)` (the plan-026 rule).
    const element = renderMeter(
      { value: 12, formatValue: () => "   " },
      testTheme,
    );
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("12");
  });

  it("is status, so it is never a tab stop and never takes a handler", () => {
    const element = renderMeter({ value: 10 }, testTheme);
    expect(hostProp(element, "tabIndex")).toStrictEqual(Option.none());
    expect(hostProp(element, "onClick")).toStrictEqual(Option.none());
    expect(hostProp(element, "onKeyDown")).toStrictEqual(Option.none());
  });
});
