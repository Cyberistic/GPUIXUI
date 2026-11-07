/** @jsxImportSource @gpuix/react */
import { HighlightText } from "../src/highlight-text.js";
import { MotionProvider } from "../src/motion.js";

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
