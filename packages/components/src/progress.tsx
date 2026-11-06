/** @jsxImportSource @gpuix/react */
import {
  Progress as PrimitiveProgress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
  type ProgressIndicatorProps,
  type ProgressLabelProps,
  type ProgressProps as PrimitiveProgressProps,
  type ProgressTrackProps,
  type ProgressValueProps,
} from "@gpuixui/primitives/progress";
import type { ReactNode } from "react";
import { progressShare } from "./progress/logic.js";

export { ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue };
export type {
  ProgressIndicatorProps,
  ProgressLabelProps,
  ProgressTrackProps,
  ProgressValueProps,
};

export interface ProgressProps extends Omit<
  PrimitiveProgressProps,
  "value" | "buffer" | "children"
> {
  readonly value?: number | null;

  readonly max?: number;

  readonly children?: ReactNode;
}

export const Progress = ({
  value,
  max = 100,
  children,
  ...rest
}: ProgressProps) => (
  <PrimitiveProgress {...rest} value={progressShare(value, max)}>
    {children}
    <ProgressTrack>
      <ProgressIndicator />
    </ProgressTrack>
  </PrimitiveProgress>
);

export const progressMeta = {
  name: "Progress",
  tier: 1,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "No `aria-valuenow`/`aria-valuemin`/`aria-valuemax`: the share and its maximum are announced through `aria-valuetext`",
    "The indeterminate segment is a discrete step, not a smooth sweep",
    "The runtime's motion container animates opacity and size only, so there is no buffered segment in this surface",
  ],
  docs: "docs/progress.mdx",
  example: "examples/progress.example.tsx",
  testFile: "src/behaviour/progress.test.tsx",
} as const;
