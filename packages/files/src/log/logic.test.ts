/**
 * The log line grammar and the filter the viewer runs over it.
 *
 * The bugs these guard:
 *
 * - a line without a level token being dropped or chopped, instead of kept as
 *   the whole message at the default level;
 * - a word that merely *starts* with a level name (`debugging`) being read as
 *   that level and eating the rest of the word;
 * - the `warning` alias not mapping to `warn`, so a common log spelling is
 *   silently re-leveled.
 */

import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  filterByLevel,
  levelTone,
  parseLogLine,
  type LogEntry,
  type LogLevel,
} from "./logic.js";

describe("parseLogLine", () => {
  it("reads a level token and the message it leaves", () => {
    expect(parseLogLine("ERROR something failed")).toEqual({
      level: "error",
      message: "something failed",
    });
    expect(parseLogLine("warn: careful")).toEqual({
      level: "warn",
      message: "careful",
    });
    expect(parseLogLine("[debug] detail")).toEqual({
      level: "debug",
      message: "detail",
    });
    expect(parseLogLine("warning beware")).toEqual({
      level: "warn",
      message: "beware",
    });
  });

  it("keeps a message with no level intact", () => {
    expect(parseLogLine("just a message")).toEqual({
      level: "info",
      message: "just a message",
    });
    expect(parseLogLine("")).toEqual({ level: "info", message: "" });
    expect(parseLogLine("   padded   ")).toEqual({
      level: "info",
      message: "padded",
    });
  });

  it("does not chop a word that only starts with a level name", () => {
    expect(parseLogLine("information overload")).toEqual({
      level: "info",
      message: "information overload",
    });
    expect(parseLogLine("debugging the renderer")).toEqual({
      level: "info",
      message: "debugging the renderer",
    });
  });
});

describe("filterByLevel", () => {
  const entries: ReadonlyArray<LogEntry> = [
    parseLogLine("error boom"),
    parseLogLine("info ok"),
    parseLogLine("debug detail"),
  ];
  const levels = (
    ...values: ReadonlyArray<LogLevel>
  ): HashSet.HashSet<LogLevel> => HashSet.fromIterable(values);

  it("keeps only the enabled levels, in order", () => {
    expect(filterByLevel(entries, levels("error"))).toEqual([
      { level: "error", message: "boom" },
    ]);
    expect(filterByLevel(entries, levels("info", "debug"))).toEqual([
      { level: "info", message: "ok" },
      { level: "debug", message: "detail" },
    ]);
    expect(filterByLevel(entries, HashSet.empty())).toEqual([]);
  });
});

describe("levelTone", () => {
  it("maps a level to its status tone, none for the quiet levels", () => {
    expect(levelTone("error")).toEqual(Option.some("destructive"));
    expect(levelTone("warn")).toEqual(Option.some("warning"));
    expect(levelTone("info")).toEqual(Option.some("info"));
    expect(levelTone("debug")).toEqual(Option.none());
    expect(levelTone("trace")).toEqual(Option.none());
  });
});
