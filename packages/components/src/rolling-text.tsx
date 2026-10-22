/**
 * RollingText: a value that rolls vertically from the old one to the new one.
 *
 * A slot counter, in one clipped line: the outgoing value travels out of the
 * clip, the value is swapped while nothing is visible, and the incoming value
 * travels in from the other edge. The runtime cannot animate the characters of a
 * text node and has no `transform` (upstream issue #102), so the movement is a
 * relative `top` inside a box that clips — the same measured seam `AutoHeight`
 * uses to reveal a panel.
 *
 * Only one value is ever mounted. Keeping both halves in the tree at once would
 * put the outgoing value in the accessibility tree beside the incoming one, and
 * `0.11.0` has no `aria-hidden` to take it back out.
 */

import type { MotionProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import { Match } from "effect";
import { useEffect, useState } from "react";
import { rollFrames, type RollDirection } from "./rolling-text/logic.js";
import { useMotionPreference } from "./internal/presence.js";
import {
  initialSwap,
  requestSwap,
  settleSwap,
  swapHalves,
  type SwapPhase,
} from "./internal/text-swap.js";
import { recipeStyle } from "./internal/recipe.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";

/** What a rolling value draws at one frame. */
export interface RollingTextState {
  /** The value painted now, which is also the accessible name. */
  readonly text: string;
  /** `"leaving"` while the old value travels out, `"entering"` for the new one. */
  readonly phase: SwapPhase;
  readonly direction: RollDirection;
  readonly reducedMotion: boolean;
}

/** {@link RollingText} props. */
export interface RollingTextProps extends Omit<Props, "children" | "style"> {
  /** The value to show. A changed value rolls; the same value does nothing. */
  readonly text: string;
  /** Which way the value travels. Default `"up"` (a counter's direction). */
  readonly direction?: RollDirection;
  /** The motion level the whole roll runs at. Default `"normal"` (200 ms). */
  readonly level?: MotionLevel;
  /** A typographic role from the theme. Default `"body"`. */
  readonly role?: TextRole;
  /** A Tailwind class string, joined after the resting style so it wins. */
  readonly className?: string;
  /** A style, or a function of the roll. */
  readonly style?: StateStyle<RollingTextState>;
}

/**
 * A value that rolls into place when it changes.
 *
 * The clip is one line tall (the role's line height), so a caller that needs the
 * surrounding layout to stay still gives the box a width: the runtime cannot
 * measure a string before it is laid out, so the box is as wide as the value on
 * screen.
 */
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
  const [roll, setRoll] = useState(() => initialSwap(text));

  useEffect(() => {
    setRoll((current) => requestSwap(current, text, preference === "reduced"));
  }, [text, preference]);

  useEffect(() => {
    if (roll.phase !== "leaving") return;
    const handle = setTimeout(() => setRoll(settleSwap), timing.swapMs);
    return () => clearTimeout(handle);
  }, [roll.phase, roll.pending, timing.swapMs]);

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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
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
