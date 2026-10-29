/**
 * Which colour role a status item's tone paints.
 *
 * `default` keeps the bar's own foreground; a named tone paints its soft-surface
 * foreground role — the one tokens measure as page text — so an item never mixes
 * a readable colour by hand.
 */

import * as Option from "effect/Option";
import { statusTone, type StatusTone, type Theme } from "@gpuixui/tokens";

/** A status bar item's tone: `default`, or one of the four status tones. */
export type StatusBarTone = "default" | StatusTone;

/** Where the centre region's items sit, given what the pinned groups hold. */
export type StatusCenterAlignment = "flex-start" | "center" | "flex-end";

/**
 * The centre region's alignment.
 *
 * gpui-kit's rule: with both pinned groups present the centre is centred; with
 * only the leading group it ends against it; otherwise it starts. An empty
 * group is not a present one — a bar whose `left` is `[]` has nothing to centre
 * between, and its centre labels read from the start.
 */
export const centerAlignment = (
  left: number,
  right: number,
): StatusCenterAlignment =>
  left > 0 && right > 0 ? "center" : left > 0 ? "flex-end" : "flex-start";

/** The token status tone a bar tone names; `default` names none. */
export const statusToneOf = (tone: StatusBarTone): Option.Option<StatusTone> =>
  tone === "default" ? Option.none() : Option.some(tone);

/** The foreground role an item's tone paints. */
export const toneForeground = (theme: Theme, tone: StatusBarTone): string =>
  Option.match(statusToneOf(tone), {
    onNone: () => theme.colors.foreground,
    onSome: (named) => statusTone(theme, named).foreground,
  });
