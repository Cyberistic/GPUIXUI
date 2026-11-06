/** @jsxImportSource @gpuix/react */
import type { MotionProps } from "@gpuix/react";
import {
  delayedTiming,
  exitWindowMs,
  fadeFrom,
  fadeFromAnchor,
  fadeFromSide,
  fadeOnly,
  presenceMotion as motionOfPresence,
  presenceStyle,
  transitionWindowMs,
  type PresenceFrames,
  type PresenceHitRule,
  type PresenceSide,
  type PresenceTiming,
  type PresenceTransition,
} from "@gpuixui/motion/presence";
import {
  MotionProvider,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
  type MotionProviderProps,
  type SurfacePresence,
} from "@gpuixui/motion/react/presence";
import {
  motionTiming,
  type MotionLevel,
  type MotionPreference,
} from "@gpuixui/motion/timing";

export { MotionProvider, useMotionPreference, type MotionProviderProps };

export type SurfaceFrames = PresenceFrames;

export type SurfaceTiming = PresenceTiming;

export type PanelSide = PresenceSide;

export {
  delayedTiming,
  exitWindowMs,
  fadeFrom,
  fadeFromAnchor,
  fadeFromSide,
  fadeOnly,
  presenceStyle,
  transitionWindowMs,
};
export type { PresenceHitRule };

export { useSurfacePresence, useSurfaceTiming, type SurfacePresence };

export const moveTiming = (
  level: MotionLevel,
  preference: MotionPreference,
): PresenceTransition => motionTiming(level, { phase: "standard", preference });

export const useMoveTiming = (level: MotionLevel): PresenceTransition =>
  moveTiming(level, useMotionPreference());

export const presenceMotion = (
  frames: SurfaceFrames,
  presence: SurfacePresence,
  timing: SurfaceTiming = presence.timing,
): MotionProps => motionOfPresence(frames, presence.present, timing);

export const PresenceShield = ({ present }: { readonly present: boolean }) =>
  present ? null : (
    <div
      testId="presence-shield"
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    />
  );

export const presenceTabStop = (
  present: boolean,
): { readonly tabIndex?: number } => (present ? {} : { tabIndex: -1 });
