/** @jsxImportSource @gpuix/react */
/**
 * Separator example: a settings card whose regions are ruled.
 *
 * A horizontal rule ends a region; the vertical rules in the footer separate
 * actions. The footer's rules are decorative — the actions already have names —
 * while the region rules are semantic, so a reader is told where one group of
 * settings ends.
 */

import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { Separator } from "../src/separator.js";

/** One labelled setting row. */
const Row = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {label}
      </text>
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.mutedForeground,
        }}
      >
        {value}
      </text>
    </div>
  );
};

/** A settings card split into three ruled regions. */
export const SeparatorExample = () => {
  const theme = useTheme();
  return (
    <Card style={{ maxWidth: 440 }}>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>Settings for this checkout</CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
          padding: theme.spacing.xl,
          paddingTop: theme.spacing.xs,
        }}
      >
        <Row label="Theme" value="Platform" />
        <Row label="Density" value="Comfortable" />
        <Separator />
        <Row label="Format on save" value="On" />
        <Row label="Autosave" value="After 2s" />
        <Separator />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            height: 24,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            Reset
          </text>
          <Separator orientation="vertical" decorative />
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            Export
          </text>
        </div>
      </div>
    </Card>
  );
};
