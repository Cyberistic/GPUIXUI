/** @jsxImportSource @gpuix/react */
import { useEffect, useState } from "react";
import { Button } from "@gpuixui/components/authoring";
import { MotionProvider } from "@gpuixui/components/motion";
import { RollingText } from "../src/rolling-text.js";

const statuses = ["Running", "Deploying", "Healthy", "Draining"] as const;

export const RollingTextExample = () => {
  const [deploys, setDeploys] = useState(1_284);
  const [status, setStatus] = useState(0);

  useEffect(() => {
    const handle = setInterval(
      () => setStatus((index) => (index + 1) % statuses.length),
      900,
    );
    return () => clearInterval(handle);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <RollingText text={String(deploys)} role="display" />
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button variant="secondary" onClick={() => setDeploys((n) => n + 1)}>
          One more deploy
        </Button>
        <Button variant="ghost" onClick={() => setDeploys(0)}>
          Reset
        </Button>
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <text>Status</text>
        <RollingText text={statuses[status] ?? ""} role="bodyStrong" />
      </div>
      <MotionProvider preference="reduced">
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <text>Reduced</text>
          <RollingText
            text={statuses[status] ?? ""}
            role="bodyStrong"
            direction="down"
          />
        </div>
      </MotionProvider>
    </div>
  );
};
