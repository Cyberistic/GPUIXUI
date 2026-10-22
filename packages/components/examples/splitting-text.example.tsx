/**
 * Splitting text example: a headline that arrives word by word.
 *
 * The three lines show the knobs that change the feel: the first is the house
 * word split, the second arrives from the end, and the third splits characters
 * and paints at rest under the reduced preference.
 */

import { MotionProvider } from "../src/motion.js";
import { SplittingText } from "../src/splitting-text.js";

/** A headline, a reversed stagger and a reduced character split. */
export const SplittingTextExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <SplittingText text="Build native interfaces" role="h1" stepMs={60} />
    <SplittingText
      text="No transform, no fake"
      role="bodyStrong"
      from="end"
      offset={6}
    />
    <MotionProvider preference="reduced">
      <SplittingText
        text="Reduced motion"
        role="caption"
        split="characters"
        stepMs={20}
      />
    </MotionProvider>
  </div>
);
