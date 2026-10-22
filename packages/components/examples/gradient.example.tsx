/**
 * Gradient example: a hero band that breathes, and the same ramp stilled.
 *
 * Composition, not a gallery: the field's real job is behind a heading and its
 * actions — the content owns the words and the presses, the ramp only lights the
 * surface. The strip below shows the one decision `Gradient` leaves to its
 * caller: a shift of a whole turn is a single still ramp, and the reduced
 * preference paints the same frame.
 */

import { Card } from "../src/card.js";
import { Gradient } from "../src/gradient.js";
import { Button } from "../src/internal/button.js";
import { alpha, textStyle, useTheme } from "../src/internal/theme.js";
import { MotionProvider } from "../src/motion.js";

/** A brand wash behind a heading and its actions. */
export const GradientExample = () => {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ maxWidth: 520, padding: 0, overflow: "hidden" }}>
        <Gradient
          from={alpha(theme.colors.primary, 0.28)}
          to={alpha(theme.colors.accent, 0)}
          angle={120}
          shift={80}
          durationMs={5_000}
          radius={theme.radius.lg}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
            padding: theme.spacing.xl,
          }}
        >
          <text style={textStyle(theme, "h2")}>Ship faster with panels</text>
          <div style={{ width: 400 }}>
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.mutedForeground,
              }}
            >
              Split a workspace into panes, keep every panel's state, and let
              the layout reflow around what the reader is doing.
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
            <Button variant="primary">Open a workspace</Button>
            <Button variant="ghost">Read the guide</Button>
          </div>
        </Gradient>
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
          <Gradient
            from={alpha(theme.colors.success, 0.32)}
            to={alpha(theme.colors.success, 0)}
            angle={160}
            radius={theme.radius.md}
            style={{ width: 160, height: 72 }}
          />
        </MotionProvider>
        <div style={{ width: 300 }}>
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            The same ramp under the reduced preference: one resting gradient, no
            second layer and no tween.
          </text>
        </div>
      </div>
    </div>
  );
};
