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
import {
  renderTooltip,
  renderTooltipProvider,
  type TooltipProps,
  type TooltipProviderProps,
  type TooltipView,
} from "./Tooltip.js";
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

  it("keeps the help a trigger already announces", () => {
    // The bug guarded: the wrapper cloned the tip over whatever the trigger
    // already announced, so a field's validation hint or a setting's
    // explanation disappeared the moment a short tip wrapped it.
    const trigger = triggerOf(
      render({
        content: "Tip",
        children: <div tabIndex={0} aria-description="Required by policy" />,
      }),
    );
    expect(expectSome(hostProp(trigger, "aria-description"))).toBe(
      "Required by policy",
    );
  });

  it("lets an explicit description name the tip over the trigger's own help", () => {
    const trigger = triggerOf(
      render({
        content: "Tip",
        description: "Tip",
        children: <div tabIndex={0} aria-description="Required by policy" />,
      }),
    );
    expect(expectSome(hostProp(trigger, "aria-description"))).toBe("Tip");
  });

  it("publishes a string tip over a blank description", () => {
    // A blank string is not help: `accessibleName` trims it to an absence, so
    // the tip is the only description the trigger has.
    const trigger = triggerOf(
      render({
        content: "Tip",
        children: <div tabIndex={0} aria-description="   " />,
      }),
    );
    expect(expectSome(hostProp(trigger, "aria-description"))).toBe("Tip");
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

describe("Tooltip presence", () => {
  const props: TooltipProps = {
    content: "Revenue definition",
    side: "right",
    children: <div tabIndex={0} />,
  };
  const view: TooltipView = {
    mounted: true,
    present: false,
    side: "bottom",
    motion: {
      initial: { opacity: 0, top: -2 },
      animate: { opacity: 0, top: -2 },
      transition: { duration: 0.16, ease: "easeIn" },
    },
    onOpenChange: () => {},
  };
  const rendered = renderTooltip(props, testTheme, view);

  it("paints the frame the presence resolved, and nothing of its own", () => {
    // The bug guarded: the tip carried no `motion`, so it appeared at rest
    // beside every surface that fades. The pure tree takes the resolved view —
    // it does not invent a timing of its own — so this case holds the exact
    // frame, the resting target and the handler the component decided.
    const content = contentOf(rendered);
    expect(elementProp(content, "motion")).toStrictEqual(
      Option.some(view.motion),
    );
    // The anchor is the side the view names: a leaving tip returns the way it
    // came even if the caller changed the prop mid-flight.
    expect(elementProp(content, "side")).toStrictEqual(Option.some(view.side));
    expect(elementProp(rendered, "open")).toStrictEqual(
      Option.some(view.mounted),
    );
    expect(elementProp(rendered, "onOpenChange")).toStrictEqual(
      Option.some(view.onOpenChange),
    );
  });

  it("takes no presses while the tip leaves", () => {
    // The box is still mounted for its exit, so it would otherwise stay a press
    // target over whatever the dismiss revealed.
    const leaving = expectSome(
      Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))(
        expectSome(elementProp(contentOf(rendered), "style")),
      ),
    );
    expect(leaving["pointerEvents"]).toBe("none");
    const resting = expectSome(
      Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))(
        expectSome(elementProp(contentOf(render(props)), "style")),
      ),
    );
    // No view means the pure tree the suite reads everywhere else: the tip
    // carries no pointer rule of its own, exactly as before the seam.
    expect(Object.hasOwn(resting, "pointerEvents")).toBe(false);
  });

  it("leaves the motion to the runtime when no view is resolved", () => {
    const content = contentOf(render(props));
    expect(elementProp(content, "motion")).toStrictEqual(Option.none());
    expect(elementProp(content, "side")).toStrictEqual(Option.some("right"));
  });
});

describe("TooltipProvider", () => {
  /** The provider the runtime reads, with its props. */
  const providerOf = (props: TooltipProviderProps): ReactElement =>
    renderTooltipProvider(props);

  it("hands a group of tips the one timing it was given", () => {
    // The gap guarded: the page said a tip's delay defaults to the provider's,
    // while the package exposed no provider — a toolbar had to import the
    // runtime's own component to set one delay for its tips. Every field the
    // runtime reads must reach it from this package's names.
    const provider = providerOf({
      delay: 400,
      skipDelay: 120,
      disableHoverableContent: true,
      children: <div />,
    });
    expect(expectSome(elementProp(provider, "delayDuration"))).toBe(400);
    expect(expectSome(elementProp(provider, "skipDelayDuration"))).toBe(120);
    expect(expectSome(elementProp(provider, "disableHoverableContent"))).toBe(
      true,
    );
  });

  it("leaves the runtime's defaults when a timing is omitted", () => {
    // Omitted is not zero: the runtime's own defaults (immediate open, a 300 ms
    // skip window, hoverable content) are what an unconfigured provider means.
    const provider = providerOf({ children: <div /> });
    expect(elementProp(provider, "delayDuration")).toStrictEqual(Option.none());
    expect(elementProp(provider, "skipDelayDuration")).toStrictEqual(
      Option.none(),
    );
    expect(elementProp(provider, "disableHoverableContent")).toStrictEqual(
      Option.none(),
    );
  });
});

describe("Tooltip open state", () => {
  it("hands the runtime the open state its caller owns", () => {
    // The gap guarded: the wrapper forwarded only the delay, so the runtime's
    // own `open`/`defaultOpen`/`onOpenChange` never reached it and a tip could
    // not be held open from code. All four props are forwarded verbatim.
    const onOpenChange = (): void => {};
    const controlled = render({
      content: "Revenue definition",
      open: true,
      defaultOpen: false,
      onOpenChange,
      disableHoverableContent: true,
      children: <div tabIndex={0} />,
    });
    expect(expectSome(elementProp(controlled, "open"))).toBe(true);
    expect(expectSome(elementProp(controlled, "defaultOpen"))).toBe(false);
    expect(expectSome(elementProp(controlled, "onOpenChange"))).toBe(
      onOpenChange,
    );
    expect(expectSome(elementProp(controlled, "disableHoverableContent"))).toBe(
      true,
    );
  });

  it("leaves the runtime's own state when the caller passes none", () => {
    const uncontrolled = render({
      content: "Revenue definition",
      children: <div tabIndex={0} />,
    });
    expect(elementProp(uncontrolled, "open")).toStrictEqual(Option.none());
    expect(elementProp(uncontrolled, "defaultOpen")).toStrictEqual(
      Option.none(),
    );
    expect(elementProp(uncontrolled, "onOpenChange")).toStrictEqual(
      Option.none(),
    );
    expect(elementProp(uncontrolled, "disableHoverableContent")).toStrictEqual(
      Option.none(),
    );
  });
});
