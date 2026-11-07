/** @jsxImportSource @gpuix/react */
import type { EventPayload } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import * as Option from "effect/Option";
import { useEffect } from "react";
import {
  Button,
  actionOnColor,
  type ButtonProps,
  measuredBox,
  measuredPoint,
  send,
  useLocalState,
  useLocalStore,
  transitionWindowMs,
  useMotionPreference,
  useSurfaceTiming,
  alpha,
  useTheme,
} from "@gpuixui/components/authoring";
import {
  liquidAcross,
  liquidEmpty,
  liquidOpacity,
} from "./liquid-button/logic.js";
import { makeLiquidStore, type Flood } from "./liquid-button/store.js";

const frameFor = (flood: Flood, full: number) =>
  flood.filled ? liquidAcross(full) : liquidEmpty(flood.drain, full);

export interface LiquidButtonProps extends ButtonProps {
  readonly level?: MotionLevel;

  readonly liquidColor?: string;
}

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

  useEffect(() => {
    if (inert) send(store.clear);
  }, [inert, store]);

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
      {}
      {layer}
      {children}
    </Button>
  );
};

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
