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
    const trigger = triggerOf(
      render({ content: "Tip", children: <Box tone="card" /> }),
    );
    expect(expectSome(elementProp(trigger, "aria-description"))).toBe("Tip");
    expect(
      hostProp(renderBox({ tone: "card" }, testTheme), "aria-description"),
    ).toStrictEqual(Option.none());
  });

  it("trims a padded description like every other name", () => {
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

  it("paints no surface for copy that says nothing", () => {
    expect(
      elementChildren(render({ content: "", children: <div /> })),
    ).toHaveLength(1);
    expect(
      elementChildren(render({ content: "   ", children: <div /> })),
    ).toHaveLength(1);

    expect(
      elementChildren(render({ content: null, children: <div /> })),
    ).toHaveLength(1);

    expect(
      elementChildren(render({ content: "A hint", children: <div /> })),
    ).toHaveLength(2);
  });

  it("keeps the description a caller states for a tip that says nothing", () => {
    const trigger = triggerOf(
      render({
        content: "   ",
        description: "Revenue definition",
        children: <div tabIndex={0} />,
      }),
    );
    expect(expectSome(hostProp(trigger, "aria-description"))).toBe(
      "Revenue definition",
    );
  });
});

const contentOf = (element: ReactElement): ReactElement =>
  elementChildren(element)[1] ??
  expect.fail("the tooltip rendered no content element");

const contentStyle = (props: TooltipProps): Record<string, unknown> =>
  expectSome(
    Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))(
      expectSome(elementProp(contentOf(render(props)), "style")),
    ),
  );

describe("Tooltip theming", () => {
  it("paints the tip's text in the role its surface is measured with", () => {
    const style = contentStyle({
      content: "Revenue definition",
      children: <div tabIndex={0} />,
    });
    expect(style["color"]).toBe(testTheme.colors.popoverForeground);
    expect(style["backgroundColor"]).toBe(testTheme.colors.popover);

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
    const content = contentOf(rendered);
    expect(elementProp(content, "motion")).toStrictEqual(
      Option.some(view.motion),
    );

    expect(elementProp(content, "side")).toStrictEqual(Option.some(view.side));
    expect(elementProp(rendered, "open")).toStrictEqual(
      Option.some(view.mounted),
    );
    expect(elementProp(rendered, "onOpenChange")).toStrictEqual(
      Option.some(view.onOpenChange),
    );
  });

  it("takes no presses while the tip leaves", () => {
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

    expect(Object.hasOwn(resting, "pointerEvents")).toBe(false);
  });

  it("leaves the motion to the runtime when no view is resolved", () => {
    const content = contentOf(render(props));
    expect(elementProp(content, "motion")).toStrictEqual(Option.none());
    expect(elementProp(content, "side")).toStrictEqual(Option.some("right"));
  });
});

describe("TooltipProvider", () => {
  const providerOf = (props: TooltipProviderProps): ReactElement =>
    renderTooltipProvider(props);

  it("hands a group of tips the one timing it was given", () => {
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
