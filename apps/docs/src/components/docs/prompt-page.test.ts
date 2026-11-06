import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  promptBlocks,
  promptComponents,
  promptProseWords,
} from "../../lib/prompt-data";

describe("what the prompt is made of", () => {
  it("lists every component page the site ships", () => {
    const prompt = buildPrompt();

    expect(promptComponents.length).toBeGreaterThan(50);

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

    expect(promptBlocks.every((entry) => entry.description !== "")).toBe(true);

    expect(promptBlocks.map((entry) => entry.title)).not.toContain("Blocks");
  });

  it("counts what it lists", () => {
    const prompt = buildPrompt();

    expect(prompt).toContain(`## Components (${promptComponents.length})`);
    expect(prompt).toContain(`## Blocks (${promptBlocks.length})`);
  });

  it("is generated: a page passed in is a row out", () => {
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

    expect(prompt).toContain("npx shadcn@latest add @sudokw/primitives-button");
    expect(prompt).toContain('"jsxImportSource": "@gpuix/react"');
    expect(prompt).toContain("nub run dev:playground");
    expect(prompt).toContain("nub run check");
  });

  it("does not claim the packages cannot be installed", () => {
    expect(prompt).not.toContain("there is no registry");
    expect(prompt).not.toContain("@gpuixui/components@workspace:*");
  });

  it("keeps the prose short", () => {
    expect(promptProseWords()).toBeLessThan(500);
  });

  it("names the two habits that fail review", () => {
    expect(prompt).toContain("Semantic roles only");
    expect(prompt).toContain(
      "Every fix lands with a test that fails without it",
    );
  });
});
