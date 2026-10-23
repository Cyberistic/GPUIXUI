/**
 * The selected surface's geometry.
 *
 * The bug this guards: the tab set used to paint the selected tab as a
 * background on that trigger, so "the selected surface" existed once per
 * trigger and only that draw call knew its box. The shared pill is placed from
 * measured boxes instead, and a wrong subtraction (rail box instead of the
 * absolute containing block, or a size copied from the rail) puts it off its
 * trigger.
 */

import type { EventPayload } from "@gpuix/react";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { measuredBox as seamMeasuredBox } from "../internal/measure.js";
import { indicatorBox, measuredBox, type TabBox } from "./indicator.js";

const event = (payload: Partial<EventPayload>): EventPayload => ({
  elementId: 1,
  eventType: "layout",
  ...payload,
});

/** The box, or the string `none` so a failing case prints something honest. */
const boxOrDefault = (measured: Option.Option<TabBox>): TabBox | "none" =>
  Option.match(measured, { onNone: () => "none", onSome: (box) => box });

const origin: TabBox = { x: 100, y: 50, width: 1, height: 1 };
const trigger: TabBox = { x: 137, y: 61, width: 88, height: 36 };

describe("measuredBox", () => {
  it("reads the four numbers a layout event carries", () => {
    expect(
      boxOrDefault(measuredBox(event({ x: 12, y: 34, width: 56, height: 78 }))),
    ).toEqual({ x: 12, y: 34, width: 56, height: 78 });
  });

  it("is None for an event that carries no box", () => {
    expect(
      Option.isNone(measuredBox(event({ eventType: "click", x: 12, y: 34 }))),
    ).toBe(true);
    expect(
      Option.isNone(measuredBox(event({ x: 12, y: 34, width: 56 }))),
      "a missing height is not a box",
    ).toBe(true);
  });

  it("is the seam's decoder, not a copy", () => {
    // The tab pill measured its own boxes with a second decoder shaped like the
    // seam's, so a rule the seam gained — a side it cannot paint is no box —
    // would have reached every measuring surface except this one.
    expect(measuredBox).toBe(seamMeasuredBox);
  });
});

describe("indicatorBox", () => {
  it("moves the trigger's box onto the containing block's origin", () => {
    expect(indicatorBox(origin, trigger)).toEqual({
      left: 37,
      top: 11,
      width: 88,
      height: 36,
    });
  });

  it("keeps the trigger's size rather than the rail's", () => {
    const box = indicatorBox(origin, trigger);

    expect(box.width).toBe(trigger.width);
    expect(box.width).not.toBe(origin.width);
    expect(box.height).toBe(trigger.height);
  });

  it("is position-independent: a rail and trigger that both moved agree", () => {
    const moved = { ...trigger, x: trigger.x + 240, y: trigger.y + 90 };

    expect(
      indicatorBox({ ...origin, x: origin.x + 240, y: origin.y + 90 }, moved),
    ).toEqual(indicatorBox(origin, trigger));
  });
});
