/**
 * Hexagon: a flat-top hexagon grid generated for the box it fills.
 *
 * The runtime paints one `<svg source>` path as a mask in the element's colour,
 * so the field is **one** generated path rather than a component per cell. The
 * `svg-pattern` probe measured how that path lands: it is scaled by the element's
 * width alone and centred from a content area the element does not clip, so the
 * field generates its view box from its own measured box — the scale is then 1:1
 * on both axes, including in a wide hero. `hexagon/logic.ts` owns the tiling.
 *
 * The grid cannot move: the runtime has no `transform` (upstream issue #102), so
 * the only motion a line-art field can offer is a slow breath of opacity, which
 * `internal/pattern-field.tsx` runs. The grid is not content: its art owns no
 * accessibility node and takes no pointer input, children painted above it keep
 * both, and it paints nothing until the box has been measured.
 */

import type { Props } from "@gpuix/react";
import type { StateStyle } from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import type { ReactNode } from "react";
import { hexagonField, hexagonRadius, hexagonStroke } from "./hexagon/logic.js";
import {
  PatternField,
  type PatternFieldState,
} from "./internal/pattern-field.js";
import { useTheme } from "./internal/theme.js";

/** What a hexagon field draws at one frame. */
export type HexagonState = PatternFieldState;

/** {@link Hexagon} props. */
export interface HexagonProps extends Omit<Props, "children" | "style"> {
  /** The hexagon radius (centre to vertex), in pixels. Default `30`; 10–160. */
  readonly radius?: number;
  /** The outline weight, in pixels. Default `1`; 0.5–6. */
  readonly stroke?: number;
  /** The line colour. Default the theme's `border` role. */
  readonly color?: string;
  /** One breath's length in milliseconds. Default `8_000`; 1–60 s. */
  readonly breatheMs?: number;
  /** The entrance level. Default `"slow"` (320 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the box, merged last. */
  readonly className?: string;
  /** A style for the box, or a function of the measured field. */
  readonly style?: StateStyle<HexagonState>;
  /** Content painted above the grid; it owns the words and the presses. */
  readonly children?: ReactNode;
}

/**
 * A bounded box of hexagon outlines behind a hero, a card or an empty state.
 *
 * Give it a box — a height, padding or a sized flex parent — because the grid is
 * generated for the size the field actually has; before the first layout it
 * paints nothing.
 */
export const Hexagon = ({
  radius,
  stroke,
  color,
  breatheMs,
  level,
  className,
  style,
  children,
  ...rest
}: HexagonProps) => {
  const theme = useTheme();
  const ink = color ?? theme.colors.border;

  return (
    <PatternField
      {...rest}
      markup={(box) =>
        hexagonField({
          ...box,
          radius: radius ?? hexagonRadius,
          stroke: stroke ?? hexagonStroke,
        }).markup
      }
      color={ink}
      breatheMs={breatheMs}
      level={level}
      className={className}
      style={style}
    >
      {children}
    </PatternField>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const hexagonMeta = {
  name: "Hexagon",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the field is one generated `<svg source>` path painted as a mask in the element's colour: the runtime paints a markup as one tint, so a multi-colour field is several elements, and a per-shape palette inside one element is not available",
    "the view box is generated for the measured box because a `<svg>` path is scaled by the element's width alone and its centred content area is not clipped by the element (the `svg-pattern` probe); a caller that resizes the box re-generates the grid",
    "the grid cannot rotate, pan or scale: the runtime has no `transform` (upstream issue #102), so the only motion is a slow opacity breath",
    "a radius small enough to exceed the cell cap is grown to the radius the cap allows, and the field reports the drawn radius from its logic rather than dropping cells",
    "the field measures its own box, so the caller must bound it; before the first layout it paints nothing",
    "the field publishes no accessibility node and takes no pointer input: name and describe the content it sits behind",
    "a hidden field keeps breathing (the runtime exposes no visibility query), so unmount it when it is off screen",
  ],
  docs: "docs/hexagon.mdx",
  example: "examples/hexagon.example.tsx",
  testFile: "src/behaviour/hexagon.test.tsx",
} as const;
