/**
 * `Progress` — a determinate or indeterminate bar.
 *
 * The runtime exposes **no `aria-valuenow`** (plan 020 §1.4), so the value is
 * reported through `aria-valuetext`, which is the one supported way to make a
 * progressbar legible to assistive technology. A `value` outside 0–100 is
 * clamped by `core/style.ts`; an absent `value` means indeterminate.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import { indeterminateOffset, SPINNER_SEGMENTS } from "../core/loading.js";
import {
  progressPercent,
  type ProgressSpec,
  type ProgressTone,
} from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { progressFillClass, progressTrackClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, useStep } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface ProgressProps {
  /** 0–100. Omit for an indeterminate bar. */
  readonly value?: number;
  /** Defaults to `primary`. */
  readonly tone?: ProgressTone;
  /** Defaults to `md`. */
  readonly size?: ProgressSpec["size"];
  /** Accessible name, e.g. "Uploading". */
  readonly label?: string;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** The segment width of an indeterminate bar, as a percentage of the track. */
const SEGMENT = 40;

export const renderProgress = (
  {
    value,
    tone = "primary",
    size = "md",
    label,
    style,
    className,
    testId,
  }: ProgressProps,
  theme: PrimitiveTheme,
  step: number,
): ReactElement => {
  const determinate = value !== undefined;
  const percent = determinate ? progressPercent(value) : 0;
  const track = mergeStyle(
    recipeTw.classesToStyle(cn(progressTrackClass(size), className), theme)
      .style,
    { ...style, display: "flex", flexDirection: "row" },
  );
  const fill = mergeStyle(
    recipeTw.classesToStyle(
      progressFillClass(determinate ? tone : "primary"),
      theme,
    ).style,
    { width: `${determinate ? percent : SEGMENT}%` },
  );
  const lead = mergeStyle(recipeTw.classesToStyle("shrink-0", theme).style, {
    width: `${indeterminateOffset(step, SEGMENT)}%`,
  });
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuetext={determinate ? `${percent}%` : "loading"}
      testId={testId}
      style={track}
    >
      {determinate ? (
        <div style={fill} />
      ) : (
        <>
          <div style={lead} />
          <div style={fill} />
        </>
      )}
    </div>
  );
};

/** A progress bar. */
export const Progress = (props: ProgressProps): ReactElement =>
  renderProgress(props, useTheme(), useStep(SPINNER_SEGMENTS, 120));
