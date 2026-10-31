/**
 * What the window did with a picked set of paths.
 *
 * A picker the reader cancels answers `null` from the runtime, which is the
 * absence of a choice rather than an empty folder list; the label keeps the two
 * apart so a caller cannot report "0 files" for a cancel.
 */
export type PickedPaths =
  | { readonly _tag: "Cancelled" }
  | { readonly _tag: "Picked"; readonly paths: ReadonlyArray<string> };

/** The outcome of a path prompt, as the absence of a choice or a choice. */
export const pickedPaths = (
  paths: ReadonlyArray<string> | null | undefined,
): PickedPaths =>
  paths == null || paths.length === 0
    ? { _tag: "Cancelled" }
    : { _tag: "Picked", paths };
