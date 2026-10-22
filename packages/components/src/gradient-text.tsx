/**
 * GradientText: a phrase painted as a colour ramp.
 *
 * `@gpuix/native@0.11.0` has no text fill — a `linear-gradient` is a box
 * background, and a `<text>` host paints one `color` — so the ramp is sampled
 * **per glyph**: every code point is its own text host and takes the colour the
 * ramp gives its position in the line (`gradient-text/logic.ts`). The blend is
 * discrete at glyph resolution, which is the strongest honest form the runtime
 * can paint; a continuous fill waits on a text-fill capability.
 *
 * A word is one non-wrapping row of glyphs, and the line wraps **between**
 * words, never inside one. The first glyph of each word carries the word as its
 * accessible name and the rest are presentational, because `0.11.0` has no
 * `aria-hidden` and a reader should hear words rather than letters.
 *
 * The only motion is the house entrance: a fade on mount, zeroed under
 * `MotionProvider preference="reduced"`. The ramp itself does not travel —
 * recolouring glyphs frame by frame would need a per-frame React loop, and
 * there is no `transform` (upstream issue #102) to move a text layer instead.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { fadeOnly, useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";
import {
  glyphCount,
  gradientLines,
  type GradientLine,
} from "./gradient-text/logic.js";

/** What a gradient text paints. */
export interface GradientTextState {
  readonly text: string;
  /** How many glyphs the ramp samples. */
  readonly glyphs: number;
  readonly reducedMotion: boolean;
}

/** {@link GradientText} props. */
export interface GradientTextProps extends Omit<Props, "children" | "style"> {
  /** The phrase to paint. A changed phrase re-samples the ramp. */
  readonly text: string;
  /** The ramp's first colour. Default the theme's `foreground` role. */
  readonly from?: string;
  /** The ramp's last colour. Default the theme's `primary` role. */
  readonly to?: string;
  /** A typographic role from the theme. Default `"display"`. */
  readonly role?: TextRole;
  /** The entrance level. Default `"slow"` (320 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string, joined after the resting style so it wins. */
  readonly className?: string;
  /** A style, or a function of what is painted. */
  readonly style?: StateStyle<GradientTextState>;
}

/** One line: a wrapping row of words, each word a non-wrapping row of glyphs. */
const Line = ({
  line,
  metrics,
  gap,
}: {
  readonly line: GradientLine;
  readonly metrics: ReturnType<typeof textStyle>;
  readonly gap: number;
}) => (
  <div
    testId={`gradient-line-${line.key}`}
    style={{
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
      columnGap: gap,
    }}
  >
    {line.words.map((word) => (
      <div
        key={word.key}
        testId={`gradient-word-${word.key}`}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
        }}
      >
        {word.glyphs.map((glyph) => (
          <text
            key={glyph.key}
            {...Option.match(glyph.label, {
              onNone: () => ({ role: "presentation" as const }),
              onSome: (label) => ({ "aria-label": label }),
            })}
            style={{ ...metrics, color: glyph.color }}
          >
            {glyph.text}
          </text>
        ))}
      </div>
    ))}
  </div>
);

/**
 * A phrase painted as a colour ramp, one colour per glyph.
 *
 * Both ends must be hex colours; an end that is not one paints the run flat in
 * `from` rather than inventing an interpolation. An explicit `\n` starts a new
 * line and a new ramp, and every run of whitespace is a word gap.
 */
export const GradientText = ({
  text,
  from,
  to,
  role = "display",
  level = "slow",
  className,
  style,
  ...rest
}: GradientTextProps) => {
  const theme = useTheme();
  const timing = useSurfaceTiming(level);
  const start = from ?? theme.colors.foreground;
  const end = to ?? theme.colors.primary;
  const lines = gradientLines(text, start, end);
  const metrics = textStyle(theme, role);
  const state: GradientTextState = {
    text,
    glyphs: glyphCount(lines),
    reducedMotion: timing.enter.duration === 0,
  };

  return (
    <div
      {...rest}
      motion={{ ...fadeOnly, transition: timing.enter }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          display: "flex",
          flexDirection: "column",
        }),
        resolveStyle(style, state),
      )}
    >
      {lines.map((line) => (
        <Line
          key={line.key}
          line={line}
          metrics={metrics}
          gap={Math.round(metrics.fontSize * 0.3)}
        />
      ))}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const gradientTextMeta = {
  name: "Gradient text",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no text fill in 0.11.0: the ramp is sampled per glyph into each code point's own colour, so the blend is discrete at glyph resolution rather than continuous",
    "both ends must be hex colours; an end that is not one paints the whole run in the start colour",
    "the ramp restarts on each explicit line rather than continuing across the block",
    "a word is one row of glyph hosts, so a long paragraph is many nodes; wrapping happens between words",
    "the ramp itself does not travel: recolouring would need a per-frame React loop, and there is no transform to move a text layer instead",
    "the accessible reading is one label per word, because 0.11.0 has no aria-hidden and every glyph is its own host",
  ],
  docs: "docs/gradient-text.mdx",
  example: "examples/gradient-text.example.tsx",
  testFile: "src/behaviour/gradient-text.test.tsx",
} as const;
