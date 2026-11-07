import {
  collectionByOrigin,
  packageSections,
  type PackageCollection,
} from "./collection-routes";

export type PackageLane = "data-display" | "workspace";

const laneSections: Readonly<Record<PackageLane, string>> = {
  "data-display": "Data display",
  workspace: "Workspace",
};

export interface LanePageRow {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly section: string;
}

export interface LanePageGroup {
  readonly collection: PackageCollection;
  readonly pages: ReadonlyArray<LanePageRow>;
}

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

export const lanePageTotal = (groups: ReadonlyArray<LanePageGroup>): number =>
  groups.reduce((total, group) => total + group.pages.length, 0);
