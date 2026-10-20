/**
 * `Progress` — the bar and its accessible value.
 *
 * GPUix has no `aria-valuenow` (plan 020 §1.4), so the value rides on
 * `aria-valuetext`. The bug to guard is paint outside the track: a value above
 * 100 or below 0 must clamp, and an indeterminate bar must not look finished.
 * A computed percentage must announce as a whole number while the fill keeps its
 * exact fraction (plan 755). A bar that stands for a quantity announces the
 * caller's sentence through `formatValue`, and a blank sentence falls back to
 * the percentage (plan 780).
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderProgress } from "./Progress.js";
import {
  elementChildren,
  expectSome,
  hostProp,
  hostStyleString,
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

  it("has no aria-valuenow to read, so the value text is the only report", () => {
    const element = bar(Option.some(42));
    expect(hostProp(element, "aria-valuenow")).toStrictEqual(Option.none());
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("42%");
  });

  it("announces a computed value as a whole percent while the fill stays exact", () => {
    // Plan 755: the announcement is a sentence a person hears; the fill is
    // geometry. Rounding the paint would be a different, wrong fix.
    const element = renderProgress({ value: 100 / 3 }, testTheme, 0);
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("33%");
    const fill = expectSome(Arr.get(elementChildren(element), 0));
    expect(expectSome(hostStyleString(fill, "width"))).toBe(
      "33.333333333333336%",
    );
  });

  it("announces the caller's sentence and leaves the fill's geometry alone", () => {
    // Plan 780: "42%" cannot say how many files a copy has left.
    const element = renderProgress(
      { value: 42, formatValue: () => "3 of 10 files" },
      testTheme,
      0,
    );
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe(
      "3 of 10 files",
    );
    const fill = expectSome(Arr.get(elementChildren(element), 0));
    expect(expectSome(hostStyleString(fill, "width"))).toBe("42%");
  });

  it("falls back to the percentage when the caller's sentence is blank", () => {
    const element = renderProgress(
      { value: 42, formatValue: () => "   " },
      testTheme,
      0,
    );
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("42%");
  });

  it("never asks an indeterminate bar's formatter, and still says loading", () => {
    const formatValue = vi.fn(() => "3 of 10 files");
    const element = renderProgress({ formatValue }, testTheme, 0);
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("loading");
    expect(formatValue).not.toHaveBeenCalled();
  });

  it("paints an indeterminate bar in the requested tone", () => {
    // The bug guarded (plan 328): the indeterminate branch hard-coded the brand
    // role, so tone="success" painted primary while a determinate bar obeyed.
    const element = renderProgress(
      { tone: "success", label: "Saving" },
      testTheme,
      0,
    );
    const fill = expectSome(Arr.get(elementChildren(element), 1));
    expect(expectSome(hostStyleString(fill, "backgroundColor"))).toBe(
      testTheme.colors.success,
    );
  });

  it("treats a blank label as absent and trims a real one", () => {
    // Plan 026: the label is a name only when it says something.
    const blank = renderProgress({ value: 42, label: "   " }, testTheme, 0);
    expect(hostProp(blank, "aria-label")).toStrictEqual(Option.none());
    const padded = renderProgress(
      { value: 42, label: "  Uploading  " },
      testTheme,
      0,
    );
    expect(expectSome(hostProp(padded, "aria-label"))).toBe("Uploading");
  });
});
