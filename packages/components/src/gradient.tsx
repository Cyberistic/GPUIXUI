/** @jsxImportSource @gpuix/react */
import type { MotionProps, Props, StyleDesc } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useState } from "react";
import {
  fadeOnly,
  useMotionPreference,
  useSurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { alpha, useTheme } from "./internal/theme.js";
import {
  angleOf,
  breathesAtAll,
  legOf,
  radiusOf,
  rampOf,
  shiftOf,
  shiftedRampOf,
} from "./gradient/logic.js";

export interface GradientState {
  readonly angle: number;

  readonly shift: number;

  readonly animated: boolean;
  readonly reducedMotion: boolean;
}

export interface GradientProps extends Omit<Props, "style"> {
  readonly from?: string;

  readonly to?: string;

  readonly angle?: number;

  readonly shift?: number;

  readonly durationMs?: number;

  readonly radius?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<GradientState>;
}

interface BreathProps {
  readonly ramp: ReturnType<typeof rampOf>;
  readonly legMs: number;
  readonly radius: number;
}

const Breath = ({ ramp, legMs, radius }: BreathProps) => {
  const [lit, setLit] = useState(false);
  const motion: MotionProps = {
    initial: { opacity: 0 },
    animate: { opacity: lit ? 0 : 1 },
    transition: { duration: legMs / 1000, ease: "easeInOut" },
  };

  return (
    <div
      testId="gradient-shift"
      motion={motion}
      onMotionComplete={() => setLit((current) => !current)}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        background: ramp,
        borderRadius: radius,
        opacity: 0,

        pointerEvents: "none",
      }}
    />
  );
};

export const Gradient = ({
  from,
  to,
  angle,
  shift,
  durationMs,
  radius,
  level = "slow",
  className,
  style,
  children,
  ...rest
}: GradientProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level);
  const baseAngle = angleOf(Option.fromNullishOr(angle));
  const turn = shiftOf(Option.fromNullishOr(shift));
  const legMs = legOf(Option.fromNullishOr(durationMs));
  const rounded = radiusOf(Option.fromNullishOr(radius));
  const still = preference === "reduced";
  const start = from ?? theme.colors.primary;
  const end = to ?? alpha(theme.colors.primary, 0);
  const breathing = !still && breathesAtAll(turn);
  const shape: StyleDesc = rounded > 0 ? { borderRadius: rounded } : {};

  const state: GradientState = {
    angle: baseAngle,
    shift: turn,
    animated: breathing,
    reducedMotion: still,
  };

  return (
    <div
      {...rest}
      motion={{ ...fadeOnly, transition: timing.enter }}
      style={mergeStyles(
        mergeStyles(mergeStyles(recipeStyle(cn(className), theme), shape), {
          position: "relative",
          background: rampOf(start, end, baseAngle),
        }),
        resolveStyle(style, state),
      )}
    >
      {breathing ? (
        <Breath
          ramp={shiftedRampOf(start, end, baseAngle, turn)}
          legMs={legMs}
          radius={rounded}
        />
      ) : undefined}
      {children}
    </div>
  );
};

export const gradientMeta = {
  name: "Gradient",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the runtime paints exactly two gradient stops, so a three-colour or multi-stop ramp is not expressible; the movement is two ramps of the same pair crossfaded, not a gradient whose stops travel",
    "there is no transform (upstream issue #102), so the second ramp is re-drawn at another angle rather than rotated or scaled",
    "the layers are rectangles: a rounded field passes `radius`, which is applied to the field and its layer, because the runtime does not document a rounded overflow clip",
    "the reduced preference paints the base ramp alone, with no second layer and no motion target",
    "the field is decoration in the sense that it owns no text, but it is a surface: content passed as children is painted above it and keeps its presses",
    "a hidden field keeps breathing (the runtime exposes no visibility query), so unmount it or pass `shift={0}` when it is off screen",
  ],
  docs: "docs/gradient.mdx",
  example: "examples/gradient.example.tsx",
  testFile: "src/behaviour/gradient.test.tsx",
} as const;
