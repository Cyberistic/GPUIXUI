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
import { renderInfoTip } from "./InfoTip.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostProp,
  hostStyle,
  hostTag,
} from "./testing/element.js";

const triggerOf = (focused = false) => {
  const tree = renderInfoTip(
    { content: "Net of refunds.", label: "Revenue definition" },
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
});
