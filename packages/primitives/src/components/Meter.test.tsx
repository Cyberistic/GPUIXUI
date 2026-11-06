import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type { ProgressTone } from "../core/style.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  meterPart,
  MeterIndicator,
  MeterTrack,
  renderMeter,
  renderMeterLabel,
  renderMeterValue,
  type MeterProps,
} from "./Meter.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostProp,
  hostStyle,
  hostStyleString,
  hostTag,
} from "./testing/element.js";

const stringIn = (element: ReactElement, name: string): string =>
  expectSome(hostStyleString(element, name));

const bodyOf = (element: ReactElement): ReactElement => {
  const child =
    elementChildren(element)[0] ?? expect.fail("the meter drew nothing");
  return Option.isSome(hostTag(child))
    ? child
    : (elementChildren(child)[0] ?? expect.fail("the meter has no body"));
};

const trackOf = bodyOf;

const fillOf = (element: ReactElement): ReactElement =>
  elementChildren(trackOf(element))[0] ?? expect.fail("the track has no fill");

const textOf = (element: ReactElement | null): string =>
  Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(element), (host) =>
      Option.flatMap(elementProp(host, "children"), (children) =>
        Schema.decodeUnknownOption(Schema.String)(children),
      ),
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

  it("keeps the bar's height when its size name is one the scale does not carry", () => {
    const stored = renderMeter({ value: 62, size: "xl" as "md" }, testTheme);
    const fallback = renderMeter({ value: 62, size: "md" }, testTheme);
    expect(expectSome(hostStyle(trackOf(stored), "height"))).toStrictEqual(
      expectSome(hostStyle(trackOf(fallback), "height")),
    );
    expect(expectSome(hostStyle(trackOf(stored), "height"))).toBe(
      testTheme.spacing.sm,
    );
  });

  it("reads a saved bound it cannot read as the documented range", () => {
    const stored = renderMeter(
      { value: 62, max: "100" } as unknown as MeterProps,
      testTheme,
    );
    const fallback = renderMeter({ value: 62, max: 100 }, testTheme);
    expect(stringIn(fillOf(stored), "width")).toBe(
      stringIn(fillOf(fallback), "width"),
    );
    expect(stringIn(fillOf(stored), "width")).toBe("62%");
    expect(expectSome(hostProp(stored, "aria-valuetext"))).toBe("62");
  });

  it("paints the fill when its tone name is one the table does not carry", () => {
    const stored = renderMeter(
      { value: 62, tone: "chart" as ProgressTone },
      testTheme,
    );
    const fallback = renderMeter({ value: 62, tone: "primary" }, testTheme);
    expect(stringIn(fillOf(stored), "backgroundColor")).toBe(
      stringIn(fillOf(fallback), "backgroundColor"),
    );
    expect(stringIn(fillOf(stored), "backgroundColor")).toBe(
      testTheme.colors.primary,
    );
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

  it("keeps the measurement when a formatter says nothing", () => {
    const part = meterPart({ value: 62, formatValue: () => "" }, testTheme);
    const blank = renderMeter({ value: 62, formatValue: () => "" }, testTheme);
    expect(expectSome(hostProp(blank, "aria-valuetext"))).toBe("62");
    expect(textOf(renderMeterValue({}, part))).toBe("62");
    expect(part.valueText).toBe("62");

    expect(
      expectSome(
        hostProp(
          renderMeter({ value: 62, formatValue: () => " 62 GB " }, testTheme),
          "aria-valuetext",
        ),
      ),
    ).toBe("62 GB");
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

    expect(part.fraction).toBe(1);
  });

  it("shows the label in a label part, or the caller's own text", () => {
    const part = meterPart({ value: 68, label: "Disk usage" }, testTheme);
    expect(textOf(renderMeterLabel({}, part))).toBe("Disk usage");
    expect(textOf(renderMeterLabel({ children: "Memory" }, part))).toBe(
      "Memory",
    );
  });

  it("paints no label line for a label that arrived blank", () => {
    const part = meterPart({ value: 68, label: "   " }, testTheme);
    expect(renderMeterLabel({}, part)).toBeNull();
    expect(textOf(renderMeterLabel({ children: "Memory" }, part))).toBe(
      "Memory",
    );
  });

  it("keeps the stored label for a child that says nothing", () => {
    const named = meterPart({ value: 68, label: "Disk usage" }, testTheme);
    expect(textOf(renderMeterLabel({ children: "" }, named))).toBe(
      "Disk usage",
    );
    expect(textOf(renderMeterLabel({ children: "   " }, named))).toBe(
      "Disk usage",
    );

    const unnamed = meterPart({ value: 68, label: "  " }, testTheme);
    expect(renderMeterLabel({ children: "   " }, unnamed)).toBeNull();

    expect(textOf(renderMeterLabel({ children: "  Memory  " }, named))).toBe(
      "  Memory  ",
    );
  });

  it("lets a caller's className restyle the frame", () => {
    const element = renderMeter(
      { value: 62, className: "flex-row" },
      testTheme,
    );
    expect(stringIn(element, "flexDirection")).toBe("row");
  });

  it("keeps the default composition to the track and its indicator", () => {
    const element = renderMeter({ value: 68 }, testTheme);
    const track = trackOf(element);
    expect(hostTag(track)).toStrictEqual(Option.some("div"));
    expect(elementChildren(track)).toHaveLength(1);

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
