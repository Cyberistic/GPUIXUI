/**
 * `Tooltip` — the trigger's accessible description.
 *
 * The bug this suite guards: a tooltip's text was painted but never announced,
 * because the wrapper only cloned the runtime's hover/focus handlers onto the
 * trigger. GPUix 0.11.0 has `aria-description` (and still no
 * `aria-describedby`), so a string tip — or an explicit `description` — must
 * reach the trigger's host props. A trigger that is not a host element cannot
 * carry the prop, and the wrapper must not pretend it did.
 */

import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Box } from "./Box.js";
import { renderTooltip, type TooltipProps } from "./Tooltip.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostProp,
} from "./testing/element.js";

/** The trigger's child, after the wrapper's clone. */
const triggerOf = (element: ReactElement): ReactElement => {
  const trigger =
    elementChildren(element)[0] ?? expect.fail("the tooltip has no trigger");
  return (
    elementChildren(trigger)[0] ?? expect.fail("the trigger carried no child")
  );
};

const render = (props: TooltipProps): ReactElement =>
  renderTooltip(props, testTheme);

describe("Tooltip accessibility", () => {
  it("publishes a string tip as the trigger's description", () => {
    const trigger = triggerOf(
      render({
        content: "Booked revenue, net of refunds.",
        children: <div tabIndex={0} />,
      }),
    );
    expect(expectSome(hostProp(trigger, "aria-description"))).toBe(
      "Booked revenue, net of refunds.",
    );
  });

  it("publishes an explicit description for a non-text tip", () => {
    const trigger = triggerOf(
      render({
        content: <text>Not a string</text>,
        description: "Revenue definition",
        children: <div tabIndex={0} />,
      }),
    );
    expect(expectSome(hostProp(trigger, "aria-description"))).toBe(
      "Revenue definition",
    );
  });

  it("invents no description for a non-text tip without one", () => {
    const trigger = triggerOf(
      render({ content: <text>Not a string</text>, children: <div /> }),
    );
    expect(hostProp(trigger, "aria-description")).toStrictEqual(Option.none());
  });

  it("does not attach a description to a component trigger", () => {
    // The documented contract is a focusable host element. Cloning a component
    // would set a prop it may ignore, so the wrapper leaves it alone and the
    // docs say to give the control its own name and description.
    const trigger = triggerOf(
      render({ content: "Tip", children: <Box tone="card" /> }),
    );
    expect(elementProp(trigger, "aria-description")).toStrictEqual(
      Option.none(),
    );
  });
});
