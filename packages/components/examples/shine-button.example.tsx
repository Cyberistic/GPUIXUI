/**
 * Shine button example: a build toolbar whose actions catch the light as the
 * pointer crosses them, and the same primary action under the reduced
 * preference.
 *
 * The component owns the hover reading, so the example only shows the looks: a
 * filled primary, an outlined secondary, a ghost action on the page, and a
 * reduced row that still runs.
 */

import { useState } from "react";
import { MotionProvider } from "../src/motion.js";
import { ShineButton } from "../src/shine-button.js";

/** A build counter over three looks, plus a reduced primary action. */
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
