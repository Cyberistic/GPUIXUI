/**
 * Browser preview for the Shimmer page.
 *
 * The native surface is a row of thin strips: each strip is a two-stop ramp
 * between two neighbouring samples of one triangular brightness profile, and
 * the profile's peak travels across the row. The drawing uses the component's
 * own `shimmerFrame`, so the preview and the paint cannot disagree about where
 * the highlight is. Two fixed frames sit beside a live surface, because the
 * effect is easier to read when two points in its travel are side by side.
 */

import { SHIMMER_STEPS, shimmerFrame } from "@gpuixui/components/shimmer/logic";
import * as Arr from "effect/Array";
import { useEffect, useState, type ReactNode } from "react";

const STEPS = Arr.range(0, SHIMMER_STEPS - 1);

interface SurfaceProps {
  /** A fixed frame, or `undefined` to run the sweep. */
  readonly step?: number;
  readonly label: string;
  readonly children: ReactNode;
}

const strip = (from: number, to: number): string =>
  `linear-gradient(90deg, color-mix(in srgb, var(--foreground) ${from * 30}%, transparent), color-mix(in srgb, var(--foreground) ${to * 30}%, transparent))`;

/** One surface: the content, then the band over it. */
const ShimmerSurface = ({ step, label, children }: SurfaceProps) => {
  const [live, setLive] = useState(0);

  useEffect(() => {
    if (step !== undefined) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    const id = setInterval(() => setLive((current) => current + 1), 125);
    return () => clearInterval(id);
  }, [step]);

  const frame = shimmerFrame(step ?? live);

  return (
    <div className="gx-shimmer-frame">
      <div className="gx-shimmer-surface">
        <div className="gx-shimmer-content">{children}</div>
        <div aria-hidden="true" className="gx-shimmer-band">
          {Arr.map(STEPS, (index) => (
            <span
              className="gx-shimmer-strip"
              key={index}
              style={{
                background: strip(
                  frame.alphas[index] ?? 0,
                  frame.alphas[index + 1] ?? 0,
                ),
              }}
            />
          ))}
        </div>
      </div>
      <span className="gx-shimmer-caption">{label}</span>
    </div>
  );
};

export const ShimmerDemo = () => (
  <div className="gx-demo gx-demo-column gx-shimmer-scene">
    <ShimmerSurface label="Live sweep">
      <p className="gx-shimmer-title">Generating a reply…</p>
      <p className="gx-shimmer-line">
        The assistant is reading the conversation.
      </p>
    </ShimmerSurface>
    <div className="gx-shimmer-frames">
      <ShimmerSurface label="Frame 4" step={4}>
        <p className="gx-shimmer-title">Thinking…</p>
      </ShimmerSurface>
      <ShimmerSurface label="Frame 11" step={11}>
        <p className="gx-shimmer-title">Thinking…</p>
      </ShimmerSurface>
    </div>
  </div>
);

export const shimmerDemoSource = `import { Shimmer } from "@gpuixui/components/shimmer";

<Shimmer label="Generating a reply" durationMs={2000}>
  <p>Generating a reply…</p>
</Shimmer>;

// A surface that owns its own height, clipping the band:
<Shimmer active={false}>
  <p>Done</p>
</Shimmer>;`;
