/**
 * `Surface`'s accessibility shape.
 *
 * The bug guarded (plan `696`): a focusable surface must be a named group and a
 * static one must be a named image. A blank label must drop the tab stop too —
 * otherwise the component publishes the unnamed focus stop plan `573`/`396`
 * removed everywhere else.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { renderSurface } from "./Surface.js";
import {
  elementChildren,
  expectSome,
  hostProp,
  hostStyle,
  hostTag,
} from "./testing/element.js";

const render = (label: string, tabIndex?: number) =>
  renderSurface({
    width: 120,
    height: 80,
    label,
    tabIndex,
    elementRef: { current: null },
    imageRef: { current: null },
  });

const renderSized = (width: number, height: number) =>
  renderSurface({
    width,
    height,
    label: "Revenue",
    elementRef: { current: null },
    imageRef: { current: null },
  });

const styleNumber = (tree: ReturnType<typeof render>, prop: string) =>
  Option.flatMap(hostStyle(tree, prop), (value) =>
    typeof value === "number" ? Option.some(value) : Option.none(),
  );

describe("Surface accessibility", () => {
  it("is one named image when it is static", () => {
    const tree = render("Revenue");
    expect(expectSome(hostTag(tree))).toBe("div");
    expect(Option.isNone(hostProp(tree, "role"))).toBe(true);
    expect(Option.isNone(hostProp(tree, "tabIndex"))).toBe(true);

    const image = expectSome(Option.fromNullishOr(elementChildren(tree)[0]));
    expect(expectSome(hostTag(image))).toBe("img");
    expect(expectSome(hostProp(image, "alt"))).toBe("Revenue");
  });

  it("is a named group with a decorative image when it is a tab stop", () => {
    const tree = render("Revenue", 0);
    expect(expectSome(hostTag(tree))).toBe("div");
    expect(expectSome(hostProp(tree, "role"))).toBe("group");
    expect(expectSome(hostProp(tree, "aria-label"))).toBe("Revenue");
    expect(expectSome(hostProp(tree, "tabIndex"))).toBe(0);

    const image = expectSome(Option.fromNullishOr(elementChildren(tree)[0]));
    expect(Option.isNone(hostProp(image, "alt"))).toBe(true);
  });

  it("drops the tab stop when the label says nothing", () => {
    const tree = render("   ", 0);
    expect(Option.isNone(hostProp(tree, "tabIndex"))).toBe(true);
    expect(Option.isNone(hostProp(tree, "role"))).toBe(true);
    expect(Option.isNone(hostProp(tree, "aria-label"))).toBe(true);

    const image = expectSome(Option.fromNullishOr(elementChildren(tree)[0]));
    expect(Option.isNone(hostProp(image, "alt"))).toBe(true);
  });

  it("paints a whole box, never a fractional or unreadable length", () => {
    expect(styleNumber(renderSized(320.5, 180.9), "width")).toStrictEqual(
      Option.some(320),
    );
    expect(styleNumber(renderSized(320.5, 180.9), "height")).toStrictEqual(
      Option.some(180),
    );
    expect(styleNumber(renderSized(Number.NaN, 80), "width")).toStrictEqual(
      Option.some(0),
    );
    expect(
      styleNumber(renderSized(Number.POSITIVE_INFINITY, -4), "height"),
    ).toStrictEqual(Option.some(0));
  });
});
