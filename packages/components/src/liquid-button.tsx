/** @jsxImportSource @gpuix/react */
/**
 * LiquidButton: an action a fill floods into on hover and drains out of on leave.
 *
 * The runtime has no `transform` (upstream issue #102), so the flood is not a
 * scaled blob: it is a layer whose `left` and `width` tween together, born empty
 * at the edge the pointer entered and draining toward the edge it left through
 * (`liquid-button/logic.ts`). `@gpuixui/motion` owns the duration and the
 * reduced-motion policy.
 *
 * The wash is the control's own label ink at a low share, so it reads on a
 * filled action where the fill is the surface it crosses, and it is clipped by
 * the control's rounded box. It takes no pointer input, so the hover it marks
 * still reaches the action.
 *
 * The edges are read from the pointer's **move** events: the runtime's enter and
 * leave payloads carry no position, so the flood starts on the first move into
 * the control and drains toward the side the last move was on.
 *
 * The flood marks a pointer, so it is feedback rather than content: under the
 * reduced preference none is painted, and a disabled action paints none either.
 */

import type { EventPayload } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import * as Option from "effect/Option";
import { useEffect } from "react";
import { Button, actionOnColor, type ButtonProps } from "./internal/button.js";
import { measuredBox, measuredPoint } from "./internal/measure.js";
import { send, useLocalState, useLocalStore } from "./internal/local-state.js";
import {
  transitionWindowMs,
  useMotionPreference,
  useSurfaceTiming,
} from "./internal/presence.js";
import { alpha, useTheme } from "./internal/theme.js";
import {
  liquidAcross,
  liquidEmpty,
  liquidOpacity,
} from "./liquid-button/logic.js";
import { makeLiquidStore, type Flood } from "./liquid-button/store.js";

/** The frame the flood is heading for: across while filled, empty at its drain edge. */
const frameFor = (flood: Flood, full: number) =>
  flood.filled ? liquidAcross(full) : liquidEmpty(flood.drain, full);

/** {@link LiquidButton} props. */
export interface LiquidButtonProps extends ButtonProps {
  /** The flood's duration. Default `"normal"` (200 ms) — one sweep across. */
  readonly level?: MotionLevel;
  /** The wash colour. Default the label's own ink at {@link liquidOpacity}. */
  readonly liquidColor?: string;
}

/**
 * A labelled action that floods from the pointer's edge and drains to the edge it
 * leaves by.
 *
 * It is the local `Button` with one extra layer, so `variant`, `size`,
 * `disabled` and the whole host-prop surface behave exactly as they do there.
 */
export const LiquidButton = ({
  variant = "secondary",
  size = "md",
  disabled = false,
  level = "normal",
  liquidColor,
  onMouseMove,
  onMouseLeave,
  onLayout,
  style,
  children,
  ...rest
}: LiquidButtonProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level).enter;
  const store = useLocalStore(makeLiquidStore);
  const { box, flood } = useLocalState(store.local);
  const wash =
    liquidColor ?? alpha(actionOnColor(theme, variant), liquidOpacity);
  const inert = disabled || preference === "reduced";

  const windowMs = transitionWindowMs(timing);

  // A flood is pure journey, so a reader who turns the preference on mid-hover
  // keeps no wash: the layer goes with the travel the setting removed. A control
  // the caller disables is the same rule — the wash marks a pointer on an action
  // that can no longer answer one, and nothing else would ever drain it.
  useEffect(() => {
    if (inert) send(store.clear);
  }, [inert, store]);

  // A level change retimes the drain it finds running.
  useEffect(() => {
    send(store.retime(windowMs));
  }, [store, windowMs]);

  const measure = (event: EventPayload) => {
    send(store.measure(measuredBox(event)));
    onLayout?.(event);
  };

  const move = (event: EventPayload) => {
    onMouseMove?.(event);
    send(store.move(measuredPoint(event), inert));
  };

  const leave = (event: EventPayload) => {
    onMouseLeave?.(event);
    send(store.leave(measuredPoint(event), inert, windowMs));
  };

  const layer = Option.match(flood, {
    onNone: () => null,
    onSome: (current) =>
      Option.match(box, {
        onNone: () => null,
        onSome: (measured) => (
          <div
            key={current.run}
            testId="liquid"
            motion={{
              initial: liquidEmpty(current.entry, measured.width),
              animate: frameFor(current, measured.width),
              transition: timing,
            }}
            style={{
              position: "absolute",
              top: 0,
              height: measured.height,
              backgroundColor: wash,
              pointerEvents: "none",
            }}
          />
        ),
      }),
  });

  return (
    <Button
      {...rest}
      variant={variant}
      size={size}
      disabled={disabled}
      onMouseMove={move}
      onMouseLeave={leave}
      onLayout={measure}
      style={mergeStyles({ position: "relative", overflow: "hidden" }, style)}
    >
      {/* The flood paints under the label. The layer is absolute, and a later
          child paints over an earlier one in GPUI, so the order here is the
          stacking order the preview needs too. */}
      {layer}
      {children}
    </Button>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const liquidButtonMeta = {
  name: "Liquid button",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the flood travels on inset left/width, not a transform: the runtime scales nothing (upstream issue #102)",
    "a reduced-motion reader and a disabled action get no flood; the control's own hover fill is the feedback that remains",
    "the layer is born at one measured edge, so a control that resizes during the sweep retargets to the new width rather than restarting",
    "the flood crosses the label: the copy is tinted while the wash passes",
  ],
  docs: "docs/liquid-button.mdx",
  example: "examples/liquid-button.example.tsx",
  testFile: "src/behaviour/liquid-button.test.tsx",
} as const;
