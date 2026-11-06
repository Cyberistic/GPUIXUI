import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { curatedTwinOf } from "./curated-twins";
import { relatedFamilies, soloPages } from "./related";

const root = new URL("../../../../", import.meta.url);

const mountedUrl = (route: string, file: string): string => {
  const name = file.replace(/\.mdx$/, "");
  return name === "index" ? route : `${route}/${name}`;
};

const packagePages = packageCollections.flatMap((collection) =>
  collectionPages(root, collection)
    .filter((file) => file !== "index.mdx")
    .map((file) => mountedUrl(collection.route, file))
    .filter((url) => curatedTwinOf(url) === undefined),
);

const curatedPages = readdirSync(
  new URL("apps/docs/content/docs/components/", root),
)
  .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
  .map((file) => mountedUrl("/components", file));

const served = new Set([...packagePages, ...curatedPages]);

const resolves = (href: string): string => curatedTwinOf(href) ?? href;

const familyHrefs = new Set(
  relatedFamilies.flatMap((family) =>
    family.pages.map((member) => resolves(member.href)),
  ),
);

describe("the related-component families", () => {
  it("links only addresses the site answers", () => {
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
