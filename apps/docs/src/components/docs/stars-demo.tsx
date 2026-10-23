/**
 * Browser preview for the Stars page.
 *
 * The native field scatters `count` seeded lights and twinkles them in place;
 * the preview reproduces the scatter and pulses each light's opacity.
 */

import { scatter } from "./scatter";

const points = scatter(64, 11, 1, 3);

export function StarsDemo() {
  return (
    <div className="gx-stars">
      {points.map((point, index) => (
        <span
          aria-hidden="true"
          className="gx-stars-dot"
          key={index}
          style={{
            left: `${point.x * 100}%`,
            top: `${point.y * 100}%`,
            width: point.size,
            height: point.size,
            animationDelay: `${-point.phase * 2.4}s`,
          }}
        />
      ))}
    </div>
  );
}

export const starsDemoSource = `import { Stars } from "@gpuixui/components/stars";

<div style={{ position: "relative", height: 240, overflow: "hidden" }}>
  <div style={{ position: "absolute", inset: 0 }}>
    <Stars count={64} seed={11} />
  </div>
  <EmptyState title="No builds yet" />
</div>;`;
