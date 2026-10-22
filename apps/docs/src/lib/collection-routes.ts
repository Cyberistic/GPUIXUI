import {
  componentDocsRoute,
  dataDocsRoute,
  iconDocsRoute,
  primitiveDocsRoute,
} from "./shared";

/**
 * The package documentation the site mounts.
 *
 * Each package writes the page a component ships with; the site renders that
 * directory rather than a copy, so the page and the package cannot disagree.
 * This module is pure data: `package-docs.ts` builds the loaders from it and
 * `package-docs.test.ts` holds it to the directories on disk.
 */

/** Which package a page came from. */
export type PackageOrigin = "primitives" | "icons" | "components" | "data";

/** One mounted package docs directory. */
export interface PackageCollection {
  readonly origin: PackageOrigin;
  /** The package directory, relative to the repository root. */
  readonly dir: string;
  /** The published package the pages belong to, e.g. `@gpuixui/primitives`. */
  readonly packageName: string;
  /** Where the collection's pages render. */
  readonly route: string;
  /** The sidebar folder the pages fill. */
  readonly section: string;
  /** What the note above a page calls the package. */
  readonly kind: string;
}

const primitives: PackageCollection = {
  origin: "primitives",
  dir: "packages/primitives/docs",
  packageName: "@gpuixui/primitives",
  route: primitiveDocsRoute,
  section: "Primitives",
  kind: "primitive",
};

const icons: PackageCollection = {
  origin: "icons",
  dir: "packages/icons/docs",
  packageName: "@gpuixui/icons",
  route: iconDocsRoute,
  section: "Primitives",
  kind: "icon set",
};

const components: PackageCollection = {
  origin: "components",
  dir: "packages/components/docs",
  packageName: "@gpuixui/components",
  route: componentDocsRoute,
  section: "Components",
  kind: "component",
};

const data: PackageCollection = {
  origin: "data",
  dir: "packages/data/docs",
  packageName: "@gpuixui/data",
  route: dataDocsRoute,
  section: "Data display",
  kind: "data surface",
};

export const packageCollections = [
  primitives,
  icons,
  components,
  data,
] as const;

export const collectionByOrigin = {
  primitives,
  icons,
  components,
  data,
} satisfies Record<PackageOrigin, PackageCollection>;

/**
 * The sidebar folders the package pages fill.
 *
 * The primitive layer is one section even though two packages write its pages;
 * a reader looks for a lane of the library, not for a package boundary.
 */
export const packageSections: ReadonlyArray<{
  readonly name: string;
  readonly separator: string;
  readonly origins: ReadonlyArray<PackageOrigin>;
}> = [
  {
    name: "Primitives",
    separator: "All primitives",
    origins: ["primitives", "icons"],
  },
  {
    name: "Components",
    separator: "All components",
    origins: ["components"],
  },
  {
    name: "Data display",
    separator: "All data surfaces",
    origins: ["data"],
  },
];
