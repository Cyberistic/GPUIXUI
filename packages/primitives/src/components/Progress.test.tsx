import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { storedNumber } from "../core/stored.js";
import { PROGRESS_TONES, type ProgressTone } from "../core/style.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  progressPart,
  ProgressIndicator,
  ProgressTrack,
  renderProgress,
  renderProgressLabel,
  renderProgressValue,
  type ProgressProps,
} from "./Progress.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostProp,
  hostStyle,
  hostStyleString,
  hostTag,
} from "./testing/element.js";

const bar = (value: Option.Option<number>) =>
  renderProgress(
    Option.match(value, {
      onNone: () => ({}),
      onSome: (size) => ({ value: size }),
    }),
    testTheme,
    0,
  );

const bodyOf = (element: ReactElement): ReactElement => {
  const child =
    elementChildren(element)[0] ?? expect.fail("the progress drew nothing");
  return Option.isSome(hostTag(child))
    ? child
    : (elementChildren(child)[0] ?? expect.fail("the progress has no body"));
};

const trackOf = bodyOf;

const fillOf = (element: ReactElement) =>
  elementChildren(trackOf(element))[0] ??
  expect.fail("the track has no indicator");

const textOf = (element: ReactElement | null): string =>
  Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(element), (host) =>
      Option.flatMap(elementProp(host, "children"), (children) =>
        Schema.decodeUnknownOption(Schema.String)(children),
      ),
    ),
    () => expect.fail("the part carried no text"),
  );

const announced = (element: ReactElement): string =>
  expectSome(
    Option.flatMap(hostProp(element, "aria-valuetext"), (value) =>
      Schema.decodeUnknownOption(Schema.String)(value),
    ),
  );

