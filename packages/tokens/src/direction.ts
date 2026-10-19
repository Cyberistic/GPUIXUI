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

/**
 * Every interaction ladder the library documents, in documentation order: the
 * four filled families, derived from `filledControlFamilies`, then the panel
 * action, the generic wash, the selected step and the two row presses.
 * `StateLadderName` derives from this list, so a new ladder joins the type,
 * `stateLadders` and every diagnostics table from one edit.
 *
 * @example
 * ```ts
 * import { stateLadderNames, stateLadders } from "@gpuixui/tokens";
 *
 * const covered = stateLadderNames.every((name) =>
 *   stateLadders.some((ladder) => ladder.name === name),
 * );
 * ```
 */
export const stateLadderNames = [
  ...filledControlFamilies,
  "softAction",
  "wash",
  "selection",
  "selectionPress",
  "rowPress",
] as const;

/** A ladder from {@link stateLadderNames}. */
export type StateLadderName = (typeof stateLadderNames)[number];

/** One interaction ladder: a resting fill followed by its pointer states. */
export interface StateLadder {
  /** The ladder's name: one member of `stateLadderNames`. */
  readonly name: StateLadderName;
  /** The fills from rest upward — at least a rest and one state. */
  readonly roles: ReadonlyArray<keyof ThemeColors>;
  /**
   * Which way the ladder moves. `away` (the default) steps away from the canvas
   * — darker in light, lighter in dark — and is what an action or a wash does.
   * `toward` steps back toward the canvas: the selected row's press previews
   * the row it returns to when a click deselects it.
   */
  readonly direction?: "away" | "toward";
}

/**
 * Every interaction ladder the library documents, in documentation order: the
 * four filled families (derived from {@link filledControlFamilies}), the action
 * a soft status panel carries, the generic wash a ghost or outline control
 * paints, the selected step past the accent a row hovers with, the selectable
 * row's press past that same accent hover — the direction of
 * `rowPressStepPairs` — and the selected row's press, the one ladder that moves
 * toward the canvas. `stateLadderNames` is that list's ordered index.
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
  // The one ladder that runs the other way: pressing a chosen row previews the
  // canvas the click returns it to.
  {
    name: "selectionPress",
    roles: ["selected", "selectedActive"],
    direction: "toward",
  },
  // A selectable row hovers `accent` and presses `active`; the distance is
  // published by `rowPressStepPairs`, and this ladder is its direction. It
  // follows the accent hover, not the generic `hover` wash, so it is its own
  // ladder.
  { name: "rowPress", roles: ["accent", "active"] },
];

/** A ladder step that moves toward the canvas instead of away from it. */
export interface DirectionFailure {
  /** The ladder the step belongs to, one member of `stateLadderNames`. */
  readonly ladder: StateLadderName;
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
 * Every ladder step that moves the wrong way, the selectable row's press
 * included — not only the filled families and the wash. The ladders are
 * `stateLadders`, indexed by `stateLadderNames`; each step is compared with the
 * one before it.
 *
 * An `away` ladder (the default) steps darker in a light theme and lighter in a
 * dark one, the same direction `filled-states.test.ts` asserts on the shipped
 * values; a `toward` ladder — the selected row's press, which previews
 * deselection — runs the other way. An equal pair is not
 * reported here — `stateStepPairs`, `washStepPairs`, `selectionStepPairs`,
 * `rowPressStepPairs`, `selectionPressStepPairs` and `softActionStepPairs`
 * report a collapsed step — and a
 * value the maths cannot parse is reported because no direction can be
 * established.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeDirectionFailures } from "@gpuixui/tokens";
 *
 * const inverted = extendTheme(getTheme("light"), {
 *   colors: {
 *     primary: "#3A2A9A",
 *     primaryHover: "#4A38AE",
 *     primaryActive: "#5A46C2",
 *   },
 * });
 *
 * themeDirectionFailures(inverted); // two `darker` failures, one per step
 * ```
 */
export function themeDirectionFailures(
  theme: Theme,
): ReadonlyArray<DirectionFailure> {
  return stateLadders.flatMap(({ name, roles, direction }) => {
    // `away` is the design system's default: a light theme darkens and a dark
    // theme lightens. A `toward` ladder is the selected row's press and runs the
    // other way.
    const away = direction !== "toward";
    const expected = (theme.mode === "light") === away ? "darker" : "lighter";
    return roles.flatMap((to, index) => {
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
    });
  });
}
