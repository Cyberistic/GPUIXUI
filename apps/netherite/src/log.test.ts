import { describe, expect, it } from "vitest";
import { LOG_LIMIT, append, feed, tail } from "./log.js";

describe("the log tail", () => {
  it("drops the oldest line past the cap", () => {
    const full = Array.from({ length: LOG_LIMIT }, (_, index) => `l${index}`);
    const next = append(full, "last");
    expect(next).toHaveLength(LOG_LIMIT);
    expect(next[0]).toBe("l1");
    expect(next[next.length - 1]).toBe("last");
  });

  it("splits a chunk and keeps the unfinished line", () => {
    const lines = feed([], "one\ntwo\nthr");
    expect(lines).toEqual(["one", "two", "thr"]);
  });

  it("does not treat a trailing newline as a line", () => {
    expect(feed([], "one\ntwo\n")).toEqual(["one", "two"]);
  });

  it("returns the last lines without mutating the input", () => {
    const lines = ["a", "b", "c"];
    expect(tail(lines, 2)).toEqual(["b", "c"]);
    expect(lines).toEqual(["a", "b", "c"]);
  });
});
