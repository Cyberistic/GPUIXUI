/** @jsxImportSource @gpuix/react */
import type { EventPayload } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useEffect } from "react";
import {
  Button,
  actionOnColor,
  type ButtonProps,
  measuredBox,
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
  sheenFrames,
  sheenGradient,
  sheenHalf,
  sheenOpacity,
  type SheenHalf,
} from "./shine-button/logic.js";
import { makeSheenStore } from "./shine-button/store.js";

const halves: ReadonlyArray<SheenHalf> = ["lead", "trail"];

export interface ShineButtonProps extends ButtonProps {
  readonly level?: MotionLevel;

  readonly sheenColor?: string;
}

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
  const store = useLocalStore(makeSheenStore);
  const { box, sweeping, run } = useLocalState(store.local);
  const ink = sheenColor ?? actionOnColor(theme, variant);
  const windowMs = transitionWindowMs(timing);
  const inert = disabled || preference === "reduced";

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

  const enter = (event: EventPayload) => {
    onMouseEnter?.(event);
    send(store.enter(inert, windowMs));
  };

  const sheen = Option.match(box, {
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

export const shineButtonMeta = {
  name: "Shine button",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the sheen travels on inset left, not a transform: the runtime scales nothing (upstream issue #102)",
    "the band is two two-stop gradients, because 0.11.0's LinearGradientBackground takes exactly two stops",
    "a reduced-motion reader, a keyboard reader and a disabled action get no sheen — including a band already crossing when the action is disabled; the hover fill and the focus ring are the remaining feedback",
    "one sweep per hover entry; a repeating sheen needs the caller to re-enter or its own timer",
  ],
  docs: "docs/shine-button.mdx",
  example: "examples/shine-button.example.tsx",
  testFile: "src/behaviour/shine-button.test.tsx",
} as const;
