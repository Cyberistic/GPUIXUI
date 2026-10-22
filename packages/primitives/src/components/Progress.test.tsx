/**
 * `Progress` — the bar, its parts and its accessible value.
 *
 * GPUix has no `aria-valuenow` (see `docs/gpuix-capabilities.md`), so the value rides on
 * `aria-valuetext`. The bug to guard is paint outside the track: a value above
 * 100 or below 0 must clamp, and an indeterminate bar must not look finished.
 * The parts suite guards the second failure: the value a caller renders must be
 * the same clamped number the fill paints, and the default composition must
 * stay the track alone so an existing `<Progress value={42} />` does not grow
 * text it never asked for.
 */

import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  progressPart,
  ProgressIndicator,
  ProgressTrack,
  renderProgress,
  renderProgressLabel,
  renderProgressValue,
} from "./Progress.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostProp,
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

/**
 * The first painted element: a context provider draws nothing, so the root's
 * body is one level in before the default composition's track.
 */
const bodyOf = (element: ReactElement): ReactElement => {
  const child =
    elementChildren(element)[0] ?? expect.fail("the progress drew nothing");
  return Option.isSome(hostTag(child))
    ? child
    : (elementChildren(child)[0] ?? expect.fail("the progress has no body"));
};

/** The bar's background — the default composition's only body. */
const trackOf = bodyOf;

/** The fill inside the default track. */
const fillOf = (element: ReactElement) =>
  elementChildren(trackOf(element))[0] ??
  expect.fail("the track has no indicator");

/** A text part's children, as React handed them to the host. */
const textOf = (element: ReactElement): string =>
  Option.getOrElse(
    Option.flatMap(elementProp(element, "children"), (children) =>
      Schema.decodeUnknownOption(Schema.String)(children),
    ),
    () => expect.fail("the part carried no text"),
  );

describe("Progress", () => {
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

  it("paints the held-ahead buffer in the segment between value and buffer", () => {
    // The bug guarded: a bar reported only `value`, so a download that had
    // buffered further ahead painted as if nothing were held.
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
    // Past the end clamps to the bar's own end.
    expect(widthOf({ value: 40, buffer: 250 })).toStrictEqual(
      Option.some("60%"),
    );
    // Behind the value, there is no held segment left to paint.
    expect(widthOf({ value: 70, buffer: 40 })).toStrictEqual(Option.none());
    // A buffer is a place on the bar; an indeterminate bar has none.
    expect(progressPart({ buffer: 70 }, testTheme, 0).bufferPercent).toBe(
      undefined,
    );
    // An unreadable buffer is empty, like an unreadable value.
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
    // A value part that read the raw prop would print "250%".
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

  it("lays the bar's segments in a row", () => {
    // The bug guarded: the track was a block, so the indeterminate lead and the
    // fill stacked — the moving fill never left the start of the bar and every
    // segment after the first was clipped below it.
    const track = trackOf(bar(Option.some(42)));
    expect(expectSome(hostStyleString(track, "display"))).toBe("flex");
    expect(expectSome(hostStyleString(track, "flexDirection"))).toBe("row");
  });

  it("keeps the default composition to the track and its indicator", () => {
    const element = bar(Option.some(42));
    const track = trackOf(element);
    expect(expectSome(hostTag(track))).toBe("div");
    expect(hostStyleString(track, "backgroundColor")).toStrictEqual(
      Option.some(testTheme.colors.muted),
    );
    // One child: an indeterminate bar adds a second moving segment, and no
    // composition carries a value part unless the caller asks for one.
    expect(elementChildren(track)).toHaveLength(1);
    // Root → provider → track: the default body has no value part.
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
    // The bug guarded: `reducedMotion` stopped the timer but the segment still
    // painted whatever step the renderer held, so a reader who asked not to see
    // motion saw the bar advance on the next unrelated re-render.
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
    // The bug guarded: the indeterminate bar ignored the tone and painted the
    // primary role, so a destructive task and a successful one looked the same
    // until the value arrived.
    const determinate = renderProgress(
      { value: 42, tone: "success" },
      testTheme,
      0,
    );
    expect(
      expectSome(hostStyleString(fillOf(determinate), "backgroundColor")),
    ).toBe(testTheme.colors.success);
    const indeterminate = renderProgress({ tone: "success" }, testTheme, 0);
    // The indeterminate track holds a lead segment and then the fill.
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
    // The caller's style is merged last, after the frame's own width.
    expect(hostStyleString(element, "width")).toStrictEqual(Option.some("80%"));
    expect(hostStyleString(trackOf(element), "backgroundColor")).toStrictEqual(
      Option.some(testTheme.colors.muted),
    );
  });
});
