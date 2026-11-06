/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import type { StateStyle } from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import type { ReactNode } from "react";
import { hexagonField, hexagonRadius, hexagonStroke } from "./hexagon/logic.js";
import {
  PatternField,
  type PatternFieldState,
  useTheme,
} from "@gpuixui/components/authoring";

export type HexagonState = PatternFieldState;

export interface HexagonProps extends Omit<Props, "children" | "style"> {
  readonly radius?: number;

  readonly stroke?: number;

  readonly color?: string;

  readonly breatheMs?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<HexagonState>;

  readonly children?: ReactNode;
}

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
