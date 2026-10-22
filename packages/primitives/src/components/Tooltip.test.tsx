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
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  contrastFloors,
  contrastRatio,
  darkTheme,
  lightTheme,
} from "@gpuixui/tokens";
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

/** The tip's own element: the second child of the runtime's `Tooltip`. */
const contentOf = (element: ReactElement): ReactElement =>
  elementChildren(element)[1] ??
  expect.fail("the tooltip rendered no content element");

/** The style the content element was given, decoded. */
const contentStyle = (props: TooltipProps): Record<string, unknown> =>
  expectSome(
    Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))(
      expectSome(elementProp(contentOf(render(props)), "style")),
    ),
  );

describe("Tooltip theming", () => {
  it("paints the tip's text in the role its surface is measured with", () => {
    // The bug guarded: the tip carried the popover fill and no text colour, so
    // its copy inherited whatever the anchored layer sat under. That is a
    // colour the wrapper cannot see and no pair measures. The surface owns its
    // role instead — `popoverForeground` on `popover` is a `contrastPairs`
    // entry — and this case holds the painted pair to the body floor.
    const style = contentStyle({
      content: "Revenue definition",
      children: <div tabIndex={0} />,
    });
    expect(style["color"]).toBe(testTheme.colors.popoverForeground);
    expect(style["backgroundColor"]).toBe(testTheme.colors.popover);
    // The fixture's colours are deliberately meaningless, so the ratio is read
    // from the shipped palettes — the ones `contrastPairs` measures.
    Arr.forEach([lightTheme, darkTheme], (theme) => {
      const ratio = contrastRatio(
        theme.colors.popoverForeground,
        theme.colors.popover,
      );
      expect(expectSome(Option.fromNullishOr(ratio))).toBeGreaterThanOrEqual(
        contrastFloors.body,
      );
    });
  });

  it("lets a caller's className and style restyle the tip", () => {
    // The gap guarded: every other primitive takes `className` and `style`,
    // and the tip took neither, so a caller could not change its width or fill.
    // The merge order is the package's: className beats the recipe, style beats
    // both.
    const restyled = contentStyle({
      content: "Revenue definition",
      className: "bg-card",
      style: { maxWidth: 240 },
      children: <div tabIndex={0} />,
    });
    expect(restyled["backgroundColor"]).toBe(testTheme.colors.card);
    expect(restyled["maxWidth"]).toBe(240);
    const overridden = contentStyle({
      content: "Revenue definition",
      className: "bg-card",
      style: { backgroundColor: testTheme.colors.muted },
      children: <div tabIndex={0} />,
    });
    expect(overridden["backgroundColor"]).toBe(testTheme.colors.muted);
  });
});
