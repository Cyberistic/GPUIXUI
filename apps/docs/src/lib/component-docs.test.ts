import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The site renders `packages/components/docs/*.mdx` as MDX, which is stricter
 * than the Markdown the package writes it as. Two defects are silent in the
 * package and fatal here:
 *
 *   1. a frontmatter value a YAML parser rejects (`description: `@name` …` —
 *      a plain scalar may not start with a backtick), which fails the whole
 *      collection, not one page;
 *   2. a raw `<tag>` in prose (`named "<label> hex value"`), which MDX reads as
 *      JSX and fails the page at compile time.
 *
 * Both broke the build once; each check below failed on that content.
 */

const docsDir = new URL(
  "../../../../packages/components/docs/",
  import.meta.url,
);

const files = readdirSync(docsDir).filter((name) => name.endsWith(".mdx"));

const read = (name: string): string =>
  readFileSync(new URL(name, docsDir), "utf8");

/** A plain YAML scalar may not begin with one of these. */
const YAML_RESERVED = /^[`@*&[\]{}>|%#]/;

const frontmatter = (source: string): string => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
  return match?.[1] ?? "";
};

/** The prose of a page: no frontmatter, no fenced blocks, no inline code. */
const prose = (source: string): string =>
  source
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "");

describe("the package's component docs", () => {
  it("are found, so a rename does not silently empty the section", () => {
    expect(files.length).toBeGreaterThanOrEqual(39);
  });

  it("carry a title and a description every page needs", () => {
    const missing = files.filter((name) => {
      const head = frontmatter(read(name));
      return !/^title: .+/m.test(head) || !/^description: .+/m.test(head);
    });

    expect(missing).toEqual([]);
  });

  it("quote a frontmatter value a YAML parser would reject", () => {
    const unquoted = files.flatMap((name) =>
      frontmatter(read(name))
        .split("\n")
        .flatMap((line) => {
          const [, value = ""] = /^[a-z]+:\s*(.*)$/.exec(line) ?? [];
          const quoted = value.startsWith('"') || value.startsWith("'");
          return YAML_RESERVED.test(value) && !quoted
            ? [`${name}: ${value}`]
            : [];
        }),
    );

    expect(unquoted).toEqual([]);
  });

  it("keep angle brackets inside code, where MDX does not read them as JSX", () => {
    const jsx = files.flatMap((name) =>
      prose(read(name))
        .split("\n")
        .filter((line) => /<[A-Za-z/]/.test(line))
        .map((line) => `${name}: ${line.trim()}`),
    );

    expect(jsx).toEqual([]);
  });
});
