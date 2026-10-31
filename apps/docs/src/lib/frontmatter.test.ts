/**
 * Every page's frontmatter parses as YAML.
 *
 * Bug guarded: eight block pages wrote `description: A week view: …` — an
 * unquoted `: ` inside a plain scalar — and Fumadocs' parser refused it
 * (`Nested mappings are not allowed in compact mappings`), so the dev server
 * answered 500 on every page while every unit suite stayed green, because none
 * of them parsed the frontmatter the site actually reads.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse, parseDocument } from "yaml";

const repo = fileURLToPath(new URL("../../../../", import.meta.url));

const pages = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? pages(join(dir, entry.name))
      : entry.name.endsWith(".mdx")
        ? [join(dir, entry.name)]
        : [],
  );

const roots = [
  "apps/docs/content/docs",
  ...readdirSync(join(repo, "packages"))
    .map((pkg) => `packages/${pkg}/docs`)
    .filter((dir) => existsSync(join(repo, dir))),
];

const failures = (): ReadonlyArray<string> =>
  roots.flatMap((root) =>
    pages(join(repo, root)).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const block = /^---\n([\s\S]*?)\n---/.exec(source)?.[1];
      if (block === undefined) return [];
      const document = parseDocument(block);
      const page = file.slice(repo.length);
      return document.errors.length > 0
        ? [`${page}: ${document.errors[0]?.message.split("\n")[0] ?? ""}`]
        : typeof document.toJS() === "object" && document.toJS() !== null
          ? []
          : [`${page}: frontmatter is not a mapping`];
    }),
  );

describe("the pages' frontmatter", () => {
  it("parses as a YAML mapping on every page the site mounts", () => {
    expect(failures()).toEqual([]);
  });

  it("refuses an unquoted colon in a plain description", () => {
    expect(() =>
      parse("title: X\ndescription: A week view: calendars"),
    ).toThrow();
  });
});
