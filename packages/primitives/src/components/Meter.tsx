/**
 * `Meter` — a value inside a range.
 *
 * Distinct from `Progress`, which reports how far a task has got (0–100 with no
 * meaning above or below). A meter reports a measurement: 62 of 100, 12 of 16.
 * It is status, not a control — never focusable, no pointer or key handlers.
 *
 * `@gpuix/native` 0.11.0 has no `aria-valuenow`/`min`/`max` (see
 * `docs/gpuix-capabilities.md`), so the value is announced through
 * `aria-valuetext`, and the honest default text is the formatted value alone.
 * The paint is `Progress`'s track and fill, because a second bar painter would
 * drift from it.
 *
 * The parts mirror `Progress`: the root is the frame, `MeterTrack` the bar,
 * `MeterIndicator` the fill, `MeterLabel`/`MeterValue` the text.
 */

import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import type { ProgressTone } from "../core/style.js";
import { clampValue, normalizeRange, valueFraction } from "../core/value.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { progressFillClass, progressTrackClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { Text } from "./Text.js";
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** The parts to draw. Omit for the track and its indicator. */
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** What every part reads from the meter that owns it. */
export interface MeterPart {
  readonly theme: PrimitiveTheme;
  /** The clamped measurement, in the range's own units. */
  readonly value: number;
  /** The fraction of the track the fill paints. */
  readonly fraction: number;
  readonly tone: ProgressTone;
  readonly size: "sm" | "md";
  readonly label: string | undefined;
  /** The measurement as announced and displayed. */
  readonly valueText: string;
}

/** Resolve a meter's shared state once, for its root and every part. */
export const meterPart = (
  props: MeterProps,
  theme: PrimitiveTheme,
): MeterPart => {
  const range = normalizeRange({
    min: props.min ?? 0,
    max: props.max ?? 100,
    step: 0,
  });
  const value = clampValue(props.value, range);
  return {
    theme,
    value,
    fraction: valueFraction(value, range),
    tone: props.tone ?? "primary",
    size: props.size ?? "md",
    label: props.label,
    valueText: props.formatValue?.(value) ?? String(value),
  };
};

const MeterPartContext = createContext<MeterPart | null>(null);

const useMeterPart = (name: string): MeterPart => {
  const part = useContext(MeterPartContext);
  if (part === null) {
    throw new Error(`${name} must be used inside Meter`);
  }
  return part;
};

/** The row a meter's parts stack in. */
const frameStyle = (theme: PrimitiveTheme): StyleDesc => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing["2xs"],
});

/** {@link MeterTrack} props. */
export interface MeterTrackProps {
  /** The indicators. Omit for an empty track. */
  readonly children?: ReactNode;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** The bar's background. */
export const renderMeterTrack = (
  { children, className, style, testId }: MeterTrackProps,
  part: MeterPart,
): ReactElement => (
  <div
    testId={testId}
    style={mergeStyle(
      recipeTw.classesToStyle(
        cn(progressTrackClass(part.size), className),
        part.theme,
      ).style,
      style,
    )}
  >
    {children}
  </div>
);

/** The bar's background, inside a meter. */
export const MeterTrack = (props: MeterTrackProps): ReactElement =>
  renderMeterTrack(props, useMeterPart("MeterTrack"));

/** {@link MeterIndicator} props. */
export interface MeterIndicatorProps {
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** The measurement's share of the track. */
export const renderMeterIndicator = (
  { className, style, testId }: MeterIndicatorProps,
  part: MeterPart,
): ReactElement => (
  <div
    testId={testId}
    style={mergeStyle(
      mergeStyle(
        recipeTw.classesToStyle(progressFillClass(part.tone), part.theme).style,
        { width: `${part.fraction * 100}%` },
      ),
      className === undefined
        ? style
        : mergeStyle(
            recipeTw.classesToStyle(className, part.theme).style,
            style,
          ),
    )}
  />
);

/** The measurement's share of the track, inside a meter. */
export const MeterIndicator = (props: MeterIndicatorProps): ReactElement =>
  renderMeterIndicator(props, useMeterPart("MeterIndicator"));

/** {@link MeterLabel} props. */
export interface MeterLabelProps {
  /** Visible text. Defaults to the meter's `label`. */
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** The measurement's subject, as visible text. */
export const renderMeterLabel = (
  { children, testId }: MeterLabelProps,
  part: MeterPart,
): ReactElement => (
  <Text role="caption" tone="muted" testId={testId}>
    {children ?? part.label}
  </Text>
);

/** The measurement's subject, inside a meter. */
export const MeterLabel = (props: MeterLabelProps): ReactElement =>
  renderMeterLabel(props, useMeterPart("MeterLabel"));

/** {@link MeterValue} props. */
export interface MeterValueProps {
  readonly testId?: string;
}

/** The formatted measurement. */
export const renderMeterValue = (
  { testId }: MeterValueProps,
  part: MeterPart,
): ReactElement => (
  <Text role="caption" tone="muted" testId={testId}>
    {part.valueText}
  </Text>
);

/** The formatted measurement, inside a meter. */
export const MeterValue = (props: MeterValueProps): ReactElement =>
  renderMeterValue(props, useMeterPart("MeterValue"));

/** The element a meter renders. Pure in its arguments. */
export const renderMeter = (
  props: MeterProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const part = meterPart(props, theme);
  return (
    <div
      role="meter"
      aria-label={accessibleName(props.label)}
      aria-valuetext={part.valueText}
      testId={props.testId}
      style={mergeStyle(
        recipeTw.classesToStyle(props.className, theme).style,
        mergeStyle(frameStyle(theme), props.style),
      )}
    >
      <MeterPartContext.Provider value={part}>
        {props.children ??
          renderMeterTrack({ children: renderMeterIndicator({}, part) }, part)}
      </MeterPartContext.Provider>
    </div>
  );
};

/** A measurement inside a range. */
export const Meter = (props: MeterProps): ReactElement =>
  renderMeter(props, useTheme());
