/**
 * `Progress` — the bar and its accessible value.
 *
 * GPUix has no `aria-valuenow` (plan 020 §1.4), so the value rides on
 * `aria-valuetext`. The bug to guard is paint outside the track: a value above
 * 100 or below 0 must clamp, and an indeterminate bar must not look finished.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderProgress } from "./Progress.js";
import { expectSome, hostProp } from "./testing/element.js";

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
});
