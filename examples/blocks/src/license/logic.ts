/** The Hunter License block's rules: the directory's filter and a rank's words. */

import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import type { Hunter, Specialty } from "./data.js";

/** The sidebar's scope: everyone, the star hunters, or one specialty. */
export type Scope = "all" | "stars" | Specialty;

/** The hunters a scope lists, most stars first, then by name. */
export const huntersIn = (
  all: ReadonlyArray<Hunter>,
  scope: Scope,
): ReadonlyArray<Hunter> =>
  Arr.sort(
    Arr.filter(
      all,
      (hunter) =>
        scope === "all" ||
        (scope === "stars" ? hunter.stars > 0 : hunter.specialty === scope),
    ),
    Order.combine(
      Order.mapInput(Order.flip(Order.Number), (h: Hunter) => h.stars),
      Order.mapInput(Order.String, (h: Hunter) => h.name),
    ),
  );

/** "Double-star Treasure Hunter", "Contract Hunter". */
export const rankTitle = (hunter: Hunter): string =>
  `${["", "Single-star ", "Double-star ", "Triple-star "][hunter.stars] ?? ""}${hunter.specialty} Hunter`;
