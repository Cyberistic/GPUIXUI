/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { RippleButton } from "../src/ripple-button.js";
import { MotionProvider } from "@gpuixui/components/motion";

export const RippleButtonExample = () => {
  const [deploys, setDeploys] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <text>{`Deploys: ${deploys}`}</text>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <RippleButton
          variant="primary"
          onClick={() => setDeploys((n) => n + 1)}
        >
          Deploy
        </RippleButton>
        <RippleButton variant="secondary" onClick={() => setDeploys(0)}>
          Reset
        </RippleButton>
        <RippleButton variant="ghost" onClick={() => setDeploys(0)}>
          Cancel
        </RippleButton>
      </div>
      <MotionProvider preference="reduced">
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <text>Reduced</text>
          <RippleButton
            variant="primary"
            onClick={() => setDeploys((n) => n + 1)}
          >
            Still acts
          </RippleButton>
        </div>
      </MotionProvider>
    </div>
  );
};
