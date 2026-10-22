/**
 * The clock rules the Time picker preview runs on.
 *
 * The shipped field (`packages/components/src/time-picker.tsx` and its pure
 * `time-picker/time.ts`) keeps one clock function behind every edit: typing and
 * the arrow keys both go through `addMinutes`, so hours and minutes cannot
 * disagree at an hour edge or across midnight. This module is the same model,
 * small enough to read and with no runtime dependency, so the browser preview
 * and the native field cannot teach two different clocks.
 *
 * A value is `HH:mm` in 24-hour form, or `null` for "no time": never a `Date`,
 * never a locale string, never a timestamp. **`parseTime` is the only entry for
 * untrusted input**; every other function takes a time it has already read. The
 * text of a segment is deliberately separate from the value — the native field
 * keeps raw digits (`9`) while it reports the canonical `09:00`, and pads both
 * segments on blur — so an edit returns the text and the value together.
 *
 * `null` is the browser boundary's "no value" (an unset field, a blank tile),
 * not the native API's `Option`. The docs site is a web app with no Effect
 * runtime of its own, so a preview module stays plain TypeScript rather than
 * pulling the runtime in for a drawing.
 */

/** Hours `0..23` and minutes `0..59`, independent of any date or zone. */
export interface TimeOfDay {
  readonly hours: number;
  readonly minutes: number;
}

/** Which half of the time a segment edits. */
export type Segment = "hours" | "minutes";

/** The raw text of both segments, before or after padding. */
export interface TimeText {
  readonly hours: string;
  readonly minutes: string;
}

/** What the field holds: its text and the canonical value it reports. */
export interface TimeState extends TimeText {
  readonly value: string | null;
}

const ISO_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SEGMENT = /^\d{1,2}$/;

/** One day of minutes: the modulus every arrow and typed edit wraps through. */
const MINUTES_PER_DAY = 1440;

const pad = (value: number): string => String(value).padStart(2, "0");

/** Parse a canonical `HH:mm`; `"9:30"`, `"24:00"` and `"12:60"` are `null`. */
export const parseTime = (value: string): TimeOfDay | null => {
  const match = ISO_TIME.exec(value);
  if (match === null) return null;
  const hours = match[1];
  const minutes = match[2];
  if (hours === undefined || minutes === undefined) return null;
  return { hours: Number(hours), minutes: Number(minutes) };
};

/** Canonical `HH:mm`: `09:30`, `00:00`, `23:59`. */
export const formatTime = (time: TimeOfDay): string =>
  `${pad(time.hours)}:${pad(time.minutes)}`;

/**
 * Add whole minutes, carrying at the hour and wrapping across midnight in both
 * directions. This is the one clock the field edits through.
 */
export const addMinutes = (time: TimeOfDay, amount: number): TimeOfDay => {
  const total =
    (((time.hours * 60 + time.minutes + amount) % MINUTES_PER_DAY) +
      MINUTES_PER_DAY) %
    MINUTES_PER_DAY;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
};

/** `undefined`, non-finite or `< 1` → 1; `> 59` → 59; fractional → floor. */
export const normalizeStep = (step: number | undefined): number =>
  step === undefined || !Number.isFinite(step)
    ? 1
    : Math.min(59, Math.max(1, Math.floor(step)));

/** The last two digits typed into a segment (the host has no `maxLength`). */
export const digitsOf = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-2);
};

/** Digits clamped into `0..max`: `99` hours is `23`, `99` minutes is `59`. */
export const clampSegment = (text: string, max: number): number =>
  Math.min(Number(text), max);

/** The text a segment shows for a value; an unset value shows no digits. */
export const segmentText = (value: string | null, segment: Segment): string => {
  const time = value === null ? null : parseTime(value);
  if (time === null) return "";
  return pad(segment === "hours" ? time.hours : time.minutes);
};

/** Both segments of a value, for a field that adopts one from its caller. */
export const timeText = (value: string | null): TimeText => ({
  hours: segmentText(value, "hours"),
  minutes: segmentText(value, "minutes"),
});

/** The empty field: no text and `null`, the state Clear returns to. */
export const emptyTime = (): TimeState => ({
  hours: "",
  minutes: "",
  value: null,
});

/** A non-blank segment must parse; a blank one reads as zero. */
const segmentOf = (text: string, max: number): number | null => {
  if (text === "") return 0;
  return SEGMENT.test(text) && Number(text) <= max ? Number(text) : null;
};

/**
 * The canonical value of a segment pair; both blank is `null`. One typed
 * segment therefore completes a value with the other read as zero — typing `9`
 * in hours reports `09:00` while the minutes segment still shows nothing.
 */
export const composeValue = (
  hours: string,
  minutes: string,
): string | null => {
  if (hours === "" && minutes === "") return null;
  const hour = segmentOf(hours, 23);
  const minute = segmentOf(minutes, 59);
  return hour === null || minute === null
    ? null
    : formatTime({ hours: hour, minutes: minute });
};

/**
 * One accepted edit: keep the last two digits, clamp immediately above the
 * segment's maximum, and erase the whole time when the segment is emptied. The
 * value and the text never disagree.
 */
export const editSegment = (
  state: TimeState,
  segment: Segment,
  raw: string,
): TimeState => {
  const digits = digitsOf(raw);
  if (digits === "") return emptyTime();
  const max = segment === "hours" ? 23 : 59;
  const text =
    Number(digits) > max ? pad(clampSegment(digits, max)) : digits;
  const next: TimeText =
    segment === "hours"
      ? { hours: text, minutes: state.minutes }
      : { hours: state.hours, minutes: text };
  return { ...next, value: composeValue(next.hours, next.minutes) };
};

/** Blur pads both segments to two digits, and a blank one becomes `00`. */
export const padOnBlur = (state: TimeState): TimeState => {
  const time = state.value === null ? null : parseTime(state.value);
  return time === null
    ? emptyTime()
    : {
        hours: pad(time.hours),
        minutes: pad(time.minutes),
        value: formatTime(time),
      };
};

/**
 * An arrow press: hours move a whole hour whatever `minuteStep` says, minutes
 * move by the normalised step, and an empty field starts from midnight.
 */
export const stepSegment = (
  state: TimeState,
  segment: Segment,
  direction: -1 | 1,
  minuteStep?: number,
): TimeState => {
  const base =
    (state.value === null ? null : parseTime(state.value)) ?? {
      hours: 0,
      minutes: 0,
    };
  const delta =
    segment === "hours" ? 60 * direction : normalizeStep(minuteStep) * direction;
  const next = addMinutes(base, delta);
  return {
    hours: pad(next.hours),
    minutes: pad(next.minutes),
    value: formatTime(next),
  };
};

/** Clear reports `null` and leaves both segments empty. */
export const clearTime = (): TimeState => emptyTime();

/** Whether the field holds a time; the clear control depends on it. */
export const hasTime = (state: TimeState): boolean => state.value !== null;

/** The readout under a preview: the value the control would report. */
export const describeValue = (value: string | null): string =>
  value === null
    ? "No time selected — the field reports null."
    : `Value: ${value}`;
