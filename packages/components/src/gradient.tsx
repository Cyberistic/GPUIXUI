/**
 * Gradient: a two-stop gradient surface that breathes between two ramps.
 *
 * The runtime paints one gradient shape — a CSS angle and two stops — and it
 * does not interpolate one: a gradient is paint, and the tween targets it
 * animates are numbers. So a gradient that moves is **two ramps of the same
 * colours**, the second a quarter turn away, and the movement is the one value
 * the runtime animates natively: the second layer's `opacity`, tweened from
 * nothing to full and back. `@gpuixui/motion` owns the leg's floor and cap
 * through `gradient/logic.ts`, and `MotionProvider preference="reduced"` paints
 * the resting ramp alone instead of deleting the surface.
 *
 * The field is a surface, not a field to measure: a gradient fills whatever box
 * the layout gives it, so it needs no `onLayout` and paints from the first frame.
 * Its content is painted after the layers, because paint order is tree order and
 * the runtime has no `zIndex`.
 *
 * `transform` is not involved anywhere: the ramp is re-drawn at another angle
 * rather than rotated, which is what the runtime cannot do (upstream issue #102).
 */

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

/** What a field paints at one frame. */
export interface GradientState {
  /** The base ramp's angle, in degrees. */
  readonly angle: number;
  /** The shift between the two ramps, in degrees; `0` means it does not breathe. */
  readonly shift: number;
  /** Whether a second ramp is crossfading: false when still or unshifted. */
  readonly animated: boolean;
  readonly reducedMotion: boolean;
}

/** {@link Gradient} props. */
export interface GradientProps extends Omit<Props, "style"> {
  /** The ramp's start colour. Default the theme's `primary` role. */
  readonly from?: string;
  /**
   * The ramp's end colour. Default the start colour at zero alpha, so the ramp
   * dissolves into whatever surface the field is painted on.
   */
  readonly to?: string;
  /** The base ramp's angle in degrees (0 points up, clockwise). Default `135`. */
  readonly angle?: number;
  /**
   * The second ramp's angle, relative to the first. Default `90`; `0` (or a
   * whole turn) paints one still ramp, because two identical ramps have nothing
   * to crossfade.
   */
  readonly shift?: number;
  /** One leg of the breath, in milliseconds. Default `6_000`; below 400 ms it falls back, 60 s is the cap. */
  readonly durationMs?: number;
  /** The field's corner radius. Default `0`; the layers take it too, so a rounded field has no square corners. */
  readonly radius?: number;
  /** The entrance level. Default `"slow"` (320 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string, merged last. */
  readonly className?: string;
  /** A style for the field, or a function of {@link GradientState}. */
  readonly style?: StateStyle<GradientState>;
}

interface BreathProps {
  readonly ramp: ReturnType<typeof rampOf>;
  readonly legMs: number;
  readonly radius: number;
}

/**
 * The second ramp, breathing: born transparent, tweened to full, then back.
 *
 * The runtime tweens a target once, so a breath is a ping-pong driven by
 * `onMotionComplete` — the same rule the decorative fields follow.
 */
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
        // A background never takes the presses aimed at the content above it.
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * A two-stop gradient surface, optionally breathing between two ramps.
 *
 * Give it a box — a height, a padding, or content with its own size — and paint
 * content as children; they sit above the gradient.
 */
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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
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
