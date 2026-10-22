/**
 * The build-time modules the Vite plugin provides.
 *
 * `virtual:gpuixui-public-symbols` carries the public symbol index, which the
 * plugin computes from the workspace source at build time.
 * `virtual:gpuixui-page-dependencies` carries the packages each package page's
 * component imports.
 */
declare module "virtual:gpuixui-public-symbols" {
  const index: import("./public-symbols").PublicSymbolIndex;
  export default index;
}

declare module "virtual:gpuixui-page-dependencies" {
  const index: import("./page-dependencies").PageDependencyIndex;
  export default index;
}
