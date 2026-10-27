/** @jsxImportSource @gpuix/react */
/**
 * AspectRatio: a box that holds one width-to-height ratio.
 *
 * The runtime paints the ratio (`StyleDesc.aspectRatio`, measured by the
 * `aspect-ratio-paint` capability probe), so the box takes the width its parent
 * gives it and lets the renderer derive the height — there is no measurement
 * here, and therefore no frame painted at the wrong height when the parent's
 * width changes.
 *
 * A ratio the renderer cannot divide by (zero, negative, `NaN`, an infinity from
 * a width calculation that never arrived) paints no ratio, the rule the
 * primitives' `Box` follows: the box then takes its content's height instead of
 * asserting a shape it cannot compute.
 */

import type { StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { ASPECT_RATIO, cn } from "@gpuixui/tw";
import type { ReactNode } from "react";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

/** {@link AspectRatio} props. */
export interface AspectRatioProps {
  /** Width divided by height. Default `1`. */
  readonly ratio?: number;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, merged last. */
  readonly style?: StyleDesc;
  /** The content that fills the box. */
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** The ratio the renderer can paint, or nothing. */
const paintable = (ratio: number): number | undefined =>
  Number.isFinite(ratio) && ratio > 0 ? ratio : undefined;

/** A box whose height follows its width through one ratio. */
export const AspectRatio = ({
  ratio = 1,
  className,
  style,
  children,
  testId,
}: AspectRatioProps) => {
  const theme = useTheme();
  const painted = paintable(ratio);
  const shape: StyleDesc =
    painted === undefined ? {} : { aspectRatio: painted };
  return (
    <div
      testId={testId}
      style={mergeStyles(recipeStyle(cn(ASPECT_RATIO, className), theme), {
        ...shape,
        ...style,
      })}
    >
      <div style={{ width: "100%", height: "100%" }}>{children}</div>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const aspectRatioMeta = {
  name: "Aspect ratio",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the ratio owns the height: give the box one definite axis (a width) and it derives the other — a box with both dimensions leaves the ratio unconsulted",
    "a child fills the box only when it declares `width`/`height: 100%`; the box sizes itself, not the child's paint",
  ],
  docs: "docs/aspect-ratio.mdx",
  example: "examples/aspect-ratio.example.tsx",
  testFile: "src/behaviour/aspect-ratio.test.tsx",
} as const;
