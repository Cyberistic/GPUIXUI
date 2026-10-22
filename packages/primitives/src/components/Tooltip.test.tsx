/**
 * `Tooltip` — the trigger's accessible description.
 *
 * The bug this suite guards: a tooltip's text was painted but never announced,
 * because the wrapper only cloned the runtime's hover/focus handlers onto the
 * trigger. GPUix 0.11.0 has `aria-description` (and still no
 * `aria-describedby`), so a string tip — or an explicit `description` — must
 * reach the trigger's host props. A host element publishes it directly and a
 * control forwards it from its own `TooltipTriggerProps`; the wrapper must not
 * pretend a trigger that ignores the prop carries it.
 */

import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Box, renderBox } from "./Box.js";
import { IconButton } from "./IconButton.js";
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

  it("publishes the description onto a control trigger that forwards it", () => {
    // The bug guarded: the wrapper cloned the tip only onto a host element, so
    // an `IconButton` trigger — the usual icon action with a tooltip — dropped
    // the description entirely. A control that declares `TooltipTriggerProps`
    // receives it and hands it to its own host; see `Button.test.tsx`.
    const trigger = triggerOf(
      render({
        content: "Save the document",
        children: <IconButton label="Save" icon={<text>+</text>} />,
      }),
    );
    expect(expectSome(elementProp(trigger, "aria-description"))).toBe(
      "Save the document",
    );
  });

  it("does not pretend a trigger that ignores the prop carries a description", () => {
    // `Box` takes no host attributes, so the cloned prop stops at the component
    // and its painted div has no description. The page names that limit; this
    // case keeps the claim measured rather than assumed.
    const trigger = triggerOf(
      render({ content: "Tip", children: <Box tone="card" /> }),
    );
    expect(expectSome(elementProp(trigger, "aria-description"))).toBe("Tip");
    expect(
      hostProp(renderBox({ tone: "card" }, testTheme), "aria-description"),
    ).toStrictEqual(Option.none());
  });

  it("trims a padded description like every other name", () => {
    // The bug guarded: the description was cloned verbatim while every label in
    // the package goes through `accessibleName`, so a padded copy reached the
    // accessibility tree with its padding and a screen reader read the pause.
    const trigger = triggerOf(
      render({
        content: <text>Not a string</text>,
        description: "  Revenue definition  ",
        children: <div tabIndex={0} />,
      }),
    );
    expect(expectSome(hostProp(trigger, "aria-description"))).toBe(
      "Revenue definition",
    );
  });

  it("publishes no description for a blank tip or description", () => {
    // A blank string is not a description: cloning it sets an attribute a
    // reader has to dismiss, the same reason `accessibleName` drops a blank
    // label rather than publishing it.
    const blankTip = triggerOf(
      render({ content: "   ", children: <div tabIndex={0} /> }),
    );
    const blankDescription = triggerOf(
      render({
        content: "Tip",
        description: "",
        children: <div tabIndex={0} />,
      }),
    );
    expect(hostProp(blankTip, "aria-description")).toStrictEqual(Option.none());
    expect(hostProp(blankDescription, "aria-description")).toStrictEqual(
      Option.none(),
    );
  });
});
