/**
 * A smooth path through points, the way a chart library draws one.
 *
 * A polyline puts a sharp vertex on every datum, which reads as noise when two
 * series are stacked. This is a **monotone cubic** interpolation — the curve
 * that passes through every point without overshooting between them — so the
 * line is calm and never invents a value the data does not have.
 *
 * It is shared by every browser drawing of a chart on this site, so the block,
 * the landing tile and the docs demo draw the same curve the shipped component
 * does.
 */

/** One point of a line, in the drawing's own units. */
export interface Spoke {
  readonly x: number;
  readonly y: number;
}

/** The path through the points, as SVG markup. */
export const smoothPath = (points: ReadonlyArray<Spoke>): string => {
  const first = points[0];
  if (first === undefined) return "";
  if (points.length === 1)
    return `M${first.x.toFixed(1)},${first.y.toFixed(1)}`;

  const n = points.length;
  const run: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a === undefined || b === undefined) continue;
    const span = b.x - a.x;
    run[i] = span;
    slope[i] = span === 0 ? 0 : (b.y - a.y) / span;
  }

  // The Fritsch–Carlson tangents: a slope that would overshoot is pulled back
  // to zero, so the curve stays inside its own data.
  const tangent: number[] = Array.from({ length: n }, () => 0);
  tangent[0] = slope[0] ?? 0;
  tangent[n - 1] = slope[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i += 1) {
    const before = slope[i - 1] ?? 0;
    const after = slope[i] ?? 0;
    if (before * after <= 0) {
      tangent[i] = 0;
      continue;
    }
    const left = 2 * (run[i] ?? 1) + (run[i - 1] ?? 1);
    const right = (run[i] ?? 1) + 2 * (run[i - 1] ?? 1);
    tangent[i] = (left + right) / (left / before + right / after);
  }

  let path = `M${first.x.toFixed(1)},${first.y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a === undefined || b === undefined) continue;
    const h = (b.x - a.x) / 3;
    path += ` C${(a.x + h).toFixed(1)},${(a.y + (tangent[i] ?? 0) * h).toFixed(1)} ${(b.x - h).toFixed(1)},${(b.y - (tangent[i + 1] ?? 0) * h).toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  }
  return path;
};
