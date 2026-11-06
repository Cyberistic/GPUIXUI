import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hero } from "./deck";
import { Dashboard } from "./landing";
import { Lineage } from "./lineage";
import { CodeAndComponent } from "./landing";

/**
 * The landing's copy, held to the brief it was rewritten from.
 *
 * The page carried a marketing line per section that drifted from what the
 * section actually shows: a hero advertising native "looks", an authored-look
 * grid that repeated three counts, and a lineage caption explaining the stack.
 * The copy now says what a reader gets — speed, one codebase, every platform —
 * and this guard renders each section, so a reworded heading or a reintroduced
 * caption fails here rather than in a screenshot review.
 */

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const hero = renderToStaticMarkup(<Hero />);
const lineage = renderToStaticMarkup(<Lineage />);
const dashboard = renderToStaticMarkup(<Dashboard />);
const code = renderToStaticMarkup(<CodeAndComponent />);

describe("the landing's copy", () => {
  it("leads with the claim a reader can check in the deck", () => {
    expect(hero).toContain("Super fast GPU apps");
    expect(hero).toContain("on Mac, Windows &amp; Linux");
  });

  it("puts the lineage directly after the hero, and no authored-look grid", () => {
    const source = read("landing.tsx");
    const order = source.slice(source.indexOf("<Hero />"));

    expect(order.indexOf("<Lineage />")).toBeLessThan(
      order.indexOf("<Dashboard />"),
    );
    expect(source).not.toContain("Defaults");
    expect(source).not.toContain("authored looks");
  });

  it("names the one-codebase claim and drops the stack caption", () => {
    expect(lineage).toContain("Build once, run on the GPU everywhere");
    expect(lineage).toContain("blazingly fast btw");
    expect(lineage).toContain("Terminal");
    expect(lineage).not.toContain("shadcn/ui composition, Base UI behaviour");
  });

  it("renames the code section to the agent-friendly claim", () => {
    expect(code).toContain("Your agent already knows the syntax.");
    expect(code).toContain("It&#x27;s just shadcn!");
  });

  it("shows the shipped components as one grid, with no preview switch", () => {
    expect(dashboard).toContain("All the components you need");
    expect(dashboard).toContain("Point your agent at");
    expect(dashboard).toContain('href="/llms.txt"');
    expect(dashboard).toContain("landing-grid");
    expect(dashboard).not.toContain("Choose platform");
    expect(dashboard).not.toContain(
      "Browser preview of the native composition",
    );
  });

  it("credits the maker in the footer", () => {
    const source = read("landing.tsx");
    expect(source).toContain("Made with ☕ by");
    expect(source).toContain('href="https://sudokw.com"');
    expect(source).toContain("@sudo_kw");
  });

  it("draws the navbar mark from the monotone outline", () => {
    expect(read("../../styles/landing.css")).toContain(
      'mask: url("/logo-outline.svg")',
    );
  });
});
