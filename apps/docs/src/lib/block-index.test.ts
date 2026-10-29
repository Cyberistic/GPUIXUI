import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allBlocks } from "./block-index-data";
import { frontmatterField, frontmatterOf } from "./frontmatter";

/**
 * The all-blocks list.
 *
 * The page is generated from the block pages' frontmatter rather than a second
 * hand-kept list, so the two can only disagree if the generator stops reading a
 * page. Held here: every page on disk is a row, and every row prints the title
 * and description its own page declares.
 */

const dir = new URL("../../content/docs/blocks/", import.meta.url);

const pageFiles = readdirSync(dir).filter(
  (file) => file.endsWith(".mdx") && file !== "index.mdx" && file !== "all.mdx",
);

const headOf = (slug: string): string =>
  frontmatterOf(readFileSync(new URL(`${slug}.mdx`, dir), "utf8"));

describe("the all-blocks index", () => {
  it("lists every block page, and only block pages", () => {
    expect(allBlocks.map((block) => `${block.slug}.mdx`).toSorted()).toEqual(
      pageFiles.toSorted(),
    );
  });

  it("prints each page's own title and description", () => {
    const mismatched = allBlocks.flatMap((block) => {
      const head = headOf(block.slug);
      const own =
        block.title === frontmatterField(head, "title") &&
        block.description === frontmatterField(head, "description");
      return own ? [] : [block.slug];
    });

    expect(mismatched).toEqual([]);
  });
});
