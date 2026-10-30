/** @jsxImportSource @gpuix/react */
/**
 * Shimmer: a travelling highlight, painted into a text run.
 *
 * A `background-clip: text` gradient is not available: the runtime has no mask
 * and no background-clip, and a `<text>` host paints one `color`. A plain
 * string child is therefore composed as **one text host per code point**, each
 * taking its ink from the travelling profile at its place in the line. That is
 * a per-glyph colour step, not a continuous fill — the honest form this runtime
 * can paint — and it is the strongest form of the browser drawing, not the same
 * effect.
 *
 * Any other child — a card, an icon beside a label, a run this component cannot
 * recolour — keeps the surface band: a row of thin two-stop ramps over the
 * content, sampled from that same profile. The two paths are different
 * drawings; neither is presented as the other.
 *
 * The surface owns its children's layout: the band is painted after them and
 * takes no presses, so a button or a link inside still works. Under
 * `MotionProvider preference="reduced"` — or `reducedMotion` on this surface —
 * the text rests at its own colour and the band is not painted at all: no
 * interval is scheduled.
 */

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

/** The roles a shimmer highlight may paint. */
export type ShimmerAccent = "foreground" | "primary" | "muted";

/** What a shimmer surface draws at one frame. */
export interface ShimmerState {
  /** The brightest strip's alpha this frame. */
  readonly peak: number;
  readonly reducedMotion: boolean;
  readonly active: boolean;
}

/** {@link Shimmer} props. */
export interface ShimmerProps extends Omit<Props, "children" | "style"> {
  /** The surface the highlight travels across. */
  readonly children?: ReactNode;
  /** Whether the highlight runs. Default `true`. */
  readonly active?: boolean;
  /** One complete sweep, in milliseconds. Default `2000`. */
  readonly durationMs?: number;
  /**
   * The role the highlight paints. Default `primary`: a text run blends toward
   * it, and a band paints it at a low alpha.
   */
  readonly accent?: ShimmerAccent;
  /** The typographic role a text run paints. Default `"body"`. */
  readonly role?: TextRole;
  /**
   * Hold the content still with no band. Defaults to the motion provider's
   * preference; the runtime exposes none of its own.
   */
  readonly reducedMotion?: boolean;
  /** An accessible name; when set, the surface is a `status` node. */
  readonly label?: string;
  /** A Tailwind class string, joined after the surface recipe. */
  readonly className?: string;
  /** A style for the surface, or a function of {@link ShimmerState}. */
  readonly style?: StateStyle<ShimmerState>;
}

const ACCENT_ROLE: Readonly<Record<ShimmerAccent, (theme: Theme) => string>> = {
  foreground: (theme) => theme.colors.foreground,
  primary: (theme) => theme.colors.primary,
  muted: (theme) => theme.colors.mutedForeground,
};

/** One line of inked glyphs; words wrap between each other, never inside one. */
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
  accent = "primary",
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
      : shimmerLines(text, theme.colors.foreground, ink, frame);

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
                // The role is a colour; the sample is a **share** of its
                // resting alpha, so the peak is a sheen rather than the ink.
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

/** Inventory record, mirrored into `COMPONENTS.md`'s animated-primitives table. */
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
