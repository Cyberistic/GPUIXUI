import { useEffect, useLayoutEffect, useState } from "react";
import {
  exitWindowMs,
  presenceTiming,
  presenceTimingOf,
  type PresenceTiming,
  type PresenceTimingInput,
} from "../presence.js";
import { useMotionPreference } from "../provider.js";
import type { MotionLevel } from "../timing.js";

export {
  MotionProvider,
  useMotionPreference,
  type MotionProviderProps,
} from "../provider.js";

export const useSurfaceTiming = (level: MotionLevel): PresenceTiming =>
  presenceTiming(level, useMotionPreference());

export interface SurfacePresence {
  readonly mounted: boolean;

  readonly present: boolean;
  readonly timing: PresenceTiming;
}

export const useSurfacePresence = (
  open: boolean,
  timing: PresenceTimingInput | null | undefined,
): SurfacePresence => {
  const [mounted, setMounted] = useState(open);

  const phases = presenceTimingOf(timing);
  const windowMs = exitWindowMs(phases);

  useLayoutEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (open || !mounted) return;
    if (windowMs === 0) {
      setMounted(false);
      return;
    }
    const handle = setTimeout(() => setMounted(false), windowMs);
    return () => clearTimeout(handle);
  }, [mounted, open, windowMs]);

  return { mounted, present: open, timing: phases };
};
