import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { contrastFloorsFor, contrastRatio } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { Badge, type BadgeSize, type BadgeVariant } from "../badge.js";
import {
  clickCentreOf,
  hoverCentreOf,
  sizeOf,
} from "../internal/interaction.js";
import { List, ListItem, ListItemTitle } from "../list.js";
import { darkTheme, lightTheme, tone, type Theme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

const heightOf = (root: ComponentTestRoot): Option.Option<number> =>
  Option.map(sizeOf(root, "badge"), ({ height }) => height);

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

const heightFor = (theme: Theme, size: BadgeSize): number =>
  (size === "sm" ? 16 : 20) + theme.spacing["2xs"] * 2;

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

    expect(styleOf(outline).backgroundColor).toBeUndefined();
    expect(styleOf(outline)).toMatchObject({
      color: darkTheme.colors.mutedForeground,
      borderWidth: darkTheme.borderWidth.thin,
      borderColor: darkTheme.colors.borderStrong,
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

  it("sizes the pill by the step its recipe compiles", () => {
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

  it("keeps the pill out of the pointer, and lets a consumer opt back in", () => {
    Arr.forEach(["dark", "light"] as const, (mode) => {
      const page = renderComponent(
        <List testId="list" selectionMode="single">
          <ListItem
            testId="row"
            value="beta"
            trailing={<Badge testId="badge">Beta</Badge>}
          >
            <ListItemTitle>Beta</ListItemTitle>
          </ListItem>
        </List>,
        mode,
      );

      try {
        expect(styleOf(page).pointerEvents).toBe("none");
      } finally {
        page.unmount();
      }
    });

    const interactive = renderComponent(
      <Badge testId="badge" style={{ pointerEvents: "auto" }} />,
    );

    try {
      expect(styleOf(interactive).pointerEvents).toBe("auto");
    } finally {
      interactive.unmount();
    }
  });

  it("paints the documented defaults for a stored variant and size it does not ship", () => {
    const badge = renderComponent(
      // @ts-expect-error a stored name is not the union's literal
      <Badge testId="badge" variant="critical" size="xs">
        Active
      </Badge>,
    );

    try {
      expect(styleOf(badge)).toMatchObject({
        backgroundColor: darkTheme.colors.muted,
        color: darkTheme.colors.mutedForeground,
      });
      expect(heightOf(badge)).toEqual(Option.some(heightFor(darkTheme, "md")));
    } finally {
      badge.unmount();
    }
  });

  it("keeps a shipped variant and size when it was stored as one", () => {
    const badge = renderComponent(
      <Badge testId="badge" variant="primary" size="sm">
        Active
      </Badge>,
    );

    try {
      expect(styleOf(badge)).toMatchObject({
        backgroundColor: darkTheme.colors.primary,
        color: darkTheme.colors.primaryForeground,
      });
      expect(heightOf(badge)).toEqual(Option.some(heightFor(darkTheme, "sm")));
    } finally {
      badge.unmount();
    }
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

  it("draws an outline badge's edge on the wash its row wears", () => {
    Arr.forEach(
      [
        ["dark", darkTheme],
        ["light", lightTheme],
      ] as const,
      ([mode, theme]) => {
        const page = renderComponent(
          <List testId="list" selectionMode="single">
            <ListItem
              testId="row"
              value="beta"
              trailing={
                <Badge testId="badge" variant="outline">
                  Beta
                </Badge>
              }
            >
              <ListItemTitle>Beta</ListItemTitle>
            </ListItem>
          </List>,
          mode,
        );

        try {
          const edge = String(
            page.renderer.findByTestId("badge")?.style.borderColor,
          );

          hoverCentreOf(page, "row");
          expect(page.renderer.findByTestId("row")?.style.hover).toMatchObject({
            backgroundColor: theme.colors.accent,
          });
          clickCentreOf(page, "row");
          expect(page.renderer.findByTestId("row")?.style).toMatchObject({
            backgroundColor: theme.colors.selected,
          });

          expect(edge).toBe(theme.colors.borderStrong);

          Arr.forEach([theme.colors.accent, theme.colors.selected], (fill) => {
            expect(contrastRatio(edge, fill) ?? 0).toBeGreaterThanOrEqual(
              contrastFloorsFor(theme).boundary,
            );

            expect(contrastRatio(theme.colors.border, fill) ?? 0).toBeLessThan(
              contrastFloorsFor(theme).boundary,
            );
          });
        } finally {
          page.unmount();
        }
      },
    );
  });
});
