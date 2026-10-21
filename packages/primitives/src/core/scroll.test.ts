/**
 * Keyboard scrolling's arithmetic.
 *
 * The runtime's offset is negative and an overshoot is clamped by `scrollTo`
 * (measured in `runtime/layout.runtime.test.tsx`), so these cases pin what the
 * component can decide without a renderer: which key moves which axis, by what,
 * and where it refuses to act.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { SCROLL_END, scrollTarget } from "./scroll.js";

const metrics = { line: 32, page: 60 } as const;
const at = (x: number, y: number) => ({ x, y });

describe("scrollTarget", () => {
  it("moves a vertical region one row per arrow, in negative-offset space", () => {
    expect(
      scrollTarget("down", "vertical", at(0, -100), metrics),
    ).toStrictEqual(Option.some(at(0, -132)));
    expect(scrollTarget("up", "vertical", at(0, -100), metrics)).toStrictEqual(
      Option.some(at(0, -68)),
    );
  });

  it("stops at the start instead of scrolling past it", () => {
    expect(scrollTarget("up", "vertical", at(0, -10), metrics)).toStrictEqual(
      Option.some(at(0, 0)),
    );
  });

  it("pages by the measured viewport", () => {
    expect(
      scrollTarget("pagedown", "vertical", at(0, -10), metrics),
    ).toStrictEqual(Option.some(at(0, -70)));
    expect(
      scrollTarget("pageup", "vertical", at(0, -70), metrics),
    ).toStrictEqual(Option.some(at(0, -10)));
  });

  it("leaves an axis the container does not scroll alone", () => {
    expect(scrollTarget("down", "horizontal", at(0, 0), metrics)).toStrictEqual(
      Option.none(),
    );
    expect(
      scrollTarget("right", "horizontal", at(0, 0), metrics),
    ).toStrictEqual(Option.some(at(-32, 0)));
    expect(scrollTarget("right", "vertical", at(0, 0), metrics)).toStrictEqual(
      Option.none(),
    );
  });

  it("moves both axes of a two-axis region", () => {
    expect(scrollTarget("down", "both", at(-40, -40), metrics)).toStrictEqual(
      Option.some(at(-40, -72)),
    );
    expect(scrollTarget("left", "both", at(-40, -40), metrics)).toStrictEqual(
      Option.some(at(-8, -40)),
    );
  });

  it("goes home to the start and ends at the runtime's clamp", () => {
    expect(scrollTarget("home", "both", at(-40, -40), metrics)).toStrictEqual(
      Option.some(at(0, 0)),
    );
    expect(scrollTarget("end", "vertical", at(0, -40), metrics)).toStrictEqual(
      Option.some(at(0, SCROLL_END)),
    );
    expect(
      scrollTarget("end", "horizontal", at(-40, 0), metrics),
    ).toStrictEqual(Option.some(at(SCROLL_END, 0)));
  });

  it("is None for a key the scroller does not own", () => {
    expect(scrollTarget("enter", "vertical", at(0, 0), metrics)).toStrictEqual(
      Option.none(),
    );
    expect(
      scrollTarget("constructor", "vertical", at(0, 0), metrics),
    ).toStrictEqual(Option.none());
  });
});
