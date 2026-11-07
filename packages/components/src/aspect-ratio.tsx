/** @jsxImportSource @gpuix/react */
import type { StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { ASPECT_RATIO, cn } from "@gpuixui/tw";
import type { ReactNode } from "react";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

export interface AspectRatioProps {
  readonly ratio?: number;

  readonly className?: string;

  readonly style?: StyleDesc;

  readonly children?: ReactNode;
  readonly testId?: string;
}

const paintable = (ratio: number): number | undefined =>
  Number.isFinite(ratio) && ratio > 0 ? ratio : undefined;

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
