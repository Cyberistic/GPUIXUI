/**
 * Separator behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a decorative rule still published a node to assistive
 * technology, a semantic rule published nothing (0.11.0 needs a role for a node
 * to exist), an orientation painted the other axis, and the rule painted a
 * literal instead of the active platform's border role.
 */

import { platformTheme } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { sizeOf } from "../internal/interaction.js";
import { lightTheme, type Theme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { Separator } from "../separator.js";

/** The separator nodes the rule's tree published. */
const rules = (root: ReturnType<typeof renderComponent>) =>
  nodesWithRole(root.renderer, "splitter");

/** The rule's painted box, in a bounded column or row. */
const sizeIn = (
  orientation: "horizontal" | "vertical" | undefined,
  theme: Theme,
) => {
  const root = renderComponent(
    <div
      style={
        orientation === "vertical"
          ? { display: "flex", flexDirection: "row", height: 80 }
          : { display: "flex", flexDirection: "column", width: 240 }
      }
    >
      <Separator orientation={orientation} testId="rule" />
    </div>,
    theme,
  );
  const size = Option.getOrElse(sizeOf(root, "rule"), () =>
    expect.fail("the separator painted no box"),
  );
  root.unmount();
  return size;
};

describe("Separator", () => {
  it("keeps a decorative rule out of the accessibility tree", () => {
    const rule = renderComponent(<Separator decorative testId="rule" />);

    expect(rules(rule)).toEqual([]);
    rule.unmount();
  });

  it("publishes a semantic rule as a separator node", () => {
    const rule = renderComponent(<Separator testId="rule" />);

    // 0.11.0 maps the separator token to the platform's `Splitter` role.
    expect(rules(rule)).toHaveLength(1);
    rule.unmount();
  });

  it("paints the axis it was asked for", () => {
    expect(sizeIn(undefined, lightTheme)).toMatchObject({ height: 1 });
    expect(sizeIn("horizontal", lightTheme)).toMatchObject({ height: 1 });
    expect(sizeIn("vertical", lightTheme)).toMatchObject({ width: 1 });
  });

  it("keeps the rule on the active platform's border role", () => {
    const paint = (theme: Theme) => {
      const root = renderComponent(<Separator testId="rule" />, theme);
      const colour = root.renderer.findByTestId("rule")?.style.backgroundColor;
      root.unmount();
      return colour;
    };
    const macOS = platformTheme(lightTheme, "darwin");
    const windows = platformTheme(lightTheme, "win32");

    expect(paint(macOS)).toBe(macOS.colors.border);
    expect(paint(windows)).toBe(windows.colors.border);
    // The premise: the two styles do not paint the same rule.
    expect(macOS.colors.border).not.toBe(windows.colors.border);
  });
});
