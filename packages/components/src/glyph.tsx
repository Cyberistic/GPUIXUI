/**
 * Glyph: a wall of characters generated for the box it fills.
 *
 * A character wall is the one background pattern the runtime can paint as text
 * and nothing else, so each cell is its own `<text>` host — there is no text
 * pattern and no canvas host. The grid, the mark each cell draws and its
 * brightness are a pure function of the measured box and one `seed`
 * (`glyph/logic.ts`), so the same seed paints the same wall on every mount.
 *
 * A glyph is **paint, not content**: every cell is `role="presentation"`, which
 * `0.11.0` maps to no accessibility node at all (measured — a node is in the
 * tree only with a role), so a reader is not read a wall of characters. That
 * absence is why the wall could land: the catalogue deferred it while the
 * runtime had no way to hide a decorative run of text.
 *
 * The wall cannot drift, zoom or rotate (the runtime has no `transform`,
 * upstream issue #102), so its one motion is the shared slow breath of opacity
 * from `internal/pattern-field.tsx`, plus the house entrance. Children painted
 * above it keep the words and the presses.
 */

import type { Props } from "@gpuix/react";
import type { StateStyle } from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { glyphField } from "./glyph/logic.js";
import {
  DecorativeField,
  type PatternFieldState,
} from "./internal/pattern-field.js";
import { useTheme } from "./internal/theme.js";

/** What a glyph wall draws at one frame. */
export type GlyphState = PatternFieldState;

/** {@link Glyph} props. */
export interface GlyphProps extends Omit<Props, "children" | "style"> {
  /**
   * The characters the wall draws from, as code points. Default
   * `. + * / \ < > [ ] { } ~`; an empty string uses the house set.
   */
  readonly marks?: string;
  /** The cell size, in pixels. Default `22`; 10–72, grown to honour the cell cap. */
  readonly cellSize?: number;
  /** The share of cells that carry a mark, `0…1`. Default `0.55`. */
  readonly density?: number;
  /** The layout seed. Default `1`; the same seed paints the same wall. */
  readonly seed?: number;
  /** The ink. Default the theme's `border` role. */
  readonly color?: string;
  /** One breath's length in milliseconds. Default `8_000`; 1–60 s. */
  readonly breatheMs?: number;
  /** The entrance level. Default `"slow"` (320 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the box, merged last. */
  readonly className?: string;
  /** A style for the box, or a function of the measured wall. */
  readonly style?: StateStyle<GlyphState>;
  /** Content painted above the wall; it owns the words and the presses. */
  readonly children?: ReactNode;
}

/**
 * A bounded box of characters behind a hero, a card or a launch panel.
 *
 * Give it a box — a height, padding or a sized flex parent — because the grid is
 * generated for the size the field actually has; before the first layout it
 * paints nothing.
 */
export const Glyph = ({
  marks,
  cellSize,
  density,
  seed,
  color,
  breatheMs,
  level,
  className,
  style,
  children,
  ...rest
}: GlyphProps) => {
  const theme = useTheme();
  const ink = color ?? theme.colors.border;

  return (
    <DecorativeField
      {...rest}
      art={(box, id) => {
        const field = glyphField({ ...box, cellSize, density, seed, marks });
        const size = Math.round(field.cell * 0.6);
        return (
          <>
            {Arr.map(field.cells, (cell) => (
              <text
                key={cell.key}
                testId={`${id}-cell-${cell.key}`}
                role="presentation"
                style={{
                  position: "absolute",
                  left: cell.x,
                  top: cell.y,
                  fontSize: size,
                  color: ink,
                  opacity: cell.opacity,
                  pointerEvents: "none",
                }}
              >
                {cell.text}
              </text>
            ))}
          </>
        );
      }}
      breatheMs={breatheMs}
      level={level}
      className={className}
      style={style}
    >
      {children}
    </DecorativeField>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const glyphMeta = {
  name: "Glyph",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the wall is one `<text>` host per painted cell: the runtime has no text pattern and no canvas host, so the cell count is capped at 240 and a wall is a node per glyph rather than one mask",
    "a glyph publishes no accessibility node because the runtime maps `role=\"presentation\"` to none (measured); the wall therefore says nothing, and the content above it has to carry the name",
    "the wall cannot drift, zoom or rotate — the runtime has no `transform` (upstream issue #102) — so the only motion is a slow opacity breath",
    "the grid covers whole cells, so a strip narrower than one cell at the right or bottom edge stays empty, and a box that would need more than the cell cap grows the cell instead of painting part of the wall",
    "the field measures its own box, so the caller must bound it; before the first layout it paints nothing",
    "a hidden wall keeps breathing (the runtime exposes no visibility query), so unmount it when it is off screen",
  ],
  docs: "docs/glyph.mdx",
  example: "examples/glyph.example.tsx",
  testFile: "src/behaviour/glyph.test.tsx",
} as const;
