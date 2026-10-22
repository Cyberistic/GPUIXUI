/**
 * Sliding text example: a status board whose value slides across its box.
 *
 * The clock is the application's — a sliding value is a controlled value, so the
 * example owns the interval it changes on. `Back` mirrors both halves, and the
 * last row runs under the reduced preference, which paints each value without
 * the journey.
 */

import { useEffect, useState } from "react";
import { Button } from "../src/internal/button.js";
import { MotionProvider } from "../src/motion.js";
import { SlidingText } from "../src/sliding-text.js";

const views = ["Overview", "Deployments", "Settings"] as const;

/** A view name that slides forward and one that slides back. */
export const SlidingTextExample = () => {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const view = views[index] ?? "";

  useEffect(() => {
    if (!auto) return;
    const handle = setInterval(
      () => setIndex((current) => (current + 1) % views.length),
      1_200,
    );
    return () => clearInterval(handle);
  }, [auto]);

  const step = (delta: 1 | -1) => {
    setAuto(false);
    setIndex((current) => (current + delta + views.length) % views.length);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          width: 240,
        }}
      >
        <text>Workspace</text>
        <SlidingText text={view} role="display" />
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button variant="secondary" onClick={() => step(-1)}>
          Back
        </Button>
        <Button onClick={() => step(1)}>Forward</Button>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 8,
          alignItems: "baseline",
        }}
      >
        <text>Reduced</text>
        <div style={{ width: 160 }}>
          <MotionProvider preference="reduced">
            <SlidingText text={view} role="bodyStrong" direction="back" />
          </MotionProvider>
        </div>
      </div>
    </div>
  );
};
