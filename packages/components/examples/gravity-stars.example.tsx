/**
 * GravityStars example: a launch panel with a field of falling stars behind it,
 * and the same field stilled under the reduced preference.
 *
 * Composition, not a gallery: the field's real job is behind a moment whose copy
 * owns the words and the actions — the stars only move the surface. The quiet
 * strip is the one decision the field leaves to the application.
 */

import { Card } from "../src/card.js";
import { GravityStars } from "../src/gravity-stars.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { MotionProvider } from "../src/motion.js";

/** The field fills the box it is given, so the example bounds it with insets. */
const fill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/** A falling-star field behind a launch panel, and the same field stilled. */
export const GravityStarsExample = () => {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ maxWidth: 460, padding: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "relative",
            height: 280,
            backgroundColor: theme.colors.background,
          }}
        >
          <div style={fill}>
            <GravityStars
              count={44}
              seed={7}
              fallMs={3_200}
              color={theme.colors.primary}
            />
          </div>
          <div
            style={{
              position: "relative",
              padding: theme.spacing.xl,
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.sm,
            }}
          >
            <text style={textStyle(theme, "h3")}>Welcome back</text>
            <div style={{ width: 320 }}>
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.mutedForeground,
                }}
              >
                Your workspace is where you left it. The panels keep their
                layouts, and nothing is re-fetched until you ask.
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
              <Button variant="primary">Continue</Button>
              <Button variant="ghost">Switch workspace</Button>
            </div>
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
            width: 140,
            height: 76,
            overflow: "hidden",
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.background,
          }}
        >
          <MotionProvider preference="reduced">
            <div style={fill}>
              {/* The caller's colour and pace: a quieter field, still falling. */}
              <GravityStars
                count={22}
                seed={2}
                fallMs={6_000}
                color={theme.colors.accent}
              />
            </div>
          </MotionProvider>
        </div>
        <div style={{ width: 280 }}>
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            The same field under the reduced preference: every star holds its
            approach frame, so the sky stays and nothing falls.
          </text>
        </div>
      </div>
    </div>
  );
};
