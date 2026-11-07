import * as Arr from "effect/Array";

export interface Command {
  readonly _tag: string;
}

export interface ReplayRuntime<State, In extends Command, Queries> {
  readonly initial: State;

  readonly reduce: (state: State, command: In) => State;

  readonly query: (state: State) => Queries;
}

export interface Replay<State, Queries> {
  readonly state: State;
  readonly result: Queries;
}

export const runCommands = <State, In extends Command, Queries>(
  runtime: ReplayRuntime<State, In, Queries>,
  commands: Iterable<In>,
): Replay<State, Queries> => {
  const state = Arr.reduce(commands, runtime.initial, runtime.reduce);
  return { state, result: runtime.query(state) };
};
