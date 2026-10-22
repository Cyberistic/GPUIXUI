/**
 * Topography example: a contour map behind a launch panel, and the same field
 * stilled under the reduced preference.
 *
 * Composition, not a gallery: the map's job is to give a quiet surface depth
 * while the content keeps the words and the presses. The second strip shows the
 * one decision the field leaves to its caller: the reduced preference paints the
 * same map at rest.
 */

import { Card } from "../src/card.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { MotionProvider } from "../src/motion.js";
import { Topography } from "../src/topography.js";

/** A launch panel with a contour map behind it. */
export const TopographyExample = () => {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ maxWidth: 560, padding: 0, overflow: "hidden" }}>
        <Topography
          spacing={30}
          amplitude={10}
          seed={3}
          color={theme.colors.border}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
            width: 560,
            height: 240,
            padding: theme.spacing.xl,
          }}
        >
          <text style={textStyle(theme, "h2")}>Ship the next release</text>
          <div style={{ width: 400 }}>
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.mutedForeground,
              }}
            >
              Every panel keeps its place, every tab its history, and the whole
              workspace comes back exactly as it was left.
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
            <Button variant="primary">Start a workspace</Button>
            <Button variant="ghost">Read the guide</Button>
          </div>
        </Topography>
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
          <Topography
            spacing={18}
            amplitude={6}
            style={{ width: 180, height: 96 }}
          />
        </MotionProvider>
        <div style={{ width: 280 }}>
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            The same map under the reduced preference: full ink, no breath and
            no entrance tween.
          </text>
        </div>
      </div>
    </div>
  );
};
