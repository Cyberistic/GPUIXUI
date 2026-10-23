/**
 * Sliding text: a value that slides horizontally into place when it changes.
 *
 * The horizontal sibling of `RollingText`. The outgoing value fades and travels
 * out of the clip, the value is swapped while nothing is visible, and the
 * incoming value arrives from the far edge — a relative `left` inside a box that
 * clips, because the runtime has no `transform` (upstream issue #102) and no
 * percentage insets, so the travel is a number the box has to report.
 *
 * The distance is the clip's **own measured width**: `onLayout` reports it after
 * the first paint, and until then a change fades in place rather than travelling
 * a guessed distance. The text never bounds the box — a longer string is clipped
 * at the edge it slides past, which is the effect.
 *
 * Only one value is ever mounted, so the accessible text is the value on screen;
 * `0.11.0` has no `aria-hidden` to keep an outgoing value out of the tree.
 */

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
import { measuredBox } from "./internal/measure.js";
import { useMotionPreference } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  initialSwap,
  requestSwap,
  restSwap,
  settleSwap,
  swapHalves,
  type SwapPhase,
} from "./internal/text-swap.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";
import { slideFrames, type SlideDirection } from "./sliding-text/logic.js";

/** What a sliding value draws at one frame. */
export interface SlidingTextState {
  /** The value painted now, which is also the accessible name. */
  readonly text: string;
  /**
   * `"leaving"` while the old value travels out, `"entering"` while the new
   * one arrives, and `"rest"` once that arrival's tween has completed.
   */
  readonly phase: SwapPhase;
  readonly direction: SlideDirection;
  /** The measured clip width the value travels, `0` before the first layout. */
  readonly width: number;
  readonly reducedMotion: boolean;
}

/** {@link SlidingText} props. */
export interface SlidingTextProps extends Omit<Props, "children" | "style"> {
  /** The value to show. A changed value slides; the same value does nothing. */
  readonly text: string;
  /**
   * Which way the value travels. `"forward"` reads left to right, so the next
   * value arrives from the right. Default `"forward"`.
   */
  readonly direction?: SlideDirection;
  /** The motion level the whole slide runs at. Default `"normal"` (200 ms). */
  readonly level?: MotionLevel;
  /** A typographic role from the theme. Default `"body"`. */
  readonly role?: TextRole;
  /** A Tailwind class string, joined after the resting style so it wins. */
  readonly className?: string;
  /** A style, or a function of the slide. */
  readonly style?: StateStyle<SlidingTextState>;
}

/**
 * A value that slides across its box when it changes.
 *
 * The box fills the width it is given and clips, so a caller controls the travel
 * with the box: a fixed-width region keeps the surrounding layout still. Before
 * the first layout the width is unknown and a change fades in place.
 */
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
  const [swap, setSwap] = useState(() => initialSwap(text));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setSwap((current) => requestSwap(current, text, preference === "reduced"));
  }, [text, preference]);

  useEffect(() => {
    if (swap.phase !== "leaving") return;
    const handle = setTimeout(() => setSwap(settleSwap), timing.swapMs);
    return () => clearTimeout(handle);
  }, [swap.phase, swap.pending, timing.swapMs]);

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
        // The entry's completion ends the swap on the clock that paints it, so
        // the phase does not stay `"entering"` after the value has arrived.
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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
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
