import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  promptBlocks,
  promptComponents,
  promptProseWords,
} from "../../lib/prompt-data";

/**
 * The build prompt.
 *
 * Guarded defect: a prompt that lists components by hand drifts from the site
 * the first time a page lands. These cases hold the two properties that make it
 * generated rather than maintained — the rows come from the pages, and a page
 * added to the collection appears without an edit here — plus the length
 * budget, because the prose is the context an agent spends before it writes
 * anything.
 */

describe("what the prompt is made of", () => {
  it("lists every component page the site ships", () => {
    const prompt = buildPrompt();

    expect(promptComponents.length).toBeGreaterThan(50);
    // Every row is a page, and every page is a row: a component the site does
    // not document is not offered.
    for (const entry of promptComponents) {
      expect(entry.url.startsWith("/")).toBe(true);
      expect(prompt).toContain(`${entry.title} —`);
    }
  });

  it("lists every block page, read from the blocks' own frontmatter", () => {
    expect(promptBlocks.length).toBeGreaterThan(5);
    const prompt = buildPrompt();

    for (const entry of promptBlocks) {
      expect(entry.url.startsWith("/blocks/")).toBe(true);
      expect(prompt).toContain(`${entry.title} —`);
    }
    // A block page's description is its frontmatter's, not a title repeated.
    expect(promptBlocks.every((entry) => entry.description !== "")).toBe(true);
    // The index page is a list of the blocks, not one of them.
    expect(promptBlocks.map((entry) => entry.title)).not.toContain("Blocks");
  });

  it("counts what it lists", () => {
    const prompt = buildPrompt();

    expect(prompt).toContain(`## Components (${promptComponents.length})`);
    expect(prompt).toContain(`## Blocks (${promptBlocks.length})`);
  });

  it("is generated: a page passed in is a row out", () => {
    // The property that makes it dynamic. Nothing in this module names a
    // component, so a row can only come from the pages it was given.
    const prompt = buildPrompt(
      [
        {
          title: "Probe",
          url: "/components/probe",
          description: "Proof.",
        },
      ],
      [
        {
          title: "Probe block",
          url: "/blocks/probe",
          description: "Proof.",
        },
      ],
    );

    expect(prompt).toContain("## Components (1)");
    expect(prompt).toContain(
      "- Probe — Proof. (https://gpuixui.sudokw.com/components/probe)",
    );
    expect(prompt).toContain("## Blocks (1)");
    expect(prompt).not.toContain("## Components (98)");
  });
});

describe("what it tells an agent", () => {
  const prompt = buildPrompt();

  it("installs, runs and contributes", () => {
    for (const heading of [
      "## Install",
      "## Run",
      "## Rules",
      "## Contribute",
    ]) {
      expect(prompt).toContain(heading);
    }
    expect(prompt).toContain("nub install");
    expect(prompt).toContain("nub run dev");
    expect(prompt).toContain("nub run check");
  });

  it("keeps the prose short", () => {
    // The budget is the point: a long preamble is context an agent will not
    // spend on the code. The lists do not count.
    expect(promptProseWords()).toBeLessThan(500);
  });

  it("names the two habits that fail review", () => {
    expect(prompt).toContain("Semantic roles only");
    expect(prompt).toContain(
      "Every fix lands with a test that fails without it",
    );
  });
});
