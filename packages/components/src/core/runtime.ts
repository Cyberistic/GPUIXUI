import * as Arr from "effect/Array";

export interface Command {
  readonly _tag: string;
}

export interface Runtime<State, C extends Command, Queries> {
  readonly initial: State;

  readonly reduce: (state: State, command: C) => State;

  readonly query: (state: State) => Queries;

  readonly run: (commands: Iterable<C>) => State;
}

export const createRuntime = <State, C extends Command, Queries>(config: {
  readonly initial: State;
  readonly reduce: (state: State, command: C) => State;
  readonly query: (state: State) => Queries;
}): Runtime<State, C, Queries> => ({
  ...config,
  run: (commands) => Arr.reduce(commands, config.initial, config.reduce),
});
