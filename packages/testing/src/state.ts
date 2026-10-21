/**
 * Renderer-free command replay for a component runtime (plan 201).
 *
 * A component runtime is a pure reducer plus part-shaped queries, so its
 * transitions can be replayed in a test suite that never mounts a renderer. The
 * helper is structural — it needs `initial`, `reduce` and `query`, not a
 * `Runtime` class — so a suite outside the owning package can drive the same
 * fold without depending on its implementation.
 */
import * as Arr from "effect/Array";

/** A command is a tagged value; each component declares its own union. */
export interface Command {
  readonly _tag: string;
}

/** The three members a runtime must expose to be replayed. */
export interface ReplayRuntime<State, In extends Command, Queries> {
  /** The state before any command runs. */
  readonly initial: State;
  /** Apply one command. Pure. */
  readonly reduce: (state: State, command: In) => State;
  /** Answer the part-shaped style-state for a state. */
  readonly query: (state: State) => Queries;
}

/** The final state and the query output computed from it. */
export interface Replay<State, Queries> {
  readonly state: State;
  readonly result: Queries;
}

/**
 * Folds `commands` from `initial` and queries the result.
 *
 * The query runs once, on the final state, so a check cannot pass on a query
 * answered halfway through the fold.
 */
export const runCommands = <State, In extends Command, Queries>(
  runtime: ReplayRuntime<State, In, Queries>,
  commands: Iterable<In>,
): Replay<State, Queries> => {
  const state = Arr.reduce(commands, runtime.initial, runtime.reduce);
  return { state, result: runtime.query(state) };
};
