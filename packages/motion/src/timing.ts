import { schedulableSeconds } from "./duration.js";

export const motionLevels = {
  step: 120,

  fast: 160,

  normal: 200,

  slow: 320,

  notice: 500,
} as const;

export type MotionLevel = keyof typeof motionLevels;

export type MotionPhase = "enter" | "exit" | "standard";

export type MotionCurve = [number, number, number, number];

export const motionEasingNames = [
  "linear",
  "ease",
  "easeIn",
  "easeOut",
  "easeInOut",
] as const;

export type MotionEasingName = (typeof motionEasingNames)[number];

export type MotionEasing = MotionEasingName | MotionCurve;

export const isMotionEasingName = (value: unknown): value is MotionEasingName =>
  motionEasingNames.some((name) => name === value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isUnitControl = (value: unknown): boolean =>
  isFiniteNumber(value) && value >= 0 && value <= 1;

export const isMotionEasing = (value: unknown): value is MotionEasing => {
  if (typeof value === "string") return isMotionEasingName(value);
  const curve: ReadonlyArray<unknown> = Array.isArray(value) ? value : [];
  if (curve.length !== 4) return false;
  const [x1, y1, x2, y2] = curve;
  return (
    isUnitControl(x1) &&
    isFiniteNumber(y1) &&
    isUnitControl(x2) &&
    isFiniteNumber(y2)
  );
};

export const motionEasings: Readonly<Record<MotionPhase, MotionEasingName>> = {
  enter: "easeOut",
  exit: "easeIn",
  standard: "easeInOut",
};

export type MotionPreference = "animated" | "reduced";

export const preferenceOf = (value: unknown): MotionPreference =>
  value === "reduced" || value === "animated"
    ? value
    : value === null || value === undefined
      ? "animated"
      : "reduced";

export const reducedMotionOf = (
  override: boolean | undefined,
  preference: unknown,
): boolean => override ?? preferenceOf(preference) === "reduced";

export interface MotionTiming {
  readonly duration: number;
  readonly delay?: number;
  readonly ease?: MotionEasing;
}

export interface MotionTimingOptions {
  readonly phase?: unknown;

  readonly preference?: unknown;

  readonly ease?: unknown;
}

export const isMotionLevel = (value: unknown): value is MotionLevel =>
  typeof value === "string" && Object.hasOwn(motionLevels, value);

const namesPhase = (phase: string): phase is MotionPhase =>
  Object.hasOwn(motionEasings, phase);

export const motionLevelOf = (value: unknown): MotionLevel =>
  isMotionLevel(value) ? value : "normal";

const phaseOf = (phase: unknown): MotionPhase =>
  typeof phase === "string" && namesPhase(phase) ? phase : "standard";

const runnableMs = (durationMs: number): number =>
  schedulableSeconds(durationMs / 1000) === undefined
    ? motionLevels.normal
    : durationMs;

export const motionTimingOf = (
  durationMs: number,
  options: MotionTimingOptions | null = {},
): MotionTiming => {
  const phase = options?.phase ?? "standard";
  if (preferenceOf(options?.preference) === "reduced") return { duration: 0 };
  const named = options?.ease;
  return {
    duration: runnableMs(durationMs) / 1000,
    ease: isMotionEasing(named) ? named : motionEasings[phaseOf(phase)],
  };
};

export const motionTiming = (
  level: MotionLevel,
  options: MotionTimingOptions | null = {},
): MotionTiming => motionTimingOf(motionLevels[motionLevelOf(level)], options);
