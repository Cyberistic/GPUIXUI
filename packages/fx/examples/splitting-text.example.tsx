/** @jsxImportSource @gpuix/react */
import { MotionProvider } from "@gpuixui/components/motion";
import { SplittingText } from "../src/splitting-text.js";

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
