/** @jsxImportSource @gpuix/react */
/**
 * Progress: a determinate or indeterminate bar, stated in the caller's scale.
 *
 * The primitives own the bar — the track and fill roles, the clamped fill, the
 * eight-step indeterminate segment and the words it announces. This component
 * adds the two things shadcn's `Progress` has and a percentage-only bar cannot
 * say: a **maximum** the value is stated against, and the parts a caller
 * composes above the bar. `value` is the caller's unit (`30 of 120`), and
 * `progressShare` reads it into the share the bar paints.
 *
 * The structure is shadcn's: the root always paints the track and its fill
 * after the children, so `<Progress value={56}><ProgressLabel /><ProgressValue
 * /></Progress>` is a label, a value and a bar rather than a label alone.
 *
 * **The runtime publishes no `aria-valuenow`/`aria-valuemin`/`aria-valuemax`**
 * (`docs/gpuix-capabilities.md`), so `max` is announced through the same
 * `aria-valuetext` the bar's `formatValue` words. That is the one channel
 * 0.11.0 carries and the page records the gap.
 */

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

/** {@link Progress} props. */
export interface ProgressProps extends Omit<
  PrimitiveProgressProps,
  "value" | "buffer" | "children"
> {
  /**
   * The measurement, in the same unit as `max`. Omit it — or pass `null`, which
   * is how JSON keeps a field a record never wrote — for an indeterminate bar.
   */
  readonly value?: number | null;
  /** The scale `value` is stated in. Defaults to `100`. */
  readonly max?: number;
  /** The parts above the bar; the track and fill are always painted after them. */
  readonly children?: ReactNode;
}

/**
 * A bar, its share read from `value` and `max`.
 *
 * ```tsx
 * <Progress value={30} max={120} label="Uploading">
 *   <ProgressLabel />
 *   <ProgressValue />
 * </Progress>
 * ```
 */
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

/** Inventory record, mirrored into `COMPONENTS.md`'s Progress row. */
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
