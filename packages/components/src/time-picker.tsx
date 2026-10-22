/**
 * TimePicker: one time of day, entered as an `HH:mm` hour and minute segment.
 *
 * The public value is `HH:mm` in 24-hour form, or `null` for none: never a
 * `DateTime`, never a locale string. Display is fixed 24-hour because the repo
 * has no i18n layer; AM/PM belongs to a message catalogue, not to this control.
 *
 * The two segments are real `<input>` host elements, not an invented
 * `role="spinbutton"`: `@gpuix/native@0.11.0` has `aria-valuetext` but no
 * `aria-valuenow`, so a custom spinbutton would never announce its value, while
 * an input announces its value natively. Typing clamps each segment (hours
 * `00..23`, minutes `00..59`); `minuteStep` only changes the arrow-key step.
 * Arrow keys add minutes through one clock function, so hours and minutes cannot
 * disagree at the hour or midnight boundary. Emptying a segment clears the
 * whole value; blur pads both segments. Disabled is `readOnly` on both inputs
 * because 0.11.0 has no `aria-disabled`.
 *
 * The root is a field, not a trigger with a popup (the reason it is a field is
 * above): `TimePickerSegment` places the two inputs, `TimePickerSeparator` the
 * colon, and `TimePickerClear` the optional reset.
 */

import type { EventPayload, InputProps, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  cn,
  TIME_PICKER_CLEAR,
  TIME_PICKER_ROOT,
  TIME_PICKER_SEGMENT,
  TIME_PICKER_SEPARATOR,
} from "@gpuixui/tw";
import { Match } from "effect";
import * as Option from "effect/Option";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useControllableState } from "./internal/controllable.js";
import { fieldHint, hintHost, renderFieldHint } from "@gpuixui/primitives/hint";
import { activationHandlers } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  addMinutes,
  clampSegment,
  composeIsoTime,
  digitsOf,
  formatIsoTime,
  normalizeStep,
  padSegment,
  parseIsoTime,
  type TimeOfDay,
} from "./time-picker/time.js";
import {
  controlHeight,
  disabledFade,
  keepContent,
  keyboardRing,
  nativeTextTheme,
  selectionWash,
  targetSize,
  useTheme,
} from "./internal/theme.js";

/** The two segments a time is entered in. */
export type TimeSegment = "hours" | "minutes";

/** The rules a time-picker part follows; throws outside a {@link TimePicker}. */
interface TimePickerContextValue {
  readonly hoursText: string;
  readonly minutesText: string;
  readonly disabled: boolean;
  readonly groupLabel: string;
  readonly testId: string;
  readonly clearable: boolean;
  readonly hasValue: boolean;
  readonly edit: (segment: TimeSegment, raw: string) => void;
  readonly handleKeyDown: (segment: TimeSegment, event: EventPayload) => void;
  readonly normalize: () => void;
  readonly clear: () => void;
  readonly registerHours: (instance: PublicInstance | null) => void;
}

const TimePickerContext = createContext<TimePickerContextValue | undefined>(
  undefined,
);

/** The field a part belongs to. Throws when there is none. */
const useTimePicker = (): TimePickerContextValue => {
  const value = useContext(TimePickerContext);
  if (value === undefined) {
    throw new Error("TimePicker parts must be used inside TimePicker");
  }
  return value;
};

