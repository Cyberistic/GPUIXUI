/**
 * Browser preview for the Glyph page.
 *
 * The native wall places seeded marks on a grid and breathes their ink; the
 * preview reproduces the grid and pulses the marks' opacity on the same loop.
 */

const marks = "+/*<>[]{}~";

let state = (5 * 2654435761) >>> 0;
const next = (): number => {
  state = (state * 1664525 + 1013904223) >>> 0;
  return state / 0xffffffff;
};

const cells = Array.from({ length: 96 }, () => ({
  mark: marks[Math.floor(next() * marks.length)],
  delay: -next() * 8,
  dim: next() < 0.7,
}));

export function GlyphDemo() {
  return (
    <div className="gx-glyph">
      {cells.map((cell, index) => (
        <span
          aria-hidden="true"
          className="gx-glyph-mark"
          data-dim={cell.dim ? "" : undefined}
          key={index}
          style={{ animationDelay: `${cell.delay}s` }}
        >
          {cell.mark}
        </span>
      ))}
      <p className="gx-glyph-copy">Open the command deck</p>
    </div>
  );
}

export const glyphDemoSource = `import { Glyph } from "@gpuixui/components/glyph";

<Glyph marks="+/*<>[]{}" cellSize={20} seed={5} style={{ width: 520, height: 220 }}>
  <text>Open the command deck</text>
</Glyph>;`;
