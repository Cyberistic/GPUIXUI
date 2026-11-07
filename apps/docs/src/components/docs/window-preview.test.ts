import {
  createWindowCalculator,
  type WindowSpec,
} from "@gpuixui/data/virtual/window";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rowsInView, viewReadout } from "./window-preview";

const SPEC: WindowSpec = {
  count: 100,
  rowHeight: 37,
  viewportHeight: 320,
  overdraw: 4,
};

describe("the rows a viewport shows", () => {
  it("starts at the row the top edge lands in", () => {
    expect(rowsInView(SPEC, 0)).toEqual({ start: 0, end: 9 });

    expect(rowsInView(SPEC, 370)).toEqual({ start: 10, end: 19 });
    expect(rowsInView(SPEC, 37)).toEqual({ start: 1, end: 10 });
  });

  it("is narrower than the window that mounts it", () => {
    const calculator = createWindowCalculator(SPEC);
    expect(calculator.at(370).start).toBe(rowsInView(SPEC, 370).start - 4);
    expect(calculator.at(370).end).toBeGreaterThan(rowsInView(SPEC, 370).end);
  });

  it("clamps an offset into the rows it holds", () => {
    expect(rowsInView(SPEC, -40)).toEqual({ start: 0, end: 9 });
    expect(rowsInView(SPEC, 1e9)).toEqual({ start: 91, end: 100 });
  });

  it("prints the view and the window it sits in", () => {
    expect(viewReadout(SPEC, 0, 13)).toBe("1–9 in view · 13 mounted of 100");
  });

  it("is the range both drawings read", () => {
    for (const demo of ["virtualization-demo.tsx", "tree-demo.tsx"]) {
      const source = readFileSync(
        new URL(`./${demo}`, import.meta.url),
        "utf8",
      );
      expect(source).toContain('from "./window-preview"');
      expect(source).toContain("viewReadout");
    }
  });
});
