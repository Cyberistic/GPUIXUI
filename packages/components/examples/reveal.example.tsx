/**
 * Reveal example: a settings section arriving, and a notice that leaves.
 *
 * The first block is a mount reveal per line, staggered by a delay, so a reader
 * sees the arrival a line at a time. The second is the controlled contract: a
 * press opens and closes the notice, which stays mounted for its exit.
 */

import { useState } from "react";
import { Button } from "../src/internal/button.js";
import { MotionProvider } from "../src/motion.js";
import { Reveal } from "../src/reveal.js";

const lines = [
  "Automatic updates are on.",
  "Diagnostics stay on this machine.",
  "Telemetry is off.",
];

/** A staggered arrival and a notice that can be dismissed. */
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
