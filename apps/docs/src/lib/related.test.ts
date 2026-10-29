import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { curatedTwinOf } from "./curated-twins";
import { relatedFamilies, soloPages } from "./related";

/**
 * The related line's model, held to the pages the site serves.
 *
 * `RelatedStrip` renders nothing when `relatedFor` has no answer, which is the
 * right behaviour for an argued solo and a silent hole for a page that simply
 * landed after the families were written: the MediaPlayer page shipped with no
 * family, so it ended without a related line at all and no suite noticed.
 *
 * The guard reads the mounted collections off disk rather than the Fumadocs
 * loaders (which need the MDX build), so it answers for the pages the site
 * actually serves — including the five primitive pages a curated page retires.
 */

/** The repository root, four directories above `apps/docs/src/lib`. */
const root = new URL("../../../../", import.meta.url);

/** The URL a mounted collection file answers. */
const mountedUrl = (route: string, file: string): string => {
  const name = file.replace(/\.mdx$/, "");
  return name === "index" ? route : `${route}/${name}`;
};

/** Every package page the site serves, with a curated twin's route retired. */
const packagePages = packageCollections.flatMap((collection) =>
  collectionPages(root, collection)
    .filter((file) => file !== "index.mdx")
    .map((file) => mountedUrl(collection.route, file))
    .filter((url) => curatedTwinOf(url) === undefined),
);

/** Every curated component page. */
const curatedPages = readdirSync(
  new URL("apps/docs/content/docs/components/", root),
)
  .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
  .map((file) => mountedUrl("/components", file));

/** The pages a family may choose between. */
const served = new Set([...packagePages, ...curatedPages]);

/** The address a reader lands on when they follow a family link. */
const resolves = (href: string): string => curatedTwinOf(href) ?? href;

const familyHrefs = new Set(
  relatedFamilies.flatMap((family) =>
    family.pages.map((member) => resolves(member.href)),
  ),
);

describe("the related-component families", () => {
  it("gives every page the site serves a family or an argued solo", () => {
    const uncovered = [...served].filter(
      (url) =>
        !familyHrefs.has(url) && !soloPages.some((solo) => solo.href === url),
    );

    expect(served.size).toBeGreaterThan(100);
    expect(uncovered).toEqual([]);
  });

  it("links only addresses the site answers", () => {
    // A renamed page leaves a 404 in every sibling's strip; a link to a
    // retired primitive page follows its 301 to the curated page.
    const unanswered = relatedFamilies.flatMap((family) =>
      family.pages.flatMap((member) =>
        served.has(resolves(member.href))
          ? []
          : [`${family.name}: ${member.href} → ${resolves(member.href)}`],
      ),
    );

    expect(relatedFamilies.length).toBeGreaterThan(10);
    expect(unanswered).toEqual([]);
  });

  it("keeps every family a named set of at least two distinct pages", () => {
    const malformed = relatedFamilies.flatMap((family) => {
      const seen = new Set<string>();
      const duplicates = family.pages
        .filter((member) => {
          if (seen.has(member.href)) return true;
          seen.add(member.href);
          return false;
        })
        .map((member) => member.href);

      if (family.name.trim().length === 0) return [`${family.name}: no name`];
      if (family.pages.length < 2) return [`${family.name}: one page`];
      return duplicates.map((href) => `${family.name}: ${href} twice`);
    });

    expect(malformed).toEqual([]);
  });

  it("argues a solo only for a page it serves, never beside a family", () => {
    const stale = soloPages.filter(
      (solo) =>
        !served.has(solo.href) ||
        solo.reason.trim().length === 0 ||
        familyHrefs.has(solo.href),
    );

    expect(soloPages.length).toBeGreaterThan(0);
    expect(stale.map((solo) => solo.href)).toEqual([]);
  });
});
