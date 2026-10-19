/**
 * Guards the live registry's integrity.
 *
 * Bug: the live list is hand-maintained, so a duplicate id, an id that does not
 * mark itself as live, or a live capability with no headless twin would make a
 * report claim coverage the suite did not exercise. `scenarioProblems` guards
 * the headless registry; no other test reads the live one.
 *
 * Observed two directions: appending one real entry to `liveScenarios` fails
 * the first test with "live scenario ids are not unique", and returning `[]`
 * from `liveScenarioProblems` fails the three synthetic cases.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { liveScenarios } from "./scenarios.js";
import {
  liveScenarioProblems,
  type RegisteredScenario,
} from "./scenario-problems.js";
import { scenarios } from "../scenarios/index.js";

const entry = (
  id: string,
  capability: RegisteredScenario["capability"],
): RegisteredScenario => ({ id, capability });

describe("liveScenarioProblems", () => {
  it("accepts the real live registry against the headless one", () => {
    expect(liveScenarioProblems(liveScenarios, scenarios)).toEqual([]);
    expect(Arr.length(liveScenarios)).toBeGreaterThan(0);
  });

  it("flags a duplicated live id", () => {
    expect(
      liveScenarioProblems(
        Arr.appendAll(liveScenarios, Arr.take(liveScenarios, 1)),
        scenarios,
      ),
    ).toContain("live scenario ids are not unique");
  });

  it("flags an id that does not mark the live suite", () => {
    expect(
      liveScenarioProblems([entry("theme-switch", "layout")], scenarios),
    ).toContain('live scenario "theme-switch" is not named live-');
  });

  it("flags a live capability the headless suite never mounts", () => {
    const headless = Arr.filter(
      scenarios,
      (scenario) => scenario.capability !== "focus",
    );
    expect(
      liveScenarioProblems([entry("live-x", "focus")], headless),
    ).toContain('no headless scenario covers "focus" (live "live-x")');
  });
});
