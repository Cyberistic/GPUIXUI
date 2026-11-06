/** @jsxImportSource @gpuix/react */
import type { EventPayload } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  actionOnColor,
  type ButtonProps,
  measuredBox,
  type MeasuredBox,
  transitionWindowMs,
  useMotionPreference,
  useSurfaceTiming,
  alpha,
  useTheme,
} from "@gpuixui/components/authoring";
import {
  rippleFrames,
  rippleOpacity,
  ripplePoint,
  rippleReach,
  type RipplePoint,
} from "./ripple-button/logic.js";

interface Ripple {
  readonly id: number;
  readonly point: RipplePoint;
  readonly reach: number;
}

export interface RippleButtonProps extends ButtonProps {
  readonly level?: MotionLevel;

  readonly rippleColor?: string;
}

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
