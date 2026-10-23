/**
 * Highlight text example: a marker that sweeps across a query's matches.
 *
 * The first line is the house word search, the second marks explicit ranges a
 * caller would get from its own index and names the active match, and the third
 * paints at rest under the reduced preference.
 */

import { HighlightText } from "../src/highlight-text.js";
import { MotionProvider } from "../src/motion.js";

/** A query, explicit ranges, and a reduced sweep. */
export const HighlightTextExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <HighlightText
      text="Native by default, native by design"
      query="native"
      role="h1"
    />
    <HighlightText
      text="0123456789"
      ranges={[
        [2, 5],
        [7, 9],
      ]}
      activeIndex={1}
      role="code"
    />
    <MotionProvider preference="reduced">
      <HighlightText
        text="A whole word only"
        query="word"
        wholeWord
        role="bodyStrong"
      />
    </MotionProvider>
  </div>
);