describe("Progress", () => {
  it("keeps the bar's height when its size name is one the scale does not carry", () => {
    const stored = renderProgress(
      { value: 40, size: "xl" as "md" },
      testTheme,
      0,
    );
    const fallback = renderProgress({ value: 40, size: "md" }, testTheme, 0);
    expect(expectSome(hostStyle(trackOf(stored), "height"))).toStrictEqual(
      expectSome(hostStyle(trackOf(fallback), "height")),
    );
    expect(expectSome(hostStyle(trackOf(stored), "height"))).toBe(
      testTheme.spacing.sm,
    );
  });

  it("paints the fill when its tone name is one the table does not carry", () => {
    const stored = renderProgress(
      { value: 40, tone: "chart" as ProgressTone },
      testTheme,
      0,
    );
    const fallback = renderProgress(
      { value: 40, tone: "primary" },
      testTheme,
      0,
    );
    expect(expectSome(hostStyleString(fillOf(stored), "backgroundColor"))).toBe(
      expectSome(hostStyleString(fillOf(fallback), "backgroundColor")),
    );
    expect(expectSome(hostStyleString(fillOf(stored), "backgroundColor"))).toBe(
      testTheme.colors.primary,
    );
  });

  it("clamps a value past the end instead of painting outside the track", () => {
    const element = bar(Option.some(140));
    expect(expectSome(hostProp(element, "role"))).toBe("progressbar");
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("100%");
  });

  it("treats a negative value as empty", () => {
    expect(expectSome(hostProp(bar(Option.some(-5)), "aria-valuetext"))).toBe(
      "0%",
    );
  });

  it("announces an indeterminate bar as loading rather than as 0%", () => {
    const element = bar(Option.none());
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("loading");
  });

  it("reads a stored value of null as indeterminate, not as a bar at zero", () => {
    const stored = { value: null } as unknown as ProgressProps;
    const element = renderProgress(stored, testTheme, 0);
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("loading");

    expect(elementChildren(trackOf(element))).toHaveLength(2);
    expect(progressPart(stored, testTheme, 0).determinate).toBe(false);
    expect(progressPart(stored, testTheme, 0).bufferPercent).toBe(undefined);

    expect(announced(renderProgress({ value: 0 }, testTheme, 0))).toBe("0%");
  });

  it("reads a stored share it cannot read as absence, not as NaN%", () => {
    const stored = { value: "half" } as unknown as ProgressProps;
    const element = renderProgress(stored, testTheme, 0);
    expect(announced(element)).toBe("loading");
    expect(progressPart(stored, testTheme, 0).determinate).toBe(false);
    expect(progressPart(stored, testTheme, 0).percent).toBe(0);
    expect(storedNumber(stored.value)).toStrictEqual(Option.none());

    expect(elementChildren(trackOf(element))).toHaveLength(2);

    expect(
      announced(
        renderProgress(
          { value: "42" } as unknown as ProgressProps,
          testTheme,
          0,
        ),
      ),
    ).toBe("loading");

    expect(announced(renderProgress({ value: 40 }, testTheme, 0))).toBe("40%");
    expect(announced(renderProgress({ value: Number.NaN }, testTheme, 0))).toBe(
      "0%",
    );
    const buffered = progressPart(
      { value: 40, buffer: "70" } as unknown as ProgressProps,
      testTheme,
      0,
    );
    expect(buffered.determinate).toBe(true);
    expect(buffered.percent).toBe(40);
    expect(buffered.bufferPercent).toBeUndefined();
    expect(
      elementChildren(trackOf(renderProgress({ value: 40 }, testTheme, 0))),
    ).toHaveLength(1);

    expect(storedNumber(42)).toStrictEqual(Option.some(42));
    expect(storedNumber(null)).toStrictEqual(Option.none());
  });

  it("says the value in the caller's words, in the announcement and the part", () => {
    const props = {
      value: 42,
      label: "Uploading",
      formatValue: (percent: number) => `${percent}% uploaded`,
    };
    const element = renderProgress(props, testTheme, 0);
    expect(announced(element)).toBe("42% uploaded");
    expect(
      textOf(renderProgressValue({}, progressPart(props, testTheme, 0))),
    ).toBe("42% uploaded");

    expect(announced(bar(Option.some(42)))).toBe("42%");
  });

  it("keeps its own words for a formatter that says nothing", () => {
    const empty = (): string => "";
    const props = { value: 42, formatValue: empty };
    expect(announced(renderProgress(props, testTheme, 0))).toBe("42%");
    expect(
      textOf(renderProgressValue({}, progressPart(props, testTheme, 0))),
    ).toBe("42%");
    expect(
      announced(
        renderProgress({ value: 42, formatValue: () => "   " }, testTheme, 0),
      ),
    ).toBe("42%");
    expect(
      announced(
        renderProgress({ value: 42, formatValue: empty }, testTheme, 0),
      ),
    ).toBe("42%");
    expect(announced(renderProgress({ loadingText: "  " }, testTheme, 0))).toBe(
      "loading",
    );

    expect(
      announced(
        renderProgress(
          { value: 42, formatValue: () => " nearly half " },
          testTheme,
          0,
        ),
      ),
    ).toBe("nearly half");
  });

  it("hands the formatter the clamped percentage, not the raw prop", () => {
    const said = (value: number): string =>
      announced(
        renderProgress(
          { value, formatValue: (percent) => `${percent} percent` },
          testTheme,
          0,
        ),
      );
    expect(said(250)).toBe("100 percent");
    expect(said(-5)).toBe("0 percent");
    expect(said(42)).toBe("42 percent");
  });

  it("names the indeterminate state in the caller's word", () => {
    const props = { label: "Uploading", loadingText: "Chargement" };
    const element = renderProgress(props, testTheme, 0);
    expect(announced(element)).toBe("Chargement");
    expect(
      textOf(renderProgressValue({}, progressPart(props, testTheme, 0))),
    ).toBe("Chargement");

    expect(
      announced(renderProgress({ ...props, value: 42 }, testTheme, 0)),
    ).toBe("42%");
  });

  it("paints the held-ahead buffer in the segment between value and buffer", () => {
    const element = renderProgress({ value: 40, buffer: 70 }, testTheme, 0);
    const children = elementChildren(trackOf(element));
    expect(children).toHaveLength(2);
    expect(
      expectSome(
        hostStyleString(children[0] ?? expect.fail("no fill"), "width"),
      ),
    ).toBe("40%");
    const held = children[1] ?? expect.fail("no buffer segment");
    expect(expectSome(hostStyleString(held, "width"))).toBe("30%");
    expect(expectSome(hostStyleString(held, "backgroundColor"))).toBe(
      testTheme.colors.mutedForeground,
    );
  });

  it("paints the buffer in a role its tone's fill does not already use", () => {
    const segmentsOf = (
      tone: ProgressTone,
    ): { readonly fill: ReactElement; readonly buffer: ReactElement } => {
      const children = elementChildren(
        trackOf(renderProgress({ value: 20, buffer: 80, tone }, testTheme, 0)),
      );
      return {
        fill: children[0] ?? expect.fail("no fill"),
        buffer: children[1] ?? expect.fail("no buffer"),
      };
    };
    const colourOf = (element: ReactElement): string =>
      expectSome(hostStyleString(element, "backgroundColor"));
    Arr.forEach(PROGRESS_TONES, (tone) => {
      const segments = segmentsOf(tone);
      expect(colourOf(segments.buffer), tone).not.toBe(colourOf(segments.fill));
    });
    expect(colourOf(segmentsOf("muted").fill)).toBe(
      testTheme.colors.mutedForeground,
    );
    expect(colourOf(segmentsOf("muted").buffer)).toBe(
      testTheme.colors.borderStrong,
    );

    Arr.forEach(["primary", "success", "destructive"] as const, (tone) => {
      expect(colourOf(segmentsOf(tone).buffer), tone).toBe(
        testTheme.colors.mutedForeground,
      );
    });
  });

  it("keeps the buffer clamped, ahead of the value, and out of an indeterminate bar", () => {
    const bufferOf = (props: {
      readonly value?: number;
      readonly buffer: number;
    }): Option.Option<ReactElement> =>
      Option.fromNullishOr(
        elementChildren(trackOf(renderProgress(props, testTheme, 0)))[1],
      );
    const widthOf = (props: {
      readonly value?: number;
      readonly buffer: number;
    }): Option.Option<string> =>
      Option.flatMap(bufferOf(props), (element) =>
        hostStyleString(element, "width"),
      );

    expect(widthOf({ value: 40, buffer: 250 })).toStrictEqual(
      Option.some("60%"),
    );

    expect(widthOf({ value: 70, buffer: 40 })).toStrictEqual(Option.none());

    expect(progressPart({ buffer: 70 }, testTheme, 0).bufferPercent).toBe(
      undefined,
    );

    expect(widthOf({ value: 40, buffer: Number.NaN })).toStrictEqual(
      Option.none(),
    );
  });

  it("has no aria-valuenow to read, so the value text is the only report", () => {
    const element = bar(Option.some(42));
    expect(hostProp(element, "aria-valuenow")).toStrictEqual(Option.none());
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("42%");
  });

  it("paints the fill at the clamped percentage of the track", () => {
    const widthAt = (value: number): string =>
      expectSome(hostStyleString(fillOf(bar(Option.some(value))), "width"));
    expect(widthAt(42)).toBe("42%");
    expect(widthAt(250)).toBe("100%");
    expect(widthAt(-5)).toBe("0%");
    expect(widthAt(Number.NaN)).toBe("0%");
  });

  it("gives the value part the same clamp the fill paints", () => {
    const valueText = (value: number): string =>
      textOf(renderProgressValue({}, progressPart({ value }, testTheme, 0)));
    expect(valueText(42)).toBe("42%");
    expect(valueText(250)).toBe("100%");
    expect(valueText(-5)).toBe("0%");
    expect(valueText(Number.NaN)).toBe("0%");

    expect(valueText(250)).toBe(
      expectSome(hostStyleString(fillOf(bar(Option.some(250))), "width")),
    );
  });

  it("reads the loading state, not a percentage, on an indeterminate value part", () => {
    const element = renderProgressValue({}, progressPart({}, testTheme, 0));
    expect(textOf(element)).toBe("loading");
  });

  it("shows the label in a label part, or the caller's own text", () => {
    const part = progressPart({ value: 42, label: "Uploading" }, testTheme, 0);
    expect(textOf(renderProgressLabel({}, part))).toBe("Uploading");
    expect(textOf(renderProgressLabel({ children: "Saving" }, part))).toBe(
      "Saving",
    );
  });

  it("paints no label line for a label that arrived blank", () => {
    const part = progressPart({ value: 42, label: "   " }, testTheme, 0);
    expect(renderProgressLabel({}, part)).toBeNull();
    expect(textOf(renderProgressLabel({ children: "Saving" }, part))).toBe(
      "Saving",
    );
  });

  it("keeps the stored label for a child that says nothing", () => {
    const named = progressPart({ value: 42, label: "Uploading" }, testTheme, 0);
    expect(textOf(renderProgressLabel({ children: "" }, named))).toBe(
      "Uploading",
    );
    expect(textOf(renderProgressLabel({ children: "   " }, named))).toBe(
      "Uploading",
    );

    const unnamed = progressPart({ value: 42, label: "  " }, testTheme, 0);
    expect(renderProgressLabel({ children: "   " }, unnamed)).toBeNull();

    expect(textOf(renderProgressLabel({ children: "  Saving  " }, named))).toBe(
      "  Saving  ",
    );
  });

  it("lays the bar's segments in a row", () => {
    const track = trackOf(bar(Option.some(42)));
    expect(expectSome(hostStyleString(track, "display"))).toBe("flex");
    expect(expectSome(hostStyleString(track, "flexDirection"))).toBe("row");
  });

  it("lets a caller's className restyle the frame", () => {
    const element = renderProgress(
      { value: 42, className: "flex-row" },
      testTheme,
      0,
    );
    expect(expectSome(hostStyleString(element, "flexDirection"))).toBe("row");
  });

  it("keeps the default composition to the track and its indicator", () => {
    const element = bar(Option.some(42));
    const track = trackOf(element);
    expect(expectSome(hostTag(track))).toBe("div");
    expect(hostStyleString(track, "backgroundColor")).toStrictEqual(
      Option.some(testTheme.colors.muted),
    );

    expect(elementChildren(track)).toHaveLength(1);

    const provider =
      elementChildren(element)[0] ?? expect.fail("the progress drew nothing");
    expect(elementChildren(provider)).toHaveLength(1);
  });

  it("draws a lead segment before the indicator while indeterminate", () => {
    const element = bar(Option.none());
    const track = trackOf(element);
    expect(elementChildren(track)).toHaveLength(2);
    const leadWidth = (step: number): string =>
      expectSome(
        hostStyleString(
          elementChildren(trackOf(renderProgress({}, testTheme, step)))[0] ??
            expect.fail("no lead"),
          "width",
        ),
      );
    expect(leadWidth(0)).not.toBe(leadWidth(1));
  });

  it("holds the moving segment when the reader asked for less motion", () => {
    const leadWidth = (step: number, reducedMotion?: boolean): string =>
      expectSome(
        hostStyleString(
          elementChildren(
            trackOf(renderProgress({ reducedMotion }, testTheme, step)),
          )[0] ?? expect.fail("no lead"),
          "width",
        ),
      );
    expect(leadWidth(0, true)).toBe(leadWidth(0));
    expect(leadWidth(3, true)).toBe(leadWidth(0));
    expect(leadWidth(7, true)).toBe(leadWidth(0));
    expect(leadWidth(3)).not.toBe(leadWidth(0));
  });

  it("paints its tone on the fill, determinate or not", () => {
    const determinate = renderProgress(
      { value: 42, tone: "success" },
      testTheme,
      0,
    );
    expect(
      expectSome(hostStyleString(fillOf(determinate), "backgroundColor")),
    ).toBe(testTheme.colors.success);
    const indeterminate = renderProgress({ tone: "success" }, testTheme, 0);

    const fill =
      elementChildren(trackOf(indeterminate))[1] ??
      expect.fail("the indeterminate bar painted no fill");
    expect(expectSome(hostStyleString(fill, "backgroundColor"))).toBe(
      testTheme.colors.success,
    );
  });

  it("lets a caller replace the composition with the parts", () => {
    const element = renderProgress(
      {
        value: 50,
        children: (
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        ),
      },
      testTheme,
      0,
    );
    const provider =
      elementChildren(element)[0] ?? expect.fail("the progress drew nothing");
    const track = elementChildren(provider)[0];
    expect(track?.type).toBe(ProgressTrack);
    const indicator = elementChildren(
      track ?? expect.fail("the caller's track went missing"),
    )[0];
    expect(indicator?.type).toBe(ProgressIndicator);
  });

  it("keeps the caller's style on the root frame and the bar's paint on the track", () => {
    const element = renderProgress(
      { value: 42, style: { width: "80%" } },
      testTheme,
      0,
    );
    expect(hostStyleString(element, "flexDirection")).toStrictEqual(
      Option.some("column"),
    );

    expect(hostStyleString(element, "width")).toStrictEqual(Option.some("80%"));
    expect(hostStyleString(trackOf(element), "backgroundColor")).toStrictEqual(
      Option.some(testTheme.colors.muted),
    );
  });
});
