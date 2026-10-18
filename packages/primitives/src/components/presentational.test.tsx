/**
 * The components whose contribution is the element they produce.
 *
 * Their behaviour lives in `core/` and is already pinned there (`layout.test.ts`,
 * `style.test.ts`, `loading.test.ts`); what those suites cannot see is the piece
 * the *component* adds — which host element, which resolved chrome, which ARIA.
 * That is the seam this file guards.
 */

import type { ReactElement } from "react";
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

  it("spacer either takes a fixed step or fills what is left", () => {
    expect(
      numberIn(renderSpacer({ size: "lg" }, testTheme), "width"),
    ).toStrictEqual(Option.some(testTheme.spacing.lg));
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
  });
});
