/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { reducedMotionOf } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import type { GradientLine } from "./gradient-text/logic.js";
import { rampOf } from "./gradient/logic.js";
import { useMotionPreference } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { nameOf, textOf } from "./internal/text.js";
import {
  alpha,
  textStyle,
  useTheme,
  type TextRole,
  type Theme,
} from "./internal/theme.js";
import {
  SHIMMER_STEPS,
  shimmerFrame,
  shimmerInterval,
  shimmerLines,
} from "./shimmer/logic.js";

export type ShimmerAccent = "foreground" | "primary" | "muted";

export interface ShimmerState {
  readonly peak: number;
  readonly reducedMotion: boolean;
  readonly active: boolean;
}

export interface ShimmerProps extends Omit<Props, "children" | "style"> {
  readonly children?: ReactNode;

  readonly active?: boolean;

  readonly durationMs?: number;

  readonly accent?: ShimmerAccent;

  readonly role?: TextRole;

  readonly reducedMotion?: boolean;

  readonly label?: string;

  readonly className?: string;

  readonly style?: StateStyle<ShimmerState>;
}

const ACCENT_ROLE: Readonly<Record<ShimmerAccent, (theme: Theme) => string>> = {
  foreground: (theme) => theme.colors.foreground,
  primary: (theme) => theme.colors.primary,
  muted: (theme) => theme.colors.mutedForeground,
};

const GlyphLine = ({
  line,
  metrics,
  gap,
}: {
  readonly line: GradientLine;
  readonly metrics: ReturnType<typeof textStyle>;
  readonly gap: number;
}) => (
  <div
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
              onSome: (wordLabel) => ({ "aria-label": wordLabel }),
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

export const Shimmer = ({
  children,
  active = true,
  durationMs = 2_000,
  accent = "foreground",
  role = "body",
  reducedMotion,
  label,
  className,
  style,
  ...rest
}: ShimmerProps): ReactElement => {
  const theme = useTheme();
  const reduced = reducedMotionOf(reducedMotion, useMotionPreference());
  const [step, setStep] = useState(0);
  const running = active && !reduced;

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(
      () => setStep((current) => current + 1),
      shimmerInterval(durationMs),
    );
    return () => clearInterval(id);
  }, [running, durationMs]);

  const frame = shimmerFrame(running ? step : 0);
  const ink = ACCENT_ROLE[accent](theme);
  const name = nameOf(label);
  const text = typeof children === "string" ? textOf(children) : undefined;
  const metrics = textStyle(theme, role);
  const lines =
    text === undefined
      ? []
      : shimmerLines(text, theme.colors.mutedForeground, ink, frame);

  return (
    <div
      role={name === undefined ? undefined : "status"}
      {...(name === undefined ? {} : { "aria-label": name })}
      {...rest}
      style={mergeStyles(
        recipeStyle(cn("relative overflow-hidden", className), theme),
        resolveStyle(style, {
          peak: frame.peak,
          reducedMotion: reduced,
          active,
        }),
      )}
    >
      {text === undefined ? (
        children
      ) : (
        <div
          testId={rest.testId === undefined ? undefined : `${rest.testId}-ink`}
          style={{ display: "flex", flexDirection: "column" }}
        >
          {lines.map((line) => (
            <GlyphLine
              gap={Math.round(metrics.fontSize * 0.3)}
              key={line.key}
              line={line}
              metrics={metrics}
            />
          ))}
        </div>
      )}
      {text === undefined && running ? (
        <div
          testId={
            rest.testId === undefined ? undefined : `${rest.testId}-overlay`
          }
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            display: "flex",
            flexDirection: "row",
            pointerEvents: "none",
          }}
        >
          {Arr.map(Arr.range(0, SHIMMER_STEPS - 1), (index) => (
            <div
              key={index}
              style={{
                flexGrow: 1,
                flexBasis: 0,
                height: "100%",

                background: rampOf(
                  alpha(ink, 0.3 * (frame.alphas[index] ?? 0)),
                  alpha(ink, 0.3 * (frame.alphas[index + 1] ?? 0)),
                  90,
                ),
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const shimmerMeta = {
  name: "Shimmer",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "No mask or background-clip: a text run is inked one code point at a time",
    "A glyph's ink is one colour, so the sheen is discrete at glyph resolution",
    "Children that cannot be recoloured keep the surface band, a different drawing",
    "Reduced motion rests the text and paints no band",
  ],
  docs: "docs/shimmer.mdx",
  example: "examples/shimmer.example.tsx",
  testFile: "src/behaviour/shimmer.test.tsx",
} as const;
