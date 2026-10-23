/**
 * Countdown formatting: a remaining duration in, clock text out.
 *
 * The component does not tick. Time is the application's (Effect `Clock`), so
 * these functions are pure and a suite needs no waiting.
 */

/** A remaining duration split into whole units. */
export interface CountdownParts {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

/**
 * The remaining time a clock can paint: a finite duration, floored at zero.
 *
 * A remaining time is usually arithmetic over a deadline the application
 * decoded, so a timestamp that never arrived reaches the clock as `NaN`, and an
 * absent bound as an infinity. Neither is a duration the label can draw, so an
 * unreadable one reads as no time left rather than as the word `NaN`.
 */
export const readableRemaining = (remainingMs: number): number =>
  Number.isFinite(remainingMs) ? Math.max(0, remainingMs) : 0;

/** Whole seconds remaining, floored and never negative. */
const wholeSeconds = (remainingMs: number): number =>
  Math.floor(readableRemaining(remainingMs) / 1000);

/** Split a remaining duration into days, hours, minutes and seconds. */
export const breakdown = (remainingMs: number): CountdownParts => {
  const total = wholeSeconds(remainingMs);
  return {
    days: Math.floor(total / SECONDS_PER_DAY),
    hours: Math.floor((total % SECONDS_PER_DAY) / SECONDS_PER_HOUR),
    minutes: Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
    seconds: total % SECONDS_PER_MINUTE,
  };
};

const pad = (value: number): string =>
  value < 10 ? `0${value}` : String(value);

/**
 * `MM:SS`, `HH:MM:SS`, or `Nd HH:MM:SS` when `showDays` and a day remains.
 * Hours are uncapped without `showDays`: 25 hours render as `25:00:00`.
 */
export const formatCountdown = (
  remainingMs: number,
  options: { readonly showDays?: boolean } = {},
): string => {
  const total = wholeSeconds(remainingMs);
  const { days, minutes, seconds } = breakdown(remainingMs);

  if (options.showDays === true && days > 0) {
    const hours = Math.floor((total % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  if (total >= SECONDS_PER_HOUR) {
    return `${pad(Math.floor(total / SECONDS_PER_HOUR))}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};
