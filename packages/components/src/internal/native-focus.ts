/**
 * The host that holds native focus, sampled on a timer.
 *
 * `@gpuix/native@0.10.0` delivers no React `focus`/`blur` for a native focus
 * change (plans 536/540), so a part that paints focus must ask the renderer
 * which host it is on. One interval per mounted consumer; the shared tracker in
 * `@gpuixui/primitives` is the long-term home (TODO.md → Interlocks).
 */

import { useGpuix } from "@gpuix/react";
import { useEffect, useState } from "react";

/** How often a component asks the renderer which host holds focus, ms. */
export const FOCUS_SAMPLE_MS = 50;

/** The focused host's id, or `null` when nothing has focus or sampling is off. */
export const useNativeFocusId = (enabled: boolean): number | null => {
  const renderer = useGpuix().renderer;
  const [focusedId, setFocusedId] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || renderer == null) {
      setFocusedId(null);
      return;
    }
    const read = (): void =>
      setFocusedId(renderer.getFocusedElementId?.() ?? null);
    read();
    const timer = setInterval(read, FOCUS_SAMPLE_MS);
    return () => clearInterval(timer);
  }, [enabled, renderer]);

  return focusedId;
};
