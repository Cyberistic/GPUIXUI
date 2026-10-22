/**
 * Sliding number example: a counter and a price whose digits roll.
 *
 * Two buttons move the counter, so the value crossing a decade shows the column
 * that appears beside the one that rolls. The price shows the point and the
 * affixes; the reduced case changes with the same controls and paints the new
 * digits at once.
 */

import { useState } from "react";
import { Button } from "../src/internal/button.js";
import { MotionProvider } from "../src/motion.js";
import { SlidingNumber } from "../src/sliding-number.js";

/** A counter that steps by one, a price that steps by a cent, and a reduced row. */
export const SlidingNumberExample = () => {
  const [count, setCount] = useState(99);
  const [price, setPrice] = useState(24.5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SlidingNumber value={count} role="display" label={`${count} deploys`} />
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button variant="secondary" onClick={() => setCount((n) => n + 1)}>
          One more
        </Button>
        <Button variant="ghost" onClick={() => setCount(0)}>
          Reset
        </Button>
      </div>
      <SlidingNumber
        value={price}
        decimals={2}
        prefix="$"
        suffix="/mo"
        role="h3"
        label={`$${price.toFixed(2)} per month`}
      />
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button
          variant="secondary"
          onClick={() => setPrice((value) => Number((value + 0.05).toFixed(2)))}
        >
          Raise 5¢
        </Button>
        <MotionProvider preference="reduced">
          <SlidingNumber value={count} role="h3" suffix="%" />
        </MotionProvider>
      </div>
    </div>
  );
};
