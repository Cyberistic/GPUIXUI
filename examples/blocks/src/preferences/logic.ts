/** The preferences block's rule: which panes a sidebar search keeps. */

import * as Arr from "effect/Array";
import * as Str from "effect/String";
import type { Pane } from "./data.js";

/** The panes whose label holds the query, ignoring case; all for none. */
export const panesMatching = (
  panes: ReadonlyArray<Pane>,
  query: string,
): ReadonlyArray<Pane> => {
  const needle = Str.toLowerCase(Str.trim(query));
  return Arr.filter(
    panes,
    (pane) =>
      needle === "" || Str.includes(needle)(Str.toLowerCase(pane.label)),
  );
};
