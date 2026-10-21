/**
 * Guards the renderer-free replay helper (plan 201).
 *
 * The bugs these can catch: a fold that answers the query before the last
 * command (a check passing on a halfway state), a replay that mutates
 * `initial` so a second run starts dirty, and a folded command whose effect the
 * query never sees. Deleting the `Arr.reduce` above fails the fold and query
 * checks; the initial-state check fails if the fold writes into it.
 */
import { Match } from "effect";
import { describe, expect, it } from "vitest";
import { runCommands, type ReplayRuntime } from "./state.js";

interface TabsState {
  readonly selected: string;
  readonly highlighted: string;
}

type TabsCommand =
  | { readonly _tag: "select"; readonly value: string }
  | { readonly _tag: "highlight"; readonly value: string };

interface TabState {
  readonly active: boolean;
  readonly highlighted: boolean;
}

const tabs: ReplayRuntime<TabsState, TabsCommand, (value: string) => TabState> =
  {
    initial: { selected: "first", highlighted: "first" },
    reduce: (state, command) =>
      Match.value(command).pipe(
        Match.when({ _tag: "select" }, (selected) => ({
          selected: selected.value,
          highlighted: selected.value,
        })),
        Match.when({ _tag: "highlight" }, (highlighted) => ({
          ...state,
          highlighted: highlighted.value,
        })),
        Match.exhaustive,
      ),
    query: (state) => (value) => ({
      active: state.selected === value,
      highlighted: state.highlighted === value,
    }),
  };

describe("runCommands", () => {
  it("folds every command and queries the final state", () => {
    const replay = runCommands(tabs, [
      { _tag: "select", value: "second" },
      { _tag: "highlight", value: "third" },
    ]);

    expect(replay.state).toEqual({ selected: "second", highlighted: "third" });
    expect(replay.result("second")).toEqual({
      active: true,
      highlighted: false,
    });
    expect(replay.result("third")).toEqual({
      active: false,
      highlighted: true,
    });
  });

  it("answers the query on the state before the first command", () => {
    const replay = runCommands(tabs, []);

    expect(replay.state).toEqual(tabs.initial);
    expect(replay.result("first")).toEqual({
      active: true,
      highlighted: true,
    });
  });

  it("leaves the runtime's initial state untouched", () => {
    runCommands(tabs, [{ _tag: "select", value: "second" }]);

    expect(tabs.initial).toEqual({ selected: "first", highlighted: "first" });
  });
});
