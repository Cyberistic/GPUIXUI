/**
 * The launcher's results and its ranking rule: a title that starts with the
 * query outranks one that only contains it, and the groups keep their order.
 */

import type { Result } from "./data.js";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Str from "effect/String";

const groups = ["Apps", "Commands", "Files"] as const;

/** The results for a query, grouped in order, prefix matches first. */
export const rank = (
  all: ReadonlyArray<Result>,
  query: string,
): ReadonlyArray<Result> => {
  const needle = Str.toLowerCase(Str.trim(query));
  const matching = Arr.filter(all, (result) =>
    Str.includes(needle)(Str.toLowerCase(result.title)),
  );
  const score = (result: Result) =>
    groups.indexOf(result.group) * 2 +
    (Str.startsWith(needle)(Str.toLowerCase(result.title)) ? 0 : 1);
  return Arr.sort(matching, Order.mapInput(Order.Number, score));
};

/** The highlighted index after an arrow, clamped to the list. */
export const moveHighlight = (count: number, at: number, by: 1 | -1): number =>
  Math.min(Math.max(0, at + by), Math.max(0, count - 1));
