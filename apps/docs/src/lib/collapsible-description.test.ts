import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { descriptionRuns, descriptionText } from "./page-description";

const SENTENCE = "[Accordion](/components/accordion)";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const descriptionOf = (source: string): string =>
  /^description: (.+)$/m.exec(source)?.[1] ?? "";

describe("the collapsible description", () => {
  it("names the accordion on both pages that document the section", () => {
    const curated = read("../../content/docs/components/collapsible.mdx");
    const packaged = read(
      "../../../../packages/components/docs/collapsible.mdx",
    );

    for (const page of [curated, packaged]) {
      expect(page).toContain(SENTENCE);
    }

    for (const page of [curated, packaged]) {
      expect(descriptionOf(page).length).toBeLessThan(61);
    }
  });

  it("paints a reference as a link to a page the site serves", () => {
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
