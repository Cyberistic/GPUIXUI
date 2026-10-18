/**
 * The direction half of the theme contract.
 *
 * A pointer state is not only perceivable, it moves a consistent way: the
 * design system steps a fill away from the canvas — darker in light, lighter in
 * dark. Plan 097's shipped defect was an *inverted* step, not a collapsed one,
 * so a step floor alone cannot see it: a light family whose hover and press
 * lighten passes 1.05:1, the on-colour floor and the surface floor while
 * returning toward the canvas. This module publishes the ladders and the rule
 * for an edited theme, beside the step pairs that publish the distance.
 */

import type { ThemeColors } from "./color.js";
import { relativeLuminance } from "./contrast.js";
import { filledControlFamilies } from "./styles.js";
import type { Theme } from "./theme.js";

/** One interaction ladder: a resting fill followed by its pointer states. */
export interface StateLadder {
  /** The family or mechanism the ladder belongs to, for diagnostics. */
  readonly name: string;
  /** The fills from rest upward — at least a rest and one state. */
  readonly roles: ReadonlyArray<keyof ThemeColors>;
}

/**
 * Every interaction ladder the library documents, in documentation order: the
 * four filled families (derived from {@link filledControlFamilies}), the action
 * a soft status panel carries, the generic wash a ghost or outline control
 * paints, and the selected step past the accent a row hovers with.
 */
export const stateLadders: ReadonlyArray<StateLadder> = [
  ...filledControlFamilies.map(
    (family): StateLadder => ({
      name: family,
      roles: [family, `${family}Hover`, `${family}Active`],
    }),
  ),
  {
    name: "softAction",
    roles: ["softAction", "softActionHover", "softActionActive"],
  },
  { name: "wash", roles: ["hover", "active"] },
  { name: "selection", roles: ["accent", "selected"] },
];

/** A ladder step that moves toward the canvas instead of away from it. */
export interface DirectionFailure {
  /** The ladder the step belongs to — a family, `softAction`, `wash` or `selection`. */
  readonly ladder: string;
  /** The fill the step starts from. */
  readonly from: keyof ThemeColors;
  /** The fill it moves to. */
  readonly to: keyof ThemeColors;
  /** The direction the theme's mode requires. */
  readonly expected: "darker" | "lighter";
  /** The starting fill's relative luminance. */
  readonly fromLuminance: number;
  /** The ending fill's relative luminance. */
  readonly toLuminance: number;
}

/**
 * Every ladder step that moves toward the canvas.
 *
 * A light theme steps darker and a dark theme lighter, the same direction
 * `filled-states.test.ts` asserts on the shipped values. An equal pair is not
 * reported here — `stateStepPairs`, `washStepPairs`, `selectionStepPairs` and
 * `softActionStepPairs` report a collapsed step — and a value the maths cannot
 * parse is reported because no direction can be established.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeDirectionFailures } from "@gpuixui/tokens";
 *
 * const inverted = extendTheme(getTheme("light"), {
 *   colors: {
 *     primary: "#1E1060",
 *     primaryHover: "#2A1A7A",
 *     primaryActive: "#372394",
 *   },
 * });
 *
 * themeDirectionFailures(inverted); // two `darker` failures, one per step
 * ```
 */
export function themeDirectionFailures(
  theme: Theme,
): ReadonlyArray<DirectionFailure> {
  const expected = theme.mode === "light" ? "darker" : "lighter";
  return stateLadders.flatMap(({ name, roles }) =>
    roles.flatMap((to, index) => {
      const from = roles[index - 1];
      if (from === undefined) {
        return [];
      }
      const fromLuminance = relativeLuminance(theme.colors[from]);
      const toLuminance = relativeLuminance(theme.colors[to]);
      const moves =
        expected === "darker"
          ? toLuminance < fromLuminance
          : toLuminance > fromLuminance;
      const collapsed = fromLuminance === toLuminance;
      return moves || collapsed
        ? []
        : [{ ladder: name, from, to, expected, fromLuminance, toLuminance }];
    }),
  );
}
