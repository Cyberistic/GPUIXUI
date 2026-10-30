/**
 * The Shimmer drawing.
 *
 * The bug these guard: the preview painted a translucent band over its children
 * instead of putting the highlight in the text, and a fixed strip of stops that
 * the component's own `shimmerFrame` never moved. The drawing now samples the
 * component's frame, so two frames must produce different gradients and the
 * surface must never regain a band.
 */

import { SHIMMER_STEPS, shimmerFrame } from "@gpuixui/components/shimmer/logic";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShimmerDemo, shimmerGradient } from "./shimmer-demo";

/** The stop positions in a gradient, after each `color-mix(...)`. */
const stops = (gradient: string): ReadonlyArray<string> =>
  gradient.match(/\)\) \d+(?:\.\d+)?%/g) ?? [];

describe("the shimmer drawing", () => {
  it("paints the gradient into the text and lays no band over it", () => {
    const markup = renderToStaticMarkup(<ShimmerDemo />);

    expect(markup).toContain("gx-shimmer-content");
    expect(markup).toContain("background-image:linear-gradient(90deg");
    expect(markup).not.toContain("gx-shimmer-band");
  });

  it("draws one stop per profile sample", () => {
    expect(stops(shimmerGradient(shimmerFrame(4)))).toHaveLength(
      SHIMMER_STEPS + 1,
    );
  });

  it("moves the stops with the component's frame", () => {
    expect(shimmerGradient(shimmerFrame(4))).not.toBe(
      shimmerGradient(shimmerFrame(11)),
    );
    expect(shimmerGradient(shimmerFrame(0))).toBe(
      shimmerGradient(shimmerFrame(SHIMMER_STEPS)),
    );
  });
});
