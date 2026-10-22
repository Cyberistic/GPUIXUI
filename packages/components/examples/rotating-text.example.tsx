/**
 * Rotating text example: a value proposition that cycles.
 *
 * The list lives here, the clock lives in the component. The second line runs
 * under the reduced preference, so the same words arrive without the fade.
 */

import { MotionProvider } from "../src/motion.js";
import { RotatingText } from "../src/rotating-text.js";

/** Three reasons, one at a time. */
export const RotatingTextExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <RotatingText
      phrases={["Faster builds", "Safer releases", "One native runtime"]}
      intervalMs={2500}
      role="h1"
    />
    <RotatingText
      phrases={["Ship on macOS", "Ship on Linux", "Ship on Windows"]}
      intervalMs={1800}
      role="bodyStrong"
      label="Platforms"
    />
    <MotionProvider preference="reduced">
      <RotatingText
        phrases={["Reduced motion", "Same words", "No fade"]}
        intervalMs={1500}
        role="caption"
      />
    </MotionProvider>
  </div>
);
