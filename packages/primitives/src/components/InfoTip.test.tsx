/**
 * `InfoTip` — the accessible info-icon trigger.
 *
 * The bug guarded (plan 073): the trigger shape was hand-rolled per consumer and
 * `examples/basic-app` shipped it as a bare `Box`, which is hover-only and absent
 * from the accessibility tree. A labelled `img` tab stop is the one honest shape,
 * and the icon inside must stay decorative so the trigger is a single node.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  renderInfoTip,
  type InfoTipProps,
  type InfoTipState,
} from "./InfoTip.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostProp,
  hostStyle,
  hostTag,
} from "./testing/element.js";

const triggerOf = (focused = false, style?: InfoTipProps["style"]) => {
  const tree = renderInfoTip(
    { content: "Net of refunds.", label: "Revenue definition", style },
    testTheme,
    { focused, onFocus: () => {}, onBlur: () => {} },
  );
  return Option.getOrElse(Option.fromNullishOr(elementChildren(tree)[0]), () =>
    expect.fail("InfoTip rendered no trigger"),
  );
};

describe("InfoTip", () => {
  it("makes the trigger a named, focusable image", () => {
    const trigger = triggerOf();
    expect(expectSome(hostTag(trigger))).toBe("div");
    expect(expectSome(hostProp(trigger, "role"))).toBe("img");
    expect(expectSome(hostProp(trigger, "aria-label"))).toBe(
      "Revenue definition",
    );
    expect(expectSome(hostProp(trigger, "tabIndex"))).toBe(0);
  });

  it("falls back to a documented name for a blank label", () => {
    // Plan 573: `ariaName` dropped the blank value but the trigger stayed a
    // focusable `role="img"`, so the tree held an unnamed focus stop. A blank
    // computed label now takes the same documented fallback as Spinner.
    const blank = renderInfoTip(
      { content: "Net of refunds.", label: "   " },
      testTheme,
    );
    const blankTrigger = expectSome(
      Option.fromNullishOr(elementChildren(blank)[0]),
    );
    expect(expectSome(hostProp(blankTrigger, "aria-label"))).toBe(
      "More information",
    );
    const padded = renderInfoTip(
      { content: "Net of refunds.", label: "  Revenue definition  " },
      testTheme,
    );
    const paddedTrigger = expectSome(
      Option.fromNullishOr(elementChildren(padded)[0]),
    );
    expect(expectSome(hostProp(paddedTrigger, "aria-label"))).toBe(
      "Revenue definition",
    );
  });

  it("keeps the icon decorative so the trigger is one node", () => {
    const icon = expectSome(
      Option.fromNullishOr(elementChildren(triggerOf())[0]),
    );
    expect(expectSome(elementProp(icon, "name"))).toBe("info");
    // No `label` → the icon renders as `presentation`, not a second a11y node.
    expect(elementProp(icon, "label")).toStrictEqual(Option.none());
    expect(elementProp(icon, "size")).toStrictEqual(
      Option.some(testTheme.iconSize.sm),
    );
  });

  it("paints the focus ring only while focused", () => {
    expect(Option.isSome(hostStyle(triggerOf(true), "boxShadow"))).toBe(true);
    expect(hostStyle(triggerOf(false), "boxShadow")).toStrictEqual(
      Option.none(),
    );
  });

  it("merges a caller's style last on the trigger", () => {
    // Plan 695: `InfoTip` was the one interactive part with no `style` seam, so
    // an icon beside a heading could not be nudged onto the baseline without a
    // `Box` wrapper. The caller's property lands on the trigger, and the role,
    // name and tab stop stay the component's.
    const trigger = triggerOf(false, { marginLeft: 12 });
    expect(expectSome(hostStyle(trigger, "marginLeft"))).toBe(12);
    expect(expectSome(hostProp(trigger, "role"))).toBe("img");
    expect(expectSome(hostProp(trigger, "aria-label"))).toBe(
      "Revenue definition",
    );
    expect(expectSome(hostProp(trigger, "tabIndex"))).toBe(0);
  });

  it("hands the callback the trigger's focus state and wins over the base", () => {
    const seen: Array<boolean> = [];
    const style = (state: InfoTipState) => {
      seen.push(state.focused);
      return { opacity: state.focused ? 0.5 : 1 };
    };
    const idle = triggerOf(false, style);
    const active = triggerOf(true, style);
    expect(seen).toStrictEqual([false, true]);
    expect(expectSome(hostStyle(idle, "opacity"))).toBe(1);
    expect(expectSome(hostStyle(active, "opacity"))).toBe(0.5);
  });

  it("keeps the ring in the base unless the caller replaces it", () => {
    expect(
      Option.isSome(hostStyle(triggerOf(true, { marginLeft: 4 }), "boxShadow")),
    ).toBe(true);
    expect(
      hostStyle(triggerOf(true, { boxShadow: undefined }), "boxShadow"),
    ).toStrictEqual(Option.none());
  });
});
