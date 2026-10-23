/**
 * Browser preview for the Gradient text page.
 *
 * The native phrase is a per-glyph colour ramp; the preview paints each glyph
 * its own stop between the two roles, so the ramp reads at glyph resolution.
 */

const phrase = "Native by default";

const stops = Array.from({ length: phrase.length }, (_, index) =>
  index === 0 ? 0 : index / (phrase.length - 1),
);

export function GradientTextDemo() {
  return (
    <div className="gx-gradienttext">
      {phrase.split("").map((glyph, index) => {
        const stop = stops[index] ?? 0;
        return (
          <span
            aria-hidden="true"
            className="gx-gradienttext-glyph"
            key={index}
            style={{
              color: `color-mix(in srgb, var(--primary) ${(stop * 100).toFixed(0)}%, var(--foreground))`,
            }}
          >
            {glyph === " " ? "\u00A0" : glyph}
          </span>
        );
      })}
    </div>
  );
}

export const gradientTextDemoSource = `import { GradientText } from "@gpuixui/components/gradient-text";

<GradientText text="Native by default" />;

// Own the colours.
<GradientText text="Fast by design" from="#7C5CFF" to="#24C6A8" role="h2" />;`;
