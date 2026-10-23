/**
 * Browser preview for the Particles page.
 *
 * The native field drifts `count` seeded motes across the caller's bounded box;
 * the preview reproduces the scatter and drifts each mote on a slow loop.
 */

import type { CSSProperties } from "react";
import { scatter } from "./scatter";

const points = scatter(28, 7, 2, 5);

export function ParticlesDemo() {
  return (
    <div className="gx-particles">
      {points.map((point, index) => (
        <span
          aria-hidden="true"
          className="gx-particles-dot"
          key={index}
          style={
            {
              "--start": `${point.x * 100}%`,
              top: `${point.y * 100}%`,
              width: point.size,
              height: point.size,
              animationDelay: `${-point.phase * 14}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export const particlesDemoSource = `import { Particles } from "@gpuixui/components/particles";

<div style={{ position: "relative", height: 220, overflow: "hidden" }}>
  <div style={{ position: "absolute", inset: 0 }}>
    <Particles count={28} seed={7} />
  </div>
  <Hero copy="Aurora 3.0" />
</div>;`;
