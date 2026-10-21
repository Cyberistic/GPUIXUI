import markdown from "../../../../COMPONENTS.md?raw";
import {
  laneView,
  parseInventory,
  type Inventory,
  type LaneName,
  type LaneView,
} from "./inventory";

/**
 * `COMPONENTS.md`, parsed once for the composition pages.
 *
 * The file is imported as text rather than copied into the docs, so the pages
 * and the inventory are the same document. Its tier tables are the only input;
 * `inventory.test.ts` holds the parse.
 */
export const inventory: Inventory = parseInventory(markdown);

export const laneData = (name: LaneName): LaneView => laneView(inventory, name);
