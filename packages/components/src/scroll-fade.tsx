/** @jsxImportSource @gpuix/react */
import type { StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { ScrollSurface } from "./internal/scroll-surface.js";
import { nameOf } from "./internal/text.js";
import { alpha, useTheme } from "./internal/theme.js";
import {
  edgeGradient,
  scrollSize,
  type ScrollEdge,
  type ScrollMetrics,
} from "./scroll/metrics.js";

export interface ScrollFadeProps {
  readonly children?: ReactNode;

  readonly testId?: string;

  readonly label?: string;

  readonly color?: string;

  readonly edgeSize?: number;

  readonly className?: string;

  readonly style?: StyleDesc;
}

const Edge = ({
  edge,
  size,
  gradient,
  testId,
}: {
  readonly edge: ScrollEdge;
  readonly size: number;
  readonly gradient: StyleDesc["background"];
  readonly testId: string;
}) => (
  <div
    testId={testId}
    style={{
      position: "absolute",
      ...(edge === "top" ? { top: 0 } : { bottom: 0 }),
      left: 0,
      right: 0,
      height: size,
      background: gradient,
      pointerEvents: "none",
    }}
  />
);

const fades = (edge: ScrollEdge, metrics: ScrollMetrics): boolean =>
  metrics.scrollable && (edge === "top" ? !metrics.atStart : !metrics.atEnd);

export const ScrollFade = ({
  children,
  color,
  edgeSize,
  className,
  style,
  testId,
  label,
}: ScrollFadeProps) => {
  const theme = useTheme();
  const base = testId ?? "scroll-fade";
  const size = scrollSize(Option.fromNullishOr(edgeSize), 32);
  const name = nameOf(label);
  const solid = color ?? theme.colors.background;
  const stops = { solid, clear: alpha(solid, 0) };

  return (
    <ScrollSurface
      testId={testId}
      label={name}
      className={className}
      style={style}
      chrome={(metrics) => (
        <>
          {fades("top", metrics) ? (
            <Edge
              edge="top"
              size={size}
              gradient={edgeGradient("top", stops)}
              testId={`${base}-top`}
            />
          ) : null}
          {fades("bottom", metrics) ? (
            <Edge
              edge="bottom"
              size={size}
              gradient={edgeGradient("bottom", stops)}
              testId={`${base}-bottom`}
            />
          ) : null}
        </>
      )}
    >
      {children}
    </ScrollSurface>
  );
};

export const scrollFadeMeta = {
  name: "Scroll fade",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the edges toggle with the offset instead of animating: a scroll position is a direct reading, and the runtime has no gradient animation",
    "the fade is vertical; a horizontal rail needs the gradient on the other axis",
    "the scrollbar's thumb takes no pointer input; the wheel and the keyboard region are the routes",
  ],
  docs: "docs/scroll-fade.mdx",
  example: "examples/scroll-fade.example.tsx",
  testFile: "src/behaviour/scroll-fade.test.tsx",
} as const;
