/**
 * Browser preview for the Auto height page.
 *
 * The native reveal grows to its content's measured height; the preview mounts
 * the content in place and fades it in, which the page names the approximation.
 */

import { useState } from "react";

export function AutoHeightDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="gx-autoheight">
      <button
        className="gx-btn gx-btn-secondary gx-btn-sm"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? "Collapse" : "Expand"} build settings
      </button>
      {open ? (
        <div className="gx-autoheight-content">
          <div className="gx-autoheight-row">
            <span>Retry budget</span>
            <b>5 attempts</b>
          </div>
          <div className="gx-autoheight-row">
            <span>Timeout</span>
            <b>30 seconds</b>
          </div>
          <div className="gx-autoheight-row">
            <span>Cache</span>
            <b>Enabled</b>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const autoHeightDemoSource = `import { AutoHeight } from "@gpuixui/components/auto-height";

<AutoHeight open={open}>
  <text>Retry budget: 5 attempts</text>
  <text>Timeout: 30 seconds</text>
</AutoHeight>;`;
