/**
 * Browser preview for the Shimmer page.
 *
 * The drawing puts the highlight **in the text**: `.gx-shimmer-content` carries
 * a travelling linear-gradient, clipped to the glyphs with `background-clip:
 * text`, and every stop is the component's own `shimmerFrame` sampled across
 * the line. The preview and the component therefore cannot disagree about where
 * the highlight is. Two fixed frames sit beside the live surface, because the
 * travel is easier to read when two points are side by side.
 *
 * The native component cannot do this (no mask, no background-clip): it inks a
 * text run one code point at a time, or lays a band over children it cannot
 * recolour. The page states that difference rather than implying the two are
 * the same drawing.
 */

import {
  SHIMMER_INK,
  shimmerFrame,
  type ShimmerFrame,
} from "@gpuixui/components/shimmer/logic";
import { useEffect, useState, type ReactNode } from "react";

interface SurfaceProps {
  /** A fixed frame, or `undefined` to run the sweep. */
  readonly step?: number;
  readonly label: string;
  readonly children: ReactNode;
}

/**
 * The gradient at one frame.
 *
 * Each sample is the profile's alpha blended out of the role the theme gives
 * it, so the unlit glyphs keep their resting ink and the peak reads as a sheen.
 * The stop positions are the strip edges the native band paints, so both
 * drawings describe the same travel.
 */
export const shimmerGradient = (frame: ShimmerFrame): string => {
  const last = frame.alphas.length - 1;
  const stops = frame.alphas.map((alpha, index) => {
    const share = Math.round(alpha * SHIMMER_INK * 100);
    const position = last === 0 ? 0 : (index / last) * 100;
    return `color-mix(in srgb, var(--primary) ${share}%, var(--foreground)) ${position}%`;
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
};

/** One surface: the content painted with the frame's gradient. */
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
        <div
          className="gx-shimmer-content"
          style={{ backgroundImage: shimmerGradient(frame) }}
        >
          {children}
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

// A plain string is inked one code point at a time from the travelling profile.
<Shimmer label="Generating a reply" durationMs={2000}>
  Generating a reply…
</Shimmer>;

// A composed child keeps the surface band; the runtime cannot recolour it.
<Shimmer label="Reading the conversation">
  <Card>
    <Text role="body">The assistant is reading the conversation.</Text>
  </Card>
</Shimmer>;`;
