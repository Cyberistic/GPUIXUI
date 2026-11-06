/** @jsxImportSource @gpuix/react */
import type { MotionProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import { Match } from "effect";
import { useEffect } from "react";
import { rollFrames, type RollDirection } from "./rolling-text/logic.js";
import { makeRollingStore } from "./rolling-text/store.js";
import {
  send,
  useLocalState,
  useLocalStore,
  useMotionPreference,
  recipeStyle,
  textOf,
  textStyle,
  useTheme,
  type TextRole,
} from "@gpuixui/components/authoring";
import { swapHalves, type SwapPhase } from "./internal/text-swap.js";

export interface RollingTextState {
  readonly text: string;

  readonly phase: SwapPhase;
  readonly direction: RollDirection;
  readonly reducedMotion: boolean;
}

export interface RollingTextProps extends Omit<Props, "children" | "style"> {
  readonly text: string;

  readonly direction?: RollDirection;

  readonly level?: MotionLevel;

  readonly role?: TextRole;

  readonly className?: string;

  readonly style?: StateStyle<RollingTextState>;
}

export const RollingText = ({
  text,
  direction = "up",
  level = "normal",
  role = "body",
  className,
  style,
  ...rest
}: RollingTextProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = swapHalves(level, preference);
  const reduced = preference === "reduced";

  const value = textOf(text);
  const store = useLocalStore(makeRollingStore(value));
  const roll = useLocalState(store.local);

  useEffect(() => {
    send(store.show(value, { reduced, swapMs: timing.swapMs }));
  }, [store, value, reduced, timing.swapMs]);

  const metrics = textStyle(theme, role);
  const frames = rollFrames(direction, metrics.lineHeight);
  const motion = Match.value(roll.phase).pipe(
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
  const state: RollingTextState = {
    text: roll.shown,
    phase: roll.phase,
    direction,
    reducedMotion: preference === "reduced",
  };

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(
          {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            overflow: "hidden",
            height: metrics.lineHeight,
          },
          recipeStyle(cn(className), theme),
        ),
        resolveStyle(style, state),
      )}
    >
      <text
        key={roll.run}
        motion={motion}
        onMotionComplete={() => send(store.entered)}
        style={{
          position: "relative",
          ...metrics,
          color: theme.colors.foreground,
          whiteSpace: "nowrap",
        }}
      >
        {roll.shown}
      </text>
    </div>
  );
};

export const rollingTextMeta = {
  name: "Rolling text",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "one value is mounted at a time: the swap happens while the clip is empty, because 0.11.0 has no aria-hidden to keep the outgoing value out of the accessibility tree",
    "the travel is a relative top inside a clipping box, not a transform (upstream issue #102)",
    "the box is as wide as the value on screen: the runtime cannot measure a string before it lays it out, so a caller reserves width when the layout must not move",
    "no horizontal direction: a full-width slide needs the same measured width, so it is not implemented",
  ],
  docs: "docs/rolling-text.mdx",
  example: "examples/rolling-text.example.tsx",
  testFile: "src/behaviour/rolling-text.test.tsx",
} as const;
