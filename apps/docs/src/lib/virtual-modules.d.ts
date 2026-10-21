/**
 * The build-time modules the Vite plugin provides.
 *
 * `virtual:gpuixui-public-symbols` carries the public symbol index, which the
 * plugin computes from the workspace source at build time.
 */
declare module "virtual:gpuixui-public-symbols" {
  const index: import("./public-symbols").PublicSymbolIndex;
  export default index;
}
