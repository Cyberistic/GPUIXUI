/** The menu-bar extra's rules: flip one watch, and the header's status line. */

import * as Arr from "effect/Array";
import type { Watch } from "./data.js";

export const toggle = (
  all: ReadonlyArray<Watch>,
  id: string,
): ReadonlyArray<Watch> =>
  Arr.map(all, (watch) =>
    watch.id === id ? { ...watch, on: !watch.on } : watch,
  );

/** "Watching 2 of 4", or "Paused" when nothing is on. */
export const statusLine = (all: ReadonlyArray<Watch>): string => {
  const on = Arr.filter(all, (watch) => watch.on).length;
  return on === 0 ? "Paused" : `Watching ${on} of ${all.length}`;
};
