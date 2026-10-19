/**
 * The components whose contribution is the element they produce.
 *
 * Their behaviour lives in `core/` and is already pinned there (`layout.test.ts`,
 * `style.test.ts`, `loading.test.ts`); what those suites cannot see is the piece
 * the *component* adds — which host element, which resolved chrome, which ARIA.
 * That is the seam this file guards.
 */

import type { ReactElement } from "react";
import type { LinearGradientBackground } from "@gpuix/react";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderBox } from "./Box.js";
import { renderButton } from "./Button.js";
import { renderButtonGroup } from "./ButtonGroup.js";
import { labelledBy, renderLabel } from "./Label.js";
import { renderScrollArea } from "./ScrollArea.js";
import { renderSeparator, renderSpacer } from "./Separator.js";
import { renderSkeleton } from "./Skeleton.js";
import { renderSpinner } from "./Spinner.js";
import { renderGrid, renderStack } from "./Stack.js";
import { renderText, textSemantics } from "./Text.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostProp,
  hostTag,
} from "./testing/element.js";

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

  it("removes the content floor from a box that may shrink", () => {
    // The bug guarded (plan 607): `shrink` reached the tree as `flexShrink: 1`
    // only, while the runtime's automatic minimum size still capped the box at
    // its content's size.
    const plain = renderBox({ tone: "none" }, testTheme);
    expect(styleProp(plain, "minWidth")).toStrictEqual(Option.none());
    expect(styleProp(plain, "minHeight")).toStrictEqual(Option.none());
    const shrinking = renderBox({ tone: "none", shrink: true }, testTheme);
    expect(styleProp(shrinking, "minWidth")).toStrictEqual(Option.some(0));
    expect(styleProp(shrinking, "minHeight")).toStrictEqual(Option.some(0));
  });

  it("keeps a two-stop gradient the caller passes through style", () => {
    // The bug guarded (plan 342): the docs claimed the runtime is solid-only,
    // but `background` takes a two-stop gradient and `style` is merged last.
    const background: LinearGradientBackground = {
      type: "linear-gradient",
      angle: 90,
      stops: [
        { color: testTheme.colors.primary, position: 0 },
        { color: testTheme.colors.accent, position: 1 },
      ],
    };
    const element = renderBox(
      { tone: "card", style: { background } },
      testTheme,
    );
    expect(styleProp(element, "background")).toStrictEqual(
      Option.some(background),
    );
    // The tonal fill is a separate field and still resolves underneath.
    expect(expectSome(stringIn(element, "backgroundColor"))).toBe(
      testTheme.colors.card,
    );
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

  it("carry the runtime's track minimums on the resolved style", () => {
    // The bug guarded (plan 376): the grid hid `gridColumnMin`/`gridRowMin`, so
    // a content-sized label column was unreachable from the public API.
    const content = renderGrid(
      { columns: 2, columnMin: "max-content", rows: 2, rowMin: "min-content" },
      testTheme,
    );
    expect(expectSome(stringIn(content, "gridColumnMin"))).toBe("max-content");
    expect(expectSome(stringIn(content, "gridRowMin"))).toBe("min-content");
    const plain = renderGrid({ columns: 2 }, testTheme);
    expect(stringIn(plain, "gridColumnMin")).toStrictEqual(Option.none());
    expect(stringIn(plain, "gridRowMin")).toStrictEqual(Option.none());
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

  it("stretch a rule across the stack's cross axis", () => {
    // The bug guarded (plan 381): the rule's cross axis was auto, so under a
    // `start`/`center`/`end` stack it painted zero — a vertical divider in a
    // centred toolbar was invisible. Both orientations now stretch.
    expect(
      stringIn(
        renderSeparator({ orientation: "vertical" }, testTheme),
        "alignSelf",
      ),
    ).toStrictEqual(Option.some("stretch"));
    expect(
      stringIn(
        renderSeparator({ orientation: "horizontal" }, testTheme),
        "alignSelf",
      ),
    ).toStrictEqual(Option.some("stretch"));
  });

  it("keeps a rule whole when its caption says nothing", () => {
    // The bug guarded (plan 577): the labelled branch was chosen whenever
    // `label` was present, so `<Separator label="   ">` painted two rules with
    // a `sm` gap around an empty caption — a hole in the divider. A blank
    // caption is not a caption, like every other blank string in the package
    // (plans 026, 396, 500).
    const blank = renderSeparator(
      { orientation: "horizontal", label: "   " },
      testTheme,
    );
    expect(stringIn(blank, "display")).toStrictEqual(Option.none());
    expect(elementChildren(blank)).toStrictEqual([]);
    const labelled = renderSeparator(
      { orientation: "horizontal", label: "Advanced" },
      testTheme,
    );
    expect(expectSome(stringIn(labelled, "display"))).toBe("flex");
  });

  it("put a labelled separator's caller style on the control, not its rules", () => {
    // The bug guarded (plan 364): `style` was merged into the shared rule object
    // and spread onto both halves, so a container property landed twice while
    // the element the caller named (`testId` on the root) never moved.
    const element = renderSeparator(
      {
        orientation: "horizontal",
        label: "Advanced",
        style: { marginTop: 40 },
      },
      testTheme,
    );
    expect(numberIn(element, "marginTop")).toStrictEqual(Option.some(40));
    const rules = Arr.filter(elementChildren(element), (child) =>
      Option.isSome(hostTag(child)),
    );
    expect(rules.length).toBeGreaterThan(0);
    expect(Arr.map(rules, (rule) => numberIn(rule, "marginTop"))).toStrictEqual(
      Arr.map(rules, () => Option.none()),
    );
  });

  it("spacer either takes a fixed step or fills what is left", () => {
    // The bug guarded (plan 382): the fixed form set width *and* height, so a
    // horizontal gap also set its row's height. It is the main-axis size now.
    const fixed = renderSpacer({ size: "lg" }, testTheme);
    expect(numberIn(fixed, "flexBasis")).toStrictEqual(
      Option.some(testTheme.spacing.lg),
    );
    expect(numberIn(fixed, "width")).toStrictEqual(Option.none());
    expect(numberIn(fixed, "height")).toStrictEqual(Option.none());
    expect(numberIn(renderSpacer({}, testTheme), "flexGrow")).toStrictEqual(
      Option.some(1),
    );
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

  it("scroll only the axes they were asked for", () => {
    const vertical = renderScrollArea({ axis: "vertical" }, testTheme);
    expect(expectSome(stringIn(vertical, "overflowY"))).toBe("scroll");
    expect(expectSome(stringIn(vertical, "overflowX"))).toBe("hidden");
    expect(
      expectSome(
        stringIn(renderScrollArea({ axis: "both" }, testTheme), "overflowX"),
      ),
    ).toBe("scroll");
  });

  it("group related buttons under one role", () => {
    const attached = renderButtonGroup({ mode: "attached" }, testTheme);
    expect(expectSome(hostProp(attached, "role"))).toBe("group");
    expect(numberIn(attached, "gap")).toStrictEqual(Option.some(0));
    expect(
      numberIn(renderButtonGroup({ mode: "separated" }, testTheme), "gap"),
    ).toStrictEqual(Option.some(testTheme.spacing.sm));
  });

  it("lay a row by default and a column when vertical", () => {
    // The gap guarded (plan 096): every other group takes `orientation`, but
    // ButtonGroup was hard-coded to one centred row, so a vertical action stack
    // hugged each label instead of filling the group.
    const horizontal = renderButtonGroup({}, testTheme);
    expect(expectSome(stringIn(horizontal, "flexDirection"))).toBe("row");
    expect(expectSome(stringIn(horizontal, "alignItems"))).toBe("center");

    const vertical = renderButtonGroup({ orientation: "vertical" }, testTheme);
    expect(expectSome(stringIn(vertical, "flexDirection"))).toBe("column");
    expect(expectSome(stringIn(vertical, "alignItems"))).toBe("stretch");
  });

  it("let the caller override the group's axis", () => {
    const overridden = renderButtonGroup(
      { orientation: "vertical", style: { alignItems: "center" } },
      testTheme,
    );
    expect(expectSome(stringIn(overridden, "alignItems"))).toBe("center");
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
    // A computed blank or padded label is not the name it looks like (plan 026).
    expect(
      hostProp(
        renderButtonGroup({ mode: "attached", label: "   " }, testTheme),
        "aria-label",
      ),
    ).toStrictEqual(Option.none());
    expect(
      expectSome(
        hostProp(
          renderButtonGroup({ label: "  Text alignment  " }, testTheme),
          "aria-label",
        ),
      ),
    ).toBe("Text alignment");
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

  it("derives the host semantics from the role", () => {
    expect(textSemantics("h1")).toStrictEqual({
      role: "heading",
      "aria-level": 1,
    });
    expect(textSemantics("h3")).toStrictEqual({
      role: "heading",
      "aria-level": 3,
    });
    expect(textSemantics("code")).toStrictEqual({ role: "code" });
    expect(textSemantics("codeBlock")).toStrictEqual({ role: "code" });
    expect(textSemantics("display")).toStrictEqual({});
    expect(textSemantics("body")).toStrictEqual({});
    const heading = renderText({ role: "h2" }, testTheme);
    expect(expectSome(hostProp(heading, "role"))).toBe("heading");
    expect(expectSome(hostProp(heading, "aria-level"))).toBe(2);
    expect(
      expectSome(hostProp(renderText({ role: "code" }, testTheme), "role")),
    ).toBe("code");
    expect(
      hostProp(renderText({ role: "body" }, testTheme), "role"),
    ).toStrictEqual(Option.none());
  });

  it("sends an end alignment to the runtime as a right alignment", () => {
    // The bug guarded (plan 365): the runtime's `text_align` match has no
    // `end`, so the documented value painted like `start`.
    expect(
      expectSome(
        stringIn(renderText({ align: "end" }, testTheme), "textAlign"),
      ),
    ).toBe("right");
    expect(
      expectSome(
        stringIn(renderText({ align: "start" }, testTheme), "textAlign"),
      ),
    ).toBe("start");
  });

  it("clamps after a line count and truncates on one line", () => {
    const clamped = renderText({ clamp: 3 }, testTheme);
    expect(numberIn(clamped, "maxHeight")).toStrictEqual(
      Option.some(3 * testTheme.typography.body.lineHeight),
    );
    expect(expectSome(stringIn(clamped, "overflow"))).toBe("hidden");
    expect(expectSome(stringIn(clamped, "whiteSpace"))).toBe("normal");
    expect(numberIn(clamped, "lineClamp")).toStrictEqual(Option.none());
    const truncated = renderText({ truncate: true }, testTheme);
    expect(expectSome(stringIn(truncated, "whiteSpace"))).toBe("nowrap");
    expect(numberIn(truncated, "maxHeight")).toStrictEqual(Option.none());
  });

  it("may shrink below its own content width", () => {
    // The bug guarded (plan 383): a text run kept CSS's automatic content floor,
    // so a sentence in a bounded row painted past it and pushed its sibling out.
    // Every role removes the floor; a caller can still raise it.
    const roles = ["display", "h1", "body", "caption", "code"] as const;
    expect(
      Arr.map(roles, (role) =>
        numberIn(renderText({ role }, testTheme), "minWidth"),
      ),
    ).toStrictEqual(Arr.map(roles, () => Option.some(0)));
    expect(
      numberIn(renderText({ style: { minWidth: 120 } }, testTheme), "minWidth"),
    ).toStrictEqual(Option.some(120));
  });

  it("restores the automatic floor when it must be measured", () => {
    // The bug guarded (plan 587): the shrink floor above is what a
    // `Grid columnMin="max-content"` track reads as the cell's content, so a
    // bare `Text` in that grid measured 0 wide. `shrink={false}` asks for the
    // runtime's automatic floor; the default stays 0 for plan 383's row rule.
    expect(
      stringIn(renderText({ shrink: false }, testTheme), "minWidth"),
    ).toStrictEqual(Option.some("auto"));
    expect(stringIn(renderText({}, testTheme), "minWidth")).toStrictEqual(
      Option.none(),
    );
    expect(numberIn(renderText({}, testTheme), "minWidth")).toStrictEqual(
      Option.some(0),
    );
  });

  it("paints the decoration it is given, and a caller's style still wins", () => {
    // The gap guarded (plan 377): the runtime paints underline and
    // line-through, but `Text` had no prop for either.
    const plain = renderText({}, testTheme);
    expect(stringIn(plain, "textDecoration")).toStrictEqual(Option.none());
    expect(
      expectSome(
        stringIn(
          renderText({ decoration: "underline" }, testTheme),
          "textDecoration",
        ),
      ),
    ).toBe("underline");
    expect(
      expectSome(
        stringIn(
          renderText({ decoration: "line-through" }, testTheme),
          "textDecoration",
        ),
      ),
    ).toBe("line-through");
    expect(
      stringIn(
        renderText(
          { decoration: "underline", style: { textDecoration: "none" } },
          testTheme,
        ),
        "textDecoration",
      ),
    ).toStrictEqual(Option.some("none"));
  });

  it("leaves chrome unselectable and content selectable", () => {
    // The prop's only contribution is the host's `userSelect`; whether a drag
    // actually takes the text is the runtime suite's job (plan 385).
    expect(stringIn(renderText({}, testTheme), "userSelect")).toStrictEqual(
      Option.some("none"),
    );
    expect(
      stringIn(renderText({ selectable: true }, testTheme), "userSelect"),
    ).toStrictEqual(Option.some("text"));
    // The caller's style still wins, as it does everywhere else.
    expect(
      stringIn(
        renderText(
          { selectable: true, style: { userSelect: "none" } },
          testTheme,
        ),
        "userSelect",
      ),
    ).toStrictEqual(Option.some("none"));
  });

  it("paints no description line when the description says nothing", () => {
    // The bug guarded (plan 577): `description === undefined` was the only
    // gate, so a computed blank description still painted a caption `Text` —
    // one empty line of the caption role under every label (and under every
    // group option). A blank description is absent, as its own docstring says.
    const blank = renderLabel({ description: "   ", children: "Email" });
    expect(elementChildren(blank)).toHaveLength(1);
    const described = renderLabel({
      description: "A hint.",
      children: "Email",
    });
    expect(elementChildren(described)).toHaveLength(2);
    expect(
      elementProp(
        expectSome(Arr.get(elementChildren(described), 1)),
        "children",
      ),
    ).toStrictEqual(Option.some("A hint."));
  });

  it("names a mark without changing its prose neighbours", () => {
    // Plan 581: a run that carries meaning but is not prose — a required
    // asterisk — becomes an image named by `label`. The runtime maps
    // `role="img"` + `aria-label` on a `<text>` to an `Image` (measured), so
    // the mark is announced as words rather than as an asterisk.
    const mark = renderText(
      { role: "label", tone: "destructive", label: "  required  " },
      testTheme,
    );
    expect(expectSome(hostProp(mark, "role"))).toBe("img");
    expect(expectSome(hostProp(mark, "aria-label"))).toBe("required");
    // A blank name is absent, not an empty image: the role decides again.
    const plain = renderText({ label: "   " }, testTheme);
    expect(hostProp(plain, "role")).toStrictEqual(Option.none());
    expect(hostProp(plain, "aria-label")).toStrictEqual(Option.none());
  });

  it("names the required marker, with a documented fallback", () => {
    // The bug guarded (plan 581): the marker was a plain `Text`, so the
    // runtime published it as a `Label` whose value was `"*"`. The page called
    // it "visual only"; assistive technology heard an unexplained asterisk.
    const markerOf = (props: Parameters<typeof renderLabel>[0]): ReactElement =>
      expectSome(
        Arr.get(
          elementChildren(
            expectSome(Arr.get(elementChildren(renderLabel(props)), 0)),
          ),
          1,
        ),
      );
    const defaulted = markerOf({ required: true, children: "Email" });
    expect(elementProp(defaulted, "role")).toStrictEqual(Option.some("label"));
    // Plan 647: the marker is a run the row must not squeeze. `Text` removes
    // the content floor by default (plan 383), so the star kept the same
    // `minWidth: 0` as the wrapping name and painted 0.5 px in a 12 px column;
    // `shrink={false}` gives it the runtime's automatic content floor.
    expect(elementProp(defaulted, "shrink")).toStrictEqual(Option.some(false));
    const custom = markerOf({
      required: true,
      requiredLabel: "  obligatoire  ",
      children: "Email",
    });
    expect(expectSome(elementProp(custom, "label"))).toBe("obligatoire");
    const blank = markerOf({
      required: true,
      requiredLabel: "   ",
      children: "Email",
    });
    expect(expectSome(elementProp(blank, "label"))).toBe("required");
    const markerLabel = Schema.decodeUnknownSync(Schema.String)(
      expectSome(elementProp(defaulted, "label")),
    );
    expect(markerLabel).toBe("required");
    // The marker is the `Text` primitive with a name, so the named-mark rule
    // above decides its host semantics.
    expect(textSemantics("label", markerLabel)).toStrictEqual({
      role: "img",
      "aria-label": "required",
    });
    // No `required`, no marker — the name row has one child.
    const row = expectSome(
      Arr.get(elementChildren(renderLabel({ children: "Email" })), 0),
    );
    expect(elementChildren(row)).toHaveLength(1);
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
});

describe("loading", () => {
  it("pulses a skeleton rather than painting the surface it stands in for", () => {
    const opacities = Arr.map([0, 1], (step) =>
      expectSome(numberIn(renderSkeleton({}, testTheme, step), "opacity")),
    );
    expect(Arr.some(opacities, (opacity) => opacity < 1)).toBe(true);
    expect(new Set(opacities).size).toBeGreaterThan(1);
  });

  it("announces a spinner by role and name", () => {
    const element = renderSpinner({ label: "Saving" }, testTheme, 0);
    expect(expectSome(hostProp(element, "role"))).toBe("status");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Saving");
    // The documented default survives a blank computed label (plan 026).
    expect(
      expectSome(
        hostProp(renderSpinner({ label: "   " }, testTheme, 0), "aria-label"),
      ),
    ).toBe("Loading");
  });
});
