/**
 * The bench's parsers (plan 730). Bug guarded: a landing number is a claim, so
 * a malformed reading must be `None` — a parser that answered 0 for a line it
 * could not read would print "0 MB" as a measurement.
 */
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { median, parseDu, parseRss } from "./parse.js";

describe("the bench's parsers", () => {
  it("reads the resident memory the block reports", () => {
    expect(Option.getOrNull(parseRss("…\nbench rss=104857600\n"))).toBe(100);
  });

  it("refuses a missing or zero reading", () => {
    expect(Option.isNone(parseRss("bench rss=\n"))).toBe(true);
    expect(Option.isNone(parseRss("bench rss=0\n"))).toBe(true);
    expect(Option.isNone(parseDu("du: no such file\n"))).toBe(true);
  });

  it("reads a directory's size", () => {
    expect(Option.getOrNull(parseDu("20480\t/store/native\n"))).toBe(20);
  });

  it("takes the median of odd and even runs, none for no runs", () => {
    expect(Option.getOrNull(median([300, 100, 200]))).toBe(200);
    expect(Option.getOrNull(median([400, 100, 300, 200]))).toBe(250);
    expect(Option.isNone(median([]))).toBe(true);
  });
});
