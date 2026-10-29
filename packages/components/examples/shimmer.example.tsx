/** @jsxImportSource @gpuix/react */
/**
 * Shimmer example: a generating state, and the same surface settled.
 *
 * The highlight is the surface's own: the content owns the words and the box,
 * and `Shimmer` paints the travelling band over it. The second card is the
 * state the caller switches to when the work lands — no band, no timer.
 */

import { Card } from "../src/card.js";
import { Shimmer } from "../src/shimmer.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

export const ShimmerExample = () => {
  const theme = useTheme();

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16, width: 420 }}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Shimmer
          label="Generating a reply"
          style={{ padding: theme.spacing.lg }}
        >
          <text style={textStyle(theme, "body")}>Generating a reply…</text>
        </Shimmer>
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Shimmer active={false} style={{ padding: theme.spacing.lg }}>
          <text style={textStyle(theme, "body")}>
            The reply is ready and the surface is still.
          </text>
        </Shimmer>
      </Card>
    </div>
  );
};
