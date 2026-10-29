/** @jsxImportSource @gpuix/react */
/**
 * Shimmer: a travelling highlight across a surface.
 *
 * The runtime paints a gradient with exactly two stops and cannot animate the
 * stops themselves (see `docs/gpuix-capabilities.md`), so the effect is
 * **composed**: a row of thin strips, each a two-stop ramp between two
 * neighbouring samples of one brightness profile, and a step moves the profile.
 * Nothing measures the surface, nothing rotates, and nothing interpolates a
 * gradient; the strips repaint at {@link SHIMMER_STEPS} discrete positions.
 *
 * The surface owns its children's layout: the highlight is painted after them
 * and takes no presses, so a button or a link inside still works. Under
 * `MotionProvider preference="reduced"` — or `reducedMotion` on this surface —
 * the band is not painted at all: the content is the resting state, and no
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
import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import { rampOf } from "./gradient/logic.js";
import { useMotionPreference } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { nameOf } from "./internal/text.js";
import { alpha, useTheme, type Theme } from "./internal/theme.js";
import {
  SHIMMER_STEPS,
  shimmerFrame,
  shimmerInterval,
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
  /** The role the highlight paints. Default `foreground`, at a low alpha. */
  readonly accent?: ShimmerAccent;
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

export const Shimmer = ({
  children,
  active = true,
  durationMs = 2_000,
  accent = "foreground",
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

  const frame = shimmerFrame(step);
  const role = ACCENT_ROLE[accent](theme);
  const name = nameOf(label);

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
      {children}
      {running ? (
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
                  alpha(role, 0.3 * (frame.alphas[index] ?? 0)),
                  alpha(role, 0.3 * (frame.alphas[index + 1] ?? 0)),
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
    "Cannot interpolate a gradient: the band steps through 16 sampled profiles",
    "Two stops per ramp, so a strip is the smallest movable piece",
    "Reduced motion paints the content with no band at all",
  ],
  docs: "docs/shimmer.mdx",
  example: "examples/shimmer.example.tsx",
  testFile: "src/behaviour/shimmer.test.tsx",
} as const;
