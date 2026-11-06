/** @jsxImportSource @gpuix/react */
import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import type { StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import { useMotionPreference } from "@gpuixui/motion/react/presence";
import { cn } from "@gpuixui/tw";
import {
  accessibleName,
  captionCopy,
  spokenText,
  visibleCopy,
} from "../core/a11y.js";
import { storedNumber } from "../core/stored.js";
import {
  defaultMessages,
  indeterminateWord,
  type PrimitiveMessages,
} from "../core/messages.js";
import {
  indeterminateOffset,
  progressAnimates,
  SPINNER_SEGMENTS,
  STEP_INTERVAL_MS,
} from "../core/loading.js";
import { reducedMotionOf, stillFrame } from "../core/motion.js";
import {
  progressPercent,
  progressSizeOf,
  progressToneOf,
  type ProgressSize,
  type ProgressSpec,
  type ProgressTone,
} from "../core/style.js";
import { spaceValue } from "../core/theme.js";
import type { PrimitiveTheme } from "../core/theme.js";
import {
  progressBufferClass,
  progressFillClass,
  progressTrackClass,
} from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, useStep, type ElementHostProps } from "./internal.js";
import { useMessages } from "./MessagesProvider.js";
import { Text } from "./Text.js";
import { useTheme } from "./ThemeProvider.js";

export interface ProgressProps extends ElementHostProps {
  readonly value?: number;

  readonly buffer?: number;

  readonly tone?: ProgressTone;

  readonly size?: ProgressSpec["size"];

  readonly label?: string;

  readonly formatValue?: (percent: number) => string;

  readonly loadingText?: string;

  readonly reducedMotion?: boolean;
  readonly style?: StyleDesc;

  readonly className?: string;

  readonly children?: ReactNode;
  readonly testId?: string;
}

const SEGMENT = 40;

export interface ProgressPart {
  readonly theme: PrimitiveTheme;
  readonly determinate: boolean;
  readonly percent: number;

  readonly bufferPercent: number | undefined;
  readonly tone: ProgressTone;
  readonly size: ProgressSize;
  readonly step: number;
  readonly label: string | undefined;

  readonly valueText: string;
}

export const progressPart = (
  {
    value,
    buffer,
    tone = "primary",
    size = "md",
    label,
    formatValue,
    loadingText,
  }: ProgressProps,
  theme: PrimitiveTheme,
  step: number,
  messages: PrimitiveMessages = defaultMessages,
): ProgressPart => {
  const measurement = storedNumber(value);
  const determinate = Option.isSome(measurement);
  const percent = Option.match(measurement, {
    onNone: () => 0,
    onSome: progressPercent,
  });
  return {
    theme,
    determinate,
    percent,

    bufferPercent: determinate
      ? Option.match(storedNumber(buffer), {
          onNone: () => undefined,
          onSome: (held) => Math.max(percent, progressPercent(held)),
        })
      : undefined,
    tone: progressToneOf(tone),
    size: progressSizeOf(size),
    step,

    label: visibleCopy(label),

    valueText: determinate
      ? spokenText(Option.fromNullishOr(formatValue?.(percent)), `${percent}%`)
      : spokenText(
          Option.fromNullishOr(loadingText),

          indeterminateWord(messages.loading),
        ),
  };
};

const ProgressPartContext = createContext<ProgressPart | null>(null);

const useProgressPart = (name: string): ProgressPart => {
  const part = useContext(ProgressPartContext);
  if (part === null) {
    throw new Error(`${name} must be used inside Progress`);
  }
  return part;
};

const frameStyle = (theme: PrimitiveTheme): StyleDesc => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: spaceValue(theme, "2xs"),
});

export interface ProgressTrackProps {
  readonly children?: ReactNode;
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly testId?: string;
}

export const renderProgressTrack = (
  { children, className, style, testId }: ProgressTrackProps,
  part: ProgressPart,
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

export const ProgressTrack = (props: ProgressTrackProps): ReactElement =>
  renderProgressTrack(props, useProgressPart("ProgressTrack"));

export interface ProgressIndicatorProps {
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly testId?: string;
}

export const renderProgressIndicator = (
  { className, style, testId }: ProgressIndicatorProps,
  part: ProgressPart,
): ReactElement => {
  const fill = mergeStyle(
    mergeStyle(
      recipeTw.classesToStyle(progressFillClass(part.tone), part.theme).style,
      { width: `${part.determinate ? part.percent : SEGMENT}%` },
    ),
    className === undefined
      ? style
      : mergeStyle(recipeTw.classesToStyle(className, part.theme).style, style),
  );
  if (part.determinate) {
    const held = part.bufferPercent;
    return (
      <>
        <div testId={testId} style={fill} />
        {held === undefined || held <= part.percent ? null : (
          <div
            style={mergeStyle(
              recipeTw.classesToStyle(
                progressBufferClass(part.tone),
                part.theme,
              ).style,
              { width: `${held - part.percent}%` },
            )}
          />
        )}
      </>
    );
  }
  const lead = mergeStyle(
    recipeTw.classesToStyle("shrink-0", part.theme).style,
    { width: `${indeterminateOffset(part.step, SEGMENT)}%` },
  );
  return (
    <>
      <div style={lead} />
      <div testId={testId} style={fill} />
    </>
  );
};

export const ProgressIndicator = (
  props: ProgressIndicatorProps,
): ReactElement =>
  renderProgressIndicator(props, useProgressPart("ProgressIndicator"));

export interface ProgressLabelProps {
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderProgressLabel = (
  { children, testId }: ProgressLabelProps,
  part: ProgressPart,
): ReactElement | null => {
  const copy = captionCopy(children, part.label);
  return copy === undefined ? null : (
    <Text role="caption" tone="muted" testId={testId}>
      {copy}
    </Text>
  );
};

export const ProgressLabel = (props: ProgressLabelProps): ReactElement | null =>
  renderProgressLabel(props, useProgressPart("ProgressLabel"));

export interface ProgressValueProps {
  readonly testId?: string;
}

export const renderProgressValue = (
  { testId }: ProgressValueProps,
  part: ProgressPart,
): ReactElement => (
  <Text role="caption" tone="muted" testId={testId}>
    {part.valueText}
  </Text>
);

export const ProgressValue = (props: ProgressValueProps): ReactElement =>
  renderProgressValue(props, useProgressPart("ProgressValue"));

export const renderProgress = (
  props: ProgressProps,
  theme: PrimitiveTheme,
  step: number,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const {
    label,
    style,
    className,
    children,
    testId,
    ref,
    "aria-id": controlId,
    onLayout,
  } = props;
  const part = progressPart(
    props,
    theme,
    stillFrame(step, props.reducedMotion),
    messages,
  );
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-label={accessibleName(label)}
      aria-id={controlId}
      aria-valuetext={part.valueText}
      testId={testId}
      onLayout={onLayout}
      style={mergeStyle(
        mergeStyle(
          frameStyle(theme),
          recipeTw.classesToStyle(className, theme).style,
        ),
        style,
      )}
    >
      <ProgressPartContext.Provider value={part}>
        {children ??
          renderProgressTrack(
            { children: renderProgressIndicator({}, part) },
            part,
          )}
      </ProgressPartContext.Provider>
    </div>
  );
};

export const Progress = (props: ProgressProps): ReactElement => {
  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );

  const animates =
    progressAnimates(storedNumber(props.value)) && !reducedMotion;
  return renderProgress(
    { ...props, reducedMotion },
    useTheme(),
    useStep(SPINNER_SEGMENTS, STEP_INTERVAL_MS, animates),
    useMessages(),
  );
};
