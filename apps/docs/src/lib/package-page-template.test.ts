import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";

const root = new URL("../../../../", import.meta.url);

interface PackagePage {
  readonly path: string;
  readonly headings: ReadonlyArray<string>;
}

const readPage = (path: string): PackagePage => ({
  path,
  headings: [
    ...readFileSync(new URL(path, root), "utf8").matchAll(/^## (.+)$/gm),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1].trim()])),
});

const pages: ReadonlyArray<PackagePage> = packageCollections.flatMap(
  (collection) =>
    collectionPages(root, collection)
      .filter((name) => name !== "index.mdx")
      .toSorted()
      .map((name) => readPage(`${collection.dir}/${name}`)),
);

interface Section {
  readonly name: string;
  readonly accepts: (heading: string) => boolean;
}

const sections: ReadonlyArray<Section> = [
  { name: "API", accepts: (heading) => heading === "API" },
];

interface KnownGap {
  readonly page: string;
  readonly section: string;

  readonly owner: string;
}

const knownGaps: ReadonlyArray<KnownGap> = [];

const missing = pages.flatMap((page) =>
  sections.flatMap((section) =>
    page.headings.some(section.accepts)
      ? []
      : [{ page: page.path, section: section.name }],
  ),
);

const isKnown = (page: string, section: string): boolean =>
  knownGaps.some((gap) => gap.page === page && gap.section === section);

describe("the package page template", () => {
  it("scans every page the package collections mount", () => {
    expect(packageCollections.length).toBeGreaterThanOrEqual(3);
    expect(pages.length).toBeGreaterThanOrEqual(69);
    expect(pages.every((page) => page.headings.length > 0)).toBe(true);
  });

  it("gives every page its API and its accessibility budget", () => {
    const unrecorded = missing.filter((gap) => !isKnown(gap.page, gap.section));

    expect(
      unrecorded.map((gap) => `${gap.page}: no ${gap.section} section`),
    ).toEqual([]);
  });

  it("keeps a known gap only while the section is still missing", () => {
    const stale = knownGaps.filter(
      (gap) =>
        !missing.some(
          (found) => found.page === gap.page && found.section === gap.section,
        ),
    );

    expect(
      stale.map((gap) => `${gap.page}: ${gap.section} is documented now`),
    ).toEqual([]);
  });

  it("names an owner and a mounted page for every known gap", () => {
    const mounted = new Set(pages.map((page) => page.path));

    const unowned = knownGaps.filter(
      (gap) => gap.owner.length === 0 || !mounted.has(gap.page),
    );

    expect(unowned.map((gap) => gap.page)).toEqual([]);
  });

  it("keeps no gap in the ledger", () => {
    expect(knownGaps).toEqual([]);
    expect(missing).toEqual([]);
  });

  it("states the two sections it holds, and where Related comes from", () => {
    const policy = readFileSync(
      new URL("docs/preview-strategy.md", root),
      "utf8",
    ).replace(/\s+/g, " ");
    const ledger = readFileSync(
      new URL("apps/docs/README.md", root),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(sections.map((section) => section.name)).toEqual(["API"]);
    expect(policy).toContain("`## API`");
    expect(policy).not.toContain("Four sections are not optional");
    expect(ledger).not.toContain("the evidence section and `## Related`");
    expect(ledger).toContain("src/lib/related.ts");
  });
});
