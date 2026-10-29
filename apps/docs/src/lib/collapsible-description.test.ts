import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { descriptionRuns, descriptionText } from "./page-description";

/**
 * The collapsible page's cross-reference.
 *
 * The bug: a reader who wants several sections open — and whose page is not
 * prerendered anyway — was told nothing about the accordion, which is the
 * control for that job. Both pages that document the section say so in their
 * description, and the description's one inline link is painted as a link under
 * the `h1`: a literal `[accordion](/…)` in a `<p>` is not a reference a
 * reader can follow.
 */

const SENTENCE =
  "prefer [accordion](/components/accordion) when prerendering is not too heavy";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** The frontmatter's `description`, as authored. */
const descriptionOf = (source: string): string =>
  /^description: (.+)$/m.exec(source)?.[1] ?? "";

describe("the collapsible description", () => {
  it("names the accordion on both pages that document the section", () => {
    const curated = descriptionOf(
      read("../../content/docs/components/collapsible.mdx"),
    );
    const packaged = descriptionOf(
      read("../../../../packages/components/docs/collapsible.mdx"),
    );

    expect(curated).toContain(SENTENCE);
    expect(packaged).toContain(SENTENCE);
  });

  it("paints the reference as a link to a page the site serves", () => {
    expect(descriptionRuns(SENTENCE)).toEqual([
      { kind: "text", text: "prefer " },
      { kind: "link", text: "accordion", href: "/components/accordion" },
      { kind: "text", text: " when prerendering is not too heavy" },
    ]);
    const target = new URL(
      "../../content/docs/components/accordion.mdx",
      import.meta.url,
    );

    expect(existsSync(target)).toBe(true);
  });

  it("prints the words alone in the tags that take plain text", () => {
    expect(descriptionText(SENTENCE)).toBe(
      "prefer accordion when prerendering is not too heavy",
    );
    expect(descriptionRuns("One section that reveals its body")).toEqual([
      { kind: "text", text: "One section that reveals its body" },
    ]);
  });
});
