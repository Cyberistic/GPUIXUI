/**
 * Browser preview for the Hexagon page.
 *
 * The native field tiles hexagon outlines for its box and breathes their ink;
 * the preview reproduces the same grid as one `<svg>` and pulses its opacity.
 */

const width = 520;
const height = 260;
const radius = 26;

const path = (cx: number, cy: number, r: number): string =>
  Array.from({ length: 6 }, (_, k) => {
    const angle = (Math.PI / 3) * k;
    const x = (cx + r * Math.cos(angle)).toFixed(1);
    const y = (cy + r * Math.sin(angle)).toFixed(1);
    return `${k === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ") + "Z";

const colGap = radius * Math.sqrt(3);
const rowGap = radius * 1.5;

const cells = Array.from(
  { length: Math.ceil((width + colGap) / colGap) },
  (_, col) =>
    Array.from({ length: Math.ceil((height + rowGap) / rowGap) }, (_, row) => ({
      cx: col * colGap,
      cy: row * rowGap + (col % 2 === 0 ? 0 : rowGap / 2),
    })),
)
  .flat()
  .filter(({ cx, cy }) => cx < width + radius && cy < height + radius)
  .map(({ cx, cy }) => path(cx, cy, radius));

export function HexagonDemo() {
  return (
    <svg
      aria-hidden="true"
      className="gx-hexagon"
      viewBox={`0 0 ${width} ${height}`}
    >
      {cells.map((d, index) => (
        <path d={d} key={index} />
      ))}
    </svg>
  );
}

export const hexagonDemoSource = `import { Hexagon } from "@gpuixui/components/hexagon";

<Hexagon radius={34} stroke={1} style={{ width: 520, height: 260 }} />;`;
