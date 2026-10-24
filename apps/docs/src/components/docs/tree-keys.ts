import type { TreeKey } from "@gpuixui/data/tree/logic";
import * as Option from "effect/Option";

/**
 * The browser key names the tree's own keys answer to.
 *
 * `@gpuixui/data`'s tree speaks the desktop tree's vocabulary (`up`, `down`,
 * `enter`), and the browser names the same keys `ArrowUp`, `ArrowDown`,
 * `Enter`. Both tree drawings in this app hold the same tree, so the mapping
 * lives once: a key the runtime's tree does not own (a `PageDown`, a modifier)
 * answers `None` and the browser keeps it.
 */
const TREE_KEYS: Readonly<Record<string, TreeKey>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowRight: "right",
  ArrowLeft: "left",
  Home: "home",
  End: "end",
  Enter: "enter",
  " ": "space",
};

/** The package key a browser key names, or `None` when it is not the tree's. */
export const treeKeyOf = (key: string): Option.Option<TreeKey> =>
  Option.fromNullishOr(TREE_KEYS[key]);
