/**
 * RotatingText: one line whose phrase changes on a timer.
 *
 * A rotation is content, not decoration: the words are information, so the
 * timer keeps running under the reduced preference and only the fade is removed.
 * The phrase is a `text` host remounted per step, which is how the runtime starts
 * a new `opacity` run — there is no transform and no per-word layout, so a slide
 * or a mask is not possible.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useEffect, useRef } from "react";
import { useControllableState } from "./internal/controllable.js";
import { useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";
import { at, nextIndex, phraseAt } from "./rotating-text/logic.js";

/** What a rotation draws at one frame. */
export interface RotatingTextState {
  /** The phrase on screen. */
  readonly phrase: string;
  /** Its position in `phrases`. */
  readonly index: number;
}

/** {@link RotatingText} props. */
export interface RotatingTextProps extends Omit<Props, "children" | "style"> {
  /** The phrases to rotate through, in order. */
  readonly phrases: ReadonlyArray<string>;
  /** Milliseconds each phrase stays. Default `3000`. */
  readonly intervalMs?: number;
  /** The controlled index. `undefined` means uncontrolled. */
  readonly index?: number;
  /** The uncontrolled starting index. Default `0`. */
  readonly defaultIndex?: number;
  readonly onIndexChange?: (index: number) => void;
  /** The accessible name. Default: the phrase on screen. */
  readonly label?: string;
  /** A typographic role from the theme. Default `"body"`. */
  readonly role?: TextRole;
  /** A Tailwind class string, joined after the resting style so it wins. */
  readonly className?: string;
  /** A style, or a function of the rotation. */
  readonly style?: StateStyle<RotatingTextState>;
}

/** The interval a rotation runs on: a whole span of at least 50 ms. */
const intervalOf = (value: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(value, (ms) => Number.isFinite(ms) && ms >= 50),
    () => 3000,
  );

/**
 * A phrase that rotates on an interval.
 *
 * The fade is the house `fast` level (160 ms) and collapses to zero under
 * `MotionProvider preference="reduced"`; the rotation itself is content and
 * keeps its interval either way. A single phrase, or none, schedules no timer.
 */
export const RotatingText = ({
  phrases,
  intervalMs,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  label,
  role = "body",
  className,
  style,
  ...rest
}: RotatingTextProps) => {
  const theme = useTheme();
  const timing = useSurfaceTiming("fast");
  const interval = intervalOf(Option.fromNullishOr(intervalMs));
  const [rawIndex, setIndex] = useControllableState({
    value: indexProp,
    defaultValue: defaultIndex,
    onChange: onIndexChange,
  });
  const index = at(rawIndex, phrases.length);
  const phrase = Option.getOrElse(phraseAt(phrases, index), () => "");

  // The timer must outlive a parent re-render: the setter and the index it
  // advances from are read from a ref, so only the span and the phrase count
  // restart it.
  const latest = useRef({ index, length: phrases.length, setIndex });
  latest.current = { index, length: phrases.length, setIndex };

  useEffect(() => {
    if (phrases.length < 2) return;
    const handle = setInterval(() => {
      const next = latest.current;
      next.setIndex(nextIndex(next.index, next.length));
    }, interval);
    return () => clearInterval(handle);
  }, [interval, phrases.length]);

  const state: RotatingTextState = { phrase, index };

  return (
    <text
      key={index}
      {...rest}
      aria-label={label ?? phrase}
      motion={{
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: timing.enter,
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          ...textStyle(theme, role),
          color: theme.colors.foreground,
        }),
        resolveStyle(style, state),
      )}
    >
      {phrase}
    </text>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const rotatingTextMeta = {
  name: "Rotating text",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "each step remounts one text host: the runtime cannot animate text content in place",
    "the rotation keeps its interval under the reduced preference; only the fade is removed",
    "no per-word layout, so no slide, mask or stagger between phrases",
  ],
  docs: "docs/rotating-text.mdx",
  example: "examples/rotating-text.example.tsx",
  testFile: "src/behaviour/rotating-text.test.tsx",
} as const;
