/**
 * Glyph example: a character wall behind a launch panel, and the same wall
 * stilled under the reduced preference.
 *
 * Composition, not a gallery: the wall's job is to give a quiet surface texture
 * while the content keeps the words and the presses. The second strip shows the
 * two decisions the field leaves to its caller — the mark set and the reduced
 * preference.
 */

import { Card } from "../src/card.js";
import { Glyph } from "../src/glyph.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { MotionProvider } from "../src/motion.js";

/** A launch panel over a wall of marks. */
export const GlyphExample = () => {
  const theme = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ maxWidth: 560, padding: 0, overflow: "hidden" }}>
        <Glyph
          marks={"+/*<>[]{}"}
          cellSize={20}
          density={0.6}
          seed={5}
          color={theme.colors.border}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
            width: 560,
            height: 220,
            padding: theme.spacing.xl,
          }}
        >
          <text style={textStyle(theme, "h2")}>Open the command deck</text>
          <div style={{ width: 400 }}>
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.mutedForeground,
              }}
            >
              Every mark is paint, so the wall stays silent while a reader moves
              through the panel above it.
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
            <Button variant="primary">Open the deck</Button>
            <Button variant="ghost">See the shortcuts</Button>
          </div>
        </Glyph>
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
          <Glyph
            marks="01"
            cellSize={12}
            density={0.8}
            seed={2}
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
            A binary wall under the reduced preference: the same cells, no
            breath and no entrance tween.
          </text>
        </div>
      </div>
    </div>
  );
};
