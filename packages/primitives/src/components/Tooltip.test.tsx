/**
 * `Tooltip`'s content gate — a tip that paints nothing is no tip.
 *
 * The bug guarded (plan 744): plan 573 stopped a **string** that trimmed to
 * nothing from opening a tip, but the gate was string-only. A computed node tip
 * that resolved to `null` still opened an empty anchored layer and published an
 * unnamed `Tooltip` node (measured in the runtime), so whether a blank tip
 * opened depended on which falsy value the caller's conditional produced:
 * `false` and `"   "` opened nothing, `null` opened an empty popover.
 *
 * The gate is now `paintsContent` (plans 743, 782): absent content returns the
 * child unchanged, an element normally counts, and a `Text` run or a fragment
 * is looked through because it paints exactly its children — so a computed tip
 * wrapped for typography and blank is still no tip.
 */

import { Fragment, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import { Text } from "./Text.js";
import { renderTooltip } from "./Tooltip.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostTag,
} from "./testing/element.js";

/** A tooltip around one identifiable child, for the content under test. */
const tipOf = (content: ReactNode, label?: string) =>
  renderTooltip(
    {
      content,
      label,
      children: <div testId="child" />,
    },
    testTheme,
  );

/** Whether the tree is the caller's child alone rather than a tooltip wrapper. */
const isChildAlone = (content: ReactNode, label?: string): boolean => {
  const tree = tipOf(content, label);
  const children = elementChildren(tree);
  return (
    tree.type === Fragment &&
    children.length === 1 &&
    Option.exists(
      hostTag(expectSome(Option.fromNullishOr(children[0]))),
      (tag) => tag === "div",
    )
  );
};

describe("Tooltip content", () => {
  it("renders the child alone when the content paints nothing", () => {
    // Each of these is a legitimate value of a computed tip; none may open an
    // empty layer. The old gate opened a wrapper for `null` and `undefined`.
    expect(isChildAlone(null)).toBe(true);
    expect(isChildAlone(undefined)).toBe(true);
    expect(isChildAlone(false)).toBe(true);
    expect(isChildAlone(true)).toBe(true);
    expect(isChildAlone("   ")).toBe(true);
    expect(isChildAlone([])).toBe(true);
  });

  it("keeps a real string tip and a real node tip", () => {
    // The passing direction: an over-broad gate would drop these.
    expect(elementChildren(tipOf("A hint")).length).toBe(2);
    expect(elementChildren(tipOf(<div testId="tip-body" />)).length).toBe(2);
  });

  it("looks through a Text run that says nothing", () => {
    // Plan 782: a computed hint is often wrapped for typography. A blank run
    // opened an empty anchored layer and published an unnamed tooltip node.
    expect(isChildAlone(<Text>{""}</Text>)).toBe(true);
    expect(isChildAlone(<Text>{"   "}</Text>, "Billing cycle")).toBe(true);
    // The rule looks through a `Text` or a fragment, not through every element:
    // a real run and an element with chrome of its own still open a tip.
    expect(isChildAlone(<Text>Real tip</Text>)).toBe(false);
    expect(
      isChildAlone(
        <div>
          <Text>{""}</Text>
        </div>,
      ),
    ).toBe(false);
  });

  it("does not describe the trigger when the tip paints nothing", () => {
    // Plan 573's rule, now for a node: a label cannot resurrect an absent tip.
    const tree = tipOf(null, "Billing cycle");
    expect(tree.type).toBe(Fragment);
    expect(elementProp(tree, "aria-description")).toStrictEqual(Option.none());
  });
});
