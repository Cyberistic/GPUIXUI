/**
 * TypingText: a string that arrives a character at a time.
 *
 * The reveal is a timer over the characters the string already has — not a
 * second copy of the text and not an animation the runtime is asked to run. The
 * runtime cannot animate text content (`@gpuix/native@0.11.0` has no `transform`
 * and no per-glyph paint), so the component owns the clock and the string is the
 * frame. A changed string retypes from the beginning; the same string does not
 * restart, so a parent re-render does not replay the effect.
 *
 * The whole string is the accessible name from the first frame. A reader using
 * assistive technology must not be fed "Sav" and have to infer "Save changes";
 * see `docs/typing-text.mdx` §Accessibility.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionPreference } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  textStyle,
  useTheme,
  type TextRole,
  type Theme,
} from "./internal/theme.js";
import {
  characters,
  typingTiming,
  visibleText,
  type TypingTiming,
} from "./typing-text/logic.js";

/** What a typing text draws at one frame. */
export interface TypingTextState {
  /** How many characters are painted. */
  readonly revealed: number;
  /** Whether the last character has arrived. */
  readonly complete: boolean;
  /** Whether the reader asked for less motion, which paints the whole string. */
  readonly reducedMotion: boolean;
}

/** {@link TypingText} props. */
export interface TypingTextProps extends Omit<Props, "children" | "style"> {
  /** The string to reveal. A new value retypes from the first character. */
  readonly text: string;
  /** Milliseconds between two characters. Default `45`; `0` paints instantly. */
  readonly speed?: number;
  /** Milliseconds before the first character. Default `0`. */
  readonly delay?: number;
  /** Paint a caret after the text until the last character lands. Default `false`. */
  readonly caret?: boolean;
  /**
   * The accessible name. Default: the whole `text`, so a partial reveal is
   * never what a screen reader hears.
   */
  readonly label?: string;
  /** Called once, after the last character (and once on mount when instant). */
  readonly onComplete?: () => void;
  /** A typographic role from the theme. Default `"body"`. */
  readonly role?: TextRole;
  /** A Tailwind class string, joined after the resting style so it wins. */
  readonly className?: string;
  /** A style, or a function of the reveal. */
  readonly style?: StateStyle<TypingTextState>;
}

/** The reveal progress, tagged with the run it belongs to. */
interface Progress {
  readonly run: string;
  readonly revealed: number;
}

/** The caret's one measurement: a rule as tall as the role's line. */
const caretStyle = (theme: Theme, role: TextRole) => ({
  width: 2,
  height: theme.typography[role].lineHeight,
  backgroundColor: theme.colors.primary,
  borderRadius: 1,
});

/**
 * A string that types itself in.
 *
 * Under `MotionProvider preference="reduced"` — or with `speed={0}` — the whole
 * string paints on the first frame and `onComplete` runs once. The reveal is a
 * real-time timer, so a paused renderer clock does not hold it.
 */
export const TypingText = ({
  text,
  speed,
  delay,
  caret = false,
  label,
  onComplete,
  role = "body",
  className,
  style,
  ...rest
}: TypingTextProps) => {
  const theme = useTheme();
  const reducedMotion = useMotionPreference() === "reduced";
  const timing: TypingTiming = useMemo(
    () => typingTiming({ speedMs: speed, delayMs: delay }),
    [delay, speed],
  );
  const charactersOf = useMemo(() => characters(text), [text]);
  const total = charactersOf.length;
  const instant = reducedMotion || timing.speedMs === 0;
  /** The reveal a measured progress belongs to: a new string or pace restarts. */
  const run = `${timing.speedMs}:${timing.delayMs}:${text}`;

  // Progress belongs to the run it was measured for, so a changed string reads
  // as zero immediately instead of flashing the previous count.
  const [progress, setProgress] = useState<Progress>({ run, revealed: 0 });
  const revealed = instant
    ? total
    : progress.run === run
      ? progress.revealed
      : 0;
  const complete = revealed >= total;

  useEffect(() => {
    if (instant || total === 0) return;

    let shown = 0;
    let handle: ReturnType<typeof setTimeout> | undefined;
    const reveal = (): void => {
      shown += 1;
      setProgress({ run, revealed: shown });
      if (shown < total) handle = setTimeout(reveal, timing.speedMs);
    };
    handle = setTimeout(reveal, timing.delayMs);

    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
  }, [instant, run, timing.delayMs, timing.speedMs, total]);

  // One completion per string: a parent that re-renders with a new inline
  // callback must not re-announce a finish that already happened.
  const announced = useRef<{ readonly text: string } | undefined>(undefined);
  useEffect(() => {
    if (!complete || announced.current?.text === text) return;
    announced.current = { text };
    onComplete?.();
  }, [complete, onComplete, text]);

  const state: TypingTextState = { revealed, complete, reducedMotion };

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }),
        resolveStyle(style, state),
      )}
    >
      <text
        aria-label={label ?? text}
        style={{
          ...textStyle(theme, role),
          color: theme.colors.foreground,
        }}
      >
        {visibleText(text, revealed)}
      </text>
      {caret && !complete ? <div style={caretStyle(theme, role)} /> : null}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const typingTextMeta = {
  name: "Typing text",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the reveal is a real-time timer, so it is not driven by the renderer's motion clock",
    "a caret sits after the text block, not at the end of the last wrapped line",
    "no per-glyph paint: the runtime cannot animate or measure individual characters",
  ],
  docs: "docs/typing-text.mdx",
  example: "examples/typing-text.example.tsx",
  testFile: "src/behaviour/typing-text.test.tsx",
} as const;
