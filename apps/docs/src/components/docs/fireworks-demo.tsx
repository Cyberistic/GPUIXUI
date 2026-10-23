/**
 * Browser preview for the Fireworks page.
 *
 * The native field bursts seeded sparks out of a few centres; the preview
 * scatters the same points and flies each spark from its centre to its rim on
 * a timed loop.
 */

import type { CSSProperties } from "react";

interface Spark {
  readonly sx: number;
  readonly sy: number;
  readonly ex: number;
  readonly ey: number;
  readonly size: number;
  readonly delay: number;
}

let state = (5 * 2654435761) >>> 0;
const next = (): number => {
  state = (state * 1664525 + 1013904223) >>> 0;
  return state / 0xffffffff;
};

const centres = Array.from({ length: 3 }, () => ({
  x: 18 + next() * 64,
  y: 16 + next() * 56,
}));

const sparks: ReadonlyArray<Spark> = centres.flatMap((centre, burst) =>
  Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2 + next() * 0.4;
    const distance = 28 + next() * 52;
    return {
      sx: centre.x,
      sy: centre.y,
      ex: centre.x + Math.cos(angle) * distance,
      ey: centre.y + Math.sin(angle) * distance,
      size: 2 + next() * 2,
      delay: burst * 0.45 + next() * 0.3,
    };
  }),
);

export function FireworksDemo() {
  return (
    <div className="gx-fireworks">
      {sparks.map((spark, index) => (
        <span
          aria-hidden="true"
          className="gx-fireworks-spark"
          key={index}
          style={
            {
              "--sx": `${spark.sx}%`,
              "--sy": `${spark.sy}%`,
              "--ex": `${spark.ex}%`,
              "--ey": `${spark.ey}%`,
              width: spark.size,
              height: spark.size,
              animationDelay: `${-spark.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export const fireworksDemoSource = `import { Fireworks } from "@gpuixui/components/fireworks";

<div style={{ position: "relative", height: 260, overflow: "hidden" }}>
  <div style={{ position: "absolute", inset: 0 }}>
    <Fireworks bursts={3} sparks={18} seed={5} />
  </div>
  <EmptyState title="Release published" />
</div>;`;
