import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allBlocks } from "./block-index-data";
import { frontmatterField, frontmatterOf } from "./frontmatter";

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
