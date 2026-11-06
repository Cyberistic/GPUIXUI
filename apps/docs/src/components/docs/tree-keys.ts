import type { TreeKey } from "@gpuixui/data/tree/logic";
import * as Option from "effect/Option";

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

export const treeKeyOf = (key: string): Option.Option<TreeKey> =>
  Option.fromNullishOr(TREE_KEYS[key]);
