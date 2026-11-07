/** @jsxImportSource @gpuix/react */
import type { StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { ScrollSurface } from "./internal/scroll-surface.js";
import { nameOf } from "./internal/text.js";
import { useTheme } from "./internal/theme.js";
import { scrollSize, type ScrollMetrics } from "./scroll/metrics.js";

export type ScrollProgressSide = "top" | "bottom";

export interface ScrollProgressProps {
  readonly children?: ReactNode;

  readonly testId?: string;

  readonly side?: ScrollProgressSide;

  readonly thickness?: number;

  readonly color?: string;

  readonly trackColor?: string;

  readonly label?: string;

  readonly className?: string;

  readonly style?: StyleDesc;
}

const percent = (metrics: ScrollMetrics): number =>
  Math.round(metrics.progress * 100);

const Line = ({
  metrics,
  side,
  thickness,
  color,
  trackColor,
  label,
  base,
}: {
  readonly metrics: ScrollMetrics;
  readonly side: ScrollProgressSide;
  readonly thickness: number;
  readonly color: string;
  readonly trackColor: string;
  readonly label: string | undefined;
  readonly base: string;
}) => (
  <div
    testId={`${base}-track`}
    role="progressbar"
    {...(label === undefined ? {} : { "aria-label": label })}
    aria-valuetext={`${percent(metrics)}%`}
    style={{
      position: "absolute",
      ...(side === "top" ? { top: 0 } : { bottom: 0 }),
      left: 0,
      right: 0,
      height: thickness,
      backgroundColor: trackColor,
      overflow: "hidden",
      pointerEvents: "none",
    }}
  >
    <div
      testId={`${base}-bar`}
      style={{
        height: "100%",
        width: `${percent(metrics)}%`,
        backgroundColor: color,
      }}
    />
  </div>
);

export const ScrollProgress = ({
  children,
  side = "bottom",
  thickness,
  color,
  trackColor,
  label,
  className,
  style,
  testId,
}: ScrollProgressProps) => {
  const theme = useTheme();
  const base = testId ?? "scroll-progress";
  const name = nameOf(label);

  return (
    <ScrollSurface
      testId={testId}
      label={name}
      className={className}
      style={style}
      chrome={(metrics) => (
        <Line
          metrics={metrics}
          side={side}
          thickness={scrollSize(Option.fromNullishOr(thickness), 3)}
          color={color ?? theme.colors.primary}
          trackColor={trackColor ?? theme.colors.muted}
          label={name}
          base={base}
        />
      )}
    >
      {children}
    </ScrollSurface>
  );
};

export const scrollProgressMeta = {
  name: "Scroll progress",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the line follows the offset instead of tweening to it: a scroll position is a direct reading",
    "the region is vertical only, and an arrow key moves it by the primitives' row height",
    "the runtime exposes no aria-valuenow, so the reading is announced through aria-valuetext",
  ],
  docs: "docs/scroll-progress.mdx",
  example: "examples/scroll-progress.example.tsx",
  testFile: "src/behaviour/scroll-progress.test.tsx",
} as const;
