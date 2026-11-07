import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  brandText,
  brandTextSurfaces,
  contrastFloorsFor,
  contrastRatio,
  darkTheme,
  elevationShadow,
  lightTheme,
} from "@gpuixui/tokens";
import { testTheme } from "../core/testing/theme.fixture.js";
import { SPINNER_RING_TICKS, type SpinnerAccent } from "../core/loading.js";
import type { RuleSpec, TextTone } from "../core/style.js";
import type {
  ElevationLevel,
  PrimitiveTheme,
  RadiusStep,
  SpaceStep,
  TextRole,
} from "../core/theme.js";
import * as primitives from "../index.js";
import { renderBox } from "./Box.js";
import { renderButton } from "./Button.js";
import {
  renderButtonGroup,
  type ButtonGroupMode,
  type ButtonGroupOrientation,
} from "./ButtonGroup.js";
import { labelledBy, renderLabel } from "./Label.js";
import { renderMeter } from "./Meter.js";
import { renderProgress } from "./Progress.js";
import {
  DEFAULT_SCROLL_NAME,
  renderScrollArea,
  renderScrollAreaViewport,
  scrollPart,
  ScrollAreaViewport,
} from "./ScrollArea.js";
import { renderSeparator, renderSpacer } from "./Separator.js";
import { renderSkeleton } from "./Skeleton.js";
import { renderSpinner } from "./Spinner.js";
import { renderGrid, renderStack } from "./Stack.js";
import { renderText, type TextProps } from "./Text.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostTag,
} from "./testing/element.js";
import { clickEvent } from "./testing/event.js";

const styleProp = (
  element: ReactElement,
  name: string,
): Option.Option<unknown> =>
  Option.flatMap(hostProp(element, "style"), (style) =>
    Option.flatMap(
      Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))(
        style,
      ),
      (record) => Option.fromNullishOr(record[name]),
    ),
  );

const numberIn = (element: ReactElement, name: string): Option.Option<number> =>
  Option.flatMap(styleProp(element, name), (value) =>
    Schema.decodeUnknownOption(Schema.Number)(value),
  );

const stringIn = (element: ReactElement, name: string): Option.Option<string> =>
  Option.flatMap(styleProp(element, name), (value) =>
    Schema.decodeUnknownOption(Schema.String)(value),
  );

