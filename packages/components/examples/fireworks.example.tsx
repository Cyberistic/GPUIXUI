/**
 * Fireworks example: a release celebration behind the confirmation.
 *
 * Composition, not a gallery: the field's real job is behind a moment — a
 * published release whose copy still owns the words — and the quiet strip shows
 * the same field under the reduced preference, which is the one decision the
 * field leaves to the application.
 */

import { Card } from "../src/card.js";
import { Fireworks } from "../src/fireworks.js";
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

/** A burst field behind a release confirmation, and the same field stilled. */
export const FireworksExample = () => {
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
            <Fireworks bursts={3} sparks={20} seed={5} burstMs={1_300} />
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
            <text style={textStyle(theme, "h3")}>Release published</text>
            <div style={{ width: 300 }}>
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.mutedForeground,
                }}
              >
                v2.4.0 is live. The notes are on their way to everyone watching
                the repository.
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
              {/* The caller's colour: an accent burst rather than the page's. */}
              <Fireworks
                bursts={2}
                sparks={10}
                seed={2}
                color={theme.colors.accent}
                minSize={2}
                maxSize={3}
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
            The same field under the reduced preference: every spark holds its
            ring position, and nothing flies.
          </text>
        </div>
      </div>
    </div>
  );
};
