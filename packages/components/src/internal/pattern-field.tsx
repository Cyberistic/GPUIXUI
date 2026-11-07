/** @jsxImportSource @gpuix/react */
import type { EventPayload, MotionProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { send, useLocalState, useLocalStore } from "./local-state.js";
import { measuredBox } from "./measure.js";
import { makeFieldStore } from "./pattern-field/store.js";
import { fadeOnly, useMotionPreference, useSurfaceTiming } from "./presence.js";
import { recipeStyle } from "./recipe.js";
import { durationOf } from "./scatter.js";
import { paintableBox, type PatternBox } from "./svg-pattern.js";
import { useTheme } from "./theme.js";

export const patternBreatheMs = 8_000;

export const patternBreatheFloor = 1_000;

export const patternBreatheCap = 60_000;

export const patternDim = 0.55;

export interface PatternFieldState {
  readonly width: number;
  readonly height: number;
  readonly reducedMotion: boolean;
}

export type FieldArt = (box: PatternBox, testId: string) => ReactNode;

export interface PatternFieldProps extends Omit<Props, "children" | "style"> {
  readonly markup: (box: PatternBox) => string;

  readonly color: string;

  readonly breatheMs?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<PatternFieldState>;

  readonly children?: ReactNode;
}

export interface DecorativeFieldProps extends Omit<
  Props,
  "children" | "style"
> {
  readonly art: FieldArt;

  readonly breatheMs?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<PatternFieldState>;

  readonly children?: ReactNode;
}

const Breath = ({
  art,
  legMs,
  id,
  lit,
  onLanded,
}: {
  readonly art: ReactNode;
  readonly legMs: number;
  readonly id: string;
  readonly lit: boolean;
  readonly onLanded: () => void;
}) => {
  const motion: MotionProps = {
    initial: { opacity: patternDim },
    animate: { opacity: lit ? patternDim : 1 },
    transition: { duration: legMs / 1000, ease: "easeInOut" },
  };

  return (
    <div
      testId={`${id}-breath`}
      motion={motion}
      onMotionComplete={onLanded}
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
  const store = useLocalStore(makeFieldStore);
  const field = useLocalState(store.local);

  const noteBox = (event: EventPayload): void => {
    Option.match(measuredBox(event), {
      onNone: () => undefined,
      onSome: (next) =>
        send(store.note({ width: next.width, height: next.height })),
    });
  };

  const measured: PatternBox = Option.getOrElse(field.box, () => ({
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
          <Breath
            art={art(measured, id)}
            legMs={legMs}
            id={id}
            lit={field.lit}
            onLanded={() => send(store.breathe)}
          />
        )
      ) : undefined}
      {children}
    </div>
  );
};

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
