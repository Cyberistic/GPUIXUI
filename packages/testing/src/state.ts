/**
 * Replaying a component runtime without a renderer (plan 201 §6/§7).
 *
 * A runtime is a pure reducer plus part-shaped queries. This structural port
 * lets any suite — inside or outside `@gpuixui/components` — fold commands and
 * read the state the parts would render, with no React and no GPUix.
 */

import * as Arr from "effect/Array";

/** The two pieces a replay needs; every component runtime fits structurally. */
export interface Runnable<State, Command> {
  readonly initial: State;
  readonly reduce: (state: State, command: Command) => State;
}

/** A runtime that also answers part-shaped questions about a state. */
export interface Queried<State, Command, Queries> extends Runnable<
  State,
  Command
> {
  readonly query: (state: State) => Queries;
}

/** The final state and the queries a part would read from it. */
export interface Replay<State, Queries> {
  readonly state: State;
  readonly queries: Queries;
}

/**
 * Folds `commands` from `runtime.initial`, then answers `runtime.query` once on
 * the final state. `runtime.initial` is never mutated.
 *
 * @example
 * const { state, queries } = runCommands(tabs, [{ _tag: "select", value: "b" }]);
 * expect(queries("b").active).toBe(true);
 */
export const runCommands = <State, Command, Queries>(
  runtime: Queried<State, Command, Queries>,
  commands: Iterable<Command>,
): Replay<State, Queries> => {
  const state = Arr.reduce(commands, runtime.initial, runtime.reduce);
  return { state, queries: runtime.query(state) };
};
