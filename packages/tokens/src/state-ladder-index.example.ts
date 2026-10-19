import type { ThemeColors } from "./color.js";
import {
  stateLadderNames,
  stateLadders,
  themeDirectionFailures,
  type DirectionFailure,
  type StateLadderName,
} from "./index.js";
import type { Theme } from "./theme.js";

/** One ladder's failures, in `stateLadderNames` order. */
export interface StateLadderRow {
  /** The ladder's documented name. */
  readonly name: StateLadderName;
  /** The failures that ladder owns; empty when every step moves away. */
  readonly failures: ReadonlyArray<DirectionFailure>;
}

/**
 * Group a theme's direction failures by ladder. `stateLadderNames` is the
 * ordered owner of the names, so a report iterates the index instead of
 * retyping the four families or the two row presses, and
 * `DirectionFailure.ladder` narrows to the same union.
 */
export const stateLadderRows = (
  theme: Theme,
): ReadonlyArray<StateLadderRow> => {
  const failures = themeDirectionFailures(theme);
  return stateLadderNames.map((name) => ({
    name,
    failures: failures.filter((failure) => failure.ladder === name),
  }));
};

/** The fills one ladder paints, in its documented order. */
export const stateLadderColors = (
  theme: Theme,
  name: StateLadderName,
): ReadonlyArray<{
  readonly role: keyof ThemeColors;
  readonly color: string;
}> => {
  const ladder = stateLadders.find((candidate) => candidate.name === name);
  if (ladder === undefined) {
    return [];
  }
  return ladder.roles.map((role) => ({ role, color: theme.colors[role] }));
};
