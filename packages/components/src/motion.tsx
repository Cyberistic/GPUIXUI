/** @jsxImportSource @gpuix/react */
import { motionLevelOf, type MotionLevel } from "@gpuixui/motion/timing";

export {
  MotionProvider,
  useMotionPreference,
  type MotionProviderProps,
} from "./internal/presence.js";
export type { MotionPreference } from "@gpuixui/motion/timing";

export type SurfaceLevel = MotionLevel | "none";

export const surfaceLevelOf = (value: unknown): SurfaceLevel =>
  value === "none" ? "none" : motionLevelOf(value);
