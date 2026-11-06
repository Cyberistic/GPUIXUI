/** @jsxImportSource @gpuix/react */
import type { EventPayload, MotionProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import { Match } from "effect";
import * as Option from "effect/Option";
import { useEffect, useState } from "react";
import {
  measuredBox,
  useMotionPreference,
  recipeStyle,
  textOf,
  textStyle,
  useTheme,
  type TextRole,
} from "@gpuixui/components/authoring";
import {
  initialSwap,
  requestSwap,
  restSwap,
  settleSwap,
  swapHalves,
  type SwapPhase,
} from "./internal/text-swap.js";
import { slideFrames, type SlideDirection } from "./sliding-text/logic.js";

export interface SlidingTextState {
  readonly text: string;

  readonly phase: SwapPhase;
  readonly direction: SlideDirection;

  readonly width: number;
  readonly reducedMotion: boolean;
}

export interface SlidingTextProps extends Omit<Props, "children" | "style"> {
  readonly text: string;

  readonly direction?: SlideDirection;

  readonly level?: MotionLevel;

  readonly role?: TextRole;

  readonly className?: string;

  readonly style?: StateStyle<SlidingTextState>;
}

export const SlidingText = ({
  text,
  direction = "forward",
  level = "normal",
  role = "body",
  className,
  style,
  onLayout,
  ...rest
}: SlidingTextProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = swapHalves(level, preference);

  const value = textOf(text);
  const [swap, setSwap] = useState(() => initialSwap(value));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setSwap((current) => requestSwap(current, value, preference === "reduced"));
  }, [value, preference]);

  useEffect(() => {
    if (swap.phase !== "leaving") return;

    const handle = setTimeout(() => setSwap(settleSwap), timing.swapMs);
    return () => clearTimeout(handle);
  }, [swap.phase, timing.swapMs]);

  const measure = (event: EventPayload) => {
    onLayout?.(event);
    Option.match(measuredBox(event), {
      onNone: () => undefined,
      onSome: (box) => setWidth(box.width),
    });
  };

  const metrics = textStyle(theme, role);
  const frames = slideFrames(direction, width);
  const motion = Match.value(swap.phase).pipe(
    Match.when(
      "rest",
      (): MotionProps => ({
        initial: false,
        animate: frames.rest,
        transition: { duration: 0 },
      }),
    ),
    Match.when(
      "leaving",
      (): MotionProps => ({
        initial: false,
        animate: frames.exitTo,
        transition: timing.exit,
      }),
    ),
    Match.when(
      "entering",
      (): MotionProps => ({
        initial: frames.enterFrom,
        animate: frames.rest,
        transition: timing.enter,
      }),
    ),
    Match.exhaustive,
  );
  const state: SlidingTextState = {
    text: swap.shown,
    phase: swap.phase,
    direction,
    width,
    reducedMotion: preference === "reduced",
  };

  return (
    <div
      {...rest}
      onLayout={measure}
      style={mergeStyles(
        mergeStyles(
          {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            overflow: "hidden",
            width: "100%",
            height: metrics.lineHeight,
          },
          recipeStyle(cn(className), theme),
        ),
        resolveStyle(style, state),
      )}
    >
      <text
        key={swap.run}
        motion={motion}
        onMotionComplete={() => setSwap(restSwap)}
        style={{
          position: "relative",
          flexShrink: 0,
          ...metrics,
          color: theme.colors.foreground,
          whiteSpace: "nowrap",
        }}
      >
        {swap.shown}
      </text>
    </div>
  );
};

export const slidingTextMeta = {
  name: "Sliding text",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the travel is a relative left inside a clipping box, not a transform (upstream issue #102), and the runtime keeps insets as numbers, so the distance is the box width the runtime reports after its first paint",
    "a value changed before the box has been laid out fades in place, because the width is not known yet",
    "one value is mounted at a time: the swap happens while the clip is empty, because 0.11.0 has no aria-hidden to keep the outgoing value out of the accessibility tree",
    "the value is one line: a string wider than the box is clipped at the edge it slides past, not wrapped",
  ],
  docs: "docs/sliding-text.mdx",
  example: "examples/sliding-text.example.tsx",
  testFile: "src/behaviour/sliding-text.test.tsx",
} as const;
