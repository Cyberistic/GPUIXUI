import { pipe } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export interface TimeOfDay {
  readonly hours: number;
  readonly minutes: number;
}

const ISO_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SEGMENT = /^\d{1,2}$/;
const DIGITS = /^\d+$/;

export const parseIsoTime = (value: string): Option.Option<TimeOfDay> => {
  const match = ISO_TIME.exec(value);
  if (match === null) return Option.none();
  const hours = match[1];
  const minutes = match[2];
  if (hours === undefined || minutes === undefined) return Option.none();
  return Option.some({ hours: Number(hours), minutes: Number(minutes) });
};

export const formatIsoTime = (time: TimeOfDay): string =>
  `${padSegment(time.hours)}:${padSegment(time.minutes)}`;

export const addMinutes = (time: TimeOfDay, amount: number): TimeOfDay => {
  const total =
    (((time.hours * 60 + time.minutes + amount) % 1440) + 1440) % 1440;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
};

export const parseSegment = (
  text: string,
  max: number,
): Option.Option<number> =>
  SEGMENT.test(text) && Number(text) <= max
    ? Option.some(Number(text))
    : Option.none();

export const clampSegment = (
  text: string,
  max: number,
): Option.Option<number> =>
  DIGITS.test(text) ? Option.some(Math.min(Number(text), max)) : Option.none();

export const padSegment = (value: number): string =>
  pipe(String(value), Str.padStart(2, "0"));

export const normalizeStep = (step: number | undefined): number =>
  step === undefined || !Number.isFinite(step)
    ? 1
    : Math.min(59, Math.max(1, Math.floor(step)));

export const digitsOf = (raw: string): string =>
  pipe(raw, Str.replace(/\D/g, ""), Str.takeRight(2));

const segment = (text: string, max: number): Option.Option<number> =>
  text === "" ? Option.some(0) : parseSegment(text, max);

export const composeIsoTime = (
  hours: string,
  minutes: string,
): Option.Option<string> =>
  hours === "" && minutes === ""
    ? Option.none()
    : pipe(
        Option.all([segment(hours, 23), segment(minutes, 59)]),
        Option.map(([hour, minute]) =>
          formatIsoTime({ hours: hour, minutes: minute }),
        ),
      );
