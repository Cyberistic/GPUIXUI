/** @jsxImportSource @gpuix/react */
/**
 * SplittingText: a headline that arrives unit by unit.
 *
 * The runtime cannot animate the characters of one text node, so the split is
 * the component: every word (or every code point) is its own `<text>` host with
 * its own tween, staggered by `@gpuixui/motion`'s rule. Each unit **fades** and
 * **rises** the house offset — a relative `top`, not a transform, because the
 * runtime has no transform style key (upstream issue #102). The offset moves the
 * unit without reflowing the line: the measured box stays where the layout put
 * it.
 *
 * A unit's key is its position and its text, so a parent re-render replays
 * nothing and a changed word replays that word. Redraw the whole phrase by
 * changing its identity: `<SplittingText key={step} text={phrase} />`.
 *
 * The split itself is `splitting-text/store.ts`: the phrase, the mode and the
 * stagger are props, and a change is a write into an Effect `SubscriptionRef`
 * rather than a split recomputed on every render.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { StaggerFrom } from "@gpuixui/motion/timeline";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useEffect } from "react";
import { send, useLocalState, useLocalStore } from "./internal/local-state.js";
import { delayedTiming, useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { textOf } from "./internal/text.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";
import { offsetOf, type SplitMode } from "./splitting-text/logic.js";
import { makeSplittingStore } from "./splitting-text/store.js";

/** What a splitting reveal draws at one frame. */
export interface SplittingTextState {
  readonly text: string;
  /** How many units the phrase split into. */
  readonly units: number;
  readonly reducedMotion: boolean;
}

/** {@link SplittingText} props. */
export interface SplittingTextProps extends Omit<Props, "children" | "style"> {
  /**
   * The phrase to reveal. A changed phrase replays the units it changed, and a
   * value a saved record left absent paints no units rather than taking the
   * render down.
   */
  readonly text: string;
  /** Split into words or code points. Default `"words"`. */
  readonly split?: SplitMode;
  /** Milliseconds between two units. Default `40`; `0` reveals in one frame. */
  readonly stepMs?: number;
  /** Where the stagger starts. Default `"start"`. */
  readonly from?: StaggerFrom;
  /** Pixels a unit rises from. Default `8`; a negative value starts it above. */
  readonly offset?: number;
  /** A typographic role from the theme. Default `"body"`. */
  readonly role?: TextRole;
  /** A Tailwind class string, joined after the resting style so it wins. */
  readonly className?: string;
  /** A style, or a function of the reveal. */
  readonly style?: StateStyle<SplittingTextState>;
}

/**
 * A phrase whose units fade and rise into place, one after another.
 *
 * The accessible text is the units themselves, read in order: `0.11.0` has no
 * `aria-hidden`, so a character split is heard a letter at a time and a word
 * split a word at a time (see `docs/splitting-text.mdx` §Accessibility).
 */
export const SplittingText = ({
  text,
  split = "words",
  stepMs,
  from = "start",
  offset,
  role = "body",
  className,
  style,
  ...rest
}: SplittingTextProps) => {
  const theme = useTheme();
  const timing = useSurfaceTiming("normal");
  /** The phrase a saved layout may have lost; JSON writes `null` for it. */
  const phrase = textOf(text);
  const store = useLocalStore(
    makeSplittingStore({ text: phrase, split, stepMs, from }),
  );
  const reveal = useLocalState(store.local);

  // The phrase and the split it needs are props, so a change is forwarded to
  // the store; the reveal's keys stay put while none of them moves.
  useEffect(() => {
    send(store.show({ text: phrase, split, stepMs, from }));
  }, [store, phrase, split, stepMs, from]);

  const rise = offsetOf(Option.fromNullishOr(offset));
  const metrics = textStyle(theme, role);
  const state: SplittingTextState = {
    text: reveal.text,
    units: reveal.units,
    reducedMotion: timing.enter.duration === 0,
  };

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          display: "flex",
          flexDirection: "column",
        }),
        resolveStyle(style, state),
      )}
    >
      {reveal.lines.map((line) => (
        <div
          key={line.key}
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "baseline",
            // A word gap is the column gap; a character split carries its own
            // spaces, so the letters stay joined.
            columnGap:
              split === "words" ? Math.round(metrics.fontSize * 0.3) : 0,
          }}
        >
          {line.units.map((unit) => (
            <text
              key={unit.key}
              motion={{
                initial: { opacity: 0, top: rise },
                animate: { opacity: 1, top: 0 },
                transition: delayedTiming(timing.enter, unit.delayMs),
              }}
              style={{
                position: "relative",
                ...metrics,
                color: theme.colors.foreground,
              }}
            >
              {unit.text}
            </text>
          ))}
        </div>
      ))}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const splittingTextMeta = {
  name: "Splitting text",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the runtime cannot animate one text node, so every unit is its own host",
    "no transform: a unit fades and rises on a relative top offset",
    "no aria-hidden in 0.11.0, so assistive technology hears the split units in order",
  ],
  docs: "docs/splitting-text.mdx",
  example: "examples/splitting-text.example.tsx",
  testFile: "src/behaviour/splitting-text.test.tsx",
} as const;
