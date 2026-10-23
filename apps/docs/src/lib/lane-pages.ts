import {
  collectionByOrigin,
  packageSections,
  type PackageCollection,
} from "./collection-routes";

/**
 * The pages a composition lane's packages mount.
 *
 * A lane page describes a way of composing the library, but the packages that
 * fill the lane also ship their own pages. Hand-writing that list left three
 * data pages and five workspace packages out of the lane a reader arrives on,
 * so the list is generated from the same index every component page comes from.
 * Adding a page to a package adds it here without a docs change.
 */

/** The lanes whose packages mount pages of their own. */
export type PackageLane = "data-display" | "workspace";

const laneSections: Readonly<Record<PackageLane, string>> = {
  "data-display": "Data display",
  workspace: "Workspace",
};

/** The fields a lane list needs from a page. */
export interface LanePageRow {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly section: string;
}

/** One package's pages, in the order the sidebar lists them. */
export interface LanePageGroup {
  readonly collection: PackageCollection;
  readonly pages: ReadonlyArray<LanePageRow>;
}

/**
 * The lane's pages, grouped by the package that ships them.
 *
 * A collection with no pages is left out: the site mounts some collections
 * before the package writes its documentation, and an empty group is not a
 * package a reader can visit. The package order is the sidebar's.
 */
export const lanePageGroups = (
  pages: ReadonlyArray<LanePageRow>,
  lane: PackageLane,
): ReadonlyArray<LanePageGroup> => {
  const section = laneSections[lane];
  const order = packageSections.find((candidate) => candidate.name === section);

  return (order?.origins ?? [])
    .map((origin) => collectionByOrigin[origin])
    .map((collection) => ({
      collection,
      pages: pages.filter(
        (page) =>
          page.section === section &&
          page.url.startsWith(`${collection.route}/`),
      ),
    }))
    .filter((group) => group.pages.length > 0);
};

/** How many pages the lane's packages mount. */
export const lanePageTotal = (groups: ReadonlyArray<LanePageGroup>): number =>
  groups.reduce((total, group) => total + group.pages.length, 0);
