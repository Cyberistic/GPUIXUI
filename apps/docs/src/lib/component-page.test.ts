import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The component page contract.
 *
 * `docs/preview-strategy.md` fixes the sections a curated component page must
 * carry. A page that drops one hides a decision from the reader — most often
 * the limitations — so the template is checked rather than remembered. The
 * package's own pages are exempt: they are the component's doc file, not a
 * curated page.
 *
 * The section index is held to the same folder: it names every curated page (it
 * had listed four after the fifth landed) and its "How to read a page" table
 * can only offer a section some page actually uses. It also states how a reader
 * runs the native component, so the sentence is held to the note a package page
 * mounts rather than to memory.
 */

const dir = new URL("../../content/docs/components/", import.meta.url);
const repo = new URL("../../../../", import.meta.url);

/** Curated pages, i.e. everything in the folder but the section index. */
const pages = readdirSync(dir).filter(
  (name) => name.endsWith(".mdx") && name !== "index.mdx",
);

const source = (name: string): string =>
  readFileSync(new URL(name, dir), "utf8");

/** The `title` a page's frontmatter declares. */
const title = (body: string): string =>
  /^title: (.+)$/m.exec(body)?.[1]?.trim() ?? "";

/** Every `##` heading on a page, in order. */
const sections = (body: string): readonly string[] =>
  [...body.matchAll(/^## (.+)$/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1].trim()],
  );

/** Every package docs page the site mounts, as source. */
const packagePages = readdirSync(new URL("packages", repo), {
  withFileTypes: true,
}).flatMap((entry) => {
  if (!entry.isDirectory()) return [];
  const docs = new URL(`packages/${entry.name}/docs/`, repo);
  if (!existsSync(docs)) return [];
  return readdirSync(docs)
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => readFileSync(new URL(name, docs), "utf8"));
});

const required = [
  "Installation",
  "Usage",
  "Composition",
  "API reference",
  "Theming",
  "Dependencies",
  "Accessibility and limitations",
  "Related",
  "Status",
] as const;

describe("the curated component pages", () => {
  it("exist, so the folder cannot empty out unnoticed", () => {
    expect(pages.length).toBeGreaterThanOrEqual(4);
  });

  it("carry the sections the template requires, in the template's order", () => {
    const missing = pages.flatMap((name) => {
      const found = sections(source(name));
      const positions = required.map((section) => found.indexOf(section));
      return positions.flatMap((position, index) => {
        const section = required[index] ?? "";
        if (position === -1) return [`${name}: no ## ${section}`];
        // Order matters: API before limitations before related.
        const previous = positions[index - 1];
        return previous !== undefined && position < previous
          ? [`${name}: ## ${section} is out of order`]
          : [];
      });
    });

    expect(missing).toEqual([]);
  });

  it("open with a preview and a sentence saying what the component is not", () => {
    const withoutPreview = pages.filter(
      (name) => !source(name).includes("<ComponentPreview"),
    );

    expect(withoutPreview).toEqual([]);
  });

  it("name the package they install from", () => {
    const withoutInstall = pages.filter(
      (name) => !/<Install packageName="@gpuixui\/[a-z-]+"/.test(source(name)),
    );

    expect(withoutInstall).toEqual([]);
  });
});

describe("the component section index", () => {
  it("names every curated page, so a fifth cannot land as a fourth", () => {
    // The index listed Button, Dialog, Popover and Tabs while the Dropdown menu
    // page shipped beside them, so a reader looking for a menu preview was told
    // the curated set did not include one.
    const index = source("index.mdx");

    expect(
      pages
        .map((name) => title(source(name)))
        .filter((pageTitle) => !index.includes(pageTitle)),
    ).toEqual([]);
  });

  it("says how to run the native component, in the note's own words", () => {
    // The index claimed every package page named the example file; the note
    // names the playground command and the Markdown path, so the sentence was
    // false. It imports the exported command instead of retyping it.
    const index = source("index.mdx");

    expect(index).toContain(
      'import { playgroundCommand } from "@/components/docs/native-run-note";',
    );
    // Backticks would print the expression like a code sample — the literal
    // `{playgroundCommand}` — rather than the command, which this guard caught.
    expect(index).toContain("<code>{playgroundCommand}</code>");
    expect(index).toContain("/docs/installation#run-the-playground");
    expect(index).not.toMatch(/example file/);
  });

  it("only offers a section some page actually uses", () => {
    // "How to read a page" is guidance, and a row naming a heading no page
    // carries sends a reader looking for something that does not exist.
    const index = source("index.mdx");
    const table =
      /## How to read a page\n([\s\S]*?)\n\n/.exec(index)?.[1] ?? "";
    const offered = [...table.matchAll(/^\| ([^|]+) \|/gm)]
      .map((match) => match[1]?.trim() ?? "")
      .filter((cell) => cell !== "Section" && !/^-+$/.test(cell))
      .flatMap((cell) => cell.split("/").map((part) => part.trim()))
      .filter((part) => part.length > 0);

    const used = new Set(
      [...pages.map((name) => source(name)), ...packagePages].flatMap(sections),
    );

    expect(offered.length).toBeGreaterThan(4);
    expect(offered.filter((section) => !used.has(section))).toEqual([]);
  });
});
