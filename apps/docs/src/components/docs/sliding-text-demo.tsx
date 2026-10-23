/**
 * Browser preview for the Sliding text page.
 *
 * The native value slides horizontally into a clipped box when it changes; the
 * preview clips one line and slides the current value in from the direction.
 */

import { useState } from "react";

const states = ["Draft", "In review", "Merged"];

export function SlidingTextDemo() {
  const [index, setIndex] = useState(0);
  const value = states[index] ?? states[0];

  return (
    <div className="gx-slidingtext">
      <div className="gx-slidingtext-box">
        <span className="gx-slidingtext-value" key={value}>
          {value}
        </span>
      </div>
      <button
        className="gx-btn gx-btn-secondary gx-btn-sm"
        onClick={() => setIndex((current) => (current + 1) % states.length)}
        type="button"
      >
        Advance
      </button>
    </div>
  );
}

export const slidingTextDemoSource = `import { SlidingText } from "@gpuixui/components/sliding-text";

<div style={{ width: 220 }}>
  <SlidingText text={status} role="bodyStrong" />
</div>;`;
