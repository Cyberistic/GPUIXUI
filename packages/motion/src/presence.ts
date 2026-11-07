import { schedulableSeconds } from "./duration.js";
import {
  isMotionEasing,
  motionTiming,
  type MotionEasing,
  type MotionLevel,
} from "./timing.js";

export type PresenceSide = "top" | "right" | "bottom" | "left";

export interface PresenceFrame {
  readonly opacity?: number;
  readonly height?: number;
  readonly top?: number;
  readonly left?: number;
}

export interface PresenceFrames {
  readonly initial: PresenceFrame;
  readonly animate: PresenceFrame;
  readonly exit: PresenceFrame;
}

export interface PresenceFrameInput {
  readonly opacity?: number | null;
  readonly height?: number | null;
  readonly top?: number | null;
  readonly left?: number | null;
}

export interface PresenceFramesInput {
  readonly initial?: PresenceFrameInput | null;
  readonly animate?: PresenceFrameInput | null;
  readonly exit?: PresenceFrameInput | null;
}

export interface PresenceTransition {
  readonly duration?: number;

  readonly delay?: number;
  readonly ease?: MotionEasing;
}

export interface PresenceTransitionInput {
  readonly duration?: number | null;
  readonly delay?: number | null;

  readonly ease?: unknown;
}

export interface PresenceTiming {
  readonly enter: PresenceTransition;
  readonly exit: PresenceTransition;
}

export interface PresenceTimingInput {
  readonly enter?: PresenceTransitionInput | null;
  readonly exit?: PresenceTransitionInput | null;
}

export interface PresenceHitRule {
  readonly pointerEvents?: "auto" | "none";
}

const RENDERABLE_MAX = 3.402_823_466_385_288_6e38;

const readInset = (value: number | null | undefined): number | undefined =>
  value !== null &&
  value !== undefined &&
  Number.isFinite(value) &&
  Math.abs(value) <= RENDERABLE_MAX
    ? value
    : undefined;

const readOpacity = (value: number | null | undefined): number | undefined => {
  const share = readInset(value);
  return share !== undefined && share >= 0 && share <= 1 ? share : undefined;
};

const readSize = (value: number | null | undefined): number | undefined => {
  const size = readInset(value);
  return size !== undefined && size >= 0 ? size : undefined;
};

const travelOf = (offset: number): number => readInset(offset) ?? 0;

const axisOf = (axis: "top" | "left"): "top" | "left" =>
  axis === "left" ? "left" : "top";

export const fadeFrom = (
  axis: "top" | "left",
  offset: number,
): PresenceFrames => {
  const travel = travelOf(offset);
  return axisOf(axis) === "top"
    ? {
        initial: { opacity: 0, top: travel },
        animate: { opacity: 1, top: 0 },
        exit: { opacity: 0, top: travel },
      }
    : {
        initial: { opacity: 0, left: travel },
        animate: { opacity: 1, left: 0 },
        exit: { opacity: 0, left: travel },
      };
};

export const fadeOnly: PresenceFrames = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const sideOf = (side: PresenceSide): PresenceSide =>
  side === "top" || side === "right" || side === "left" ? side : "bottom";

export const fadeFromSide = (
  side: PresenceSide,
  offset: number,
): PresenceFrames => {
  const named = sideOf(side);
  return named === "top"
    ? fadeFrom("top", -offset)
    : named === "bottom"
      ? fadeFrom("top", offset)
      : named === "left"
        ? fadeFrom("left", -offset)
        : fadeFrom("left", offset);
};

export const fadeFromAnchor = (
  side: PresenceSide,
  offset: number,
): PresenceFrames => {
  const named = sideOf(side);
  return named === "top"
    ? fadeFrom("top", offset)
    : named === "bottom"
      ? fadeFrom("top", -offset)
      : named === "left"
        ? fadeFrom("left", offset)
        : fadeFrom("left", -offset);
};

const frameOf = (
  frame: PresenceFrameInput | null | undefined,
): PresenceFrame => {
  if (typeof frame !== "object" || frame === null) return {};
  const opacity = readOpacity(frame.opacity);
  const height = readSize(frame.height);
  const top = readInset(frame.top);
  const left = readInset(frame.left);
  return {
    ...(opacity === undefined ? {} : { opacity }),
    ...(height === undefined ? {} : { height }),
    ...(top === undefined ? {} : { top }),
    ...(left === undefined ? {} : { left }),
  };
};

const framesOf = (
  frames: PresenceFramesInput | null | undefined,
): PresenceFrames => ({
  initial: frameOf(frames?.initial),
  animate: frameOf(frames?.animate),
  exit: frameOf(frames?.exit),
});

const transitionOf = (
  transition: PresenceTransitionInput | null | undefined,
): PresenceTransition => {
  const duration = schedulableSeconds(transition?.duration);
  if (duration === undefined) return { duration: 0 };
  const delay = schedulableSeconds(transition?.delay);
  const ease = transition?.ease;
  return {
    duration,
    ...(delay === undefined ? {} : { delay }),
    ...(ease === null || ease === undefined || !isMotionEasing(ease)
      ? {}
      : { ease }),
  };
};

export const presenceTimingOf = (
  timing: PresenceTimingInput | null | undefined,
): PresenceTiming => ({
  enter: transitionOf(timing?.enter),
  exit: transitionOf(timing?.exit),
});

export const presenceTiming = (
  level: MotionLevel,
  preference: unknown = "animated",
): PresenceTiming => ({
  enter: motionTiming(level, { phase: "enter", preference }),
  exit: motionTiming(level, { phase: "exit", preference }),
});

const milliseconds = (seconds: number | null | undefined): number =>
  (schedulableSeconds(seconds) ?? 0) * 1000;

const SCHEDULABLE_WINDOW_MS = 2_147_483_647;

export const transitionWindowMs = (
  timing: PresenceTransition | null | undefined,
): number => {
  const total = Math.round(
    milliseconds(timing?.duration) + milliseconds(timing?.delay),
  );
  return Number.isFinite(total) && total <= SCHEDULABLE_WINDOW_MS ? total : 0;
};

export const exitWindowMs = (
  timing: PresenceTimingInput | null | undefined,
): number => transitionWindowMs(presenceTimingOf(timing).exit);

const waitSeconds = (delayMs: number): number | undefined =>
  schedulableSeconds(delayMs / 1000);

export const delayedTiming = (
  timing: PresenceTransition | null | undefined,
  delayMs: number,
): PresenceTransition => {
  const wait = waitSeconds(delayMs);
  return milliseconds(timing?.duration) === 0 || wait === undefined
    ? (timing ?? {})
    : { ...timing, delay: wait };
};

export const presenceMotion = (
  frames: PresenceFramesInput | null | undefined,
  present: boolean,
  timing: PresenceTimingInput | null | undefined,
): {
  readonly initial: PresenceFrame;
  readonly animate: PresenceFrame;
  readonly transition: PresenceTransition;
} => {
  const phases = presenceTimingOf(timing);
  const read = framesOf(frames);
  return {
    initial: read.initial,
    animate: present ? read.animate : read.exit,
    transition: present ? phases.enter : phases.exit,
  };
};

export const presenceStyle = (
  present: boolean,
  rest: "target" | "wrapper" = "target",
): PresenceHitRule =>
  present && rest === "wrapper"
    ? {}
    : { pointerEvents: present ? "auto" : "none" };
