/**
 * The bench's readings, parsed (plan 730). Pure: a malformed line is `None`,
 * never a zero a landing could print.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";

/** The line the runtime prints when the window's tree is mounted. */
export const MOUNTED = "[gpuix] mount complete";

/** `bench rss=<bytes>` → megabytes. */
export const parseRss = (output: string): Option.Option<number> =>
  Option.flatMap(
    Option.fromNullishOr(/bench rss=(\d+)/.exec(output)?.[1]),
    (bytes) => {
      const value = Number(bytes);
      return value > 0 ? Option.some(value / (1024 * 1024)) : Option.none();
    },
  );

/** `du -sk <dir>` → megabytes. */
export const parseDu = (output: string): Option.Option<number> =>
  Option.flatMap(Option.fromNullishOr(/^(\d+)\s/.exec(output)?.[1]), (kib) => {
    const value = Number(kib);
    return value > 0 ? Option.some(value / 1024) : Option.none();
  });

/** The median of the runs; none for no runs. */
export const median = (
  values: ReadonlyArray<number>,
): Option.Option<number> => {
  const sorted = Arr.sort(values, Order.Number);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length === 0
    ? Option.none()
    : sorted.length % 2 === 1
      ? Arr.get(sorted, middle)
      : Option.map(
          Option.all([Arr.get(sorted, middle - 1), Arr.get(sorted, middle)]),
          ([a, b]) => (a + b) / 2,
        );
};
