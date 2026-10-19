import { describe, expect, it } from "vitest";
import { capabilities } from "./capabilities";
import { capabilitySearchEntry } from "./capability-search";
import { search } from "./search";

/**
 * The bug being guarded: `/docs/capabilities` renders `<CapabilityMatrix />`
 * from `capabilities.ts`, so the MDX index never saw a scenario id. Measured
 * against the production build (2026-10-18): `modal-focus-trap` returned Command
 * menu prose, `floating-placement` returned Dialog/Spinner prose and
 * `theme-color-roles` returned the Colour picker — the page that invites the
 * reader to run the scenario was never a result. These tests fail if the
 * capability document is dropped, if a scenario id is not promoted, if a plain
 * capability word is promoted, or if the promotion steals a component page.
 */

const content = capabilitySearchEntry.index.content ?? "";

describe("the capability matrix is indexed", () => {
  it("names every capability, verdict and scenario the matrix records", () => {
    const missing = capabilities.flatMap((entry) => [
      ...(content.includes(entry.label) ? [] : [entry.label]),
      ...(content.includes(entry.capability) ? [] : [entry.capability]),
      ...(content.includes(entry.verdict) ? [] : [entry.verdict]),
      ...entry.scenarios.filter((scenario) => !content.includes(scenario)),
    ]);
    expect(missing).toEqual([]);
  });

  it("quotes what each run proves", () => {
    const missing = capabilities
      .filter((entry) => !content.includes(entry.proves))
      .map((entry) => entry.capability);
    expect(missing).toEqual([]);
  });

  it("promotes every scenario id and no plain-word capability", () => {
    const scenarioMisses = capabilities
      .flatMap((entry) => entry.scenarios)
      .filter((scenario) => !capabilitySearchEntry.names.includes(scenario));
    const promotedWords = capabilities
      .map((entry) => entry.capability)
      .filter(
        (name) =>
          !name.includes("-") && capabilitySearchEntry.names.includes(name),
      );
    expect(scenarioMisses).toEqual([]);
    expect(promotedWords).toEqual([]);
  });
});

describe("capability search", { timeout: 120_000 }, () => {
  it("finds the matrix from a scenario id", async () => {
    const results = await search("modal-focus-trap", 5);
    expect(results[0]?.url).toBe("/docs/capabilities");
  });

  it("finds the matrix from a hyphenated capability name", async () => {
    const results = await search("virtual-list", 5);
    expect(results[0]?.url).toBe("/docs/capabilities");
  });

  it("finds the matrix from a scenario id written as words", async () => {
    const [focus, placement] = await Promise.all([
      search("modal focus", 5),
      search("floating placement", 5),
    ]);
    expect(focus[0]?.url).toBe("/docs/capabilities");
    expect(placement[0]?.url).toBe("/docs/capabilities");
  });

  it("finds the matrix from a theme scenario", async () => {
    const results = await search("theme-color-roles", 5);
    expect(results[0]?.url).toBe("/docs/capabilities");
  });

  it("leaves ordinary words with their component pages", async () => {
    const [input, label] = await Promise.all([
      search("input", 5),
      search("label", 5),
    ]);
    expect(input[0]?.url).toBe("/docs/components/text-input");
    expect(label[0]?.url).toBe("/docs/components/label");
  });

  it("does not invent a scenario that no row records", async () => {
    expect(await search("zzzznosuchscenario")).toEqual([]);
  });
});
