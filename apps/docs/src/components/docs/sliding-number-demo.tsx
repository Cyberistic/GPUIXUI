/**
 * Browser preview for the Sliding number page.
 *
 * The native counter rolls digits into place; the preview clips one line of
 * tabular digits and rolls the current value up on each deploy.
 */

import { useState } from "react";

export function SlidingNumberDemo() {
  const [deploys, setDeploys] = useState(128);

  return (
    <div className="gx-slidingnumber">
      <div className="gx-slidingnumber-line">
        <span className="gx-slidingnumber-value" key={deploys}>
          {deploys}
        </span>
      </div>
      <p className="gx-slidingnumber-readout">{deploys} deploys</p>
      <button
        className="gx-btn gx-btn-secondary gx-btn-sm"
        onClick={() => setDeploys((current) => current + 1)}
        type="button"
      >
        Deploy
      </button>
    </div>
  );
}

export const slidingNumberDemoSource = `import { SlidingNumber } from "@gpuixui/components/sliding-number";

<SlidingNumber value={deploys} role="display" label={\`\${deploys} deploys\`} />;`;
