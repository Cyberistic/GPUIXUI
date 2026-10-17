/**
 * The shared component-runtime contract (plan 201).
 *
 * A stateful component is a pure reducer plus part-shaped queries. This module
 * imports no React and no GPUix, so every transition is testable without a
 * renderer; the thin context and the thin parts live beside the component.
 *
 * Commands are tagged values. Queries answer part-shaped questions ("is this tab
 * active?") and never expose a raw index, so a part cannot grow a private view of
 * the component's state.
 */

import * as Arr from "effect/Array";

/** A command is a tagged value; each component declares its own union. */
export interface Command {
  readonly _tag: string;
}

/** A pure runtime: commands in, style-state out. */
export interface Runtime<State, C extends Command, Queries> {
  /** The state before any command runs. */
  readonly initial: State;
  /** Apply one command. Pure. */
  readonly reduce: (state: State, command: C) => State;
  /** Build the style-state a part reads for the current state. */
  readonly query: (state: State) => Queries;
  /** Fold commands from `initial` — tests and event replay. */
  readonly run: (commands: Iterable<C>) => State;
}

/** Build a runtime from its initial state, reducer and query. */
export const createRuntime = <State, C extends Command, Queries>(config: {
  readonly initial: State;
  readonly reduce: (state: State, command: C) => State;
  readonly query: (state: State) => Queries;
}): Runtime<State, C, Queries> => ({
  ...config,
  run: (commands) => Arr.reduce(commands, config.initial, config.reduce),
});
