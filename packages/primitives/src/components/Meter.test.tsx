/**
 * `Meter` — a measurement in a range, not a task's progress.
 *
 * The bug to guard is the one that made this a separate component: a value
 * outside its range must clamp instead of painting outside the track, and the
 * announced value must be the measurement (not the percentage the fill uses).
 * A meter is status, so it must also never become a tab stop or take a handler.
 * The parts suite guards that a label or value part cannot drift from the
 * clamped measurement the fill paints.
 */

import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  meterPart,
  MeterIndicator,
  MeterTrack,
  renderMeter,
  renderMeterLabel,
  renderMeterValue,
} from "./Meter.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostProp,
  hostStyleString,
  hostTag,
} from "./testing/element.js";

const stringIn = (element: ReactElement, name: string): string =>
  expectSome(hostStyleString(element, name));

/**
 * The first painted element: a context provider draws nothing, so the root's
 * body is one level in before the default composition's track.
 */
const bodyOf = (element: ReactElement): ReactElement => {
  const child =
    elementChildren(element)[0] ?? expect.fail("the meter drew nothing");
  return Option.isSome(hostTag(child))
    ? child
    : (elementChildren(child)[0] ?? expect.fail("the meter has no body"));
};

/** The bar's background — the default composition's only body. */
const trackOf = bodyOf;

/** The fill inside the default track. */
const fillOf = (element: ReactElement): ReactElement =>
  elementChildren(trackOf(element))[0] ?? expect.fail("the track has no fill");

/** A text part's children, as React handed them to the host. */
const textOf = (element: ReactElement): string =>
  Option.getOrElse(
    Option.flatMap(elementProp(element, "children"), (children) =>
      Schema.decodeUnknownOption(Schema.String)(children),
    ),
    () => expect.fail("the part carried no text"),
  );

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
    expect(stringIn(fillOf(element), "width")).toBe("50%");
    expect(stringIn(trackOf(element), "backgroundColor")).toBe(
      testTheme.colors.muted,
    );
  });

  it("clamps a measurement outside its range instead of painting past the end", () => {
    const element = renderMeter({ value: 75, min: 0, max: 50 }, testTheme);
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("50");
    expect(stringIn(fillOf(element), "width")).toBe("100%");
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

  it("gives the value part the measurement the fill paints", () => {
    const part = meterPart(
      { value: 75, min: 0, max: 50, formatValue: (value) => `${value} GB` },
      testTheme,
    );
    expect(textOf(renderMeterValue({}, part))).toBe("50 GB");
    // The fraction is the clamped measurement's place, not the raw value's.
    expect(part.fraction).toBe(1);
  });

  it("shows the label in a label part, or the caller's own text", () => {
    const part = meterPart({ value: 68, label: "Disk usage" }, testTheme);
    expect(textOf(renderMeterLabel({}, part))).toBe("Disk usage");
    expect(textOf(renderMeterLabel({ children: "Memory" }, part))).toBe(
      "Memory",
    );
  });

  it("keeps the default composition to the track and its indicator", () => {
    const element = renderMeter({ value: 68 }, testTheme);
    const track = trackOf(element);
    expect(hostTag(track)).toStrictEqual(Option.some("div"));
    expect(elementChildren(track)).toHaveLength(1);
    // Root → provider → track: no value part is drawn for the caller; the
    // announced measurement lives on the root.
    const provider =
      elementChildren(element)[0] ?? expect.fail("the meter drew nothing");
    expect(elementChildren(provider)).toHaveLength(1);
  });

  it("lets a caller replace the composition with the parts", () => {
    const element = renderMeter(
      {
        value: 25,
        children: (
          <MeterTrack>
            <MeterIndicator />
          </MeterTrack>
        ),
      },
      testTheme,
    );
    const provider =
      elementChildren(element)[0] ?? expect.fail("the meter drew nothing");
    const track = elementChildren(provider)[0];
    expect(track?.type).toBe(MeterTrack);
    expect(
      elementChildren(
        track ?? expect.fail("the caller's track went missing"),
      )[0]?.type,
    ).toBe(MeterIndicator);
  });

  it("keeps the caller's style on the root frame and the bar's paint on the track", () => {
    const element = renderMeter(
      { value: 68, style: { width: "80%" } },
      testTheme,
    );
    expect(hostStyleString(element, "flexDirection")).toStrictEqual(
      Option.some("column"),
    );
    expect(hostStyleString(element, "width")).toStrictEqual(Option.some("80%"));
    expect(stringIn(trackOf(element), "backgroundColor")).toBe(
      testTheme.colors.muted,
    );
  });
});
