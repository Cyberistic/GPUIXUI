/** @jsxImportSource @gpuix/react */
import { Card } from "@gpuixui/components/card";
import { EmptyState } from "@gpuixui/components/empty-state";
import { textStyle, useTheme } from "@gpuixui/components/authoring";
import { MotionProvider } from "@gpuixui/components/motion";
import { Stars } from "../src/stars.js";

const fill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export const StarsExample = () => {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ maxWidth: 480, padding: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "relative",
            height: 240,
            backgroundColor: theme.colors.muted,
          }}
        >
          <div style={fill}>
            <Stars count={64} seed={11} />
          </div>
          <div style={{ position: "relative", padding: theme.spacing.lg }}>
            <EmptyState
              title="No builds yet"
              description="Push a commit and the first run will appear here."
            />
          </div>
        </div>
      </Card>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 120,
            height: 72,
            overflow: "hidden",
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.muted,
          }}
        >
          <MotionProvider preference="reduced">
            <div style={fill}>
              {}
              <Stars
                count={24}
                seed={3}
                color={theme.colors.primary}
                twinkleMs={1_600}
              />
            </div>
          </MotionProvider>
        </div>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The same sky under the reduced preference: every star holds its own
          floor, and nothing twinkles.
        </text>
      </div>
    </div>
  );
};
