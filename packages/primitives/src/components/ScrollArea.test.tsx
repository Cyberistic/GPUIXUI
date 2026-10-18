/**
 * `ScrollArea` — the region semantics and the keyboard scroll stop.
 *
 * The bug guarded (plan 072): a scroll container had no keyboard path at all,
 * and giving every `ScrollArea` a tab stop silently would change tab order in
 * every existing layout. A label is what makes the region a scroll stop, so the
 * element tree is where that decision is asserted.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderScrollArea } from "./ScrollArea.js";
import {
  expectSome,
  hostHandler,
  hostProp,
  hostStyle,
} from "./testing/element.js";

describe("ScrollArea", () => {
  it("is a named region and a tab stop when it is labelled", () => {
    const area = renderScrollArea(
      { axis: "vertical", label: "Properties" },
      testTheme,
      { onKeyDown: () => {} },
    );
    expect(expectSome(hostProp(area, "role"))).toBe("region");
    expect(expectSome(hostProp(area, "aria-label"))).toBe("Properties");
    expect(expectSome(hostProp(area, "tabIndex"))).toBe(0);
    expect(Option.isSome(hostProp(area, "onKeyDown"))).toBe(true);
  });

  it("stays an inert container when it is not labelled", () => {
    const area = renderScrollArea({ axis: "vertical" }, testTheme);
    expect(hostProp(area, "role")).toStrictEqual(Option.none());
    expect(hostProp(area, "aria-label")).toStrictEqual(Option.none());
    expect(hostProp(area, "tabIndex")).toStrictEqual(Option.none());
  });

  it("paints the focus ring only on a labelled, focused region", () => {
    const focused = renderScrollArea(
      { axis: "vertical", label: "Properties" },
      testTheme,
      { focused: true },
    );
    expect(Option.isSome(hostStyle(focused, "boxShadow"))).toBe(true);
    expect(
      hostStyle(
        renderScrollArea({ axis: "vertical" }, testTheme, { focused: true }),
        "boxShadow",
      ),
    ).toStrictEqual(Option.none());
  });

  it("forwards the caller's onScroll to the viewport", () => {
    // The impure wrapper composes a position reporter around this handler, so
    // the pure renderer must pass the caller's own handler through unchanged.
    const deltas: number[] = [];
    const area = renderScrollArea(
      {
        axis: "vertical",
        onScroll: (event) => deltas.push(event.deltaY ?? 0),
      },
      testTheme,
    );
    const handler = expectSome(hostHandler(area, "onScroll"));
    handler({ elementId: 0, eventType: "scroll", deltaY: -100 });
    expect(deltas).toStrictEqual([-100]);
  });
});
