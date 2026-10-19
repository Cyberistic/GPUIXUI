/**
 * `Meter` — a value inside a range.
 *
 * Distinct from `Progress`, which reports how far a task has got (0–100 with no
 * meaning above or below). A meter reports a measurement: 62 of 100, 12 of 16.
 * It is status, not a control — never focusable, no pointer or key handlers.
 *
 * GPUix 0.10.0 has no `aria-valuenow`/`min`/`max` (plan 020 §1.4), so the value
 * is announced through `aria-valuetext`, and the honest default text is the
 * formatted value alone. The paint is `Progress`'s track and fill, because a
 * second bar painter would drift from it.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import {
  progressFillStyle,
  progressTrackStyle,
  type ProgressSpec,
  type ProgressTone,
} from "../core/style.js";
import {
  clampValue,
  normalizeRange,
  valueFraction,
  valueText,
} from "../core/value.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { ariaName, mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface MeterProps {
  readonly value: number;
  /** Defaults to 0. */
  readonly min?: number;
  /** Defaults to 100. */
  readonly max?: number;
  /** Defaults to `primary`. */
  readonly tone?: ProgressTone;
  /** Defaults to `md`. */
  readonly size?: "sm" | "md";
  /** Accessible name, e.g. "Disk usage". */
  readonly label?: string;
  /** How the value is announced. Defaults to `String(value)`. */
  readonly formatValue?: (value: number) => string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

/** The element a meter renders. Pure in its arguments. */
export const renderMeter = (
  props: MeterProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const range = normalizeRange({
    min: props.min ?? 0,
    max: props.max ?? 100,
    step: 0,
  });
  const value = clampValue(props.value, range);
  const spec: ProgressSpec = {
    value: valueFraction(value, range) * 100,
    tone: props.tone ?? "primary",
    size: props.size ?? "md",
  };
  return (
    <div
      role="meter"
      aria-label={ariaName(props.label)}
      aria-valuetext={valueText(value, props.formatValue?.(value))}
      testId={props.testId}
      style={mergeStyle(progressTrackStyle(spec, theme), props.style)}
    >
      <div style={progressFillStyle(spec, theme)} />
    </div>
  );
};

/** A measurement inside a range. */
export const Meter = (props: MeterProps): ReactElement =>
  renderMeter(props, useTheme());
