/** @jsxImportSource @gpuix/react */
import { MotionProvider } from "@gpuixui/components/motion";
import { TypingText } from "../src/typing-text.js";

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
