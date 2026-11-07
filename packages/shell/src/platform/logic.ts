export type PickedPaths =
  | { readonly _tag: "Cancelled" }
  | { readonly _tag: "Picked"; readonly paths: ReadonlyArray<string> };

export const pickedPaths = (
  paths: ReadonlyArray<string> | null | undefined,
): PickedPaths =>
  paths == null || paths.length === 0
    ? { _tag: "Cancelled" }
    : { _tag: "Picked", paths };
