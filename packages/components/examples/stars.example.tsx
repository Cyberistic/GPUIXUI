/**
 * Stars example: an empty state under a night sky.
 *
 * Composition, not a gallery: the field's real job is behind content — an empty
 * state whose copy still owns the words — and the quiet strip shows the same sky
 * under the reduced preference, which is the one decision the field leaves to the
 * application.
 */

import { Card } from "../src/card.js";
import { EmptyState } from "../src/empty-state.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { MotionProvider } from "../src/motion.js";
import { Stars } from "../src/stars.js";

/** The field fills the box it is given, so the example bounds it with insets. */
const fill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/** A night sky behind an empty state, and the same sky stilled. */
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
              {/* The caller's colour: a warm sky rather than the page ink. */}
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
