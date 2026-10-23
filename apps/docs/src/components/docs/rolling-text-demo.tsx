/**
 * Browser preview for the Rolling text page.
 *
 * The native value rolls vertically into a single clipped line on change; the
 * preview clips one line and rolls the current value up into it.
 */

import { useState } from "react";

const states = ["Idle", "Building", "Deploying", "Live"];

export function RollingTextDemo() {
  const [index, setIndex] = useState(0);
  const value = states[index] ?? states[0];

  return (
    <div className="gx-rolling">
      <div className="gx-rolling-line">
        <span className="gx-rolling-value" key={value}>
          {value}
        </span>
      </div>
      <button
        className="gx-btn gx-btn-secondary gx-btn-sm"
        onClick={() => setIndex((current) => (current + 1) % states.length)}
        type="button"
      >
        Next state
      </button>
    </div>
  );
}

export const rollingTextDemoSource = `import { RollingText } from "@gpuixui/components/rolling-text";

<RollingText text={status} role="bodyStrong" />;`;
