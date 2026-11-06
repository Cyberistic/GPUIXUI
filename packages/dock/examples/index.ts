import type { ComponentType } from "react";
import { DockLayoutExample } from "./dock-layout.example.js";
import { PanelGroupExample } from "./panel-group.example.js";
import { SplitPaneExample } from "./split-pane.example.js";

export const examples: Readonly<Record<string, ComponentType>> = {
  "split-pane": SplitPaneExample,
  "panel-group": PanelGroupExample,
  "dock-layout": DockLayoutExample,
};
