/**
 * `Progress` — a determinate or indeterminate bar.
 *
 * The runtime exposes **no `aria-valuenow`** (plan 020 §1.4), so the value is
 * reported through `aria-valuetext`, which is the one supported way to make a
 * progressbar legible to assistive technology. A `value` outside 0–100 is
 * clamped by `core/style.ts`; an absent `value` means indeterminate. The step
 * timer runs only while the bar is indeterminate, and `tone` colours the fill
 * in both modes (plan 328). The announced percentage is a whole number while the
 * fill keeps its exact fraction (plan `754`).
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import {
  indeterminateFillStyle,
  indeterminateLeadStyle,
  indeterminateOffset,
  SPINNER_SEGMENTS,
} from "../core/loading.js";
import {
  progressFillStyle,
  progressToneColor,
  progressTrackStyle,
  progressValueText,
  type ProgressSpec,
  type ProgressTone,
} from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { ariaName, mergeStyle, useStep } from "./internal.js";
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
  readonly testId?: string;
}

/** The segment width of an indeterminate bar, as a percentage of the track. */
const SEGMENT = 40;

/** An absent value means the bar has no proportion to show. */
const isIndeterminate = (value: number | undefined): value is undefined =>
  value === undefined;

/** The element tree `Progress` renders, determinate or indeterminate. */
export const renderProgress = (
  { value, tone = "primary", size = "md", label, style, testId }: ProgressProps,
  theme: PrimitiveTheme,
  step: number,
): ReactElement => {
  const spec: ProgressSpec = { value, tone, size };
  const row = mergeStyle(progressTrackStyle(spec, theme), {
    display: "flex",
    flexDirection: "row",
  });
  const track = mergeStyle(row, style);
  const determinate = !isIndeterminate(value);
  const fill = determinate
    ? progressFillStyle(spec, theme)
    : indeterminateFillStyle(SEGMENT, progressToneColor(tone, theme), theme);
  return (
    <div
      role="progressbar"
      aria-label={ariaName(label)}
      aria-valuetext={determinate ? progressValueText(value) : "loading"}
      testId={testId}
      style={track}
    >
      {determinate ? (
        <div style={fill} />
      ) : (
        <>
          <div
            style={indeterminateLeadStyle(indeterminateOffset(step, SEGMENT))}
          />
          <div style={fill} />
        </>
      )}
    </div>
  );
};

/** A progress bar. */
export const Progress = (props: ProgressProps): ReactElement =>
  renderProgress(
    props,
    useTheme(),
    useStep(SPINNER_SEGMENTS, 120, isIndeterminate(props.value)),
  );
