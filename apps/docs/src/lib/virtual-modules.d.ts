/**
 * The build-time modules the Vite plugin provides.
 *
 * `virtual:gpuixui-public-symbols` carries the public symbol index, which the
 * plugin computes from the workspace source at build time.
 * `virtual:gpuixui-page-dependencies` carries the packages each package page's
 * component imports.
 * `virtual:gpuixui-page-sources` carries each package page's module and the
 * loader that reads it, so the page can print the implementation it documents.
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
