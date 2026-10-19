/**
 * Guards the className-aware JSX runtime.
 *
 * The bug guarded: shadcn TSX writes `className` on host elements. Without the
 * runtime the prop reaches a GPUix host that has no class concept and the style
 * disappears. These tests pin the wrapper boundary: only classed host elements
 * are wrapped; components and unclassed hosts pass through.
 */

import { describe, expect, it } from "vitest";
import * as P from "effect/Predicate";
import { jsx, jsxs } from "./jsx-runtime.js";
import { jsxDEV } from "./jsx-dev-runtime.js";
import { TwHost } from "./host.js";

const Component = () => null;

const prop = (element: { readonly props: unknown }, key: string): unknown =>
  P.isObject(element.props) ? Reflect.get(element.props, key) : undefined;

describe("JSX runtime", () => {
  it("wraps a classed div and preserves the host name", () => {
    const element = jsx("div", { className: "h-9 px-3" });
    expect(element.type).toBe(TwHost);
    expect(prop(element, "as")).toBe("div");
    expect(prop(element, "className")).toBe("h-9 px-3");
  });

  it("wraps a classed input", () => {
    const element = jsx("input", { className: "h-9", value: "x" });
    expect(element.type).toBe(TwHost);
    expect(prop(element, "as")).toBe("input");
  });

  it("leaves an unclassed host element alone", () => {
    const element = jsx("div", { style: { height: 9 } });
    expect(element.type).toBe("div");
  });

  it("leaves a component alone even when it has a className", () => {
    const element = jsx(Component, { className: "h-9" });
    expect(element.type).toBe(Component);
  });

  it("preserves children through jsxs", () => {
    const element = jsxs("div", {
      className: "h-9",
      children: ["a", "b"],
    });
    expect(element.type).toBe(TwHost);
    expect(prop(element, "children")).toEqual(["a", "b"]);
  });

  it("applies the same rule in the dev runtime", () => {
    const element = jsxDEV(
      "div",
      { className: "h-9" },
      undefined,
      false,
      undefined,
      undefined,
    );
    expect(element.type).toBe(TwHost);
    expect(prop(element, "as")).toBe("div");
  });
});
