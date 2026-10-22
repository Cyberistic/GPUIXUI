import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";

/**
 * The component page template, enforced on the pages a package writes.
 *
 * `MISSION.md` makes a page part of a component's definition, and
 * `docs/preview-strategy.md` records the template: a page carries its prop
 * documentation, the runtime's accessibility budget and limitations, the
 * evidence that the behaviour was measured, and where a reader goes next.
 * The curated pages are held to the full template by `component-page.test.ts`.
 * The package pages are strategy 4 — no browser preview, the real API — and
 * until this guard they were exempt from everything: a page could lose its
 * `## API` table or its limitations and the build stayed green, while the site
 * kept rendering it as the component's documentation.
 *
 * Only the sections every page can carry are required. A page without sizes,
 * a keyboard path or a theming decision omits that section by design
 * (`docs/preview-strategy.md`), so the guard holds the four that no component
 * page may hide:
 *
 *   - `## API` — what the props are;
 *   - an accessibility or limitations section — the runtime's budget;
 *   - an evidence section (`## Verification` or `## Testing`) — what ran;
 *   - `## Related` — the sibling, parent or alternative.
 *
 * The known gaps are listed with the workstream that owns the page, and a gap
 * that is fixed fails the staleness case, so the list cannot outlive it.
 */

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

/** One required section: the headings that satisfy it, and what it is for. */
interface Section {
  readonly name: string;
  readonly accepts: (heading: string) => boolean;
}

const sections: ReadonlyArray<Section> = [
  { name: "API", accepts: (heading) => heading === "API" },
  {
    name: "accessibility or limitations",
    accepts: (heading) =>
      heading.startsWith("Accessibility") || heading === "Limitations",
  },
];

interface KnownGap {
  /** Page path relative to the repo root. */
  readonly page: string;
  readonly section: string;
  /** The workstream that owns the page, so a reader knows who closes it. */
  readonly owner: string;
}

/**
 * Pages missing a section today. Each is a TODO interlock row; the staleness
 * case below fails once the owner adds the section, so the entry is deleted in
 * the same change.
 */
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
    // Floors, so a walk that stopped matching cannot pass.
    expect(packageCollections.length).toBeGreaterThanOrEqual(3);
    expect(pages.length).toBeGreaterThanOrEqual(69);
    expect(pages.every((page) => page.headings.length > 0)).toBe(true);
  });

  it("gives every page its API, its accessibility budget, its evidence and its siblings", () => {
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

  it("keeps the policy's description of the ledger true", () => {
    // The policy said the one page without `## Related` "is recorded in
    // TODO.md and in the guard's own list" after the page had been fixed and
    // the entry deleted, so a reader was sent to two empty ledgers. The policy
    // has to describe the ledger it has, and the page it names has to keep the
    // section it was fixed for.
    const policy = readFileSync(
      new URL("docs/preview-strategy.md", root),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(policy.includes("it is empty today")).toBe(knownGaps.length === 0);
    expect(policy).not.toContain("that gap is recorded in `TODO.md`");

    const messageScroller = pages.find((page) =>
      page.path.endsWith("message-scroller.mdx"),
    );
    expect(messageScroller?.headings).toContain("Related");
  });
});
