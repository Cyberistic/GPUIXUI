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
});
