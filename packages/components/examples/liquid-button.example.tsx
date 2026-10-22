/**
 * Liquid button example: a save bar whose actions flood from whichever edge the
 * pointer crosses into them, and the same action under the reduced preference.
 *
 * The component reads its own pointer, so the example only shows the looks: a
 * filled primary, an outlined secondary, a ghost action on the page, and a
 * reduced row that still acts without the flood.
 */

import { useState } from "react";
import { LiquidButton } from "../src/liquid-button.js";
import { MotionProvider } from "../src/motion.js";

/** A save counter over three looks, plus a reduced primary action. */
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
