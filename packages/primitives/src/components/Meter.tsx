/** @jsxImportSource @gpuix/react */
import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import {
  accessibleName,
  captionCopy,
  spokenText,
  visibleCopy,
} from "../core/a11y.js";
import {
  progressSizeOf,
  progressToneOf,
  type ProgressSize,
  type ProgressTone,
} from "../core/style.js";
import { clampValue, storedRange, valueFraction } from "../core/value.js";
import { spaceValue } from "../core/theme.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { progressFillClass, progressTrackClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, type ElementHostProps } from "./internal.js";
import { Text } from "./Text.js";
import { useTheme } from "./ThemeProvider.js";

export interface MeterProps extends ElementHostProps {
  readonly value: number;

  readonly min?: number;

  readonly max?: number;

  readonly tone?: ProgressTone;

  readonly size?: ProgressSize;

  readonly label?: string;

  readonly formatValue?: (value: number) => string;
  readonly style?: StyleDesc;

  readonly className?: string;

  readonly children?: ReactNode;
  readonly testId?: string;
}

export interface MeterPart {
  readonly theme: PrimitiveTheme;

  readonly value: number;

  readonly fraction: number;
  readonly tone: ProgressTone;
  readonly size: ProgressSize;
  readonly label: string | undefined;

  readonly valueText: string;
}

export const meterPart = (
  props: MeterProps,
  theme: PrimitiveTheme,
): MeterPart => {
  const range = storedRange(props, {
    min: 0,
    max: 100,
    step: 0,
  });
  const value = clampValue(props.value, range);
  return {
    theme,
    value,
    fraction: valueFraction(value, range),
    tone: progressToneOf(props.tone),
    size: progressSizeOf(props.size),

    label: visibleCopy(props.label),

    valueText: spokenText(
      Option.fromNullishOr(props.formatValue?.(value)),
      String(value),
    ),
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

const frameStyle = (theme: PrimitiveTheme): StyleDesc => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: spaceValue(theme, "2xs"),
});

export interface MeterTrackProps {
  readonly children?: ReactNode;
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly testId?: string;
}

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

export const MeterTrack = (props: MeterTrackProps): ReactElement =>
  renderMeterTrack(props, useMeterPart("MeterTrack"));

export interface MeterIndicatorProps {
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly testId?: string;
}

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

export const MeterIndicator = (props: MeterIndicatorProps): ReactElement =>
  renderMeterIndicator(props, useMeterPart("MeterIndicator"));

export interface MeterLabelProps {
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderMeterLabel = (
  { children, testId }: MeterLabelProps,
  part: MeterPart,
): ReactElement | null => {
  const copy = captionCopy(children, part.label);
  return copy === undefined ? null : (
    <Text role="caption" tone="muted" testId={testId}>
      {copy}
    </Text>
  );
};

export const MeterLabel = (props: MeterLabelProps): ReactElement | null =>
  renderMeterLabel(props, useMeterPart("MeterLabel"));

export interface MeterValueProps {
  readonly testId?: string;
}

export const renderMeterValue = (
  { testId }: MeterValueProps,
  part: MeterPart,
): ReactElement => (
  <Text role="caption" tone="muted" testId={testId}>
    {part.valueText}
  </Text>
);

export const MeterValue = (props: MeterValueProps): ReactElement =>
  renderMeterValue(props, useMeterPart("MeterValue"));

export const renderMeter = (
  props: MeterProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const part = meterPart(props, theme);
  return (
    <div
      ref={props.ref}
      role="meter"
      aria-label={accessibleName(props.label)}
      aria-id={props["aria-id"]}
      aria-valuetext={part.valueText}
      testId={props.testId}
      onLayout={props.onLayout}
      style={mergeStyle(
        mergeStyle(
          frameStyle(theme),
          recipeTw.classesToStyle(props.className, theme).style,
        ),
        props.style,
      )}
    >
      <MeterPartContext.Provider value={part}>
        {props.children ??
          renderMeterTrack({ children: renderMeterIndicator({}, part) }, part)}
      </MeterPartContext.Provider>
    </div>
  );
};

export const Meter = (props: MeterProps): ReactElement =>
  renderMeter(props, useTheme());
