/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { MotionProvider } from "@gpuixui/components/motion";
import { ShineButton } from "../src/shine-button.js";

export const ShineButtonExample = () => {
  const [builds, setBuilds] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <text>Glint toolbar</text>
      <text>{`Builds started: ${builds}`}</text>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <ShineButton variant="primary" onClick={() => setBuilds((n) => n + 1)}>
          Start build
        </ShineButton>
        <ShineButton
          variant="secondary"
          onClick={() => setBuilds((n) => n + 1)}
        >
          Rebuild
        </ShineButton>
        <ShineButton variant="ghost" onClick={() => setBuilds(0)}>
          Clear log
        </ShineButton>
      </div>
      <MotionProvider preference="reduced">
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <text>Reduced motion</text>
          <ShineButton
            variant="primary"
            onClick={() => setBuilds((n) => n + 1)}
          >
            Start build
          </ShineButton>
        </div>
      </MotionProvider>
    </div>
  );
};
