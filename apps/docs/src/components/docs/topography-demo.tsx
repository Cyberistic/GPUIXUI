/**
 * Browser preview for the Topography page.
 *
 * The native map is seeded contour lines from two sine waves; the preview
 * reproduces the same wave field as one `<svg>` and breathes its ink.
 */

const width = 520;
const height = 260;
const spacing = 32;
const amplitude = 10;

const contour = (y: number, phase: number): string => {
  const step = 8;
  const points = Array.from(
    { length: Math.floor(width / step) + 1 },
    (_, i) => {
      const x = i * step;
      const dy =
        amplitude *
        (Math.sin(x / 48 + phase) + 0.6 * Math.sin(x / 23 + phase * 1.7));
      return `L${x},${(y + dy).toFixed(1)}`;
    },
  );
  return `M0,${y.toFixed(1)}` + points.join("");
};

const lines = Array.from({ length: Math.floor(height / spacing) + 1 }, (_, i) =>
  contour(i * spacing, i * 0.9),
);

export function TopographyDemo() {
  return (
    <svg
      aria-hidden="true"
      className="gx-topography"
      viewBox={`0 0 ${width} ${height}`}
    >
      {lines.map((d, index) => (
        <path d={d} key={index} />
      ))}
    </svg>
  );
}

export const topographyDemoSource = `import { Topography } from "@gpuixui/components/topography";

<Topography spacing={30} amplitude={10} seed={3} style={{ width: 520, height: 260 }} />;`;
