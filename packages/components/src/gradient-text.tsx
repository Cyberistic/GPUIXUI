/** @jsxImportSource @gpuix/react */
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
import { textOf } from "./internal/text.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";
import {
  glyphCount,
  gradientLines,
  type GradientLine,
} from "./gradient-text/logic.js";

export interface GradientTextState {
  readonly text: string;

  readonly glyphs: number;
  readonly reducedMotion: boolean;
}

export interface GradientTextProps extends Omit<Props, "children" | "style"> {
  readonly text: string;

  readonly from?: string;

  readonly to?: string;

  readonly role?: TextRole;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<GradientTextState>;
}

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

  const phrase = textOf(text);
  const lines = gradientLines(phrase, start, end);
  const metrics = textStyle(theme, role);
  const state: GradientTextState = {
    text: phrase,
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
