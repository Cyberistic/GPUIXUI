/**
 * The palette's pure half: filtering and the active row.
 *
 * Kept out of the view so the two rules that a weaker implementation gets wrong
 * — a case/whitespace-insensitive filter, and wrapping at both ends — are
 * provable on a host with no GPUix binding.
 */
import * as Arr from "effect/Array";
import * as Str from "effect/String";

/** One entry a palette can commit. */
export interface Command {
  readonly id: string;
  readonly label: string;
}

const normalized = (text: string): string => Str.toLowerCase(Str.trim(text));

/**
 * The commands whose label contains `query`, case-insensitively.
 *
 * A blank query matches everything: a newly opened palette lists its full
 * command set before the user types a character.
 */
export const filterCommands = (
  commands: ReadonlyArray<Command>,
  query: string,
): ReadonlyArray<Command> => {
  const needle = normalized(query);
  return Str.isEmpty(needle)
    ? commands
    : Arr.filter(commands, (command) =>
        Str.includes(needle)(normalized(command.label)),
      );
};

/**
 * The next active index after moving by `delta`, wrapping in both directions.
 *
 * An empty list has no row to be active, so it always answers `0`; otherwise the
 * result is the mathematical remainder, which keeps a backwards move from
 * producing a negative index.
 */
export const moveActive = (
  index: number,
  delta: number,
  length: number,
): number => (length <= 0 ? 0 : (((index + delta) % length) + length) % length);