describe("layout containers", () => {
  it("are the runtime's one box, with the surface roles applied", () => {
    const filled = renderBox({ tone: "muted" }, testTheme);
    const bare = renderBox({ tone: "none" }, testTheme);
    expect(expectSome(hostTag(filled))).toBe("div");
    expect(expectSome(stringIn(filled, "backgroundColor"))).toBe(
      testTheme.colors.muted,
    );
    expect(styleProp(bare, "backgroundColor")).toStrictEqual(Option.none());
  });

  it("let one axis pad apart from the other, and paint a dashed edge", () => {
    const element = renderBox(
      {
        tone: "card",
        padding: "lg",
        paddingX: "sm",
        border: true,
        borderStyle: "dashed",
        aspectRatio: 2,
      },
      testTheme,
    );
    expect(styleProp(element, "padding")).toStrictEqual(Option.none());
    expect(numberIn(element, "paddingTop")).toStrictEqual(
      Option.some(testTheme.spacing.lg),
    );
    expect(numberIn(element, "paddingLeft")).toStrictEqual(
      Option.some(testTheme.spacing.sm),
    );
    expect(stringIn(element, "borderStyle")).toStrictEqual(
      Option.some("dashed"),
    );
    expect(numberIn(element, "aspectRatio")).toStrictEqual(Option.some(2));
  });

  it("lifts a box for a stored level name this release does not carry", () => {
    const shadow = (elevation: ElevationLevel): Option.Option<unknown> =>
      styleProp(renderBox({ tone: "card", elevation }, testTheme), "boxShadow");
    expect(shadow("raised" as ElevationLevel)).toStrictEqual(
      Option.some(elevationShadow(testTheme, "md")),
    );
    expect(shadow("overlay")).toStrictEqual(Option.none());
    expect(
      styleProp(renderBox({ tone: "card" }, testTheme), "boxShadow"),
    ).toStrictEqual(Option.none());
  });

  it("lay their children out in one direction, on the theme's spacing", () => {
    const element = renderStack(
      { direction: "row", gap: "xl", justify: "between" },
      testTheme,
    );
    expect(expectSome(hostTag(element))).toBe("div");
    expect(expectSome(stringIn(element, "flexDirection"))).toBe("row");
    expect(numberIn(element, "gap")).toStrictEqual(
      Option.some(testTheme.spacing.xl),
    );
  });

  it("use the runtime's numeric grid rather than track strings", () => {
    const element = renderGrid({ columns: 2, gap: "sm" }, testTheme);
    expect(expectSome(stringIn(element, "display"))).toBe("grid");
    expect(numberIn(element, "gridTemplateColumns")).toStrictEqual(
      Option.some(2),
    );
    expect(stringIn(element, "gridAutoFlow")).toStrictEqual(Option.none());
  });

  it("draws one track for a count the runtime cannot measure", () => {
    Arr.forEach(
      [
        { spec: { columns: Number.NaN }, columns: 1, rows: Option.none() },
        {
          spec: { columns: Number.POSITIVE_INFINITY },
          columns: 1,
          rows: Option.none(),
        },
        {
          spec: { columns: Number.NEGATIVE_INFINITY },
          columns: 1,
          rows: Option.none(),
        },
        {
          spec: { columns: 2, rows: Number.NaN },
          columns: 2,
          rows: Option.some(1),
        },
      ],
      ({ spec, columns, rows }) => {
        const element = renderGrid(spec, testTheme);
        expect(numberIn(element, "gridTemplateColumns")).toStrictEqual(
          Option.some(columns),
        );
        expect(numberIn(element, "gridTemplateRows")).toStrictEqual(rows);
      },
    );
  });

  it("let the caller's className override the grid recipe", () => {
    const element = renderGrid(
      { columns: 1, className: "grid-cols-3 gap-md" },
      testTheme,
    );
    expect(numberIn(element, "gridTemplateColumns")).toStrictEqual(
      Option.some(3),
    );
    expect(numberIn(element, "gap")).toStrictEqual(
      Option.some(testTheme.spacing.md),
    );
  });

  it("draw a rule on the border role, one border wide", () => {
    expect(
      numberIn(
        renderSeparator({ orientation: "vertical" }, testTheme),
        "width",
      ),
    ).toStrictEqual(Option.some(testTheme.borderWidth.thin));
    expect(
      numberIn(
        renderSeparator({ orientation: "horizontal" }, testTheme),
        "height",
      ),
    ).toStrictEqual(Option.some(testTheme.borderWidth.thin));
  });

  it("draws a stored orientation this release does not carry as the rule it defaults to", () => {
    const stored = renderSeparator(
      {
        orientation: "Horizontal" as RuleSpec["orientation"],
        label: "or",
      },
      testTheme,
    );
    expect(stored).toStrictEqual(
      renderSeparator({ orientation: "horizontal", label: "or" }, testTheme),
    );

    const rule = expectSome(Arr.head(elementChildren(stored)));
    expect(numberIn(rule, "height")).toStrictEqual(
      Option.some(testTheme.borderWidth.thin),
    );
    expect(numberIn(rule, "width")).toStrictEqual(Option.none());

    expect(
      elementChildren(
        renderSeparator({ orientation: "vertical", label: "or" }, testTheme),
      ),
    ).toEqual([]);
  });

  it("paint no caption for a caption that says nothing", () => {
    const blank = renderSeparator(
      { orientation: "horizontal", label: "   " },
      testTheme,
    );
    expect(elementChildren(blank)).toEqual([]);
    expect(numberIn(blank, "height")).toStrictEqual(
      Option.some(testTheme.borderWidth.thin),
    );

    const captioned = renderSeparator(
      { orientation: "horizontal", label: "or" },
      testTheme,
    );
    expect(elementChildren(captioned)).toHaveLength(3);
  });

  it("spacer either takes a fixed step or fills what is left", () => {
    expect(
      numberIn(renderSpacer({ size: "lg" }, testTheme), "width"),
    ).toStrictEqual(Option.some(testTheme.spacing.lg));
    expect(numberIn(renderSpacer({}, testTheme), "flexGrow")).toStrictEqual(
      Option.some(1),
    );
  });

  it("fills for a stored size name this release does not carry", () => {
    const stored = renderSpacer(
      { size: "roomy" as keyof PrimitiveTheme["spacing"] },
      testTheme,
    );
    expect(stored).toStrictEqual(renderSpacer({}, testTheme));
    expect(numberIn(stored, "flexGrow")).toStrictEqual(Option.some(1));
    expect(numberIn(stored, "width")).toStrictEqual(Option.none());

    expect(
      numberIn(renderSpacer({ size: "md" }, testTheme), "width"),
    ).toStrictEqual(Option.some(testTheme.spacing.md));
  });

  it("lets a caller add a class to the gap a spacer draws", () => {
    const element = renderSpacer({ size: "lg", className: "mt-1" }, testTheme);
    expect(numberIn(element, "marginTop")).toStrictEqual(Option.some(4));
    expect(numberIn(element, "width")).toStrictEqual(
      Option.some(testTheme.spacing.lg),
    );
    expect(
      numberIn(
        renderSpacer({ className: "mt-1", style: { marginTop: 9 } }, testTheme),
        "marginTop",
      ),
    ).toStrictEqual(Option.some(9));
  });

  it("forward the automation id the caller gave them", () => {
    const labelled = renderSeparator(
      { orientation: "horizontal", label: "or", testId: "labelled" },
      testTheme,
    );
    expect(
      Arr.map(
        [
          renderText({ testId: "text" }, testTheme),
          renderSeparator(
            { orientation: "vertical", testId: "rule" },
            testTheme,
          ),
          renderSpacer({ size: "lg", testId: "gap" }, testTheme),
          labelled,
        ],
        (element) => expectSome(hostProp(element, "testId")),
      ),
    ).toStrictEqual(["text", "rule", "gap", "labelled"]);
  });

  it("hand the runtime's host props to the element they paint", () => {
    const onLayout = () => {};
    const painted = [
      renderBox({ tone: "card", "aria-id": "box", onLayout }, testTheme),
      renderStack(
        { direction: "column", "aria-id": "stack", onLayout },
        testTheme,
      ),
      renderGrid({ columns: 2, "aria-id": "grid", onLayout }, testTheme),
      renderSpacer({ "aria-id": "spacer", onLayout }, testTheme),
    ];
    expect(
      Arr.map(painted, (element) => expectSome(hostProp(element, "aria-id"))),
    ).toStrictEqual(["box", "stack", "grid", "spacer"]);
    Arr.forEach(painted, (element) => {
      expect(hostProp(element, "onLayout")).toStrictEqual(
        Option.some(onLayout),
      );
    });

    expect(
      Arr.map(
        [
          renderBox({ tone: "card" }, testTheme),
          renderStack({ direction: "column" }, testTheme),
          renderGrid({ columns: 2 }, testTheme),
          renderSpacer({}, testTheme),
        ],
        (element) => hostProp(element, "onLayout"),
      ),
    ).toStrictEqual([
      Option.none(),
      Option.none(),
      Option.none(),
      Option.none(),
    ]);
  });

  it("hand a run of type its own element", () => {
    const onLayout = () => {};
    const hold = () => {};
    const text = renderText(
      { "aria-id": "text", onLayout, ref: hold },
      testTheme,
    );
    expect(expectSome(hostProp(text, "aria-id"))).toBe("text");
    expect(hostProp(text, "onLayout")).toStrictEqual(Option.some(onLayout));
    expect(hostProp(text, "ref")).toStrictEqual(Option.some(hold));

    const plain = renderText({}, testTheme);
    expect(hostProp(plain, "aria-id")).toStrictEqual(Option.none());
    expect(hostProp(plain, "onLayout")).toStrictEqual(Option.none());
    expect(hostProp(plain, "ref")).toStrictEqual(Option.none());
  });

  it("scroll only the axes they were asked for", () => {
    const viewport = (axis: "vertical" | "horizontal" | "both") =>
      renderScrollAreaViewport({}, scrollPart({ axis }, testTheme));
    const vertical = viewport("vertical");
    expect(expectSome(stringIn(vertical, "overflowY"))).toBe("scroll");
    expect(expectSome(stringIn(vertical, "overflowX"))).toBe("hidden");
    expect(expectSome(stringIn(viewport("both"), "overflowX"))).toBe("scroll");
  });

  it("keeps the frame's padding and radius off the viewport", () => {
    const root = renderScrollArea(
      { axis: "vertical", padding: "lg", radius: "md", border: true },
      testTheme,
    );
    expect(expectSome(numberIn(root, "padding"))).toBe(testTheme.spacing.lg);
    expect(expectSome(numberIn(root, "borderRadius"))).toBe(
      testTheme.radius.md,
    );
    const viewport = renderScrollAreaViewport(
      {},
      scrollPart({ axis: "vertical" }, testTheme),
    );
    expect(numberIn(viewport, "padding")).toStrictEqual(Option.none());
    expect(hostProp(viewport, "onScroll")).toStrictEqual(Option.none());
  });

  it("an implicit viewport carries the area's onScroll and thumb colour", () => {
    const onScroll = () => {};
    const onScrollChange = () => {};
    const part = scrollPart(
      { axis: "vertical", onScroll, onScrollChange, scrollbarWidth: 9 },
      testTheme,
    );
    const viewport = renderScrollAreaViewport({}, part);
    expect(hostProp(viewport, "onScroll")).toStrictEqual(Option.some(onScroll));
    expect(hostProp(viewport, "onScrollChange")).toStrictEqual(
      Option.some(onScrollChange),
    );
    expect(expectSome(stringIn(viewport, "scrollbarColor"))).toBe(
      testTheme.colors.scrollbar,
    );
    expect(expectSome(numberIn(viewport, "scrollbarWidth"))).toBe(9);
  });

  it("lets a scroll reading measure the scroller, and a composed viewport override it", () => {
    const areaLayout = () => {};
    const part = scrollPart(
      { axis: "vertical", onLayout: areaLayout },
      testTheme,
    );
    const implicit = renderScrollAreaViewport({}, part);
    expect(hostProp(implicit, "onLayout")).toStrictEqual(
      Option.some(areaLayout),
    );
    const ownLayout = () => {};
    const composed = renderScrollAreaViewport({ onLayout: ownLayout }, part);
    expect(hostProp(composed, "onLayout")).toStrictEqual(
      Option.some(ownLayout),
    );
  });

  it("makes the viewport a keyboard scroll region", () => {
    const part = scrollPart(
      { axis: "vertical", label: "Properties" },
      testTheme,
    );
    const viewport = renderScrollAreaViewport({}, part);
    expect(expectSome(hostProp(viewport, "tabIndex"))).toBe(0);
    expect(expectSome(hostProp(viewport, "role"))).toBe("group");
    expect(expectSome(hostProp(viewport, "aria-label"))).toBe("Properties");
  });

  it("names the unnamed viewport that takes the tab stop", () => {
    const viewport = renderScrollAreaViewport(
      {},
      scrollPart({ axis: "vertical" }, testTheme),
    );

    expect(expectSome(hostProp(viewport, "role"))).toBe("group");
    expect(expectSome(hostProp(viewport, "aria-label"))).toBe(
      DEFAULT_SCROLL_NAME,
    );
  });

  it("declares the keyboard ring on the viewport that takes the stop", () => {
    const focusable = renderScrollAreaViewport(
      {},
      scrollPart({ axis: "vertical" }, testTheme),
    );
    expect(styleProp(focusable, "focusVisible")).not.toStrictEqual(
      Option.none(),
    );
    const inert = renderScrollAreaViewport(
      { focusable: false },
      scrollPart({ axis: "vertical" }, testTheme),
    );
    expect(styleProp(inert, "focusVisible")).toStrictEqual(Option.none());
    expect(hostProp(inert, "tabIndex")).toStrictEqual(Option.none());
  });

  it("keeps a named region as a group without a tab stop", () => {
    const viewport = renderScrollAreaViewport(
      { focusable: false },
      scrollPart({ axis: "vertical", label: "Properties" }, testTheme),
    );
    expect(hostProp(viewport, "tabIndex")).toStrictEqual(Option.none());
    expect(expectSome(hostProp(viewport, "role"))).toBe("group");
    expect(expectSome(hostProp(viewport, "aria-label"))).toBe("Properties");
  });

  it("opts out of the tab stop without losing the absolute-offset callback", () => {
    const onScrollChange = () => {};
    const viewport = renderScrollAreaViewport(
      { focusable: false },
      scrollPart({ axis: "vertical", onScrollChange }, testTheme),
    );
    expect(hostProp(viewport, "tabIndex")).toStrictEqual(Option.none());
    expect(hostProp(viewport, "role")).toStrictEqual(Option.none());
    expect(hostProp(viewport, "aria-label")).toStrictEqual(Option.none());
    expect(hostProp(viewport, "onScrollChange")).toStrictEqual(
      Option.some(onScrollChange),
    );
  });

  it("wraps plain children in one implicit viewport", () => {
    const content = <div />;
    const root = renderScrollArea(
      { axis: "vertical", viewportTestId: "scroller", children: content },
      testTheme,
    );
    const provider =
      elementChildren(root)[0] ?? expect.fail("the area drew nothing");
    const viewport =
      elementChildren(provider)[0] ??
      expect.fail("the area carried no viewport");
    expect(viewport.type).toBe(ScrollAreaViewport);
    expect(expectSome(elementProp(viewport, "testId"))).toBe("scroller");
    expect(expectSome(elementProp(viewport, "children"))).toBe(content);
  });

  it("hands the implicit viewport to the caller's ref", () => {
    const viewportRef = () => {};
    const root = renderScrollArea(
      { axis: "vertical", viewportRef, children: <div /> },
      testTheme,
    );
    const provider =
      elementChildren(root)[0] ?? expect.fail("the area drew nothing");
    const viewport =
      elementChildren(provider)[0] ??
      expect.fail("the area carried no viewport");
    expect(viewport.type).toBe(ScrollAreaViewport);
    expect(expectSome(elementProp(viewport, "ref"))).toBe(viewportRef);
  });

  it("keeps the caller's composition while providing the scroll context", () => {
    const root = renderScrollArea(
      {
        axis: "vertical",
        children: <ScrollAreaViewport testId="scroller" />,
      },
      testTheme,
    );
    const provider =
      elementChildren(root)[0] ?? expect.fail("the area drew nothing");
    const viewport =
      elementChildren(provider)[0] ??
      expect.fail("the area carried no viewport");
    expect(viewport.type).toBe(ScrollAreaViewport);
    expect(expectSome(elementProp(viewport, "testId"))).toBe("scroller");
  });

  it("finds the caller's viewport inside a fragment", () => {
    const root = renderScrollArea(
      {
        axis: "vertical",
        viewportTestId: "implicit",
        children: (
          <>
            <div />
            <>
              <ScrollAreaViewport testId="scroller" />
            </>
          </>
        ),
      },
      testTheme,
    );
    const provider =
      elementChildren(root)[0] ?? expect.fail("the area drew nothing");
    const composed = elementChildren(provider);
    expect(composed).toHaveLength(2);
    const viewport =
      composed[1] ??
      expect.fail("the composition dropped the caller's viewport");
    expect(viewport.type).toBe(ScrollAreaViewport);
    expect(expectSome(elementProp(viewport, "testId"))).toBe("scroller");
  });

  it("group related buttons under one role", () => {
    const attached = renderButtonGroup({ mode: "attached" }, testTheme);
    expect(expectSome(hostProp(attached, "role"))).toBe("group");
    expect(numberIn(attached, "gap")).toStrictEqual(Option.some(0));
    expect(
      numberIn(renderButtonGroup({ mode: "separated" }, testTheme), "gap"),
    ).toStrictEqual(Option.some(testTheme.spacing.sm));
  });

  it("lays its actions on the axis it is given", () => {
    expect(
      styleProp(renderButtonGroup({}, testTheme), "flexDirection"),
    ).toStrictEqual(Option.some("row"));
    const vertical = renderButtonGroup({ orientation: "vertical" }, testTheme);
    expect(styleProp(vertical, "flexDirection")).toStrictEqual(
      Option.some("column"),
    );

    expect(styleProp(vertical, "alignItems")).toStrictEqual(
      Option.some("stretch"),
    );
    expect(numberIn(vertical, "gap")).toStrictEqual(Option.some(0));
  });

  it("paints the documented mode for a stored name the union does not carry", () => {
    const stored = renderButtonGroup(
      { mode: "segmented" as ButtonGroupMode },
      testTheme,
    );
    expect(numberIn(stored, "gap")).toStrictEqual(Option.some(0));
    expect(stringIn(stored, "overflow")).toStrictEqual(Option.some("hidden"));
    const actions =
      elementChildren(stored)[0] ?? expect.fail("the group wrapped no actions");
    expect(elementProp(actions, "value")).toStrictEqual(Option.some(true));

    const row = renderButtonGroup(
      { orientation: "diagonal" as ButtonGroupOrientation },
      testTheme,
    );
    expect(styleProp(row, "flexDirection")).toStrictEqual(Option.some("row"));
  });

  it("give the group a name when it is labelled", () => {
    const named = renderButtonGroup(
      { mode: "attached", label: "Text alignment" },
      testTheme,
    );
    expect(expectSome(hostProp(named, "aria-label"))).toBe("Text alignment");
    expect(
      hostProp(
        renderButtonGroup({ mode: "attached" }, testTheme),
        "aria-label",
      ),
    ).toStrictEqual(Option.none());
  });

  it("paints the documented gap for a stored step the theme does not carry", () => {
    const stored: ReadonlyArray<SpaceStep | null> = [null, "huge" as SpaceStep];
    Arr.forEach(stored, (gap) => {
      expect(
        numberIn(
          renderButtonGroup({ mode: "separated", gap }, testTheme),
          "gap",
        ),
        String(gap),
      ).toStrictEqual(Option.some(testTheme.spacing.sm));
    });

    expect(
      numberIn(
        renderButtonGroup({ mode: "separated", gap: "lg" }, testTheme),
        "gap",
      ),
    ).toStrictEqual(Option.some(testTheme.spacing.lg));
    expect(
      numberIn(
        renderButtonGroup({ mode: "attached", gap: "lg" }, testTheme),
        "gap",
      ),
    ).toStrictEqual(Option.some(0));
  });

  it("hands a group of actions its own element", () => {
    const onLayout = () => {};
    const hold = () => {};
    const group = renderButtonGroup(
      { label: "Text alignment", "aria-id": "toolbar", onLayout, ref: hold },
      testTheme,
    );
    expect(expectSome(hostProp(group, "aria-id"))).toBe("toolbar");
    expect(hostProp(group, "onLayout")).toStrictEqual(Option.some(onLayout));
    expect(hostProp(group, "ref")).toStrictEqual(Option.some(hold));

    const plain = renderButtonGroup({}, testTheme);
    expect(hostProp(plain, "aria-id")).toStrictEqual(Option.none());
    expect(hostProp(plain, "onLayout")).toStrictEqual(Option.none());
    expect(hostProp(plain, "ref")).toStrictEqual(Option.none());
  });
});

