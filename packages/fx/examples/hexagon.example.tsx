/** @jsxImportSource @gpuix/react */
import { Card } from "@gpuixui/components/card";
import { Hexagon } from "../src/hexagon.js";
import { Button, textStyle, useTheme } from "@gpuixui/components/authoring";
import { MotionProvider } from "@gpuixui/components/motion";

export const HexagonExample = () => {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ maxWidth: 560, padding: 0, overflow: "hidden" }}>
        <Hexagon
          radius={28}
          stroke={1}
          color={theme.colors.border}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
            width: 560,
            height: 260,
            padding: theme.spacing.xl,
          }}
        >
          <text style={textStyle(theme, "h2")}>Open a workspace</text>
          <div style={{ width: 400 }}>
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.mutedForeground,
              }}
            >
              Arrange panels for the work in front of you, and keep every pane's
              state when the layout changes.
            </text>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: theme.spacing.sm,
              paddingTop: theme.spacing.xs,
            }}
          >
            <Button variant="primary">New workspace</Button>
            <Button variant="ghost">Browse layouts</Button>
          </div>
        </Hexagon>
      </Card>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <MotionProvider preference="reduced">
          <Hexagon radius={20} style={{ width: 180, height: 96 }} />
        </MotionProvider>
        <div style={{ width: 280 }}>
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            The same grid under the reduced preference: full ink, no breath and
            no entrance tween.
          </text>
        </div>
      </div>
    </div>
  );
};
