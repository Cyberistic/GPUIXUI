/**
 * Topography: a contour map generated for the box it fills.
 *
 * Each line wanders across the box under two seeded sine waves and every line
 * has its own phase, so the field reads as a contour map rather than a set of
 * stripes. The whole map is **one** generated `<svg source>` path — the runtime
 * paints a markup as one tint, so one element is one ink — and the view box is
 * generated from the field's measured box, because a `<svg>` path is scaled by
 * the element's width alone and its centred content area is not clipped by the
 * element (the `svg-pattern` probe). `topography/logic.ts` owns the arithmetic.
 *
 * The contour cannot drift: the runtime has no `transform` (upstream issue #102),
 * so the only motion a line-art field can offer is a slow breath of opacity,
 * which `internal/pattern-field.tsx` runs. The art owns no accessibility node and
 * takes no pointer input; children painted above the map keep both. The field
 * paints nothing before its first layout.
 */

import type { Props } from "@gpuix/react";
import type { StateStyle } from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import type { ReactNode } from "react";
import {
  PatternField,
  type PatternFieldState,
} from "./internal/pattern-field.js";
import { useTheme } from "./internal/theme.js";
import {
  topographyAmplitude,
  topographyField,
  topographySeed,
  topographySpacing,
  topographyStroke,
} from "./topography/logic.js";

/** What a contour field draws at one frame. */
export type TopographyState = PatternFieldState;

/** {@link Topography} props. */
export interface TopographyProps extends Omit<Props, "children" | "style"> {
  /** The distance between two lines, in pixels. Default `32`; 12–120. */
  readonly spacing?: number;
  /** How far a line wanders from its base, in pixels. Default `8`; 0–60. */
  readonly amplitude?: number;
  /** The line weight, in pixels. Default `1`; 0.5–6. */
  readonly stroke?: number;
  /** The layout seed. Default `1`; the same seed paints the same map. */
  readonly seed?: number;
  /** The line colour. Default the theme's `border` role. */
  readonly color?: string;
  /** One breath's length in milliseconds. Default `8_000`; 1–60 s. */
  readonly breatheMs?: number;
  /** The entrance level. Default `"slow"` (320 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the box, merged last. */
  readonly className?: string;
  /** A style for the box, or a function of the measured field. */
  readonly style?: StateStyle<TopographyState>;
  /** Content painted above the map; it owns the words and the presses. */
  readonly children?: ReactNode;
}

/**
 * A bounded box of contour lines behind a hero, a launch panel or an empty state.
 *
 * Give it a box — a height, padding or a sized flex parent — because the map is
 * generated for the size the field actually has; before the first layout it
 * paints nothing.
 */
export const Topography = ({
  spacing,
  amplitude,
  stroke,
  seed,
  color,
  breatheMs,
  level,
  className,
  style,
  children,
  ...rest
}: TopographyProps) => {
  const theme = useTheme();
  const ink = color ?? theme.colors.border;

  return (
    <PatternField
      {...rest}
      markup={(box) =>
        topographyField({
          ...box,
          spacing: spacing ?? topographySpacing,
          amplitude: amplitude ?? topographyAmplitude,
          stroke: stroke ?? topographyStroke,
          seed: seed ?? topographySeed,
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
export const topographyMeta = {
  name: "Topography",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the contour is one generated `<svg source>` path painted as a mask in the element's colour: the runtime paints a markup as one tint, so a two-ink map is two elements",
    "the view box is generated for the measured box because a `<svg>` path is scaled by the element's width alone and its centred content area is not clipped by the element (the `svg-pattern` probe); a resize re-generates the map",
    "the map cannot drift, zoom or rotate: the runtime has no `transform` (upstream issue #102), so the only motion is a slow opacity breath",
    "the lines are not a real terrain function: two seeded sine waves give the contour look with arithmetic the field can afford, not elevation data",
    "a spacing that would exceed the line cap is grown to fit rather than dropping lines, and the amplitude of zero is honoured as straight rules",
    "the field measures its own box, so the caller must bound it; before the first layout it paints nothing",
    "the field publishes no accessibility node and takes no pointer input: name and describe the content it sits behind",
    "a hidden field keeps breathing (the runtime exposes no visibility query), so unmount it when it is off screen",
  ],
  docs: "docs/topography.mdx",
  example: "examples/topography.example.tsx",
  testFile: "src/behaviour/topography.test.tsx",
} as const;
