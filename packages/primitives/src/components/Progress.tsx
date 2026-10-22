/**
 * `Progress` — a determinate or indeterminate bar.
 *
 * The runtime exposes **no `aria-valuenow`** (see `docs/gpuix-capabilities.md`), so the value is
 * reported through `aria-valuetext`, which is the one supported way to make a
 * progressbar legible to assistive technology. A `value` outside 0–100 is
 * clamped by `core/style.ts`; an absent `value` means indeterminate.
 *
 * The root paints nothing but the frame; `ProgressTrack` is the bar,
 * `ProgressIndicator` the fill, and `ProgressLabel`/`ProgressValue` the text a
 * caller may put beside it. The default composition is the track alone, so
 * `<Progress value={42} />` renders exactly the bar it always has.
 */

import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import type { StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import {
  indeterminateOffset,
  progressAnimates,
  SPINNER_SEGMENTS,
} from "../core/loading.js";
import { stillFrame } from "../core/motion.js";
import {
  progressPercent,
  type ProgressSpec,
  type ProgressTone,
} from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import {
  progressBufferClass,
  progressFillClass,
  progressTrackClass,
} from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, useStep } from "./internal.js";
import { Text } from "./Text.js";
import { useTheme } from "./ThemeProvider.js";

export interface ProgressProps {
  /** 0–100. Omit for an indeterminate bar. */
  readonly value?: number;
  /**
   * How much of the bar is already held — a download's received-then-buffered
   * share. Painted as one segment between `value` and this number, so a buffer
   * behind the value paints nothing. Ignored while indeterminate: an
   * indeterminate bar has no position to buffer around.
   */
  readonly buffer?: number;
  /** Defaults to `primary`. */
  readonly tone?: ProgressTone;
  /** Defaults to `md`. */
  readonly size?: ProgressSpec["size"];
  /** Accessible name, e.g. "Uploading". */
  readonly label?: string;
  /**
   * Hold the indeterminate segment and schedule no interval. The runtime
   * exposes no reduced-motion preference, so the caller passes its own. A
   * determinate bar never animates, so this changes nothing on it.
   */
  readonly reducedMotion?: boolean;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** The parts to draw. Omit for the track and its indicator. */
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** The segment width of an indeterminate bar, as a percentage of the track. */
const SEGMENT = 40;

/** What every part reads from the progress that owns it. */
export interface ProgressPart {
  readonly theme: PrimitiveTheme;
  readonly determinate: boolean;
  readonly percent: number;
  /** Where the held-ahead segment ends, or `undefined` when there is none. */
  readonly bufferPercent: number | undefined;
  readonly tone: ProgressTone;
  readonly size: ProgressSpec["size"];
  readonly step: number;
  readonly label: string | undefined;
  /** Exposed through `aria-valuetext`; `"42%"` or `"loading"`. */
  readonly valueText: string;
}

/** Resolve a progress's shared state once, for its root and every part. */
export const progressPart = (
  { value, buffer, tone = "primary", size = "md", label }: ProgressProps,
  theme: PrimitiveTheme,
  step: number,
): ProgressPart => {
  const determinate = value !== undefined;
  const percent = determinate ? progressPercent(value) : 0;
  return {
    theme,
    determinate,
    percent,
    // A buffer is a place on the bar, so it needs one: an indeterminate bar has
    // none, and a buffer behind the value has nothing left to say.
    bufferPercent:
      determinate && buffer !== undefined
        ? Math.max(percent, progressPercent(buffer))
        : undefined,
    tone,
    size,
    step,
    label,
    valueText: determinate ? `${percent}%` : "loading",
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

/** The row a progress's parts stack in. */
const frameStyle = (theme: PrimitiveTheme): StyleDesc => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing["2xs"],
});

/** {@link ProgressTrack} props. */
export interface ProgressTrackProps {
  /** The indicators. Omit for an empty track. */
  readonly children?: ReactNode;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** The bar's background. */
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

/** The bar's background, inside a progress. */
export const ProgressTrack = (props: ProgressTrackProps): ReactElement =>
  renderProgressTrack(props, useProgressPart("ProgressTrack"));

/** {@link ProgressIndicator} props. */
export interface ProgressIndicatorProps {
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/**
 * The filled segment.
 *
 * Determinate, it is one fill at the clamped percentage, plus the buffer
 * segment when the caller reports one. Indeterminate, it is the moving segment:
 * a spacer and the fill, so a caller who composes their own track still gets the
 * motion instead of a fill pinned to the start. The tone paints both — a bar
 * that changes colour when it learns its value would be a bar whose colour
 * means nothing. The buffer is painted after the fill rather than under it, so
 * its own segment is the part between the value and the buffer: the runtime
 * paints one child after another, and a segment is measurable where an overlay
 * would need a positioned ancestor the runtime does not guarantee.
 */
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

/** The filled segment, inside a progress. */
export const ProgressIndicator = (
  props: ProgressIndicatorProps,
): ReactElement =>
  renderProgressIndicator(props, useProgressPart("ProgressIndicator"));

/** {@link ProgressLabel} props. */
export interface ProgressLabelProps {
  /** Visible text. Defaults to the progress's `label`. */
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** The task's name, as visible text. */
export const renderProgressLabel = (
  { children, testId }: ProgressLabelProps,
  part: ProgressPart,
): ReactElement => (
  <Text role="caption" tone="muted" testId={testId}>
    {children ?? part.label}
  </Text>
);

/** The task's name, inside a progress. */
export const ProgressLabel = (props: ProgressLabelProps): ReactElement =>
  renderProgressLabel(props, useProgressPart("ProgressLabel"));

/** {@link ProgressValue} props. */
export interface ProgressValueProps {
  readonly testId?: string;
}

/** The percentage, or `loading` when there is no known value. */
export const renderProgressValue = (
  { testId }: ProgressValueProps,
  part: ProgressPart,
): ReactElement => (
  <Text role="caption" tone="muted" testId={testId}>
    {part.valueText}
  </Text>
);

/** The percentage, inside a progress. */
export const ProgressValue = (props: ProgressValueProps): ReactElement =>
  renderProgressValue(props, useProgressPart("ProgressValue"));

/** The element a progress renders. Pure in its arguments. */
export const renderProgress = (
  props: ProgressProps,
  theme: PrimitiveTheme,
  step: number,
): ReactElement => {
  const { label, style, className, children, testId } = props;
  const part = progressPart(
    props,
    theme,
    stillFrame(step, props.reducedMotion),
  );
  return (
    <div
      role="progressbar"
      aria-label={accessibleName(label)}
      aria-valuetext={part.valueText}
      testId={testId}
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

/**
 * A progress bar.
 *
 * Only an indeterminate bar animates, so only an indeterminate bar runs the
 * step timer: a determinate bar draws a fixed fill, and a timer that wakes the
 * tree for a segment it never paints is cost with nothing to show for it.
 * `reducedMotion` stops the timer the same way.
 */
export const Progress = (props: ProgressProps): ReactElement =>
  renderProgress(
    props,
    useTheme(),
    useStep(
      SPINNER_SEGMENTS,
      120,
      progressAnimates(Option.fromNullishOr(props.value)) &&
        props.reducedMotion !== true,
    ),
  );