describe("type", () => {
  it("is the runtime's single text element, whatever the role", () => {
    const element = renderText({ role: "h2" }, testTheme);
    expect(expectSome(hostTag(element))).toBe("text");
    expect(numberIn(element, "fontSize")).toStrictEqual(
      Option.some(testTheme.typography.h2.fontSize),
    );
  });

  it("paints a role name the scale does not carry as the body role", () => {
    const stored = renderText({ role: "h4" as TextRole }, testTheme);
    const fallback = renderText({ role: "body" }, testTheme);
    expect(numberIn(stored, "fontSize")).toStrictEqual(
      numberIn(fallback, "fontSize"),
    );
    expect(numberIn(stored, "lineHeight")).toStrictEqual(
      numberIn(fallback, "lineHeight"),
    );
    expect(numberIn(stored, "fontWeight")).toStrictEqual(
      numberIn(fallback, "fontWeight"),
    );
  });

  it("paints a tone name the table does not carry as the default tone", () => {
    const stored = renderText({ tone: "critical" as TextTone }, testTheme);
    const fallback = renderText({ tone: "default" }, testTheme);
    expect(expectSome(stringIn(stored, "color"))).toBe(
      expectSome(stringIn(fallback, "color")),
    );
    expect(expectSome(stringIn(stored, "color"))).toBe(
      testTheme.colors.foreground,
    );
  });

  it("aligns a run in the runtime's grammar, not the API's name", () => {
    expect(
      stringIn(renderText({ align: "end" }, testTheme), "textAlign"),
    ).toStrictEqual(Option.some("right"));
    expect(
      stringIn(renderText({ align: "start" }, testTheme), "textAlign"),
    ).toStrictEqual(Option.some("left"));
  });

  it("paints a spinner accent name the table does not carry as the brand", () => {
    const stored = renderSpinner(
      { accent: "brand" as SpinnerAccent },
      testTheme,
      0,
    );
    const fallback = renderSpinner({ accent: "primary" }, testTheme, 0);
    const dotOf = (element: ReactElement): ReactElement =>
      elementChildren(element)[0] ?? expect.fail("the spinner drew no dot");
    expect(expectSome(stringIn(dotOf(stored), "backgroundColor"))).toBe(
      expectSome(stringIn(dotOf(fallback), "backgroundColor")),
    );
    expect(expectSome(stringIn(dotOf(stored), "backgroundColor"))).toBe(
      testTheme.colors.primary,
    );
  });

  it("carries the semantics of a heading or code role", () => {
    const h1 = renderText({ role: "h1", children: "Title" }, testTheme);
    expect(expectSome(hostProp(h1, "role"))).toBe("heading");
    expect(expectSome(hostProp(h1, "aria-level"))).toBe(1);
    expect(expectSome(hostProp(h1, "aria-label"))).toBe("Title");
    expect(
      expectSome(hostProp(renderText({ role: "h3" }, testTheme), "aria-level")),
    ).toBe(3);
    expect(
      expectSome(hostProp(renderText({ role: "code" }, testTheme), "role")),
    ).toBe("code");

    expect(
      hostProp(renderText({ role: "body" }, testTheme), "role"),
    ).toStrictEqual(Option.none());
  });

  it("clamps after a line count and truncates on one line", () => {
    const clamped = renderText({ clamp: 3 }, testTheme);
    expect(numberIn(clamped, "height")).toStrictEqual(
      Option.some(3 * testTheme.typography.body.lineHeight),
    );
    expect(expectSome(stringIn(clamped, "overflow"))).toBe("hidden");
    expect(expectSome(stringIn(clamped, "whiteSpace"))).toBe("normal");
    expect(numberIn(clamped, "lineClamp")).toStrictEqual(Option.none());

    const heading = renderText({ role: "h1", clamp: 1 }, testTheme);
    expect(numberIn(heading, "height")).toStrictEqual(
      Option.some(testTheme.typography.h1.lineHeight),
    );
    const truncated = renderText({ truncate: true }, testTheme);
    expect(expectSome(stringIn(truncated, "whiteSpace"))).toBe("nowrap");
    expect(stringIn(truncated, "lineClamp")).toStrictEqual(Option.none());
    expect(numberIn(truncated, "height")).toStrictEqual(Option.none());
  });

  it("paints a stored clamp of null as no clamp, not as one line", () => {
    const stored = { clamp: null } as unknown as TextProps;
    const element = renderText(stored, testTheme);
    expect(numberIn(element, "height")).toStrictEqual(Option.none());
    expect(stringIn(element, "overflow")).toStrictEqual(Option.none());
    expect(stringIn(element, "whiteSpace")).toStrictEqual(Option.none());

    expect(
      numberIn(renderText({ clamp: Number.NaN }, testTheme), "height"),
    ).toStrictEqual(Option.some(testTheme.typography.body.lineHeight));
  });

  it("paints an error in the measured status text role, not the solid fill", () => {
    const element = renderText({ tone: "destructive" }, testTheme);
    expect(stringIn(element, "color")).toStrictEqual(
      Option.some(testTheme.colors.destructiveSoftForeground),
    );
    expect(stringIn(element, "color")).not.toStrictEqual(
      Option.some(testTheme.colors.destructive),
    );
  });

  it("paints a brand-toned run in the derived brand text, not the fill role", () => {
    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      const colour = expectSome(
        stringIn(renderText({ tone: "primary" }, theme), "color"),
      );
      expect(colour).toBe(brandText(theme));
      Arr.forEach(brandTextSurfaces, (surface) => {
        expect(
          contrastRatio(colour, theme.colors[surface]) ?? 0,
        ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).secondary);
      });
    });
  });

  it("hands a control its name, because GPUix has no aria-labelledby", () => {
    const button = renderButton(
      { ...labelledBy("Email"), children: "Send" },
      testTheme,
      { focused: false },
    );
    expect(expectSome(hostProp(button, "aria-label"))).toBe("Email");

    expect(expectSome(elementProp(renderLabel({}), "direction"))).toBe(
      "column",
    );
  });

  it("makes the words that name a control its pointer target", () => {
    const pressed = vi.fn();
    const element = renderLabel({ description: "We never share it." }, pressed);
    expect(expectSome(hostTag(element))).toBe("div");
    expect(expectSome(stringIn(element, "cursor"))).toBe("pointer");
    expectSome(hostHandler(element, "onClick"))(clickEvent);
    expect(pressed).toHaveBeenCalledOnce();

    const stack = elementChildren(element)[0] ?? expect.fail("no label column");
    expect(expectSome(elementProp(stack, "direction"))).toBe("column");
  });

  it("leaves a label with no target inert", () => {
    const element = renderLabel({ description: "We never share it." });
    expect(hostTag(element)).toStrictEqual(Option.none());
    expect(expectSome(elementProp(element, "direction"))).toBe("column");
    expect(elementProp(element, "onClick")).toStrictEqual(Option.none());
  });

  it("stays inert while the control it names is disabled", () => {
    const pressed = vi.fn();
    const element = renderLabel({ disabled: true }, pressed);
    expect(hostTag(element)).toStrictEqual(Option.none());
    expect(elementProp(element, "onClick")).toStrictEqual(Option.none());
    expect(pressed).not.toHaveBeenCalled();
  });

  it("hands back the description the label paints, when there is one", () => {
    expect(labelledBy("Email")).toStrictEqual({ label: "Email" });
    expect(labelledBy("Email", "We never share it.")).toStrictEqual({
      label: "Email",
      description: "We never share it.",
    });
  });

  it("paints no help line for a description that says nothing", () => {
    expect(elementChildren(renderLabel({ description: "   " }))).toHaveLength(
      1,
    );
    expect(elementChildren(renderLabel({ description: "" }))).toHaveLength(1);
    const written = renderLabel({ description: "We never share it." });
    expect(elementChildren(written)).toHaveLength(2);
    const help = elementChildren(written)[1] ?? expect.fail("no help line");
    expect(expectSome(elementProp(help, "children"))).toBe(
      "We never share it.",
    );
  });
});

