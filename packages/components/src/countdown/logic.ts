export interface CountdownParts {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export const readableRemaining = (remainingMs: number): number =>
  Number.isFinite(remainingMs) ? Math.max(0, remainingMs) : 0;

const wholeSeconds = (remainingMs: number): number =>
  Math.floor(readableRemaining(remainingMs) / 1000);

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
