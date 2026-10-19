/**
 * `ScrollArea` — the region semantics and the keyboard scroll stop.
 *
 * The bug guarded (plan 072): a scroll container had no keyboard path at all,
 * and giving every `ScrollArea` a tab stop silently would change tab order in
 * every existing layout. A label is what makes the region a scroll stop, so the
 * element tree is where that decision is asserted.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderScrollArea } from "./ScrollArea.js";
import { keyEvent } from "./testing/event.js";
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

  it("treats a blank label as absent, and trims a real one", () => {
    // Plan 396: `label="   "` used to make a focusable region nothing can
    // announce; it is not a name. A padded label is named without the padding.
    const blank = renderScrollArea(
      { axis: "vertical", label: "   " },
      testTheme,
      { onKeyDown: () => {} },
    );
    expect(hostProp(blank, "role")).toStrictEqual(Option.none());
    expect(hostProp(blank, "aria-label")).toStrictEqual(Option.none());
    expect(hostProp(blank, "tabIndex")).toStrictEqual(Option.none());

    const padded = renderScrollArea(
      { axis: "vertical", label: "  Properties  " },
      testTheme,
      { onKeyDown: () => {} },
    );
    expect(expectSome(hostProp(padded, "role"))).toBe("region");
    expect(expectSome(hostProp(padded, "aria-label"))).toBe("Properties");
    expect(expectSome(hostProp(padded, "tabIndex"))).toBe(0);
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

  it("forwards the slot's handlers and description to its region", () => {
    // The bug guarded (plan 399b): a labelled region is one focusable root, but
    // it declared no `TriggerHandlers`, so a `Tooltip` around it painted
    // nothing — the slot's cloned props stopped at the component boundary.
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const onMouseDown = vi.fn();
    const area = renderScrollArea(
      {
        axis: "vertical",
        label: "Activity",
        "aria-description": "Scroll for newer entries",
        onMouseEnter,
        onMouseLeave,
        onMouseDown,
      },
      testTheme,
    );
    expect(expectSome(hostProp(area, "aria-description"))).toBe(
      "Scroll for newer entries",
    );
    expect(Option.getOrUndefined(hostHandler(area, "onMouseEnter"))).toBe(
      onMouseEnter,
    );
    expect(Option.getOrUndefined(hostHandler(area, "onMouseLeave"))).toBe(
      onMouseLeave,
    );
    expect(Option.getOrUndefined(hostHandler(area, "onMouseDown"))).toBe(
      onMouseDown,
    );
  });

  it("drops the slot contract when the area is unlabelled", () => {
    // The bug guarded (plan 638): the passive spread was unconditional, so an
    // unlabelled area — no role, no name, no tab stop — still took the hover
    // handlers a `Tooltip` clones onto it and painted a hover-only tip. The
    // role/name/tab stop are gated on `named`; the slot contract must be too.
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const onMouseDown = vi.fn();
    const area = renderScrollArea(
      {
        axis: "vertical",
        "aria-description": "Scroll for newer entries",
        onMouseEnter,
        onMouseLeave,
        onMouseDown,
      },
      testTheme,
    );
    expect(hostProp(area, "aria-description")).toStrictEqual(Option.none());
    expect(hostHandler(area, "onMouseEnter")).toStrictEqual(Option.none());
    expect(hostHandler(area, "onMouseLeave")).toStrictEqual(Option.none());
    expect(hostHandler(area, "onMouseDown")).toStrictEqual(Option.none());
  });

  it("composes the region's own focus and key handlers with the slot's", () => {
    // Forwarding must not replace the scroll rule: the region's own handler
    // runs first, then the slot's (the Button/Slider order).
    const order: string[] = [];
    const area = renderScrollArea(
      {
        axis: "vertical",
        label: "Activity",
        onFocus: () => order.push("slot-focus"),
        onKeyDown: () => order.push("slot-key"),
      },
      testTheme,
      {
        onFocus: () => order.push("region-focus"),
        onKeyDown: () => order.push("region-key"),
      },
    );
    expectSome(hostHandler(area, "onFocus"))(keyEvent(""));
    expectSome(hostHandler(area, "onKeyDown"))(keyEvent("pagedown"));
    expect(order).toStrictEqual([
      "region-focus",
      "slot-focus",
      "region-key",
      "slot-key",
    ]);
  });
});
