/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { LiquidButton } from "../src/liquid-button.js";
import { MotionProvider } from "@gpuixui/components/motion";

export const LiquidButtonExample = () => {
  const [saves, setSaves] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <text>{`Saved drafts: ${saves}`}</text>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <LiquidButton variant="primary" onClick={() => setSaves((n) => n + 1)}>
          Save draft
        </LiquidButton>
        <LiquidButton
          variant="secondary"
          onClick={() => setSaves((n) => n + 1)}
        >
          Save as…
        </LiquidButton>
        <LiquidButton variant="ghost" onClick={() => setSaves(0)}>
          Discard
        </LiquidButton>
      </div>
      <MotionProvider preference="reduced">
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <text>Reduced motion</text>
          <LiquidButton
            variant="primary"
            onClick={() => setSaves((n) => n + 1)}
          >
            Save draft
          </LiquidButton>
        </div>
      </MotionProvider>
    </div>
  );
};
