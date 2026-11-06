/** @jsxImportSource @gpuix/react */
import * as Arr from "effect/Array";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { Progress, ProgressLabel, ProgressValue } from "../src/progress.js";

const uploads: ReadonlyArray<{
  readonly name: string;
  readonly received: number;
  readonly total: number;
}> = [
  { name: "design-system.fig", received: 3_400_000, total: 4_000_000 },
  { name: "release-notes.md", received: 12_000, total: 12_000 },
  { name: "assets.zip", received: 0, total: 250_000_000 },
];

export const ProgressExample = () => {
  const theme = useTheme();
  return (
    <Card style={{ maxWidth: 480 }}>
      <CardHeader>
        <CardTitle>Uploading</CardTitle>
        <CardDescription>Three files, stated in bytes</CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
          paddingTop: theme.spacing.xs,
        }}
      >
        {Arr.map(uploads, (upload) => (
          <Progress
            key={upload.name}
            value={upload.received}
            max={upload.total}
            label={upload.name}
            formatValue={(percent) => `${percent.toFixed(0)}%`}
          >
            <ProgressLabel />
            <ProgressValue />
          </Progress>
        ))}
        <Progress label="Preparing archive" loadingText="preparing" />
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The last bar has no measurement yet, so it paints the moving segment.
        </text>
      </div>
    </Card>
  );
};
