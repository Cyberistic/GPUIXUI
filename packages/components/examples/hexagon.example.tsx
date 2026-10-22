/**
 * Hexagon example: a hexagon field behind a workspace hero, and the same field
 * stilled under the reduced preference.
 *
 * Composition, not a gallery: the grid's job is to give a launch panel depth
 * while the content keeps the words and the presses. The second strip shows the
 * one decision the field leaves to its caller: the reduced preference paints the
 * same grid at rest.
 */

import { Card } from "../src/card.js";
import { Hexagon } from "../src/hexagon.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { MotionProvider } from "../src/motion.js";

/** A workspace launch panel with a hexagon field behind it. */
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
