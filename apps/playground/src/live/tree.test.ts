/**
 * Guards the live retention counter.
 *
 * The bug in this class: the automation tree is nested, so a counter that only
 * counts the root (or treats a leaf as a container) reports a constant. The
 * live `live-scale` probe would then "prove" that retention does not grow with
 * the model. Each case here fails if the walk stops early.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Option from "effect/Option";
import { countNodes } from "./tree.js";

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
    { id: 5, type: "text" },
  ],
};

describe("countNodes", () => {
  it("counts every nested node, not only the root", () => {
    expect(countNodes(Option.some(tree))).toBe(5);
  });

  it("counts a leaf as one node", () => {
    expect(countNodes(Option.some({ id: 9, type: "text" }))).toBe(1);
  });

  it("counts a container with no children as one node", () => {
    expect(countNodes(Option.some({ id: 10, type: "div", children: [] }))).toBe(
      1,
    );
  });

  it("counts no tree as zero, never a fabricated root", () => {
    expect(countNodes(Option.none())).toBe(0);
  });
});
