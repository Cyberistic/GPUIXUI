/** @jsxImportSource @gpuix/react */
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

export type GlyphState = PatternFieldState;

export interface GlyphProps extends Omit<Props, "children" | "style"> {
  readonly marks?: string;

  readonly cellSize?: number;

  readonly density?: number;

  readonly seed?: number;

  readonly color?: string;

  readonly breatheMs?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<GlyphState>;

  readonly children?: ReactNode;
}

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

export const glyphMeta = {
  name: "Glyph",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the wall is one `<text>` host per painted cell: the runtime has no text pattern and no canvas host, so the cell count is capped at 240 and a wall is a node per glyph rather than one mask",
    'a glyph publishes no accessibility node because the runtime maps `role="presentation"` to none (measured); the wall therefore says nothing, and the content above it has to carry the name',
    "the wall cannot drift, zoom or rotate — the runtime has no `transform` (upstream issue #102) — so the only motion is a slow opacity breath",
    "the grid covers whole cells, so a strip narrower than one cell at the right or bottom edge stays empty, and a box that would need more than the cell cap grows the cell instead of painting part of the wall",
    "the field measures its own box, so the caller must bound it; before the first layout it paints nothing",
    "a hidden wall keeps breathing (the runtime exposes no visibility query), so unmount it when it is off screen",
  ],
  docs: "docs/glyph.mdx",
  example: "examples/glyph.example.tsx",
  testFile: "src/behaviour/glyph.test.tsx",
} as const;
