/**
 * Gradient text example: three ramps on one page.
 *
 * The default ramp runs from the theme's body ink to its brand; the second is a
 * caller-owned pair, and the third sits under the reduced preference beside its
 * animated twin so the entrance can be compared.
 */

import { MotionProvider } from "../src/motion.js";
import { GradientText } from "../src/gradient-text.js";

/** A headline in the house ramp, a custom ramp, and a reduced pair. */
export const GradientTextExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <GradientText text="Native by default" />
    <GradientText text="Fast by design" from="#7C5CFF" to="#24C6A8" role="h2" />
    <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
      <GradientText text="Animated" role="h3" from="#7C5CFF" to="#FF6B6B" />
      <MotionProvider preference="reduced">
        <GradientText text="Reduced" role="h3" from="#7C5CFF" to="#FF6B6B" />
      </MotionProvider>
    </div>
    <GradientText text={"Two lines\nOne idea"} role="h3" />
  </div>
);
