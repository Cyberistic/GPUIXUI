/**
 * The contiguous-run splitter: the one rule behind a Combobox group heading
 * and a command palette group (plans 395 and 783).
 *
 * The bug these guard: a group that repeats after another run must produce a
 * second run (not be merged into the first), and an ungrouped item between two
 * grouped runs must not inherit either heading.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { runsBy } from "./runs.js";

describe("runsBy", () => {
  it("splits on a change and repeats a group as two runs", () => {
    const groups = ["A", "B", "A"];
    const runs = runsBy(groups, (group) => Option.some(group));

    expect(runs.map((run) => Option.getOrNull(run.group))).toEqual([
      "A",
      "B",
      "A",
    ]);
    expect(runs.map((run) => run.from)).toEqual([0, 1, 2]);
  });

  it("keeps an ungrouped item as its own run between grouped ones", () => {
    const groups: ReadonlyArray<Option.Option<string>> = [
      Option.none(),
      Option.some("A"),
      Option.some("A"),
      Option.none(),
    ];
    const runs = runsBy(groups, (group) => group);

    expect(runs.map((run) => Option.getOrNull(run.group) ?? "none")).toEqual([
      "none",
      "A",
      "none",
    ]);
    expect(runs.map((run) => run.items.length)).toEqual([1, 2, 1]);
    expect(runs.map((run) => run.from)).toEqual([0, 1, 3]);
  });
});
