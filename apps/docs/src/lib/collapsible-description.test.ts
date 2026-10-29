import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { descriptionRuns, descriptionText } from "./page-description";

/**
 * The collapsible page's cross-reference.
 *
 * The bug: a reader who wants several sections open — and whose page is not
 * prerendered anyway — was told nothing about the accordion, which is the
 * control for that job.
 *
 * The hint lives in the page body now, not the description: a description is one
 * line in a list (the build prompt prints every one of them), so a 96-character
 * sentence with a link in it made the list unreadable. The body is the first
 * thing under the heading, so a reader still meets the reference immediately —
 * and it is a link either way, which is what the `descriptionRuns` case below
 * holds the painter to.
 */

const SENTENCE = "[Accordion](/components/accordion)";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** The frontmatter's `description`, as authored. */
const descriptionOf = (source: string): string =>
  /^description: (.+)$/m.exec(source)?.[1] ?? "";

describe("the collapsible description", () => {
  it("names the accordion on both pages that document the section", () => {
    const curated = read("../../content/docs/components/collapsible.mdx");
    const packaged = read(
      "../../../../packages/components/docs/collapsible.mdx",
    );

    // The reference is prose on the page, in the first block under the heading.
    for (const page of [curated, packaged]) {
      expect(page).toContain(SENTENCE);
    }
    // And the description stays one line, because the build prompt prints them
    // all as a list.
    for (const page of [curated, packaged]) {
      expect(descriptionOf(page).length).toBeLessThan(61);
    }
  });

  it("paints a reference as a link to a page the site serves", () => {
    // The painter still has to carry an inline link, wherever the sentence
    // lives: a body paragraph is Markdown, and the description slot must not
    // become the only place a link can be painted.
    expect(descriptionRuns(`Reach for ${SENTENCE} instead.`)).toEqual([
      { kind: "text", text: "Reach for " },
      { kind: "link", text: "Accordion", href: "/components/accordion" },
      { kind: "text", text: " instead." },
    ]);
    const target = new URL(
      "../../content/docs/components/accordion.mdx",
      import.meta.url,
    );

    expect(existsSync(target)).toBe(true);
  });

  it("prints the words alone in the tags that take plain text", () => {
    expect(descriptionText(SENTENCE)).toBe("Accordion");
    expect(descriptionRuns("One section that reveals its body")).toEqual([
      { kind: "text", text: "One section that reveals its body" },
    ]);
  });
});
