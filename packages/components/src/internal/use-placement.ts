/**
 * Measure once per open, then place the surface from `internal/placement.ts`.
 *
 * The runtime has no layout callback, so the surface is measured after its first
 * commit with `getElementBounds` and the corrected side/offset arrives on the
 * next render. Both occurrences (Popover and Dropdown menu) share this hook so
 * the one-shot rule — and the reset when the surface closes — exists once.
 */

import { useGpuix, type PublicInstance } from "@gpuix/react";
import type { FloatingAlign, FloatingSide } from "@gpuix/react/floating";
import * as Option from "effect/Option";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { resolvePlacement, type Placement } from "./placement.js";

/** What the hook needs from the open surface and its trigger. */
export interface UsePlacementInput {
  readonly open: boolean;
  readonly side: FloatingSide;
  readonly align: FloatingAlign;
  readonly margin: number;
  readonly trigger: RefObject<PublicInstance | null>;
  readonly surface: RefObject<PublicInstance | null>;
}

const boundsOf = (
  renderer: ReturnType<typeof useGpuix>["renderer"],
  instance: PublicInstance | null,
): Option.Option<{ x: number; y: number; width: number; height: number }> =>
  Option.flatMap(Option.fromNullishOr(instance), (element) =>
    Option.fromNullishOr(renderer?.getElementBounds?.(element.id)),
  );

/**
 * The placement to render. The requested `side`/`align` are used until the first
 * measurement, then the resolved placement; closing resets the measurement so the
 * next open re-decides.
 */
export const usePlacement = ({
  open,
  side,
  align,
  margin,
  trigger,
  surface,
}: UsePlacementInput): Placement => {
  const renderer = useGpuix().renderer;
  const [placement, setPlacement] = useState<Option.Option<Placement>>(
    Option.none(),
  );
  const measuredFor = useRef<string | null>(null);
  const key = `${side}:${align}:${margin}`;

  useLayoutEffect(() => {
    if (!open) {
      measuredFor.current = null;
      setPlacement(Option.none());
      return;
    }
    if (measuredFor.current === key) return;

    const measured = Option.all({
      trigger: boundsOf(renderer, trigger.current),
      surface: boundsOf(renderer, surface.current),
      window: Option.fromNullishOr(renderer?.getWindowSize?.()),
    });
    if (Option.isNone(measured)) return;

    measuredFor.current = key;
    setPlacement(
      Option.some(resolvePlacement({ ...measured.value, side, align, margin })),
    );
  }, [align, key, margin, open, renderer, side, surface, trigger]);

  return Option.getOrElse(placement, () => ({
    side,
    align,
    alignOffset: 0,
  }));
};
