/**
 * The replace half of a find bar: apply matched ranges to a document and decide
 * where the find cursor goes next.
 *
 * Pure, because the only interesting part is offset arithmetic: a replacement
 * that changes length shifts every later match, so ranges must be applied from
 * the end of the document backwards. The runtime's half — whether the new text
 * re-washes, and whether an editor's text can be washed at all — is measured by
 * the `search-replace` scenario (plan `334`).
 */
import * as Arr from "effect/Array";
import * as Num from "effect/Number";
import * as Option from "effect/Option";

/**
 * One `[start, end)` match in UTF-16 code units — the tuple `findRanges`
 * returns, so no conversion sits between the matcher and the replacement.
 */
export type ReplaceRange = readonly [start: number, end: number];

/** The text a range covers. */
export const matchText = (text: string, range: ReplaceRange): string =>
  text.slice(range[0], range[1]);

/** `text` with one range replaced. */
export const replaceRange = (
  text: string,
  range: ReplaceRange,
  replacement: string,
): string =>
  `${text.slice(0, range[0])}${replacement}${text.slice(range[1])}`;

/**
 * `text` with every range replaced.
 *
 * Right to left: applying a length-changing replacement from the start would
 * move every range still to be applied and corrupt the document.
 */
export const replaceRanges = (
  text: string,
  ranges: ReadonlyArray<ReplaceRange>,
  replacement: string,
): string =>
  Arr.reduceRight(ranges, text, (current, range) =>
    replaceRange(current, range, replacement),
  );

/**
 * Where the find cursor belongs after replacing the match at `replacedIndex`.
 *
 * `None` when nothing matches any more; otherwise the same position clamped to
 * the new last match, so the cursor lands on the match that followed the one
 * just replaced and never points past the end.
 */
export const nextCursor = (
  totalAfter: number,
  replacedIndex: number,
): Option.Option<number> =>
  totalAfter <= 0
    ? Option.none()
    : Option.some(Num.min(replacedIndex, totalAfter - 1));
