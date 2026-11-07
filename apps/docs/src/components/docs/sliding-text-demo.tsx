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

export const slidingTextDemoSource = `import { SlidingText } from "@gpuixui/fx/sliding-text";

<div style={{ width: 220 }}>
  <SlidingText text={status} role="bodyStrong" />
</div>;`;
