/**
 * Browser preview for the Gravity stars page.
 *
 * The native field drops `count` seeded stars in straight legs toward the
 * caller's well; the preview reproduces the scatter and falls each star the
 * same way.
 */

import { scatter } from "./scatter";

const points = scatter(44, 7, 1, 3);

export function GravityStarsDemo() {
  return (
    <div className="gx-gravitystars">
      {points.map((point, index) => (
        <span
          aria-hidden="true"
          className="gx-gravitystars-dot"
          key={index}
          style={{
            left: `${point.x * 100}%`,
            width: point.size,
            height: point.size,
            animationDelay: `${-point.phase * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

export const gravityStarsDemoSource = `import { GravityStars } from "@gpuixui/components/gravity-stars";

<div style={{ position: "relative", height: 280, overflow: "hidden" }}>
  <div style={{ position: "absolute", inset: 0 }}>
    <GravityStars count={44} seed={7} />
  </div>
  <SignInCard />
</div>;`;
