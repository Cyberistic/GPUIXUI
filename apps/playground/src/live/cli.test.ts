/**
 * Guards the live runner's focused selection.
 *
 * Bug: the live runner ignored argv and drove all 42 live scenarios, so a check
 * for one component opened a full window suite (about nine minutes). These
 * tests pin the CLI contract: only `--only` or `--all` may choose a suite, an
 * unknown id is reported, and a typo cannot fall through to a full run.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { formatMissing, idsOf, parseArgs, selectLive } from "./cli.js";

const scenarios = [{ id: "live-a" }, { id: "live-b" }, { id: "live-c" }];

describe("live CLI", () => {
  it("selects only the scenario named by --only", () => {
    const selection = selectLive(scenarios, ["live-b"]);
    expect(selection.selected).toEqual([{ id: "live-b" }]);
    expect(selection.missing).toEqual([]);
  });

  it("accepts repeated and comma-separated --only", () => {
    const parsed = parseArgs(["--only", "live-a,live-c", "--only", "live-b"]);
    expect(parsed.flags.only).toEqual(["live-a", "live-c", "live-b"]);
    expect(parsed.unknown).toEqual([]);
  });

  it("preserves registry order and drops duplicate ids", () => {
    const selection = selectLive(scenarios, ["live-c", "live-a", "live-c"]);
    expect(selection.selected).toEqual([{ id: "live-a" }, { id: "live-c" }]);
  });

  it("reports an unknown id without dropping the known selection", () => {
    const selection = selectLive(scenarios, ["live-b", "live-nope"]);
    expect(selection.selected).toEqual([{ id: "live-b" }]);
    expect(selection.missing).toEqual(["live-nope"]);
  });

  it("treats no flags as no selection, not the full suite", () => {
    const parsed = parseArgs([]);
    expect(parsed.flags.only).toEqual([]);
    expect(parsed.flags.all).toBe(false);
    expect(parsed.unknown).toEqual([]);
  });

  it("returns the full registry only when the selection is empty", () => {
    const selection = selectLive(scenarios, []);
    expect(selection.selected).toEqual(scenarios);
    expect(selection.missing).toEqual([]);
  });

  it("requires a value after --only", () => {
    const parsed = parseArgs(["--only"]);
    expect(parsed.flags.only).toEqual([]);
    expect(parsed.unknown).toContain("--only needs a scenario id");
  });

  it("does not ignore an unknown flag", () => {
    const parsed = parseArgs(["--onlyy", "live-a"]);
    expect(parsed.flags.only).toEqual([]);
    expect(parsed.unknown).toEqual(["--onlyy", "live-a"]);
  });

  it("turns --all and --list into explicit flags", () => {
    const all = parseArgs(["--all"]);
    const list = parseArgs(["--list"]);
    expect(all.flags.all).toBe(true);
    expect(list.flags.list).toBe(true);
  });

  it("parses the capture directory and the commit override", () => {
    const parsed = parseArgs([
      "--only",
      "live-shell",
      "--capture",
      "out",
      "--commit",
      "abc123",
    ]);
    expect(parsed.unknown).toEqual([]);
    expect(parsed.flags.capture).toEqual(Option.some("out"));
    expect(parsed.flags.commit).toEqual(Option.some("abc123"));
    expect(parseArgs(["--only", "live-shell"]).flags.capture).toEqual(
      Option.none(),
    );
  });

  it("requires a value after --capture and --commit", () => {
    expect(parseArgs(["--capture"]).unknown).toContain(
      "--capture needs a directory",
    );
    expect(parseArgs(["--commit"]).unknown).toContain("--commit needs a sha");
  });

  it("names the bad id and every valid id in the error", () => {
    const message = formatMissing(["live-nope"], idsOf(scenarios));
    expect(message).toContain("live-nope");
    expect(message).toContain("live-a, live-b, live-c");
  });
});
