/**
 * Typing text example: a deploy log that types itself in.
 *
 * The strings are the application's, the reveal clock is the component's. The
 * second line runs under the reduced preference through a nested provider, so
 * the same example shows both paths.
 */

import { MotionProvider } from "../src/motion.js";
import { TypingText } from "../src/typing-text.js";

/** A short status line, typed, beside one that paints at once. */
export const TypingTextExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <TypingText text="Building the native binding…" speed={35} caret />
    <TypingText text="32 scenarios green." speed={35} role="bodyStrong" />
    <MotionProvider preference="reduced">
      <TypingText
        text="Reduced motion paints this line at once."
        label="Reduced motion example"
      />
    </MotionProvider>
  </div>
);
