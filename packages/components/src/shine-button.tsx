/**
 * ShineButton: a sheen that travels across the action while it is hovered.
 *
 * The runtime has no `transform` (upstream issue #102) and its gradient takes
 * exactly two stops, so the sheen is not a scaled highlight: it is two
 * absolutely positioned halves that tween their `left` together, the lead
 * brightening into the label's ink and the trail dimming back to nothing
 * (`shine-button/logic.ts`). The pair is clipped by the control's rounded box.
 *
 * The sheen marks a hover, so it is feedback rather than content: under the
 * reduced preference none is painted, and the control's own hover fill — which
 * the local `Button` already paints — is what remains. A keyboard reader gets
 * the focus ring instead.
 */

import type { EventPayload } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { motionLevels, type MotionLevel } from "@gpuixui/motion/timing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useEffect, useRef, useState } from "react";
import { Button, actionOnColor, type ButtonProps } from "./internal/button.js";
import { measuredBox, type MeasuredBox } from "./internal/measure.js";
import { useMotionPreference, useSurfaceTiming } from "./internal/presence.js";
import { alpha, useTheme } from "./internal/theme.js";
import {
  sheenFrames,
  sheenGradient,
  sheenHalf,
  sheenOpacity,
  type SheenHalf,
} from "./shine-button/logic.js";

/** The two halves, in paint order. */
const halves: ReadonlyArray<SheenHalf> = ["lead", "trail"];

/** {@link ShineButton} props. */
export interface ShineButtonProps extends ButtonProps {
  /** How long the sheen takes to cross. Default `"notice"` (500 ms). */
  readonly level?: MotionLevel;
  /** The sheen's ink. Default the label's own colour. */
  readonly sheenColor?: string;
}

/**
 * A labelled action that a sheen crosses while the pointer is over it.
 *
 * It is the local `Button` with two extra layers, so `variant`, `size`,
 * `disabled` and the whole host-prop surface behave exactly as they do there.
 */
export const ShineButton = ({
  variant = "secondary",
  size = "md",
  disabled = false,
  level = "notice",
  sheenColor,
  onMouseEnter,
  onLayout,
  style,
  children,
  ...rest
}: ShineButtonProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level).enter;
  const box = useRef<Option.Option<MeasuredBox>>(Option.none());
  const [sweeping, setSweeping] = useState(false);
  const [run, setRun] = useState(0);
  const ink = sheenColor ?? actionOnColor(theme, variant);

  useEffect(() => {
    if (!sweeping) return;
    const handle = setTimeout(() => setSweeping(false), motionLevels[level]);
    return () => clearTimeout(handle);
  }, [level, run, sweeping]);

  const measure = (event: EventPayload) => {
    box.current = measuredBox(event);
    onLayout?.(event);
  };

  const enter = (event: EventPayload) => {
    onMouseEnter?.(event);
    if (disabled || preference === "reduced") return;
    setRun((current) => current + 1);
    setSweeping(true);
  };

  const sheen = Option.match(box.current, {
    onNone: () => null,
    onSome: (measured) => {
      const half = sheenHalf(measured.width);
      return Arr.map(halves, (side) => (
        <div
          key={`${run}-${side}`}
          testId="shine"
          motion={{
            ...sheenFrames(half, measured.width, side),
            transition: timing,
          }}
          style={{
            position: "absolute",
            top: 0,
            width: half,
            height: measured.height,
            background: sheenGradient(
              alpha(ink, sheenOpacity),
              alpha(ink, 0),
              side,
            ),
            pointerEvents: "none",
          }}
        />
      ));
    },
  });

  return (
    <Button
      {...rest}
      variant={variant}
      size={size}
      disabled={disabled}
      onMouseEnter={enter}
      onLayout={measure}
      style={mergeStyles({ position: "relative", overflow: "hidden" }, style)}
    >
      {children}
      {sweeping ? sheen : null}
    </Button>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const shineButtonMeta = {
  name: "Shine button",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the sheen travels on inset left, not a transform: the runtime scales nothing (upstream issue #102)",
    "the band is two two-stop gradients, because 0.11.0's LinearGradientBackground takes exactly two stops",
    "a reduced-motion reader and a keyboard reader get no sheen; the hover fill and the focus ring are the remaining feedback",
    "one sweep per hover entry; a repeating sheen needs the caller to re-enter or its own timer",
  ],
  docs: "docs/shine-button.mdx",
  example: "examples/shine-button.example.tsx",
  testFile: "src/behaviour/shine-button.test.tsx",
} as const;
