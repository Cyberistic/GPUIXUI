/**
 * TimePicker: one time of day, entered as an `HH:mm` hour and minute segment.
 *
 * The public value is `HH:mm` in 24-hour form, or `null` for none: never a
 * `DateTime`, never a locale string. Display is fixed 24-hour because the repo
 * has no i18n layer; AM/PM belongs to a message catalogue, not to this control.
 *
 * The two segments are real `<input>` host elements, not an invented
 * `role="spinbutton"`: `@gpuix/native@0.10.0` has `aria-valuetext` but no
 * `aria-valuenow`, so a custom spinbutton would never announce its value, while
 * an input announces its value natively. Typing clamps each segment (hours
 * `00..23`, minutes `00..59`); `minuteStep` only changes the arrow-key step.
 * Arrow keys add minutes through one clock function, so hours and minutes cannot
 * disagree at the hour or midnight boundary. Emptying a segment clears the
 * whole value; blur pads both segments. Disabled is `readOnly` on both inputs
 * because 0.10.0 has no `aria-disabled`.
 *
 * The root is a field, not a trigger with a popup (the reason it is a field is
 * above): `TimePickerSegment` places the two inputs, `TimePickerSeparator` the
 * colon, and `TimePickerClear` the optional reset.
 */

import type { EventPayload, InputProps, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
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
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
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
  focusRing,
  textStyle,
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
  readonly setFocused: (focused: boolean) => void;
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
  const [focused, setFocused] = useState(false);
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
        setFocused,
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
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing["2xs"],
          height: controlHeight(theme, "md"),
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
          backgroundColor: theme.colors.input,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          opacity: disabled ? 0.5 : 1,
          ...(focused && !disabled ? focusRing(theme) : {}),
        }}
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
    setFocused,
    registerHours,
  } = useTimePicker();
  const text = segment === "hours" ? hoursText : minutesText;
  const state: TimePickerSegmentState = { disabled, focused };

  const props: InputProps = {
    testId: `${testId}-${segment}`,
    "aria-label": `${groupLabel} ${segment}`,
    value: text,
    placeholder: segment === "hours" ? "HH" : "MM",
    readOnly: disabled,
    tabIndex: disabled ? -1 : 0,
    onChange: (event) => edit(segment, event.value ?? ""),
    onKeyDown: (event) => handleKeyDown(segment, event),
    onFocus: () => {
      setFocusedSegment(true);
      setFocused(true);
    },
    onBlur: () => {
      normalize();
      setFocusedSegment(false);
      setFocused(false);
    },
    style: {
      ...textStyle(theme, "body"),
      color: theme.colors.inputForeground,
      width: SEGMENT_WIDTH,
      height: "100%",
      padding: 0,
      textAlign: "center",
      backgroundColor: undefined,
      ...resolveStyle(style, state),
    },
  };

  return (
    <input
      {...props}
      {...(segment === "hours" ? { ref: registerHours } : {})}
    />
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
    <text
      role="presentation"
      style={{
        ...textStyle(theme, "body"),
        color: theme.colors.mutedForeground,
        userSelect: "none",
      }}
    >
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
      onKeyDown={(event: EventPayload) => {
        if (event.key === "enter" || event.key === "space") clear();
      }}
      style={{
        ...textStyle(theme, "caption"),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: theme.radius.sm,
        color: theme.colors.mutedForeground,
        cursor: "pointer",
        hover: {
          backgroundColor: theme.colors.accent,
          color: theme.colors.accentForeground,
        },
      }}
    >
      <text>✕</text>
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
    "two labelled text segments instead of a spinbutton: 0.10.0 has no aria-valuenow",
    "minuteStep affects the arrow keys only; typed minutes accept 00..59",
    "disabled is readOnly plus dimming: 0.10.0 has no aria-disabled",
    "no seconds and no timezone: the value is a time of day, not an instant",
  ],
  docs: "docs/time-picker.mdx",
  example: "examples/time-picker.example.tsx",
  testFile: "src/behaviour/time-picker.test.tsx",
} as const;
