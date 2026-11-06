import { packageCollections } from "./collection-routes";

export interface ComponentDependency {
  readonly packageName: string;

  readonly specifiers: ReadonlyArray<string>;

  readonly url?: string;
}

export interface PageDependencyEntry {
  readonly module: string;
  readonly dependencies: ReadonlyArray<ComponentDependency>;
}

export interface PageDependencyIndex {
  readonly pages: Readonly<Record<string, PageDependencyEntry>>;

  readonly unresolved: ReadonlyArray<string>;
}

const sitePages: Readonly<Record<string, string>> = {
  "@gpuixui/icons": "/graphics/icons/icon",
  "@gpuixui/tokens": "/getting-started",
};

export const normalisedName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "");

export const dependencyPackage = (specifier: string): string | undefined =>
  /^(@gpuixui\/[^/]+|@gpuix\/[^/]+)/.exec(specifier)?.[1];

export const packagePage = (packageName: string): string | undefined =>
  sitePages[packageName] ??
  packageCollections.find(
    (collection) =>
      collection.packageName === packageName &&
      collection.dir ===
        `packages/${packageName.replace("@gpuixui/", "")}/docs`,
  )?.route ??
  packageCollections.find(
    (collection) => collection.packageName === packageName,
  )?.route;

export const collectDependencies = (
  specifiers: ReadonlyArray<string>,
): ReadonlyArray<ComponentDependency> => {
  const byPackage = specifiers.reduce((groups, specifier) => {
    const packageName = dependencyPackage(specifier);
    if (packageName === undefined) return groups;
    const subpaths = groups.get(packageName) ?? new Set<string>();
    subpaths.add(specifier.slice(packageName.length));
    return groups.set(packageName, subpaths);
  }, new Map<string, Set<string>>());

  return [...byPackage.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([packageName, subpaths]) => ({
      packageName,
      specifiers: [...subpaths].toSorted((left, right) =>
        left.localeCompare(right),
      ),
      url: packagePage(packageName),
    }));
};
