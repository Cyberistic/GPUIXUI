/**
 * What a package page's component is built on.
 *
 * `MISSION.md` asks every component page to list the packages it needs. The
 * package pages are Markdown, so the site cannot generate a table into them —
 * and a hand-written list beside a component drifts the first time an import
 * moves. This module is the model the site renders instead: the workspace
 * packages the component's own module imports, read at build time, with the
 * page that documents each one.
 *
 * Pure: `page-dependencies-source.ts` reads the workspace and hands the index
 * over; the strip and its tests only see this shape.
 */

/** One workspace package a component's module imports. */
export interface ComponentDependency {
  /** The package as the import names it: `@gpuixui/tokens`, `@gpuix/react`. */
  readonly packageName: string;
  /** Every subpath the module imports from it, e.g. `/floating`; empty at the root. */
  readonly specifiers: ReadonlyArray<string>;
  /** The page that documents the package, when the site mounts one. */
  readonly url?: string;
}

/** What one page depends on, and the module the imports were read from. */
export interface PageDependencyEntry {
  /** Repository-relative file the imports come from. */
  readonly module: string;
  readonly dependencies: ReadonlyArray<ComponentDependency>;
}

/** Every mounted package page, keyed by the URL it renders at. */
export interface PageDependencyIndex {
  readonly pages: Readonly<Record<string, PageDependencyEntry>>;
  /** Pages whose component module could not be resolved. Must stay empty. */
  readonly unresolved: ReadonlyArray<string>;
}

/**
 * The page that documents a workspace package.
 *
 * A package the site has no page for is still listed — it is a dependency the
 * reader may need — but its name stays plain text rather than link nowhere.
 */
const documentedAt: Readonly<Record<string, string>> = {
  "@gpuixui/primitives": "/docs/primitives",
  "@gpuixui/components": "/docs/components",
  "@gpuixui/icons": "/docs/icons/icon",
  "@gpuixui/tokens": "/docs/theming",
  "@gpuixui/tw": "/docs/styling",
  "@gpuixui/motion": "/docs/motion",
  "@gpuixui/keyboard": "/docs/keyboard",
  "@gpuixui/testing": "/docs/testing",
  "@gpuix/react": "/docs/runtime",
  "@gpuix/native": "/docs/runtime",
};

/** A name with its case and punctuation removed, so `OTPField` matches `otp-field`. */
export const normalisedName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The workspace package a specifier imports from.
 *
 * `@gpuixui/tokens`, `@gpuixui/primitives/core` and `@gpuix/react/floating`
 * name three packages between them; a framework import is not a dependency of
 * the library and returns nothing.
 */
export const dependencyPackage = (specifier: string): string | undefined =>
  /^(@gpuixui\/[^/]+|@gpuix\/[^/]+)/.exec(specifier)?.[1];

/** The page that documents a package, when the site mounts one. */
export const packagePage = (packageName: string): string | undefined =>
  documentedAt[packageName];

/** Group a module's import specifiers into the workspace packages it needs. */
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
