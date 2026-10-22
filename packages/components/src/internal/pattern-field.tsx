/**
 * The frame every generated line-art field shares.
 *
 * A pattern field is a decorative box whose picture is one `<svg source>` path
 * generated for the box it measured. `Hexagon` and `Topography` own the
 * geometry; this module owns the three things they would otherwise duplicate:
 *
 * - **The measurement.** The view box is generated from the box's own size,
 *   because the runtime scales a `<svg>` path by the element's width alone and
 *   centres a content area it does not clip (the `svg-pattern` probe). Matching
 *   the view box to the box makes that scale 1:1 instead of a centred square
 *   leaking above and below.
 * - **The house entrance.** The field fades in at its level, through
 *   `internal/presence.tsx`, like every other surface.
 * - **The breath.** Line art cannot move without a `transform` (upstream issue
 *   #102), so the one thing it can do is dim and brighten: the layer's opacity
 *   pings between its floor and full on `onMotionComplete`, because the runtime
 *   tweens a target once.
 *
 * The art is decoration: it publishes no accessibility node and takes no pointer
 * input, so the content painted above it keeps its name and its presses.
 */

import type { EventPayload, MotionProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useState, type ReactNode } from "react";
import { measuredBox } from "./measure.js";
import { fadeOnly, useMotionPreference, useSurfaceTiming } from "./presence.js";
import { recipeStyle } from "./recipe.js";
import { durationOf } from "./scatter.js";
import { paintableBox, type PatternBox } from "./svg-pattern.js";
import { useTheme } from "./theme.js";

/** The house length of one breath, in milliseconds. */
export const patternBreatheMs = 8_000;

/** The shortest breath a caller may ask for; below it the field flickers. */
export const patternBreatheFloor = 1_000;

/** The longest breath, so a field still reads as living. */
export const patternBreatheCap = 60_000;

/** The opacity a breath dims to: still visible, plainly subordinate. */
export const patternDim = 0.55;

/** What a pattern field draws at one frame. */
export interface PatternFieldState {
  readonly width: number;
  readonly height: number;
  readonly reducedMotion: boolean;
}

/** {@link PatternField} props: the shared frame plus one field's picture. */
export interface PatternFieldProps extends Omit<Props, "children" | "style"> {
  /** The markup for a measured box; a field's logic builds it from its settings. */
  readonly markup: (box: PatternBox) => string;
  /** The line colour. */
  readonly color: string;
  /** One breath's length in milliseconds. Default `8_000`, floor 1 s, cap 60 s. */
  readonly breatheMs?: number;
  /** The entrance level. Default `"slow"`. */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the box, merged last. */
  readonly className?: string;
  /** A style for the box, or a function of the measured field. */
  readonly style?: StateStyle<PatternFieldState>;
  /** Content painted above the line art; it owns the words and the presses. */
  readonly children?: ReactNode;
}

/** The layer that breathes the line art; the field's own box sits above it. */
const Breath = ({
  lines,
  size,
  color,
  legMs,
  id,
}: {
  readonly lines: string;
  readonly size: PatternBox;
  readonly color: string;
  readonly legMs: number;
  readonly id: string;
}) => {
  const [lit, setLit] = useState(false);
  const motion: MotionProps = {
    initial: { opacity: patternDim },
    animate: { opacity: lit ? patternDim : 1 },
    transition: { duration: legMs / 1000, ease: "easeInOut" },
  };

  return (
    <div
      testId={`${id}-breath`}
      motion={motion}
      onMotionComplete={() => setLit((current) => !current)}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        opacity: patternDim,
        pointerEvents: "none",
      }}
    >
      <svg
        testId={`${id}-lines`}
        source={lines}
        role="presentation"
        style={{
          width: size.width,
          height: size.height,
          color,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

/**
 * A measured, breathing line-art field.
 *
 * Give it a bounded box: it paints nothing before its first layout, because the
 * picture is generated for the size it actually has.
 */
export const PatternField = ({
  markup,
  color,
  breatheMs,
  level = "slow",
  className,
  style,
  testId,
  children,
  ...rest
}: PatternFieldProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level);
  const still = preference === "reduced";
  const legMs = durationOf(
    Option.fromNullishOr(breatheMs),
    patternBreatheMs,
    patternBreatheFloor,
    patternBreatheCap,
  );
  const [box, setBox] = useState<Option.Option<PatternBox>>(Option.none());

  const noteBox = (event: EventPayload): void => {
    Option.match(measuredBox(event), {
      onNone: () => undefined,
      onSome: (next) =>
        setBox((held) =>
          Option.match(held, {
            onNone: () => Option.some(next),
            onSome: (current) =>
              current.width === next.width && current.height === next.height
                ? held
                : Option.some(next),
          }),
        ),
    });
  };

  const measured: PatternBox = Option.getOrElse(box, () => ({
    width: 0,
    height: 0,
  }));
  const painted = paintableBox(measured);
  const lines = painted ? markup(measured) : "";
  const id = testId ?? "pattern";

  const state: PatternFieldState = {
    width: measured.width,
    height: measured.height,
    reducedMotion: still,
  };

  return (
    <div
      {...rest}
      testId={testId}
      onLayout={noteBox}
      motion={{ ...fadeOnly, transition: timing.enter }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          position: "relative",
          overflow: "hidden",
        }),
        resolveStyle(style, state),
      )}
    >
      {painted ? (
        still ? (
          <svg
            testId={`${id}-lines`}
            source={lines}
            role="presentation"
            style={{
              width: measured.width,
              height: measured.height,
              color,
              opacity: 1,
              pointerEvents: "none",
            }}
          />
        ) : (
          <Breath
            lines={lines}
            size={measured}
            color={color}
            legMs={legMs}
            id={id}
          />
        )
      ) : undefined}
      {children}
    </div>
  );
};
