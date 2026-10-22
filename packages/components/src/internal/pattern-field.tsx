/**
 * The frame every decorative field shares.
 *
 * A field is a bounded box whose picture is generated for the size it measured,
 * arrives on the house entrance, and (unless the reader asked for less motion)
 * breathes by opacity. Two families paint through this module:
 *
 * - **Line art** (`Hexagon`, `Topography`) is one `<svg source>` path, which the
 *   runtime scales by the element's width alone and centres inside a content
 *   area it does not clip (the `svg-pattern` probe). `PatternField` generates a
 *   view box from the measured box so that scale is 1:1 instead.
 * - **A glyph wall** (`Glyph`) is one `<text>` host per cell. Its glyphs are
 *   paint, not content, so each is `role="presentation"` — measured: a node is
 *   in the accessibility tree only with a role, so a presentational glyph leaves
 *   no node at all.
 *
 * This module owns the three things the families would otherwise duplicate: the
 * measurement, the entrance through `internal/presence.tsx`, and the breath. A
 * field cannot move without a `transform` (upstream issue #102), so the one
 * thing it can do is dim and brighten: the layer's opacity pings between its
 * floor and full on `onMotionComplete`, because the runtime tweens a target once.
 *
 * A field is decoration: it publishes no accessibility node and takes no pointer
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

/** What a field draws at one frame. */
export interface PatternFieldState {
  readonly width: number;
  readonly height: number;
  readonly reducedMotion: boolean;
}

/** The picture one field paints, generated from the box it measured. */
export type FieldArt = (box: PatternBox, testId: string) => ReactNode;

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

/** {@link DecorativeField} props: the shared frame plus any field's picture. */
export interface DecorativeFieldProps extends Omit<
  Props,
  "children" | "style"
> {
  /** The picture for a measured box, and the test id its parts derive from. */
  readonly art: FieldArt;
  /** One breath's length in milliseconds. Default `8_000`, floor 1 s, cap 60 s. */
  readonly breatheMs?: number;
  /** The entrance level. Default `"slow"`. */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the box, merged last. */
  readonly className?: string;
  /** A style for the box, or a function of the measured field. */
  readonly style?: StateStyle<PatternFieldState>;
  /** Content painted above the art; it owns the words and the presses. */
  readonly children?: ReactNode;
}

/** The layer that breathes the art; the field's own box sits above it. */
const Breath = ({
  art,
  legMs,
  id,
}: {
  readonly art: ReactNode;
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
      {art}
    </div>
  );
};

/**
 * A measured, entering, breathing decorative field.
 *
 * Give it a bounded box: it paints nothing before its first layout, because the
 * picture is generated for the size it actually has.
 */
export const DecorativeField = ({
  art,
  breatheMs,
  level = "slow",
  className,
  style,
  testId,
  children,
  ...rest
}: DecorativeFieldProps) => {
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
          art(measured, id)
        ) : (
          <Breath art={art(measured, id)} legMs={legMs} id={id} />
        )
      ) : undefined}
      {children}
    </div>
  );
};

/**
 * A measured, breathing line-art field.
 *
 * The markup is generated for the box the field measured and painted as one
 * `<svg source>` path, which the runtime tints in the element's colour.
 */
export const PatternField = ({ markup, color, ...rest }: PatternFieldProps) => (
  <DecorativeField
    {...rest}
    art={(box, id) => (
      <svg
        testId={`${id}-lines`}
        source={markup(box)}
        role="presentation"
        style={{
          width: box.width,
          height: box.height,
          color,
          opacity: 1,
          pointerEvents: "none",
        }}
      />
    )}
  />
);
