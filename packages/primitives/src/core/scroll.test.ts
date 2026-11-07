import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { SCROLL_END, revealScroll, scrollTarget } from "./scroll.js";

const metrics = { line: 32, page: { width: 80, height: 60 } } as const;
const at = (x: number, y: number) => ({ x, y });

const box = (y: number, height = 24) => ({ x: 10, y, width: 200, height });

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

  it("pages a sideways region by its width, not by a height it never shows", () => {
    expect(
      scrollTarget("pagedown", "horizontal", at(-10, 0), metrics),
    ).toStrictEqual(Option.some(at(-90, 0)));
    expect(
      scrollTarget("pageup", "horizontal", at(-90, 0), metrics),
    ).toStrictEqual(Option.some(at(-10, 0)));

    expect(
      scrollTarget("pagedown", "both", at(-40, -10), metrics),
    ).toStrictEqual(Option.some(at(-40, -70)));
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

  it("reads a stored axis as the region's documented axis", () => {
    const stored: unknown = "sideways";
    expect(scrollTarget("down", stored, at(0, -100), metrics)).toStrictEqual(
      Option.some(at(0, -132)),
    );
    expect(scrollTarget("pagedown", stored, at(0, -10), metrics)).toStrictEqual(
      Option.some(at(0, -70)),
    );

    expect(scrollTarget("right", stored, at(0, 0), metrics)).toStrictEqual(
      Option.none(),
    );
    expect(scrollTarget("down", "horizontal", at(0, 0), metrics)).toStrictEqual(
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

describe("revealScroll", () => {
  const viewport = { x: 0, y: 100, width: 200, height: 100 };

  it("moves a row below the fold up by exactly its overshoot", () => {
    expect(revealScroll(box(190, 30), viewport, at(0, -40))).toStrictEqual(
      Option.some(at(0, -60)),
    );
  });

  it("moves a row above the fold back down by the gap it starts above", () => {
    expect(revealScroll(box(80), viewport, at(0, -60))).toStrictEqual(
      Option.some(at(0, -40)),
    );
  });

  it("leaves a row already inside the viewport alone", () => {
    expect(revealScroll(box(120), viewport, at(0, -40))).toStrictEqual(
      Option.none(),
    );

    expect(revealScroll(box(176), viewport, at(0, -40))).toStrictEqual(
      Option.none(),
    );
  });

  it("aligns the top of a row taller than the viewport", () => {
    expect(revealScroll(box(90, 140), viewport, at(0, -10))).toStrictEqual(
      Option.some(at(0, 0)),
    );
  });

  it("aligns a tall row's top when it starts below the fold", () => {
    expect(revealScroll(box(200, 140), viewport, at(0, 0))).toStrictEqual(
      Option.some(at(0, -100)),
    );
  });

  it("leaves a tall row alone once its top is at the fold", () => {
    expect(revealScroll(box(100, 140), viewport, at(0, -30))).toStrictEqual(
      Option.none(),
    );
  });

  it("keeps the horizontal offset it was given", () => {
    expect(revealScroll(box(190, 30), viewport, at(-15, -40))).toStrictEqual(
      Option.some(at(-15, -60)),
    );
  });
});
