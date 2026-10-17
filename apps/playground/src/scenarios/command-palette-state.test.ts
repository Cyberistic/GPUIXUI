/**
 * Guards the palette's two pure rules.
 *
 * The bugs these catch: a filter that keeps non-matching rows (so Enter commits
 * a hidden command), one that is case- or whitespace-sensitive (so a real query
 * finds nothing), and an active index that runs off an end instead of wrapping.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Arr from "effect/Array";
import {
  filterCommands,
  moveActive,
  type Command,
} from "./command-palette-state.js";

const commands: ReadonlyArray<Command> = [
  { id: "new-file", label: "New file" },
  { id: "open-settings", label: "Open settings" },
  { id: "toggle-sidebar", label: "Toggle sidebar" },
];

const ids = (list: ReadonlyArray<Command>): ReadonlyArray<string> =>
  Arr.map(list, (command) => command.id);

describe("filterCommands", () => {
  it("lists every command for a blank query", () => {
    expect(ids(filterCommands(commands, ""))).toEqual([
      "new-file",
      "open-settings",
      "toggle-sidebar",
    ]);
    expect(ids(filterCommands(commands, "   "))).toEqual([
      "new-file",
      "open-settings",
      "toggle-sidebar",
    ]);
  });

  it("matches case-insensitively, and drops everything that does not match", () => {
    expect(ids(filterCommands(commands, " SET "))).toEqual(["open-settings"]);
    expect(ids(filterCommands(commands, "o"))).toEqual([
      "open-settings",
      "toggle-sidebar",
    ]);
    expect(ids(filterCommands(commands, "zzz"))).toEqual([]);
  });
});

describe("moveActive", () => {
  it("moves forward and wraps at the end", () => {
    expect(moveActive(0, 1, 3)).toBe(1);
    expect(moveActive(2, 1, 3)).toBe(0);
  });

  it("moves backward and wraps to the end", () => {
    expect(moveActive(0, -1, 3)).toBe(2);
    expect(moveActive(1, -1, 3)).toBe(0);
  });

  it("never produces an index outside the list", () => {
    expect(moveActive(0, 0, 0)).toBe(0);
    expect(moveActive(5, 0, 3)).toBe(2);
    expect(moveActive(0, 5, 3)).toBe(2);
  });
});
