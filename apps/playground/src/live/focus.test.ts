/**
 * Guards the live focus bridge.
 *
 * The bug in this class: the automation tree is nested, so a lookup that only
 * checks the root (or falls back to the first node with a `testId`) reports the
 * wrong element. Every focus assertion then compares that same wrong value and
 * passes while proving nothing. Each case here fails if the walk stops early,
 * if a node without a `testId` is coerced to `Some`, or if a miss falls back to
 * the tree root.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Option from "effect/Option";
import { testIdOf } from "./focus.js";

const tree = {
  id: 1,
  type: "div",
  testId: "root",
  children: [
    {
      id: 2,
      type: "div",
      testId: "panel",
      children: [
        { id: 3, type: "div", testId: "field" },
        { id: 4, type: "input" },
      ],
    },
  ],
};

describe("testIdOf", () => {
  it("finds a nested node by its host id", () => {
    expect(testIdOf(tree, 3)).toEqual(Option.some("field"));
  });

  it("returns None for a focused node that has no testId", () => {
    expect(testIdOf(tree, 4)).toEqual(Option.none());
  });

  it("returns None for an id outside the tree, never the root", () => {
    expect(testIdOf(tree, 99)).toEqual(Option.none());
  });

  it("returns None when the runtime has no tree", () => {
    expect(testIdOf(null, 1)).toEqual(Option.none());
  });
});
