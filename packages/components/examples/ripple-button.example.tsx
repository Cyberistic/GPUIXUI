/**
 * Ripple button example: three actions that mark the press where it landed.
 *
 * The ripple belongs to the action, not to a wrapper, so each press reports its
 * own point. The third row is under the reduced preference: the same action, the
 * same press, and no journey — the pressed fill is the feedback that remains.
 */

import { useState } from "react";
import { RippleButton } from "../src/ripple-button.js";
import { MotionProvider } from "../src/motion.js";

/** A counter pressed at the corners, plus the two other looks. */
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
