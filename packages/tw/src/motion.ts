import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import type { MotionProps, MotionStyle, MotionTransition } from "@gpuix/react";
import type { Theme } from "@gpuixui/tokens";
import { classesToStyle } from "./classes.js";

export interface TwMotion extends MotionProps {
  readonly unsupported: ReadonlyArray<string>;
}

const is = (token: string, value: string): boolean =>
  token === value || Str.endsWith(value)(token);

const has = (tokens: ReadonlyArray<string>, value: string): boolean =>
  Arr.some(tokens, (token) => is(token, value));

const durationOf = (tokens: ReadonlyArray<string>): number =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(tokens, (token) => token.includes("duration-")),
      (token) => {
        const value = Number(token.slice(token.lastIndexOf("duration-") + 9));
        return Number.isFinite(value) ? value / 1000 : 0.1;
      },
    ),
    () => 0.1,
  );

const slideOf = (
  tokens: ReadonlyArray<string>,
): { readonly top?: number; readonly left?: number } =>
  Option.match(
    Arr.findFirst(tokens, (token) => token.includes("slide-in-from-")),
    {
      onNone: () => ({}),
      onSome: (token) => {
        const amount = Number(token.slice(token.lastIndexOf("-") + 1)) * 4;
        const offset = Number.isFinite(amount) ? amount : 8;
        return Match.value(token).pipe(
          Match.when(
            (value) => value.includes("slide-in-from-top"),
            () => ({ top: -offset }),
          ),
          Match.when(
            (value) => value.includes("slide-in-from-bottom"),
            () => ({ top: offset }),
          ),
          Match.when(
            (value) => value.includes("slide-in-from-left"),
            () => ({ left: -offset }),
          ),
          Match.when(
            (value) => value.includes("slide-in-from-right"),
            () => ({ left: offset }),
          ),
          Match.orElse(() => ({})),
        );
      },
    },
  );

const easeOf = (
  tokens: ReadonlyArray<string>,
): NonNullable<MotionTransition["ease"]> =>
  Option.match(
    Arr.findFirst(tokens, (token) => token.includes("ease-")),
    {
      onNone: () => "easeOut",
      onSome: (token) => {
        if (Str.startsWith("ease-[cubic-bezier(")(token)) {
          const body = token.slice("ease-[cubic-bezier(".length, -2);
          const values = Str.split(body, ",").map((value) => Number(value));
          const [a, b, c, d] = values;
          if (
            values.length === 4 &&
            a !== undefined &&
            b !== undefined &&
            c !== undefined &&
            d !== undefined &&
            values.every((value) => Number.isFinite(value))
          ) {
            return [a, b, c, d];
          }
        }
        if (token.includes("ease-in-out")) return "easeInOut";
        if (token.includes("ease-in")) return "easeIn";
        if (token.includes("ease-out")) return "easeOut";
        if (token.includes("ease-linear")) return "linear";
        return "easeOut";
      },
    },
  );

export const motionFromClasses = (
  className: string | undefined,
  theme: Theme,
): TwMotion => {
  const parsed = classesToStyle(className, theme);
  const tokens = parsed.motion;
  const slide = slideOf(tokens);
  const duration = durationOf(tokens);
  const fadeIn = has(tokens, "fade-in-0");
  const fadeOut = has(tokens, "fade-out-0");
  const animateIn = has(tokens, "animate-in");
  const animateOut = has(tokens, "animate-out");
  const initial: MotionStyle = {
    ...(fadeIn ? { opacity: 0 } : {}),
    ...slide,
  };
  const animate: MotionStyle = {
    ...(fadeIn ? { opacity: 1 } : {}),
    ...(slide.top === undefined ? {} : { top: 0 }),
    ...(slide.left === undefined ? {} : { left: 0 }),
  };
  const exit: MotionStyle | undefined =
    fadeOut || animateOut
      ? {
          ...(fadeOut ? { opacity: 0 } : {}),
          ...slide,
        }
      : undefined;
  return {
    ...(animateIn ? { initial } : {}),
    animate: animateIn ? animate : {},
    ...(exit === undefined ? {} : { exit }),
    transition: { duration, ease: easeOf(tokens) },
    unsupported: Arr.filter(tokens, (token) => token.includes("zoom-")),
  };
};

export const dialogMotion = (theme: Theme): TwMotion =>
  motionFromClasses(
    "data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 duration-100",
    theme,
  );

export const overlayMotion = (theme: Theme): TwMotion =>
  motionFromClasses(
    "data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 duration-100",
    theme,
  );

export const toastMotion = (theme: Theme): TwMotion =>
  motionFromClasses(
    "data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
    theme,
  );