/** {@link TimePicker} props. */
export interface TimePickerProps {
  /** The controlled `HH:mm` value, or `null` for none. `undefined` means uncontrolled. */
  readonly value?: string | null;
  readonly defaultValue?: string | null;
  /** Every accepted edit, including the clear path. */
  readonly onValueChange?: (value: string | null) => void;
  /** The field group's accessible name; default `"Time"`. */
  readonly label?: string;
  /** Minutes per arrow-key step, normalised to 1..59. Typed minutes are not restricted. Default `1`. */
  readonly minuteStep?: number;
  /** Show a clear control while a time is set. Default `false`. */
  readonly clearable?: boolean;
  readonly disabled?: boolean;
  /** Base id for the parts: `<testId>-hours`, `-minutes`, `-clear`. Default `"time-picker"`. */
  readonly testId?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

const SEGMENT_WIDTH = 26;

/** The field: value, text state, clamping and the focus ring. */
export const TimePicker = ({
  value,
  defaultValue,
  onValueChange,
  label,
  minuteStep,
  clearable = false,
  disabled = false,
  testId = "time-picker",
  className,
  children,
}: TimePickerProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const step = normalizeStep(minuteStep);
  const groupLabel = label ?? "Time";
  const initialValue = value !== undefined ? value : defaultValue;
  const initialTime = Option.flatMap(
    Option.fromNullishOr(initialValue),
    parseIsoTime,
  );
  const [hoursText, setHoursText] = useState(() =>
    Option.match(initialTime, {
      onNone: () => "",
      onSome: (time) => padSegment(time.hours),
    }),
  );
  const [minutesText, setMinutesText] = useState(() =>
    Option.match(initialTime, {
      onNone: () => "",
      onSome: (time) => padSegment(time.minutes),
    }),
  );
  const [selected, setSelected] = useControllableState<string | null>({
    value,
    defaultValue: defaultValue ?? null,
    onChange: onValueChange,
  });
  const hoursInput = useRef<PublicInstance | null>(null);

  /** Adopt an external value; keep raw text while it still canonicalises to it. */
  useLayoutEffect(() => {
    if (Option.getOrNull(composeIsoTime(hoursText, minutesText)) === selected) {
      return;
    }
    Option.match(Option.flatMap(Option.fromNullishOr(selected), parseIsoTime), {
      onNone: () => {
        setHoursText("");
        setMinutesText("");
      },
      onSome: (time) => {
        setHoursText(padSegment(time.hours));
        setMinutesText(padSegment(time.minutes));
      },
    });
  }, [selected, hoursText, minutesText]);

  const emit = (next: string | null): void => setSelected(next);

  const edit = (segment: TimeSegment, raw: string): void => {
    const digits = digitsOf(raw);
    if (digits === "") {
      setHoursText("");
      setMinutesText("");
      emit(null);
      return;
    }
    const max = segment === "hours" ? 23 : 59;
    const clamped = Option.getOrElse(clampSegment(digits, max), () => 0);
    const text = Number(digits) > max ? padSegment(clamped) : digits;
    const nextHours = segment === "hours" ? text : hoursText;
    const nextMinutes = segment === "minutes" ? text : minutesText;
    if (segment === "hours") setHoursText(text);
    else setMinutesText(text);
    emit(Option.getOrNull(composeIsoTime(nextHours, nextMinutes)));
  };

  const shift = (delta: number): void => {
    const from = Option.getOrElse(
      Option.flatMap(Option.fromNullishOr(selected), parseIsoTime),
      (): TimeOfDay => ({ hours: 0, minutes: 0 }),
    );
    const next = addMinutes(from, delta);
    setHoursText(padSegment(next.hours));
    setMinutesText(padSegment(next.minutes));
    emit(formatIsoTime(next));
  };

  const handleKeyDown = (segment: TimeSegment, event: EventPayload): void => {
    Match.value(event.key).pipe(
      Match.when("up", () => shift(segment === "hours" ? 60 : step)),
      Match.when("down", () => shift(segment === "hours" ? -60 : -step)),
      Match.orElse(() => undefined),
    );
  };

  const normalize = (): void => {
    Option.match(Option.flatMap(Option.fromNullishOr(selected), parseIsoTime), {
      onNone: () => undefined,
      onSome: (time) => {
        setHoursText(padSegment(time.hours));
        setMinutesText(padSegment(time.minutes));
      },
    });
  };

  const clear = (): void => {
    setHoursText("");
    setMinutesText("");
    emit(null);
    const instance = hoursInput.current;
    if (instance !== null) renderer?.focusElement?.(instance.id);
  };

  const hasValue = Option.isSome(
    Option.flatMap(Option.fromNullishOr(selected), parseIsoTime),
  );

  assertParts(timePickerRoot, children);

  return (
    <TimePickerContext.Provider
      value={{
        hoursText,
        minutesText,
        disabled,
        groupLabel,
        testId,
        clearable,
        hasValue,
        edit,
        handleKeyDown,
        normalize,
        clear,
        registerHours: (instance) => {
          hoursInput.current = instance;
        },
      }}
    >
      <div
        role="group"
        aria-label={groupLabel}
        testId={testId}
        style={mergeStyles(
          recipeStyle(cn(TIME_PICKER_ROOT, className), theme),
          {
            height: controlHeight(theme, "md"),
            ...disabledFade(disabled),
          },
        )}
      >
        {children}
      </div>
    </TimePickerContext.Provider>
  );
};

/** {@link TimePickerSegment} props. */
export interface TimePickerSegmentProps {
  /** Which half of the time this input edits. */
  readonly segment: TimeSegment;
  /** A style, or a function of the segment's state. */
  readonly style?: StateStyle<TimePickerSegmentState>;
}

/** What a segment draws: the field's input state and its own focus. */
export interface TimePickerSegmentState {
  readonly disabled: boolean;
  readonly focused: boolean;
}

/** One labelled segment. Typing clamps, arrows step and blur pads. */
export const TimePickerSegment = ({
  segment,
  style,
}: TimePickerSegmentProps) => {
  const theme = useTheme();
  const [focused, setFocusedSegment] = useState(false);
  const {
    hoursText,
    minutesText,
    disabled,
    groupLabel,
    testId,
    edit,
    handleKeyDown,
    normalize,
    registerHours,
  } = useTimePicker();
  const text = segment === "hours" ? hoursText : minutesText;
  const state: TimePickerSegmentState = { disabled, focused };

  const fieldStyle = mergeStyles(
    mergeStyles(recipeStyle(TIME_PICKER_SEGMENT, theme), {
      width: SEGMENT_WIDTH,
      backgroundColor: undefined,
      ...(disabled ? {} : keyboardRing(theme)),
      ...selectionWash(theme),
      ...keepContent,
    }),
    resolveStyle(style, state),
  );
  const props: InputProps = {
    testId: `${testId}-${segment}`,
    "aria-label": `${groupLabel} ${segment}`,
    // The segments are transparent over the picker's `input` fill; the format
    // hint is painted, because the host's own placeholder is a fixed grey.
    theme: nativeTextTheme(theme, "input"),
    value: text,
    readOnly: disabled,
    tabIndex: disabled ? -1 : 0,
    onChange: (event) => edit(segment, event.value ?? ""),
    onKeyDown: (event) => handleKeyDown(segment, event),
    onFocus: () => setFocusedSegment(true),
    onBlur: () => {
      normalize();
      setFocusedSegment(false);
    },
    style: fieldStyle,
  };
  const hint = fieldHint(
    { placeholder: segment === "hours" ? "HH" : "MM", disabled },
    theme,
    text,
    { origin: "host", align: "center", style: fieldStyle },
  );

  return (
    <div
      style={hintHost({
        width: SEGMENT_WIDTH,
        alignSelf: "stretch",
      })}
    >
      <input
        {...props}
        {...(segment === "hours" ? { ref: registerHours } : {})}
      />
      {Option.match(hint, {
        onNone: () => null,
        onSome: (painted) => renderFieldHint(painted, `${testId}-${segment}`),
      })}
    </div>
  );
};

/** {@link TimePickerSeparator} props. */
export interface TimePickerSeparatorProps {
  readonly children?: ReactNode;
}

/** The colon between the two segments. Not focusable. */
export const TimePickerSeparator = ({
  children = ":",
}: TimePickerSeparatorProps) => {
  const theme = useTheme();

  return (
    <text role="presentation" style={recipeStyle(TIME_PICKER_SEPARATOR, theme)}>
      {children}
    </text>
  );
};

/** {@link TimePickerClear} props. */
export interface TimePickerClearProps {
  /** The accessible name. Default `"Clear time"`. */
  readonly label?: string;
}

/** The reset control. It renders only while `clearable` and a value exist. */
export const TimePickerClear = ({
  label = "Clear time",
}: TimePickerClearProps) => {
  const theme = useTheme();
  const { clearable, hasValue, disabled, testId, clear } = useTimePicker();
  if (!clearable || !hasValue || disabled) return null;

  return (
    <div
      role="button"
      aria-label={label}
      testId={`${testId}-clear`}
      tabIndex={0}
      onClick={clear}
      {...activationHandlers(clear)}
      style={mergeStyles(recipeStyle(TIME_PICKER_CLEAR, theme), {
        ...keyboardRing(theme),
        width: targetSize.minimum,
        height: targetSize.minimum,
        flexShrink: 0,
        hover: { backgroundColor: theme.colors.accent },
      })}
    >
      <Icon name="x" size="sm" color={theme.colors.mutedForeground} />
    </div>
  );
};

/** Every part of TimePicker, so a misplaced sibling is named. */
const timePickerParts: ReadonlyArray<PartComponent> = [
  TimePicker,
  TimePickerSegment,
  TimePickerSeparator,
  TimePickerClear,
];

const timePickerRoot: PartsContract = {
  parent: "TimePicker",
  family: timePickerParts,
  accepts: [TimePickerSegment, TimePickerSeparator, TimePickerClear],
  hint: "Put the segments, separator and clear control directly inside TimePicker.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const timePickerMeta = {
  name: "Time pickers",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "fixed 24-hour display: no AM/PM and no locale, because the repo has no i18n layer",
    "two labelled text segments instead of a spinbutton: 0.11.0 has no aria-valuenow",
    "minuteStep affects the arrow keys only; typed minutes accept 00..59",
    "disabled is readOnly plus dimming: 0.11.0 has no aria-disabled",
    "no seconds and no timezone: the value is a time of day, not an instant",
  ],
  docs: "docs/time-picker.mdx",
  example: "examples/time-picker.example.tsx",
  testFile: "src/behaviour/time-picker.test.tsx",
} as const;
