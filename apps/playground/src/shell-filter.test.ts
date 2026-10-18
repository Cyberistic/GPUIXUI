/**
 * The sidebar's filter rule (plan `528`).
 *
 * Each case pins one half of the contract: the query matches the id, the title
 * *and* the capability, case-insensitively and trimmed; an empty query hides
 * nothing; and the registry order is preserved so the sidebar does not shuffle
 * under the reader.
 */
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import type { PlaygroundScenario } from "./types.js";
import { filterScenarios } from "./shell-filter.js";

const scenario = (
  id: string,
  title: string,
  capability: PlaygroundScenario["capability"],
): PlaygroundScenario => ({
  id,
  title,
  capability,
  view: () => null,
  steps: () => Effect.void,
});

const list: ReadonlyArray<PlaygroundScenario> = [
  scenario("text-native", "Native text", "text"),
  scenario(
    "shell-navigation",
    "Playground shell: the scenario list scrolls",
    "layout",
  ),
  scenario("crop-area", "Crop area", "crop"),
];

const ids = (scenarios: ReadonlyArray<PlaygroundScenario>): string =>
  Arr.join(
    Arr.map(scenarios, (entry) => entry.id),
    ",",
  );

describe("filterScenarios", () => {
  it("hides nothing for an empty query", () => {
    expect(ids(filterScenarios(list, ""))).toBe(
      "text-native,shell-navigation,crop-area",
    );
  });

  it("treats a whitespace-only query as empty instead of matching a space", () => {
    expect(ids(filterScenarios(list, "   "))).toBe(
      "text-native,shell-navigation,crop-area",
    );
  });

  it("matches an id case-insensitively", () => {
    expect(ids(filterScenarios(list, "TEXT-NATIVE"))).toBe("text-native");
  });

  it("matches a word from the title", () => {
    expect(ids(filterScenarios(list, "playground shell"))).toBe(
      "shell-navigation",
    );
  });

  it("matches the capability when neither the id nor the title holds it", () => {
    expect(ids(filterScenarios(list, "layout"))).toBe("shell-navigation");
  });

  it("returns no scenarios when nothing matches", () => {
    expect(Arr.length(filterScenarios(list, "zzz"))).toBe(0);
  });

  it("trims the query before matching", () => {
    expect(ids(filterScenarios(list, "  crop-area  "))).toBe("crop-area");
  });

  it("keeps registry order rather than match order", () => {
    expect(ids(filterScenarios(list, "a"))).toBe(
      "text-native,shell-navigation,crop-area",
    );
  });
});
