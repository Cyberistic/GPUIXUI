/**
 * Guards the live registry's integrity.
 *
 * Bug: the live list is hand-maintained, so a duplicate id, an id that does not
 * mark itself as live, a live capability with no headless twin, or a core
 * capability with no live evidence would make a report claim coverage the suite
 * did not exercise. `scenarioProblems` guards the headless registry; no other
 * test reads the live one.
 *
 * Observed two directions: appending one real entry to `liveScenarios` fails
 * the first test with "live scenario ids are not unique", and returning `[]`
 * from `liveScenarioProblems` fails the three synthetic cases. Removing
 * `live-typography` fails the real case with the alias and `text` problems;
 * removing the `a11y` exemption fails it with `no live scenario covers core
 * capability "a11y"`.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { liveScenarios } from "./scenarios.js";
import {
  coreCoverageProblems,
  liveScenarioProblems,
  type RegisteredScenario,
} from "./scenario-problems.js";
import { CORE_CAPABILITIES, scenarios } from "../scenarios/index.js";

const entry = (
  id: string,
  capability: RegisteredScenario["capability"],
): RegisteredScenario => ({ id, capability });

describe("liveScenarioProblems", () => {
  it("accepts the real live registry against the headless one", () => {
    expect(
      liveScenarioProblems(liveScenarios, scenarios, CORE_CAPABILITIES),
    ).toEqual([]);
    expect(Arr.length(liveScenarios)).toBeGreaterThan(0);
  });

  it("flags a duplicated live id", () => {
    expect(
      liveScenarioProblems(
        Arr.appendAll(liveScenarios, Arr.take(liveScenarios, 1)),
        scenarios,
        CORE_CAPABILITIES,
      ),
    ).toContain("live scenario ids are not unique");
  });

  it("flags an id that does not mark the live suite", () => {
    expect(
      liveScenarioProblems(
        [entry("theme-switch", "layout")],
        scenarios,
        CORE_CAPABILITIES,
      ),
    ).toContain('live scenario "theme-switch" is not named live-');
  });

  it("flags a live capability the headless suite never mounts", () => {
    const headless = Arr.filter(
      scenarios,
      (scenario) => scenario.capability !== "focus",
    );
    expect(
      liveScenarioProblems(
        [entry("live-x", "focus")],
        headless,
        CORE_CAPABILITIES,
      ),
    ).toContain('no headless scenario covers "focus" (live "live-x")');
  });
});

describe("coreCoverageProblems", () => {
  it("flags a core capability whose live twin was removed", () => {
    const withoutCombobox = Arr.filter(
      liveScenarios,
      (scenario) => scenario.id !== "live-combobox",
    );
    expect(coreCoverageProblems(withoutCombobox, CORE_CAPABILITIES)).toContain(
      'no live scenario covers core capability "combobox"',
    );
  });

  it("flags an alias whose live id is not registered", () => {
    const withoutTypography = Arr.filter(
      liveScenarios,
      (scenario) => scenario.id !== "live-typography",
    );
    expect(
      coreCoverageProblems(withoutTypography, CORE_CAPABILITIES),
    ).toContain('live alias "live-typography" is not registered');
  });

  it("accepts the reasoned headless-only core capability", () => {
    expect(coreCoverageProblems(liveScenarios, ["a11y"])).toEqual([]);
  });

  it("flags a capability with no live scenario and no exemption", () => {
    expect(coreCoverageProblems(liveScenarios, ["upload"])).toEqual([
      'no live scenario covers core capability "upload"',
    ]);
  });
});
