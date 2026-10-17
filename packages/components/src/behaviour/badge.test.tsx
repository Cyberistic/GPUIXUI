/**
 * Badge behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a variant that does not tint the pill; a status variant
 * painted from a constant rather than the theme (both themes are asserted);
 * `outline` filling instead of bordering; and the two sizes collapsing to one
 * height. Expectations are built from the theme, so a changed token moves the
 * assertion with it.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { Badge, type BadgeSize, type BadgeVariant } from "../badge.js";
import { sizeOf } from "../internal/interaction.js";
import { darkTheme, lightTheme, tone, type Theme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

/** The height the renderer measured for the badge, `None` when it is missing. */
const heightOf = (root: ComponentTestRoot): Option.Option<number> =>
  Option.map(sizeOf(root, "badge"), ({ height }) => height);

/** The style the tree painted for `testId`; `{}` when the element is missing, so
 *  a vanished part fails the assertion rather than throwing. */
const styleOf = (
  root: ComponentTestRoot,
  testId = "badge",
): Record<string, unknown> =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(root.renderer.findByTestId(testId)),
      (element) => element.style,
    ),
    () => ({}),
  );

/** The padding a size adds above and below its line height. */
const heightFor = (theme: Theme, size: BadgeSize): number =>
  theme.typography[size === "sm" ? "caption" : "label"].lineHeight +
  theme.spacing["2xs"] * 2;

describe("Badge", () => {
  it("renders its label as text", () => {
    const badge = renderComponent(<Badge testId="badge">Active</Badge>);

    expect(badge.renderer.getAllText()).toEqual(["Active"]);

    badge.unmount();
  });

  it("paints each non-status variant from its own theme role", () => {
    const neutral = renderComponent(<Badge testId="badge" variant="neutral" />);
    expect(styleOf(neutral)).toMatchObject({
      backgroundColor: darkTheme.colors.muted,
      color: darkTheme.colors.mutedForeground,
    });
    neutral.unmount();

    const primary = renderComponent(<Badge testId="badge" variant="primary" />);
    expect(styleOf(primary)).toMatchObject({
      backgroundColor: darkTheme.colors.primary,
      color: darkTheme.colors.primaryForeground,
    });
    primary.unmount();

    const outline = renderComponent(<Badge testId="badge" variant="outline" />);
    // `toMatchObject` cannot assert an absent key, so the fill is checked apart.
    expect(styleOf(outline).backgroundColor).toBeUndefined();
    expect(styleOf(outline)).toMatchObject({
      color: darkTheme.colors.mutedForeground,
      borderWidth: darkTheme.borderWidth.thin,
      borderColor: darkTheme.colors.border,
    });
    outline.unmount();
  });

  it("paints each status variant from the shared soft-tone palette", () => {
    Arr.forEach(["info", "success", "warning", "danger"] as const, (value) => {
      const badge = renderComponent(<Badge testId="badge" variant={value} />);
      const painted = tone(darkTheme, value);

      expect(styleOf(badge)).toMatchObject({
        backgroundColor: painted.bg,
        color: painted.fg,
        borderColor: painted.border,
      });

      badge.unmount();
    });
  });

  it("reads the theme, not a constant, for a status fill", () => {
    const dark = renderComponent(
      <Badge testId="badge" variant="success" />,
      "dark",
    );
    expect(styleOf(dark).backgroundColor).toBe(tone(darkTheme, "success").bg);
    dark.unmount();

    const light = renderComponent(
      <Badge testId="badge" variant="success" />,
      "light",
    );
    expect(styleOf(light).backgroundColor).toBe(tone(lightTheme, "success").bg);
    light.unmount();
  });

  it("sizes the pill by its type role", () => {
    const sm = renderComponent(
      <Badge testId="badge" size="sm">
        Active
      </Badge>,
    );
    expect(heightOf(sm)).toEqual(Option.some(heightFor(darkTheme, "sm")));
    sm.unmount();

    const md = renderComponent(
      <Badge testId="badge" size="md">
        Active
      </Badge>,
    );
    expect(heightOf(md)).toEqual(Option.some(heightFor(darkTheme, "md")));
    md.unmount();
  });

  it("lets a consumer's style win", () => {
    const badge = renderComponent(
      <Badge testId="badge" variant="primary" style={{ color: "#001122" }} />,
    );

    expect(styleOf(badge).color).toBe("#001122");

    badge.unmount();
  });

  it("rounds every variant into a pill", () => {
    const variants: ReadonlyArray<BadgeVariant> = [
      "neutral",
      "primary",
      "success",
      "warning",
      "danger",
      "info",
      "outline",
    ];

    Arr.forEach(variants, (variant) => {
      const badge = renderComponent(<Badge testId="badge" variant={variant} />);

      expect(styleOf(badge)).toMatchObject({
        borderRadius: darkTheme.radius.full,
        whiteSpace: "nowrap",
      });

      badge.unmount();
    });
  });
});
