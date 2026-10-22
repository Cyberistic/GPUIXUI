/**
 * Bubbles example: a launch panel under a rising field.
 *
 * Composition, not a gallery: the field's real job is behind content — a
 * preparation panel whose copy still owns the words — and the quiet strip shows
 * the same field under the reduced preference, which is the one decision the
 * field leaves to the application.
 */

import { Bubbles } from "../src/bubbles.js";
import { Card } from "../src/card.js";
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

/** A rising field behind a preparation panel, and the same field stilled. */
export const BubblesExample = () => {
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
            <Bubbles count={28} seed={7} riseMs={6_000} />
          </div>
          <div
            style={{
              position: "relative",
              padding: theme.spacing.lg,
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.xs,
            }}
          >
            <text style={textStyle(theme, "h3")}>Preparing your workspace</text>
            <div style={{ width: 280 }}>
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.mutedForeground,
                }}
              >
                Installing dependencies and restoring the last session. This
                takes a few seconds.
              </text>
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
            width: 120,
            height: 72,
            overflow: "hidden",
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.muted,
          }}
        >
          <MotionProvider preference="reduced">
            <div style={fill}>
              {/* The caller's colour: an accent field rather than the page's. */}
              <Bubbles count={14} seed={3} color={theme.colors.accent} />
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
            The same field under the reduced preference: every bubble holds its
            seeded place, and nothing rises.
          </text>
        </div>
      </div>
    </div>
  );
};
