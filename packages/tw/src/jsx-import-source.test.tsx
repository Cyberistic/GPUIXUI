/** @jsxImportSource @gpuixui/tw */

/**
 * End-to-end guard for the JSX runtime: this file opts into
 * `@gpuixui/tw` and writes the same host markup shadcn writes.
 */

import { describe, expect, it } from "vitest";
import * as P from "effect/Predicate";
import { TwHost } from "./host.js";

const prop = (element: { readonly props: unknown }, key: string): unknown =>
  P.isObject(element.props) ? Reflect.get(element.props, key) : undefined;

describe("jsxImportSource @gpuixui/tw", () => {
  it("wraps a classed host element from TSX", () => {
    const element = <div className="h-9 px-3" />;
    expect(element.type).toBe(TwHost);
    expect(prop(element, "as")).toBe("div");
  });
});
