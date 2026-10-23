/**
 * Browser preview for the Bubbles page.
 *
 * The native field rises `count` seeded bubbles through the caller's bounded
 * box; the preview draws the same scatter with CSS and rises them off the top.
 */

import { scatter } from "./scatter";

const points = scatter(32, 7, 6, 28);

export function BubblesDemo() {
  return (
    <div className="gx-bubbles">
      {points.map((point, index) => (
        <span
          aria-hidden="true"
          className="gx-bubbles-dot"
          key={index}
          style={{
            left: `${point.x * 100}%`,
            width: point.size,
            height: point.size,
            animationDelay: `${-point.phase * 7}s`,
          }}
        />
      ))}
    </div>
  );
}

export const bubblesDemoSource = `import { Bubbles } from "@gpuixui/components/bubbles";

<div style={{ position: "relative", height: 260, overflow: "hidden" }}>
  <div style={{ position: "absolute", inset: 0 }}>
    <Bubbles count={32} seed={7} />
  </div>
  <EmptyState title="Preparing your workspace" />
</div>;`;
