/**
 * Badge example: the status column of a runs list.
 *
 * A realistic composition, not a gallery: the badge is never the only carrier of
 * meaning, so a reader who cannot see the colour still reads "Failed".
 */

import * as Arr from "effect/Array";
import { Badge, type BadgeVariant } from "../src/badge.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** One named run and its status. */
const runs: ReadonlyArray<{
  readonly name: string;
  readonly status: string;
  readonly variant: BadgeVariant;
}> = [
  { name: "nightly · darwin-arm64", status: "Passed", variant: "success" },
  { name: "nightly · linux-x64", status: "Running", variant: "info" },
  { name: "nightly · win32-x64", status: "Queued", variant: "neutral" },
  { name: "smoke · darwin-x64", status: "Flaky", variant: "warning" },
  { name: "release · 0.11.0", status: "Failed", variant: "danger" },
];

/** A runs list whose status column is made of badges. */
export const BadgeExample = () => {
  const theme = useTheme();
  return (
    <Card style={{ maxWidth: 480 }}>
      <CardHeader>
        <CardTitle>Nightly runs</CardTitle>
        <CardDescription>Last 24 hours</CardDescription>
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
        {Arr.map(runs, (run) => (
          <div
            key={run.name}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.lg,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.foreground,
              }}
            >
              {run.name}
            </text>
            <Badge variant={run.variant} size="sm">
              {run.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
};
