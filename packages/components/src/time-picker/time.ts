/**
 * The clock arithmetic behind TimePicker: a time of day, no date, no zone.
 *
 * The public value is `HH:mm` in 24-hour form, so this module never constructs
 * a `DateTime` and never reads a clock. That keeps a stored time independent of
 * the day it is used on, and keeps the whole module testable with fixed inputs.
 *
 * `parseIsoTime` is deliberately strict (two digits each, `00:00`–`23:59`):
 * `"9:30"` is a different format, not a value this component renders.
 */

import { pipe } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** Hours `0..23` and minutes `0..59`, independent of any date or zone. */
export interface TimeOfDay {
  readonly hours: number;
  readonly minutes: number;
}

const ISO_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SEGMENT = /^\d{1,2}$/;
const DIGITS = /^\d+$/;

/** Parse a canonical `HH:mm` (24-hour, two digits each). */
export const parseIsoTime = (value: string): Option.Option<TimeOfDay> => {
  const match = ISO_TIME.exec(value);
  if (match === null) return Option.none();
  const hours = match[1];
  const minutes = match[2];
  if (hours === undefined || minutes === undefined) return Option.none();
  return Option.some({ hours: Number(hours), minutes: Number(minutes) });
};

/** Canonical `HH:mm`. */
export const formatIsoTime = (time: TimeOfDay): string =>
  `${padSegment(time.hours)}:${padSegment(time.minutes)}`;

/** Add whole minutes, carrying at the hour and wrapping across midnight. */
export const addMinutes = (time: TimeOfDay, amount: number): TimeOfDay => {
  const total =
    (((time.hours * 60 + time.minutes + amount) % 1440) + 1440) % 1440;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
};

/** A strict segment: `"9"` and `"09"` are 9; empty, longer, non-digit or over `max` is `None`. */
export const parseSegment = (
  text: string,
  max: number,
): Option.Option<number> =>
  SEGMENT.test(text) && Number(text) <= max
    ? Option.some(Number(text))
    : Option.none();

/** Digits clamped into `0..max`; empty or non-digit text is `None`. */
export const clampSegment = (
  text: string,
  max: number,
): Option.Option<number> =>
  DIGITS.test(text) ? Option.some(Math.min(Number(text), max)) : Option.none();

/** Two digits: `0 -> "00"`, `9 -> "09"`, `23 -> "23"`. */
export const padSegment = (value: number): string =>
  pipe(String(value), Str.padStart(2, "0"));

/** `undefined`, non-finite or `< 1` -> 1; `> 59` -> 59; fractional -> floor. */
export const normalizeStep = (step: number | undefined): number =>
  step === undefined || !Number.isFinite(step)
    ? 1
    : Math.min(59, Math.max(1, Math.floor(step)));

/** The last two digits typed into a segment (the host has no `maxLength`). */
export const digitsOf = (raw: string): string =>
  pipe(raw, Str.replace(/\D/g, ""), Str.takeRight(2));

/** A blank segment reads as zero; a non-blank one must parse. */
const segment = (text: string, max: number): Option.Option<number> =>
  text === "" ? Option.some(0) : parseSegment(text, max);

/** The canonical value of a segment pair; both blank is `None`. */
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
