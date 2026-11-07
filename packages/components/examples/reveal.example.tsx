/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { Button } from "../src/internal/button.js";
import { MotionProvider } from "../src/motion.js";
import { Reveal } from "../src/reveal.js";

const lines = [
  "Automatic updates are on.",
  "Diagnostics stay on this machine.",
  "Telemetry is off.",
];

export const RevealExample = () => {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {lines.map((line, index) => (
        <Reveal key={line} delayMs={index * 60}>
          <text>{line}</text>
        </Reveal>
      ))}
      <Button variant="secondary" onClick={() => setOpen(!open)}>
        {open ? "Dismiss notice" : "Show notice"}
      </Button>
      <Reveal open={open} from="right" distance={12}>
        <text>Your export is ready to download.</text>
      </Reveal>
      <MotionProvider preference="reduced">
        <Reveal distance={12}>
          <text>This line arrives without the journey.</text>
        </Reveal>
      </MotionProvider>
    </div>
  );
};
