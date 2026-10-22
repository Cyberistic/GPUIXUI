/**
 * RippleButton: an action whose press spreads a wash from the pointer.
 *
 * The runtime has no `transform` (upstream issue #102), so the ripple is not a
 * scaled layer: it is an absolutely positioned disc whose `width`, `height`,
 * `left`, `top` and `borderRadius` all tween from the press point until they
 * cover the control, fading out as they arrive. `@gpuixui/motion` owns the
 * duration and the reduced-motion policy; the geometry is
 * `ripple-button/logic.ts`.
 *
 * The disc is the control's own label ink at {@link rippleOpacity}, so a press
 * reads as a pulse of the label rather than a second colour chosen beside it.
 * It is clipped by the control's rounded box, and it takes no pointer input:
 * the press that started it reaches the action underneath.
 *
 * A ripple is pure journey, not content, so the reduced preference paints none
 * at all — the button's pressed fill is the feedback that remains.
 */

import type { EventPayload } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, actionOnColor, type ButtonProps } from "./internal/button.js";
import { measuredBox, type MeasuredBox } from "./internal/measure.js";
import {
  transitionWindowMs,
  useMotionPreference,
  useSurfaceTiming,
} from "./internal/presence.js";
import { alpha, useTheme } from "./internal/theme.js";
import {
  rippleFrames,
  rippleOpacity,
  ripplePoint,
  rippleReach,
  type RipplePoint,
} from "./ripple-button/logic.js";

/** One disc on screen: where it started and how far it must reach. */
interface Ripple {
  readonly id: number;
  readonly point: RipplePoint;
  readonly reach: number;
}

/** {@link RippleButton} props. */
export interface RippleButtonProps extends ButtonProps {
  /** The tween's duration. Default `"notice"` (500 ms) — a disc that fills. */
  readonly level?: MotionLevel;
  /** The wash colour. Default the label's own ink at {@link rippleOpacity}. */
  readonly rippleColor?: string;
}

/** One disc, removed when its tween is over. */
const RippleCircle = ({
  id,
  point,
  reach,
  level,
  wash,
  onDone,
}: Ripple & {
  readonly level: MotionLevel;
  readonly wash: string;
  readonly onDone: (id: number) => void;
}) => {
  const timing = useSurfaceTiming(level).enter;
  const windowMs = transitionWindowMs(timing);

  // A disc is pure journey: a reader who turns the preference on mid-ripple
  // keeps no disc, and a level retimes the removal with the tween it paints.
  useEffect(() => {
    if (windowMs === 0) {
      onDone(id);
      return;
    }
    const handle = setTimeout(() => onDone(id), windowMs);
    return () => clearTimeout(handle);
  }, [id, onDone, windowMs]);

  return (
    <div
      testId="ripple"
      motion={{
        ...rippleFrames(point, reach),
        transition: timing,
      }}
      style={{
        position: "absolute",
        backgroundColor: wash,
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * A labelled action that ripples where it is pressed.
 *
 * It is the local `Button` with one extra layer, so `variant`, `size`,
 * `disabled` and the whole host-prop surface behave exactly as they do there.
 */
export const RippleButton = ({
  variant = "secondary",
  size = "md",
  disabled = false,
  level = "notice",
  rippleColor,
  onClick,
  onLayout,
  style,
  children,
  ...rest
}: RippleButtonProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const box = useRef<Option.Option<MeasuredBox>>(Option.none());
  const nextId = useRef(0);
  const [ripples, setRipples] = useState<ReadonlyArray<Ripple>>([]);
  const wash =
    rippleColor ?? alpha(actionOnColor(theme, variant), rippleOpacity);

  const removeRipple = useCallback((id: number) => {
    setRipples((current) => Arr.filter(current, (ripple) => ripple.id !== id));
  }, []);

  const measure = (event: EventPayload) => {
    box.current = measuredBox(event);
    onLayout?.(event);
  };

  const press = (event: EventPayload) => {
    onClick?.(event);
    if (preference === "reduced") return;
    const measured = box.current;
    if (Option.isNone(measured)) return;
    const point = ripplePoint(event, measured.value);
    const id = nextId.current;
    nextId.current = id + 1;
    setRipples((current) =>
      Arr.append(current, {
        id,
        point,
        reach: rippleReach(point, measured.value),
      }),
    );
  };

  return (
    <Button
      {...rest}
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={press}
      onLayout={measure}
      style={mergeStyles({ position: "relative", overflow: "hidden" }, style)}
    >
      {children}
      {Arr.map(ripples, (ripple) => (
        <RippleCircle
          key={ripple.id}
          {...ripple}
          level={level}
          wash={wash}
          onDone={removeRipple}
        />
      ))}
    </Button>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const rippleButtonMeta = {
  name: "Ripple button",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the circle grows by inset geometry, not a transform: the runtime scales nothing (upstream issue #102)",
    "a reduced-motion reader gets no ripple at all; the button's pressed fill is the remaining feedback",
    "each press mounts a painted layer for the length of the tween, so a rapid burst is a burst of layers",
  ],
  docs: "docs/ripple-button.mdx",
  example: "examples/ripple-button.example.tsx",
  testFile: "src/behaviour/ripple-button.test.tsx",
} as const;
