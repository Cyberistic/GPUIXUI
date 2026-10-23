/**
 * Browser preview for the Gradient page.
 *
 * The native surface breathes between two seeded ramps; the preview paints the
 * two-stop ramp and cross-fades a second one over it on the same slow loop.
 */

export function GradientDemo() {
  return (
    <div className="gx-gradient">
      <span aria-hidden="true" className="gx-gradient-layer" />
      <p className="gx-gradient-kicker">Release 0.11</p>
      <p className="gx-gradient-title">Ship faster with panels</p>
      <p className="gx-gradient-copy">
        One native runtime, every surface — no DOM in between.
      </p>
    </div>
  );
}

export const gradientDemoSource = `import { Gradient } from "@gpuixui/components/gradient";

<Gradient from="#7C5CFF" to="#101014" angle={120} shift={80}>
  <text role="h2">Ship faster with panels</text>
</Gradient>;`;
