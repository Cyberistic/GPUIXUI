export interface TimeOfDay {
  readonly hours: number;
  readonly minutes: number;
}

export type Segment = "hours" | "minutes";

export interface TimeText {
  readonly hours: string;
  readonly minutes: string;
}

export interface TimeState extends TimeText {
  readonly value: string | null;
}

const ISO_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SEGMENT = /^\d{1,2}$/;

const MINUTES_PER_DAY = 1440;

const pad = (value: number): string => String(value).padStart(2, "0");

export const parseTime = (value: string): TimeOfDay | null => {
  const match = ISO_TIME.exec(value);
  if (match === null) return null;
  const hours = match[1];
  const minutes = match[2];
  if (hours === undefined || minutes === undefined) return null;
  return { hours: Number(hours), minutes: Number(minutes) };
};

export const formatTime = (time: TimeOfDay): string =>
  `${pad(time.hours)}:${pad(time.minutes)}`;

export const addMinutes = (time: TimeOfDay, amount: number): TimeOfDay => {
  const total =
    (((time.hours * 60 + time.minutes + amount) % MINUTES_PER_DAY) +
      MINUTES_PER_DAY) %
    MINUTES_PER_DAY;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
};

export const normalizeStep = (step: number | undefined): number =>
  step === undefined || !Number.isFinite(step)
    ? 1
    : Math.min(59, Math.max(1, Math.floor(step)));

export const digitsOf = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-2);
};

export const clampSegment = (text: string, max: number): number =>
  Math.min(Number(text), max);

export const segmentText = (value: string | null, segment: Segment): string => {
  const time = value === null ? null : parseTime(value);
  if (time === null) return "";
  return pad(segment === "hours" ? time.hours : time.minutes);
};

export const timeText = (value: string | null): TimeText => ({
  hours: segmentText(value, "hours"),
  minutes: segmentText(value, "minutes"),
});

export const emptyTime = (): TimeState => ({
  hours: "",
  minutes: "",
  value: null,
});

const segmentOf = (text: string, max: number): number | null => {
  if (text === "") return 0;
  return SEGMENT.test(text) && Number(text) <= max ? Number(text) : null;
};

export const composeValue = (hours: string, minutes: string): string | null => {
  if (hours === "" && minutes === "") return null;
  const hour = segmentOf(hours, 23);
  const minute = segmentOf(minutes, 59);
  return hour === null || minute === null
    ? null
    : formatTime({ hours: hour, minutes: minute });
};

export const editSegment = (
  state: TimeState,
  segment: Segment,
  raw: string,
): TimeState => {
  const digits = digitsOf(raw);
  if (digits === "") return emptyTime();
  const max = segment === "hours" ? 23 : 59;
  const text = Number(digits) > max ? pad(clampSegment(digits, max)) : digits;
  const next: TimeText =
    segment === "hours"
      ? { hours: text, minutes: state.minutes }
      : { hours: state.hours, minutes: text };
  return { ...next, value: composeValue(next.hours, next.minutes) };
};

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

export const stepSegment = (
  state: TimeState,
  segment: Segment,
  direction: -1 | 1,
  minuteStep?: number,
): TimeState => {
  const base = (state.value === null ? null : parseTime(state.value)) ?? {
    hours: 0,
    minutes: 0,
  };
  const delta =
    segment === "hours"
      ? 60 * direction
      : normalizeStep(minuteStep) * direction;
  const next = addMinutes(base, delta);
  return {
    hours: pad(next.hours),
    minutes: pad(next.minutes),
    value: formatTime(next),
  };
};

export const clearTime = (): TimeState => emptyTime();

export const hasTime = (state: TimeState): boolean => state.value !== null;

export const describeValue = (value: string | null): string =>
  value === null
    ? "No time selected — the field reports null."
    : `Value: ${value}`;
