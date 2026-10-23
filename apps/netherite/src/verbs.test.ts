import { describe, expect, it } from "vitest";
import { VERBS, argvOf, step, verbAt } from "./verbs.js";

describe("the verb table", () => {
  it("wraps at both ends", () => {
    expect(step(0, -1)).toBe(VERBS.length - 1);
    expect(step(VERBS.length - 1, 1)).toBe(0);
    expect(step(1, 1)).toBe(2);
  });

  it("clamps an index outside the table", () => {
    expect(verbAt(-3).name).toBe("gate");
    expect(verbAt(99).name).toBe("help");
  });

  it("spawns the verb with no argument hints", () => {
    expect(argvOf(VERBS[0] as (typeof VERBS)[number])).toEqual(["gate"]);
  });

  it("drops the bracket hint from the argv", () => {
    const check = VERBS.find((verb) => verb.name === "check");
    expect(check).toBeDefined();
    expect(argvOf(check as (typeof VERBS)[number])).toEqual(["check"]);
  });
});
