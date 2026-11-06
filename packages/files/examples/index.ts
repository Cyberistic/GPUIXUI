import type { ComponentType } from "react";
import { FileTreeExample } from "./file-tree.example.js";
import { LogViewerExample } from "./log-viewer.example.js";
import { PropertyPanelExample } from "./property-panel.example.js";

export const examples: Readonly<Record<string, ComponentType>> = {
  "file-tree": FileTreeExample,
  "log-viewer": LogViewerExample,
  "property-panel": PropertyPanelExample,
};
