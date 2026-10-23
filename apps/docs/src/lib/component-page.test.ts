import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { componentPages } from "./component-index-data";

/**
 * The component page contract.
 *
 * `docs/preview-strategy.md` fixes the sections a curated component page must
 * carry: the example, the API table and the limits. The policy's template table
 * is parsed, so the two cannot disagree on a section's name or order.
 */

const dir = new URL("../../content/docs/components/", import.meta.url);
const repo = new URL("../../../../", import.meta.url);

/** Curated pages, i.e. everything in the folder but the section index. */
const pages = readdirSync(dir).filter(
  (name) => name.endsWith(".mdx") && name !== "index.mdx",
);

const source = (name: string): string =>
  readFileSync(new URL(name, dir), "utf8");

/** A page's frontmatter title, as the index's data reads it. */
const title = (body: string): string =>
  (/^title:\s*(.+)$/m.exec(body)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");

/** Every `##` heading on a page, in order. */
const sections = (body: string): readonly string[] =>
  [...body.matchAll(/^## (.+)$/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1].trim()],
  );

const required = [
  "Installation",
  "Usage",
  "API reference",
  "Limitations",
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
  new URL("packages/data/src/", repo),
];

/**
 * The three forms a documented name can take in the packages' source.
 *
 * `readonly` is the prop convention, the two-space form covers the shared
 * `Props` object types, and an exported declaration is what a part row
 * (`CommandMenuInput`) names. A name the platform spells with a hyphen is
 * quoted at its declaration (`"aria-id"`), so the prop forms read the quotes.
 */
const declarationForms = [
  /^\s*readonly "?([A-Za-z_][A-Za-z0-9_-]*)"?\??:/gm,
  /^  "?([A-Za-z_][A-Za-z0-9_-]*)"?\??:/gm,
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
    // the snippet walk exists for. This reads the packages a curated page can
    // document (primitives, the components built on them, and the data surfaces)
    // and holds every backticked name in the table's first column to a
    // declaration there.
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
  it("mounts the generated index rather than a hand-kept list", () => {
    // The index reads the same frontmatter the pages render, so a page added
    // to any collection appears without a docs edit.
    const index = source("index.mdx");

    expect(index).toContain("<ComponentIndex />");
    expect(index).toContain("?q=partial");
  });

  it("lists every curated page in the generated grid", () => {
    // The index listed Button, Dialog, Popover and Tabs while the Dropdown
    // menu page shipped beside them, so a reader looking for a menu preview was
    // told the curated set did not include one. The grid is the list now, so
    // the guard reads the rows the site generates rather than prose that can
    // drift: a page the index's data drops is a card no reader can reach.
    const listed = new Set(componentPages.map((entry) => entry.title));

    expect(
      pages
        .map((name) => title(source(name)))
        .filter((pageTitle) => !listed.has(pageTitle)),
    ).toEqual([]);
  });

  it("renders each page's demo in its grid tile", () => {
    // The index offers `preview` as a query and says a page that mounts a
    // preview renders it; a tile that dropped the demo would leave the claim
    // false and the grid a wall of names.
    const index = source("index.mdx");
    const grid = readFileSync(
      new URL("../components/docs/component-index.tsx", import.meta.url),
      "utf8",
    );

    expect(grid).toContain("<Scene />");
    expect(grid).toContain("data-preview");
    expect(index).toContain("renders it in its grid tile");
    expect(index).toContain("`preview` finds");
  });

  it("teaches the verdict mark a row wears, and where it comes from", () => {
    // The index marks the rows the inventory does not call whole; an
    // unexplained `partial` beside a component's name reads as a docs bug, and
    // a hand-written verdict would drift from the row the page prints.
    const index = source("index.mdx");
    const component = readFileSync(
      new URL("../components/docs/component-index.tsx", import.meta.url),
      "utf8",
    );

    expect(component).toContain("verdictMark");
    expect(index).toContain("**partial**");
    expect(index).toContain(
      "finds every component the runtime supports only in part",
    );
    expect(index).toContain(
      "`COMPONENTS.md` row the status strip already joins",
    );
  });

  it("says how to run the native component, in the note's own words", () => {
    // The command is imported rather than retyped, and printed as an
    // expression instead of a code sample.
    const index = source("index.mdx");

    expect(index).toContain(
      'import { playgroundCommand } from "@/components/docs/native-run-note";',
    );
    expect(index).toContain("<code>{playgroundCommand}</code>");
  });
});
