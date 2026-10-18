/**
 * The shared replay helper.
 *
 * Bugs these guard: a fold that ignores the command it is given; a query
 * answered from the initial state instead of the final one; a replay that
 * mutates `runtime.initial`; and a helper that requires the components
 * package's private `run` member instead of a structural runtime.
 */

import { describe, expect, it } from "vitest";
import { runCommands } from "./state.js";

interface TabsState {
  readonly selected: string;
}

type TabsCommand = { readonly _tag: "select"; readonly value: string };

interface TabsQueries {
  readonly active: (value: string) => boolean;
}

const makeTabs = (
  onQuery?: () => void,
): {
  readonly initial: TabsState;
  readonly reduce: (state: TabsState, command: TabsCommand) => TabsState;
  readonly query: (state: TabsState) => TabsQueries;
} => ({
  initial: { selected: "first" },
  reduce: (_state, command) => ({ selected: command.value }),
  query: (state) => {
    onQuery?.();
    return { active: (value) => value === state.selected };
  },
});

describe("runCommands", () => {
  it("folds the commands and answers the final state", () => {
    const replay = runCommands(makeTabs(), [
      { _tag: "select", value: "second" },
      { _tag: "select", value: "third" },
    ]);

    expect(replay.state).toEqual({ selected: "third" });
    expect(replay.queries.active("third")).toBe(true);
  });

  it("queries the final state exactly once", () => {
    let calls = 0;
    const replay = runCommands(
      makeTabs(() => calls++),
      [{ _tag: "select", value: "second" }],
    );

    expect(calls).toBe(1);
    expect(replay.queries.active("first")).toBe(false);
    expect(replay.queries.active("second")).toBe(true);
  });

  it("returns the initial state and its queries for no commands", () => {
    const replay = runCommands(makeTabs(), []);

    expect(replay.state).toEqual({ selected: "first" });
    expect(replay.queries.active("first")).toBe(true);
  });

  it("leaves the runtime's initial state untouched", () => {
    const tabs = makeTabs();
    runCommands(tabs, [{ _tag: "select", value: "second" }]);

    expect(tabs.initial).toEqual({ selected: "first" });
  });

  it("accepts a runtime that also carries a private run member", () => {
    const tabs = makeTabs();
    const withRun = {
      ...tabs,
      run: (commands: Iterable<TabsCommand>) => runCommands(tabs, commands),
    };

    const replay = runCommands(withRun, [{ _tag: "select", value: "second" }]);

    expect(replay.state).toEqual({ selected: "second" });
    expect(replay.queries.active("second")).toBe(true);
  });
});
