import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { relatedFamilies, relatedFor, soloPages } from "./related";

/**
 * The related-component families behind `RelatedStrip`.
 *
 * A package page is Markdown the site mounts, so it cannot resolve its siblings
 * and most of the ninety-odd pages shipped without a `## Related` section. The
 * site prints a family instead; this guard holds the data to the pages: a page
 * that lands in no family is a reader with no way across the lane, a link that
 * names no mounted page is a 404 from the bottom of the page, and a label that
 * drifts from the page's own frontmatter tells a reader the section is called
 * something it is not.
 */

const root = new URL("../../../../", import.meta.url);
const curatedDir = new URL("../../content/docs/components/", import.meta.url);

/** A page's frontmatter title, without the quotes a YAML scalar may carry. */
const title = (file: URL): string =>
  (/^title:\s*(.+)$/m.exec(readFileSync(file, "utf8"))?.[1] ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");

/** The curated pages, keyed by the URL they serve. */
const curated = new Map(
  readdirSync(curatedDir)
    .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
    .map((name) => [
      `/docs/components/${name.replace(/\.mdx$/, "")}`,
      title(new URL(name, curatedDir)),
    ]),
);

/**
 * Every page the package collections serve.
 *
 * A curated page keeps its URL, so the package page it shadows is not mounted
 * and has no siblings to link.
 */
const packagePages = new Map(
  packageCollections.flatMap((collection) =>
    collectionPages(root, collection).flatMap((name) => {
      if (name === "index.mdx") return [];
      const url = `${collection.route}/${name.replace(/\.mdx$/, "")}`;
      if (curated.has(url)) return [];
      return [
        [url, title(new URL(`${collection.dir}/${name}`, root))] as const,
      ];
    }),
  ),
);

/** Every page a family may link: the curated set and the mounted package set. */
const mounted = new Map([...curated, ...packagePages]);

/**
 * The mounted package pages that write the section themselves.
 *
 * They are the reason the strip takes the page's headings: printing the family
 * under a written list would offer two sets of siblings.
 */
const writtenRelated = packageCollections.flatMap((collection) =>
  collectionPages(root, collection).flatMap((name) => {
    if (name === "index.mdx") return [];
    const url = `${collection.route}/${name.replace(/\.mdx$/, "")}`;
    if (curated.has(url)) return [];
    const body = readFileSync(
      new URL(`${collection.dir}/${name}`, root),
      "utf8",
    );
    return /^## Related$/m.test(body) ? [url] : [];
  }),
);

const members = relatedFamilies.flatMap((family) =>
  family.pages.map((member) => ({ family, member })),
);

describe("the related families", () => {
  it("covers every mounted package page, or argues it as a solo", () => {
    // Bug guarded: a page with no family reads as the end of the lane. The
    // floor makes a walk that stopped matching fail instead of passing empty.
    const placed = new Set(members.map(({ member }) => member.href));
    const unplaced = [...packagePages.keys()].filter(
      (url) => !placed.has(url) && !soloPages.some((solo) => solo.href === url),
    );

    expect(packagePages.size).toBeGreaterThanOrEqual(90);
    expect(unplaced).toEqual([]);
  });

  it("counts the pages that write the section the strip would repeat", () => {
    // The strip stays silent on these; a floor keeps the premise measurable,
    // so a walk that stopped matching cannot make the silence look correct.
    expect(writtenRelated.length).toBeGreaterThanOrEqual(20);
    expect(writtenRelated.length).toBeLessThan(packagePages.size);
    expect(writtenRelated.every((url) => packagePages.has(url))).toBe(true);
  });

  it("links only pages the site mounts, labelled with the page's own title", () => {
    const wrong = members.flatMap(({ member }) => {
      const actual = mounted.get(member.href);
      if (actual === undefined) return [`${member.href}: no mounted page`];
      return actual === member.label
        ? []
        : [
            `${member.href}: reads "${member.label}", the page says "${actual}"`,
          ];
    });

    expect(wrong).toEqual([]);
  });

  it("gives every family more than one page, and no page two families", () => {
    const small = relatedFamilies
      .filter((family) => family.pages.length < 2)
      .map((family) => family.name);
    const twice = members
      .map(({ member }) => member.href)
      .filter((href, index, all) => all.indexOf(href) !== index);

    expect(relatedFamilies.length).toBeGreaterThanOrEqual(20);
    expect(small).toEqual([]);
    expect([...new Set(twice)]).toEqual([]);
  });

  it("keeps a solo out of every family, with a reason", () => {
    const placed = new Set(members.map(({ member }) => member.href));
    const problems = soloPages.flatMap((solo) =>
      !mounted.has(solo.href)
        ? [`${solo.href}: no mounted page`]
        : placed.has(solo.href)
          ? [`${solo.href}: is in a family and argued as a solo`]
          : solo.reason.trim().length === 0
            ? [`${solo.href}: no reason`]
            : [],
    );

    expect(packagePages.size + curated.size).toBeGreaterThanOrEqual(120);
    expect(problems).toEqual([]);
  });
});

describe("relatedFor", () => {
  it("answers with the page's siblings, not the page itself", () => {
    const related = relatedFor("/docs/components/ripple-button");

    expect(related?.family.name).toBe("Actions and their effects");
    expect(related?.pages.map((page) => page.href)).toEqual([
      "/docs/components/button",
      "/docs/components/liquid-button",
      "/docs/components/shine-button",
      "/docs/components/copy-button",
      "/docs/components/theme-toggler",
    ]);
  });

  it("answers nothing for an argued solo or a page outside the component lanes", () => {
    expect(relatedFor("/docs/primitives/tooltip")).toBeUndefined();
    expect(relatedFor("/docs/components/not-a-page")).toBeUndefined();
    expect(relatedFor("/docs/theming")).toBeUndefined();
  });
});
