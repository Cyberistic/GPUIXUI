/**
 * The consumer-side rule for a controlled `<diff>` (plan `648`).
 *
 * The element never collapses a file or expands a preview by itself: a header
 * click emits `toggleFile` and a `ShowMore` click emits `showMore`. These are
 * the two state transitions the view (and any diff component) applies to that
 * payload, kept pure so they are testable without a renderer.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** Add `path` when absent, remove it when present; insertion order is stable. */
export const togglePath = (
  collapsed: Option.Option<ReadonlyArray<string>>,
  path: string,
): ReadonlyArray<string> => {
  const paths = Option.getOrElse(collapsed, (): ReadonlyArray<string> => []);
  return Arr.contains(paths, path)
    ? Arr.filter(paths, (entry) => entry !== path)
    : Arr.append(paths, path);
};

/**
 * Raise the preview cap by the `showMore` payload.
 *
 * The payload is the hidden line count as a string. A missing cap, a
 * non-integer payload or a non-positive one leaves the cap untouched: the
 * element cannot paint a `ShowMore` row without a cap, and a consumer must
 * never guess from a malformed payload (plan `648`).
 */
export const revealMore = (
  maxLines: Option.Option<number>,
  remaining: string,
): Option.Option<number> => {
  const parsed = Number(remaining);
  return Number.isInteger(parsed) && parsed > 0
    ? Option.map(maxLines, (current) => current + parsed)
    : maxLines;
};
