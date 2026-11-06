import * as Option from "effect/Option";
import { statusTone, type StatusTone, type Theme } from "@gpuixui/tokens";

export type StatusBarTone = "default" | StatusTone;

export type StatusCenterAlignment = "flex-start" | "center" | "flex-end";

export const centerAlignment = (
  left: number,
  right: number,
): StatusCenterAlignment =>
  left > 0 && right > 0 ? "center" : left > 0 ? "flex-end" : "flex-start";

export const statusToneOf = (tone: StatusBarTone): Option.Option<StatusTone> =>
  tone === "default" ? Option.none() : Option.some(tone);

export const toneForeground = (theme: Theme, tone: StatusBarTone): string =>
  Option.match(statusToneOf(tone), {
    onNone: () => theme.colors.foreground,
    onSome: (named) => statusTone(theme, named).foreground,
  });
