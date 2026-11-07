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
