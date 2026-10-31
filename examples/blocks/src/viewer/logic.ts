/** The viewer's rule: ‹ › step to the album's neighbouring photo, stopping at the ends. */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const neighbour = (
  ids: ReadonlyArray<string>,
  id: string,
  by: 1 | -1,
): string =>
  Option.getOrElse(
    Option.flatMap(
      Arr.findFirstIndex(ids, (candidate) => candidate === id),
      (at) => Arr.get(ids, Math.min(Math.max(0, at + by), ids.length - 1)),
    ),
    () => id,
  );