describe("loading", () => {
  it("hand the runtime's host props to the status leaves they paint", () => {
    const onLayout = () => {};
    const hold = () => {};
    const painted = [
      renderProgress(
        { value: 40, "aria-id": "progress", onLayout, ref: hold },
        testTheme,
        0,
      ),
      renderMeter(
        { value: 4, max: 8, "aria-id": "meter", onLayout, ref: hold },
        testTheme,
      ),
      renderSkeleton(
        { "aria-id": "skeleton", onLayout, ref: hold },
        testTheme,
        0,
      ),
      renderSpinner(
        { "aria-id": "spinner", onLayout, ref: hold },
        testTheme,
        0,
      ),
    ];
    expect(
      Arr.map(painted, (element) => expectSome(hostProp(element, "aria-id"))),
    ).toStrictEqual(["progress", "meter", "skeleton", "spinner"]);
    Arr.forEach(painted, (element) => {
      expect(hostProp(element, "onLayout")).toStrictEqual(
        Option.some(onLayout),
      );
      expect(hostProp(element, "ref")).toStrictEqual(Option.some(hold));
    });

    expect(
      Arr.map(
        [
          renderProgress({ value: 40 }, testTheme, 0),
          renderMeter({ value: 4 }, testTheme),
          renderSkeleton({}, testTheme, 0),
          renderSpinner({}, testTheme, 0),
        ],
        (element) => hostProp(element, "onLayout"),
      ),
    ).toStrictEqual([
      Option.none(),
      Option.none(),
      Option.none(),
      Option.none(),
    ]);
  });

  it("pulses a skeleton rather than painting the surface it stands in for", () => {
    const opacities = Arr.map([0, 1], (step) =>
      expectSome(numberIn(renderSkeleton({}, testTheme, step), "opacity")),
    );
    expect(Arr.some(opacities, (opacity) => opacity < 1)).toBe(true);
    expect(new Set(opacities).size).toBeGreaterThan(1);
  });

  it("holds a skeleton on its resting frame when the reader asked for less motion", () => {
    const opacityAt = (step: number, reducedMotion?: boolean): number =>
      expectSome(
        numberIn(renderSkeleton({ reducedMotion }, testTheme, step), "opacity"),
      );
    const resting = opacityAt(0);
    expect(opacityAt(1)).not.toBe(resting);
    expect(opacityAt(1, true)).toBe(resting);
    expect(opacityAt(5, true)).toBe(resting);
  });

  it("holds a spinner's arc when the reader asked for less motion", () => {
    const opacitiesAt = (
      step: number,
      reducedMotion?: boolean,
    ): ReadonlyArray<number> =>
      Arr.map(
        elementChildren(renderSpinner({ reducedMotion }, testTheme, step)),
        (dot) => expectSome(numberIn(dot, "opacity")),
      );
    const resting = opacitiesAt(0);
    expect(opacitiesAt(1)).not.toStrictEqual(resting);
    expect(opacitiesAt(1, true)).toStrictEqual(resting);
    expect(opacitiesAt(7, true)).toStrictEqual(resting);
  });

  it("keeps a skeleton circle round with only one side given", () => {
    const circle = renderSkeleton({ circle: true, width: 40 }, testTheme, 0);
    expect(expectSome(numberIn(circle, "width"))).toBe(40);
    expect(expectSome(numberIn(circle, "height"))).toBe(40);
    const tall = renderSkeleton({ circle: true, height: 24 }, testTheme, 0);
    expect(expectSome(numberIn(tall, "width"))).toBe(24);
    expect(expectSome(numberIn(tall, "height"))).toBe(24);
  });

  it("paints a skeleton box when a side it was given cannot be measured", () => {
    const block = renderSkeleton({ width: Number.NaN }, testTheme, 0);
    expect(expectSome(stringIn(block, "width"))).toBe("100%");
    expect(expectSome(numberIn(block, "height"))).toBe(
      testTheme.typography.body.lineHeight,
    );
    const circle = renderSkeleton(
      { circle: true, width: Number.POSITIVE_INFINITY },
      testTheme,
      0,
    );
    expect(expectSome(numberIn(circle, "width"))).toBe(
      testTheme.typography.body.lineHeight,
    );
    expect(expectSome(numberIn(circle, "height"))).toBe(
      testTheme.typography.body.lineHeight,
    );
  });

  it("keeps the corner its page documents for a stored radius name", () => {
    const stored = "xl2" as RadiusStep;
    expect(
      expectSome(
        numberIn(
          renderSkeleton({ radius: stored }, testTheme, 0),
          "borderRadius",
        ),
      ),
    ).toBe(testTheme.radius.sm);
    expect(
      numberIn(renderSkeleton({ radius: "lg" }, testTheme, 0), "borderRadius"),
    ).toStrictEqual(Option.some(testTheme.radius.lg));
  });

  it("announces a spinner by role and name", () => {
    const element = renderSpinner({ label: "Saving" }, testTheme, 0);
    expect(expectSome(hostProp(element, "role"))).toBe("status");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Saving");

    const shipped = renderSpinner({}, testTheme, 0);
    expect(expectSome(hostProp(shipped, "role"))).toBe("status");
    expect(expectSome(hostProp(shipped, "aria-label"))).toBe("Loading");
  });

  it("paints a blank spinner label as decoration, not an unnamed status", () => {
    Arr.forEach(["", "   "], (label) => {
      const element = renderSpinner({ label }, testTheme, 0);
      expect(expectSome(hostProp(element, "role"))).toBe("presentation");
      expect(Option.isNone(hostProp(element, "aria-label"))).toBe(true);
    });
  });

  it("sizes a spinner's ring from the icon scale, or from pixels", () => {
    const ringOf = (size?: Parameters<typeof renderSpinner>[0]["size"]) => {
      const element = renderSpinner({ size }, testTheme, 0);
      return {
        width: expectSome(numberIn(element, "width")),
        height: expectSome(numberIn(element, "height")),
        ticks: elementChildren(element).length,
      };
    };
    expect(ringOf()).toEqual({
      width: testTheme.iconSize.md,
      height: testTheme.iconSize.md,
      ticks: SPINNER_RING_TICKS,
    });
    expect(ringOf("sm")).toEqual({
      width: testTheme.iconSize.sm,
      height: testTheme.iconSize.sm,
      ticks: SPINNER_RING_TICKS,
    });
    expect(ringOf(9)).toEqual({
      width: 9,
      height: 9,
      ticks: SPINNER_RING_TICKS,
    });
  });

  it("reads a ring size it cannot paint as the default step", () => {
    const ringOf = (size?: Parameters<typeof renderSpinner>[0]["size"]) => {
      const element = renderSpinner({ size }, testTheme, 0);
      return [
        expectSome(numberIn(element, "width")),
        expectSome(numberIn(element, "height")),
      ];
    };
    Arr.forEach(
      [Number.NaN, Number.POSITIVE_INFINITY, 0, -8],
      (unpaintable) => {
        expect(ringOf(unpaintable)).toStrictEqual([
          testTheme.iconSize.md,
          testTheme.iconSize.md,
        ]);
      },
    );
  });
});

describe("ButtonGroup's public surface", () => {
  it("exports both ordered indexes a persisted choice needs", () => {
    expect(primitives.BUTTON_GROUP_MODES).toStrictEqual([
      "attached",
      "separated",
    ]);
    expect(primitives.BUTTON_GROUP_ORIENTATIONS).toStrictEqual([
      "horizontal",
      "vertical",
    ]);
  });

  it("guards both choices and answers the documented default", () => {
    expect(primitives.isButtonGroupMode("separated")).toBe(true);
    expect(primitives.isButtonGroupMode("segmented")).toBe(false);
    expect(primitives.buttonGroupModeOf("segmented")).toBe("attached");
    expect(primitives.buttonGroupModeOf(undefined)).toBe("attached");

    expect(primitives.isButtonGroupOrientation("vertical")).toBe(true);
    expect(primitives.isButtonGroupOrientation("diagonal")).toBe(false);
    expect(primitives.buttonGroupOrientationOf("diagonal")).toBe("horizontal");
    expect(primitives.buttonGroupOrientationOf(42)).toBe("horizontal");
  });
});
