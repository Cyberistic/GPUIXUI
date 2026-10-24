/**
 * The components whose contribution is the element they produce.
 *
 * Their behaviour lives in `core/` and is already pinned there (`layout.test.ts`,
 * `style.test.ts`, `loading.test.ts`); what those suites cannot see is the piece
 * the *component* adds — which host element, which resolved chrome, which ARIA.
 * That is the seam this file guards.
 */

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
import type { SpinnerAccent } from "../core/loading.js";
import type { RuleSpec, TextTone } from "../core/style.js";
import type {
  ElevationLevel,
  PrimitiveTheme,
  RadiusStep,
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
import { renderText } from "./Text.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostTag,
} from "./testing/element.js";
import { clickEvent } from "./testing/event.js";

/** One property of the resolved `style` prop, still unknown. */
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
    // `elevationShadow` reads a name the scale does not carry as `md`, so the
    // shipped painter must paint that lift rather than a flat box: the recipe
    // indexed the level raw and dropped the class. `overlay` is reserved and
    // empty, and an absent level paints no lift at all.
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
    // `docs/grid.mdx` promises a non-finite count reads as one track. The core
    // resolver always did; the recipe did not, and an unresolved
    // `grid-cols-NaN` left the shipped grid with no template at all.
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
    // The bug guarded: an orientation is a stored layout choice — a saved
    // workspace's divider — so a name this release renamed or dropped arrives
    // as a string the union no longer names. `renderSeparator` read that name
    // twice and disagreed with itself: the recipe painted a **vertical**
    // hairline for anything that was not `horizontal`, while the caption branch
    // only dropped the caption for `vertical` — so the stale name painted a
    // row around two vertical rules, a caption with no rule to sit on. The axis
    // is resolved once, against the horizontal rule a region divider is drawn
    // in, so the stale name paints the tree an omitted default does.
    // The cast is the storage boundary: a saved orientation is a string.
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
    // The rule the caption sits between runs across, not up.
    const rule = expectSome(Arr.head(elementChildren(stored)));
    expect(numberIn(rule, "height")).toStrictEqual(
      Option.some(testTheme.borderWidth.thin),
    );
    expect(numberIn(rule, "width")).toStrictEqual(Option.none());
    // A shipped vertical rule still refuses the caption row it cannot carry.
    expect(
      elementChildren(
        renderSeparator({ orientation: "vertical", label: "or" }, testTheme),
      ),
    ).toEqual([]);
  });

  it("paint no caption for a caption that says nothing", () => {
    // The bug guarded: `label` is copy a caller fills from an i18n table as
    // often as a literal, and a missing row hands over `""` / `"   "`. A
    // labelled rule is a row of two rules around a `Text`, so a blank caption
    // drew the row's caption element — and the runtime lays a run of spaces out
    // as a full line (measured in `runtime/layout.runtime.test.tsx`), which
    // breaks a separator that reads as one hairline. A blank caption is no
    // caption, the rule `visibleCopy` already applies to a label's help and a
    // list row's description.
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
    // Bug guarded: `size` is a name a saved layout stores as often as a
    // literal, and it was indexed raw — `theme.spacing["roomy"]` is
    // `undefined`, so the spacer painted a **fixed** item with no side at all
    // (measured 0px beside a 12px `lg` one) instead of either of the two states
    // its API documents. The documented default for an omitted step is the
    // flexible filler, so a name the theme cannot paint reads as that default.
    // The cast is the storage boundary: a saved step is a string, not a union.
    const stored = renderSpacer(
      { size: "roomy" as keyof PrimitiveTheme["spacing"] },
      testTheme,
    );
    expect(stored).toStrictEqual(renderSpacer({}, testTheme));
    expect(numberIn(stored, "flexGrow")).toStrictEqual(Option.some(1));
    expect(numberIn(stored, "width")).toStrictEqual(Option.none());
    // A step the theme does paint is still the caller's.
    expect(
      numberIn(renderSpacer({ size: "md" }, testTheme), "width"),
    ).toStrictEqual(Option.some(testTheme.spacing.md));
  });

  it("lets a caller add a class to the gap a spacer draws", () => {
    // The bug guarded: `Spacer` was the one primitive without the caller's
    // `className` escape hatch, so a layout could not adjust the gap it owns.
    // The class is compiled after the fixed step and `style` is still last.
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
    // The bug guarded: a layout primitive painted one element and could not be
    // reached from outside. Measuring a region, holding its instance or naming
    // it for automation meant wrapping it in a `div` — and in a flex parent the
    // wrapper becomes the item, so a box that grows or stretches inside it has
    // to repeat its own flex facts on the wrapper and the layout measured is no
    // longer the layout the caller composed. The four layout primitives take
    // the runtime's own trio instead.
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
    // A primitive given neither still carries neither: the trio is the
    // caller's, not something the element invents.
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
    // The bug guarded: the area published no layout event for the element that
    // scrolls, so `ScrollProgress`/`ScrollFade` had to duplicate the viewport —
    // and lose its keyboard contract — to measure the box they read.
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
    // A tab stop with no role is a node the accessibility tree cannot hold, so
    // the unnamed viewport is a named group rather than a silent stop.
    expect(expectSome(hostProp(viewport, "role"))).toBe("group");
    expect(expectSome(hostProp(viewport, "aria-label"))).toBe(
      DEFAULT_SCROLL_NAME,
    );
  });

  it("declares the keyboard ring on the viewport that takes the stop", () => {
    // The bug guarded: the viewport was a tab stop with a keyboard contract
    // (arrows, PageUp/PageDown, Home/End) and declared no `focusVisible`, so a
    // keyboard reader who Tabbed into a scroller saw no cue at all — the one
    // focusable primitive in the package without a ring. The declaration sits
    // on the element that holds the focus, and a non-focusable viewport owes
    // neither the ring nor the stop.
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
    // The bug guarded: the page told a caller to keep `onScrollChange` "for a
    // restored offset", while the area handed out no way to set one — the
    // scroller is the element the renderer moves, so it has to be reachable.
    // `viewportTestId` addresses it in automation; `viewportRef` holds it in
    // application code.
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
    // The bug guarded: the composition scan read only direct children, so a
    // viewport grouped in a fragment (or a fragment inside one) was invisible
    // and the area wrapped the whole composition — heading and all — in a
    // second, implicit scroller.
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
    // The bug this guards: a group was only ever a row, so a column of
    // attached actions was impossible to build without hand-rolling the
    // silhouette outside the component.
    expect(
      styleProp(renderButtonGroup({}, testTheme), "flexDirection"),
    ).toStrictEqual(Option.some("row"));
    const vertical = renderButtonGroup({ orientation: "vertical" }, testTheme);
    expect(styleProp(vertical, "flexDirection")).toStrictEqual(
      Option.some("column"),
    );
    // A column shares one width: without `stretch` two text actions end at
    // different edges and the group reads as two unrelated buttons.
    expect(styleProp(vertical, "alignItems")).toStrictEqual(
      Option.some("stretch"),
    );
    expect(numberIn(vertical, "gap")).toStrictEqual(Option.some(0));
  });

  // Bug guarded: a toolbar is saved with its mode, and the mode had no
  // membership test — read raw, the class recipe's `attached` check was false
  // for a name this release does not carry, so a restored toolbar came back
  // **separated** (a gap and no clipped silhouette) although `attached` is the
  // documented default. The paint and the actions it wraps read one answer now.
  it("paints the documented mode for a stored name the union does not carry", () => {
    // The cast is the storage boundary: a saved mode is one string.
    const stored = renderButtonGroup(
      { mode: "segmented" as ButtonGroupMode },
      testTheme,
    );
    expect(numberIn(stored, "gap")).toStrictEqual(Option.some(0));
    expect(stringIn(stored, "overflow")).toStrictEqual(Option.some("hidden"));
    const actions =
      elementChildren(stored)[0] ?? expect.fail("the group wrapped no actions");
    expect(elementProp(actions, "value")).toStrictEqual(Option.some(true));
    // A stored axis reads as the documented horizontal row.
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
    // The bug guarded: `role` is content before it is a literal — a saved
    // markdown node or a restored inspector row carries the role it was written
    // with — and `ROLE_CLASS[name]` answered `undefined`, so the run asked the
    // compiler for `type-undefined` and painted no size, leading or weight at
    // all instead of the body role every run of text defaults to.
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
    // The bug guarded: `tone` is a stored choice as often as a literal — an
    // audit row, a saved message, a settings record — so a name a release
    // renamed resolved to no colour class at all. The run then inherited
    // whatever the surface behind it painted, instead of the `default` ink the
    // component documents.
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
    // The bug guarded: `align="end"` compiled to a declaration of `end`, a word
    // the pinned renderer does not parse (its text host reads `left`, `center`
    // and `right`, plus `start` as left) — handed `end` it paints the default,
    // so a right-aligned caption looked exactly like a left-aligned one.
    expect(
      stringIn(renderText({ align: "end" }, testTheme), "textAlign"),
    ).toStrictEqual(Option.some("right"));
    expect(
      stringIn(renderText({ align: "start" }, testTheme), "textAlign"),
    ).toStrictEqual(Option.some("left"));
  });

  it("paints a spinner accent name the table does not carry as the brand", () => {
    // The bug guarded: an unknown accent resolved to no colour class on every
    // dot, so the indicator painted nothing at all — a busy state a reader
    // cannot see, and no error anywhere.
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
    // Body copy is not a landmark; it must not invent a role.
    expect(
      hostProp(renderText({ role: "body" }, testTheme), "role"),
    ).toStrictEqual(Option.none());
  });

  it("clamps after a line count and truncates on one line", () => {
    // The bug: `clamp` resolved `lineClamp`, which GPUix 0.11.0 declares and
    // paints every line for (measured by the playground's `text-truncation`
    // probe: `clamp={2}` over five lines painted five). A clamp has to be a
    // definite box at the role's leading with the overflow hidden.
    const clamped = renderText({ clamp: 3 }, testTheme);
    expect(numberIn(clamped, "height")).toStrictEqual(
      Option.some(3 * testTheme.typography.body.lineHeight),
    );
    expect(expectSome(stringIn(clamped, "overflow"))).toBe("hidden");
    expect(expectSome(stringIn(clamped, "whiteSpace"))).toBe("normal");
    expect(numberIn(clamped, "lineClamp")).toStrictEqual(Option.none());
    // The height follows the role, not a fixed leading.
    const heading = renderText({ role: "h1", clamp: 1 }, testTheme);
    expect(numberIn(heading, "height")).toStrictEqual(
      Option.some(testTheme.typography.h1.lineHeight),
    );
    const truncated = renderText({ truncate: true }, testTheme);
    expect(expectSome(stringIn(truncated, "whiteSpace"))).toBe("nowrap");
    expect(stringIn(truncated, "lineClamp")).toStrictEqual(Option.none());
    expect(numberIn(truncated, "height")).toStrictEqual(Option.none());
  });

  it("paints an error in the measured status text role, not the solid fill", () => {
    // The bug: `destructive` is a *background* whose own label clears the
    // secondary floor; written as body text on the page it measured 3:1. Tokens
    // measure `destructiveSoftForeground` as page text on background and card,
    // so that is what an error message and an invalid label paint.
    const element = renderText({ tone: "destructive" }, testTheme);
    expect(stringIn(element, "color")).toStrictEqual(
      Option.some(testTheme.colors.destructiveSoftForeground),
    );
    expect(stringIn(element, "color")).not.toStrictEqual(
      Option.some(testTheme.colors.destructive),
    );
  });

  it("paints a brand-toned run in the derived brand text, not the fill role", () => {
    // The bug: `tone="primary"` resolved to `primary`, a fill role no text
    // contract measures — 4.30:1 on the base light `active` wash, 3.10:1 in
    // macOS dark. A brand-coloured run paints `brandText` like a link does.
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
    // The helper is only useful if a control can consume it: every control
    // takes `label` and writes the host's `aria-label` itself.
    const button = renderButton(
      { ...labelledBy("Email"), children: "Send" },
      testTheme,
      { focused: false },
    );
    expect(expectSome(hostProp(button, "aria-label"))).toBe("Email");
    // `Label` composes rather than renders, so its own contribution is the
    // column stack it asks for; the text inside is `Text`'s.
    expect(expectSome(elementProp(renderLabel({}), "direction"))).toBe(
      "column",
    );
  });

  it("makes the words that name a control its pointer target", () => {
    // The bug guarded: a label was inert, so pressing the words beside a field
    // did nothing. A browser gets click-to-focus from `for`/`htmlFor`; the
    // runtime has neither, but it exposes `focusElement`, so a label given its
    // control's ref is that control's pointer target. The frame is the element
    // that holds the press; the runtime case proves the words reach it.
    const pressed = vi.fn();
    const element = renderLabel({ description: "We never share it." }, pressed);
    expect(expectSome(hostTag(element))).toBe("div");
    expect(expectSome(stringIn(element, "cursor"))).toBe("pointer");
    expectSome(hostHandler(element, "onClick"))(clickEvent);
    expect(pressed).toHaveBeenCalledOnce();
    // The column the caller styled is still the label's own layout.
    const stack = elementChildren(element)[0] ?? expect.fail("no label column");
    expect(expectSome(elementProp(stack, "direction"))).toBe("column");
  });

  it("leaves a label with no target inert", () => {
    // The other direction: a label that names nothing must not become a press
    // target or a pointer cursor — reading the words is all it does, and the
    // runtime has no focus to move. No frame is added, so the tree is the
    // column the caller composes.
    const element = renderLabel({ description: "We never share it." });
    expect(hostTag(element)).toStrictEqual(Option.none());
    expect(expectSome(elementProp(element, "direction"))).toBe("column");
    expect(elementProp(element, "onClick")).toStrictEqual(Option.none());
  });

  it("stays inert while the control it names is disabled", () => {
    // A label holds the control's element, not its state, so a press would
    // otherwise move focus to a control that refuses every key. `disabled`
    // is the caller's own boolean, and it drops the press the same way a
    // disabled control installs no handler.
    const pressed = vi.fn();
    const element = renderLabel({ disabled: true }, pressed);
    expect(hostTag(element)).toStrictEqual(Option.none());
    expect(elementProp(element, "onClick")).toStrictEqual(Option.none());
    expect(pressed).not.toHaveBeenCalled();
  });

  it("hands back the description the label paints, when there is one", () => {
    // The bug guarded: `labelledBy(name)` wrote only the name, so the help a
    // visible `Label description` painted was announced to nobody — there is no
    // `aria-describedby`. Passing the same string gives the control the words;
    // the Checkbox suite proves a control consumes them.
    expect(labelledBy("Email")).toStrictEqual({ label: "Email" });
    expect(labelledBy("Email", "We never share it.")).toStrictEqual({
      label: "Email",
      description: "We never share it.",
    });
  });

  it("paints no help line for a description that says nothing", () => {
    // The bug guarded: the caption was painted for any string that was not
    // `undefined`, and a run of spaces lays out a whole line where `""` lays out
    // none (measured in a window) — so help that arrived from data blank added a
    // blank line under every name while the control announced nothing.
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
  it("pulses a skeleton rather than painting the surface it stands in for", () => {
    const opacities = Arr.map([0, 1], (step) =>
      expectSome(numberIn(renderSkeleton({}, testTheme, step), "opacity")),
    );
    expect(Arr.some(opacities, (opacity) => opacity < 1)).toBe(true);
    expect(new Set(opacities).size).toBeGreaterThan(1);
  });

  it("holds a skeleton on its resting frame when the reader asked for less motion", () => {
    // The bug guarded: the caller's preference reached nothing, so a reader who
    // asked not to see motion still got a block pulsing every 700 ms.
    const opacityAt = (step: number, reducedMotion?: boolean): number =>
      expectSome(
        numberIn(renderSkeleton({ reducedMotion }, testTheme, step), "opacity"),
      );
    const resting = opacityAt(0);
    expect(opacityAt(1)).not.toBe(resting);
    expect(opacityAt(1, true)).toBe(resting);
    expect(opacityAt(5, true)).toBe(resting);
  });

  it("holds a spinner's lit dot when the reader asked for less motion", () => {
    // The same rule on the second timed indicator: the dots stay a status
    // report, but no frame after the first is painted.
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
    // The bug: the missing side fell back to the body line height, so a
    // 40-wide avatar placeholder painted a 40x20 ellipse.
    const circle = renderSkeleton({ circle: true, width: 40 }, testTheme, 0);
    expect(expectSome(numberIn(circle, "width"))).toBe(40);
    expect(expectSome(numberIn(circle, "height"))).toBe(40);
    const tall = renderSkeleton({ circle: true, height: 24 }, testTheme, 0);
    expect(expectSome(numberIn(tall, "width"))).toBe(24);
    expect(expectSome(numberIn(tall, "height"))).toBe(24);
  });

  it("paints a skeleton box when a side it was given cannot be measured", () => {
    // The bug guarded: a placeholder's side is often a measurement, and `NaN`
    // reached `width`/`height` verbatim — a box the runtime paints as nothing,
    // which reads exactly like content that finished loading.
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
    // The bug guarded: a saved placeholder's radius arrived as a name a later
    // release dropped, so the recipe shipped an unsupported `rounded-<name>`
    // class and the block painted square while its page promised `sm`.
    const stored = "xl2" as RadiusStep; // the storage boundary
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
    // The provider's word names an unnamed indicator rather than leaving it an
    // unnamed status.
    const shipped = renderSpinner({}, testTheme, 0);
    expect(expectSome(hostProp(shipped, "role"))).toBe("status");
    expect(expectSome(hostProp(shipped, "aria-label"))).toBe("Loading");
  });

  it("paints a blank spinner label as decoration, not an unnamed status", () => {
    // Bug guarded: a blank label — deliberately (`Button`'s blank
    // `loadingLabel`) or through a translation table that answered nothing —
    // reached `aria-label={undefined}` while the node still declared
    // `role="status"`, so the window's accessibility tree carried a Status node
    // with no name: a reader walked into a status with nothing to announce.
    // Silence is decoration, the rule `Icon` follows for a blank label.
    Arr.forEach(["", "   "], (label) => {
      const element = renderSpinner({ label }, testTheme, 0);
      expect(expectSome(hostProp(element, "role"))).toBe("presentation");
      expect(Option.isNone(hostProp(element, "aria-label"))).toBe(true);
    });
  });

  it("sizes a spinner's dots from the icon scale, or from pixels", () => {
    // The bug guarded: `size` took a bare pixel count while every sibling
    // `size` prop in the package took a named step, so the documented way to
    // line a spinner up with the text beside it was to read `theme.iconSize.sm`
    // and pass the number back — a scale the caller had to find first.
    const dotSides = (size?: Parameters<typeof renderSpinner>[0]["size"]) =>
      Arr.map(elementChildren(renderSpinner({ size }, testTheme, 0)), (dot) =>
        expectSome(numberIn(dot, "width")),
      );
    expect(dotSides()).toStrictEqual(Arr.replicate(testTheme.iconSize.md, 3));
    expect(dotSides("sm")).toStrictEqual(
      Arr.replicate(testTheme.iconSize.sm, 3),
    );
    expect(dotSides(9)).toStrictEqual(Arr.replicate(9, 3));
  });

  it("reads a dot size it cannot paint as the default step", () => {
    // The bug: `size` also takes the number a caller measured, and it reached
    // `style.width`/`height` verbatim. A measurement that never arrived
    // (`NaN`), zero or a negative count paints no dot at all — the status is
    // still announced, so the indicator vanishes without a word. The icon
    // scale's own resolver already answers this case, so a spinner dot reads
    // the same as an icon.
    const dotSides = (size?: Parameters<typeof renderSpinner>[0]["size"]) =>
      Arr.map(elementChildren(renderSpinner({ size }, testTheme, 0)), (dot) =>
        expectSome(numberIn(dot, "width")),
      );
    Arr.forEach(
      [Number.NaN, Number.POSITIVE_INFINITY, 0, -8],
      (unpaintable) => {
        expect(dotSides(unpaintable)).toStrictEqual(
          Arr.replicate(testTheme.iconSize.md, 3),
        );
      },
    );
  });
});

describe("ButtonGroup's public surface", () => {
  it("exports both ordered indexes a persisted choice needs", () => {
    // The bug guarded: `ButtonGroup` gained a second axis while only the mode
    // index reached the package root, so a consumer persisting an orientation
    // could not name the choices it is allowed to store — the same dead end the
    // Select helpers had when a page taught symbols the root did not export.
    expect(primitives.BUTTON_GROUP_MODES).toStrictEqual([
      "attached",
      "separated",
    ]);
    expect(primitives.BUTTON_GROUP_ORIENTATIONS).toStrictEqual([
      "horizontal",
      "vertical",
    ]);
  });

  // An ordered index a consumer can persist beside the guard that reads it
  // back: the pair the tokens package keeps for every stored union.
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
