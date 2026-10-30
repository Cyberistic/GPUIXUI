/** @jsxImportSource @gpuix/react */
/**
 * Shimmer example: a generating state, and the same surface settled.
 *
 * A string child is a text run: the component splits it into code points and
 * inks each one from the travelling profile, because the runtime has no
 * background-clip. The second card is the state the caller switches to when the
 * work lands — the text rests and no timer runs.
 */

import { Card } from "../src/card.js";
import { Shimmer } from "../src/shimmer.js";
import { useTheme } from "../src/internal/theme.js";

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
          Generating a reply…
        </Shimmer>
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Shimmer active={false} style={{ padding: theme.spacing.lg }}>
          The reply is ready and the surface is still.
        </Shimmer>
      </Card>
    </div>
  );
};
