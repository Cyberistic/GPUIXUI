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
 * `Keyboard` is on the list because MISSION.md requires keyboard notes on every
 * component page and the policy's table has a `Keyboard` row; this guard was
 * behind its own policy and would have let a page ship without one.
 *
 * The policy's template table is parsed, so the two cannot disagree on a
 * section's name or order. That cross-check found a second drift: the table put
 * Accessibility and limitations before Dependencies (MISSION.md's order), while
 * every curated page and the guard had the two the other way round.
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
  "Keyboard",
  "API reference",
  "Theming",
  "Accessibility and limitations",
  "Dependencies",
  "Related",
  "Status",
] as const;

const policy = readFileSync(new URL("docs/preview-strategy.md", repo), "utf8");

/** The `Section` column of the policy's component-page template table. */
const policySections = (): ReadonlyArray<string> => {
  const start = policy.indexOf("## The component page template");
  const end = policy.indexOf("\n## ", start + 1);
  return policy
    .slice(start, end === -1 ? undefined : end)
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|[\s:|-]+\|$/.test(line))
    .map((line) => line.replace(/^\|/, "").split("|")[0]?.trim() ?? "")
    .filter((label) => label !== "" && label !== "Section");
};

/** The source trees a curated page's API table can resolve a name against. */
const documentedPackages = [
  new URL("packages/primitives/src/", repo),
  new URL("packages/components/src/", repo),
];

/**
 * The three forms a documented name can take in the packages' source.
 *
 * `readonly` is the prop convention, the two-space form covers the shared
 * `Props` object types, and an exported declaration is what a part row
 * (`CommandMenuInput`) names.
 */
const declarationForms = [
  /^\s*readonly ([A-Za-z_][A-Za-z0-9_]*)\??:/gm,
  /^  ([A-Za-z_][A-Za-z0-9_]*)\??:/gm,
  /^export (?:interface|type|const|function|class) ([A-Za-z_][A-Za-z0-9_]*)/gm,
];

/** Every name a prop interface or an exported part declares. */
const propDeclarations = (): ReadonlySet<string> =>
  new Set(
    documentedPackages.flatMap((dir) =>
      readdirSync(dir, { recursive: true, encoding: "utf8" })
        .filter((name) => /\.tsx?$/.test(name))
        .flatMap((name) => {
          const text = readFileSync(new URL(name, dir), "utf8");
          return declarationForms.flatMap((form) =>
            [...text.matchAll(form)].flatMap((match) => match[1] ?? []),
          );
        }),
    ),
  );

/** The backticked names in the first column of a page's `## API reference`. */
const apiNames = (body: string): ReadonlyArray<string> => {
  const start = body.indexOf("## API reference");
  if (start === -1) return [];
  const rest = body.slice(start);
  const section = rest.slice(0, rest.indexOf("\n## ", 1));

  return [...section.matchAll(/^\| ([^|]*)\|/gm)].flatMap((row) =>
    [...(row[1] ?? "").matchAll(/`([^`]+)`/g)].map((inner) => inner[1] ?? ""),
  );
};

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

  it("requires the sections its policy declares, in the policy's order", () => {
    // The guard was behind its own policy: `docs/preview-strategy.md`'s template
    // table has a `Keyboard` row, MISSION.md requires keyboard notes on every
    // component page, and the required list omitted it — so a page could drop its
    // keyboard contract and stay green. The table is parsed rather than trusted,
    // so a renamed or reordered row fails here too.
    const declared = policySections();
    const undeclared = required.filter(
      (section) => !declared.includes(section),
    );
    expect(
      undeclared,
      "the template policy has no row for these required sections",
    ).toEqual([]);

    const positions = required.map((section) => declared.indexOf(section));
    const ascending = positions.every(
      (position, index) =>
        index === 0 || position > (positions[index - 1] ?? -1),
    );
    expect(
      ascending,
      "the guard's section order disagrees with the policy",
    ).toBe(true);
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

  it("name only props and parts the packages declare", () => {
    // The API table is the page's most copyable claim, and nothing resolved it:
    // `page-snippets.test.ts` checks the imports in a fence, not the prop names
    // in a row, so renaming `onActivate` in the component left the page teaching
    // a prop that no longer exists — the same "copyable code must resolve" rule
    // the snippet walk exists for. This reads the two packages a curated page
    // can document (primitives, and the components built on it) and holds every
    // backticked name in the table's first column to a declaration there.
    //
    // It is a resolution check, not a completeness one: a prop a page omits is
    // a documentation gap, not a wrong name, and inherited `Omit`/`Props` types
    // make "every prop" a compiler question rather than a regex one.
    const declared = propDeclarations();
    const unresolved = pages.flatMap((name) =>
      apiNames(source(name))
        .filter((prop) => !declared.has(prop))
        .map((prop) => `${name}: ${prop}`),
    );

    // Floors, so a scan that stopped matching cannot pass.
    expect(declared.size).toBeGreaterThanOrEqual(400);
    expect(unresolved).toEqual([]);
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

  it("teaches the badge its rows wear, so the mark is not unexplained", () => {
    // The index marks the curated rows and offers `preview` as a query; a
    // reader needs the page to say what the mark means, and the mark's wording
    // lives in the component that renders it.
    const index = source("index.mdx");
    const badge = readFileSync(
      new URL("../components/docs/component-index.tsx", import.meta.url),
      "utf8",
    );

    expect(badge).toContain("Browser preview");
    expect(index).toContain("**Browser preview**");
    expect(index).toContain("`preview` finds");
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
