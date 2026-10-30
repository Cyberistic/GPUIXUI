/**
 * The build-time modules the Vite plugin provides.
 *
 * `virtual:gpuixui-public-symbols` carries the public symbol index, which the
 * plugin computes from the workspace source at build time.
 * `virtual:gpuixui-page-dependencies` carries the packages each package page's
 * component imports.
 * `virtual:gpuixui-page-sources` carries each package page's module and the
 * loader that reads it, so the page can print the implementation it documents.
 * `virtual:gpuixui-package-graph` carries the workspace's packages and the
 * dependencies their manifests declare.
 * `virtual:gpuixui-registry` carries the shadcn registry's index and a loader
 * per item, so a route can answer with one generated document.
 */
declare module "virtual:gpuixui-public-symbols" {
  const index: import("./public-symbols").PublicSymbolIndex;
  export default index;
}

declare module "virtual:gpuixui-page-dependencies" {
  const index: import("./page-dependencies").PageDependencyIndex;
  export default index;
}

declare module "virtual:gpuixui-page-sources" {
  export const pages: ReadonlyArray<{
    readonly url: string;
    readonly module: string;
  }>;
  export const unresolved: ReadonlyArray<string>;
  export const loaders: Readonly<
    Record<string, import("./page-source").SourceLoader>
  >;
}

declare module "virtual:gpuixui-package-graph" {
  const graph: import("./package-graph").PackageGraph;
  export default graph;
}

declare module "virtual:gpuixui-registry" {
  /** The index document, `registry.json`, as it is served. */
  export const registryIndex: string;
  /** Every item name the registry serves, in index order. */
  export const registryNames: ReadonlyArray<string>;
  /** Pages the generator could not resolve to a module. Must stay empty. */
  export const registryUnresolved: ReadonlyArray<string>;
  /** One JSON document per item, each loaded on its own. */
  export const loadRegistryItem: Readonly<
    Record<string, () => Promise<string>>
  >;
}
