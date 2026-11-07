import markdown from "../../../../.agents/slop/COMPONENTS.md?raw";
import {
  laneView,
  parseInventory,
  type Inventory,
  type LaneName,
  type LaneView,
} from "./inventory";

export const inventory: Inventory = parseInventory(markdown);

export const laneData = (name: LaneName): LaneView => laneView(inventory, name);
