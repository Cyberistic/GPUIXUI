/**
 * The shared runtime contract.
 *
 * The bugs these guard: a reducer that ignores its command, so a select does not
 * move the selection; a query that leaks a raw index instead of the part-shaped
 * state the parts render; and a `run` that mutates `initial` instead of folding
 * from it.
 */

import { Match, Order } from "effect";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { createRuntime } from "./runtime.js";

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

const tabs = createRuntime<TabsState, TabsCommand, (value: string) => TabState>(
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
  },
);

describe("createRuntime", () => {
  it("folds commands from the initial state", () => {
    expect(tabs.run([{ _tag: "select", value: "second" }])).toEqual({
      selected: "second",
      highlighted: "second",
    });
  });

  it("answers part-shaped style-state, not a raw index", () => {
    const state = tabs.run([
      { _tag: "select", value: "second" },
      { _tag: "highlight", value: "third" },
    ]);
    const part = tabs.query(state)("second");

    expect(Arr.sort(Object.keys(part), Order.String)).toEqual([
      "active",
      "highlighted",
    ]);
    expect(part).toEqual({ active: true, highlighted: false });
  });

  it("leaves the initial state untouched", () => {
    tabs.run([
      { _tag: "select", value: "second" },
      { _tag: "highlight", value: "third" },
    ]);

    expect(tabs.initial).toEqual({ selected: "first", highlighted: "first" });
  });
});
