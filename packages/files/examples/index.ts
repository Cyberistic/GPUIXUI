/**
 * The files-package example registry: `id → example`, for the native playground.
 *
 * The browser docs site must not render these as live components — they are
 * GPUix host elements, not DOM — so the docs pages carry the same source as a
 * code block.
 */

import type { ComponentType } from "react";
import { FileTreeExample } from "./file-tree.example.js";
import { LogViewerExample } from "./log-viewer.example.js";
import { PropertyPanelExample } from "./property-panel.example.js";

/** One mountable screen per file surface. */
export const examples: Readonly<Record<string, ComponentType>> = {
  "file-tree": FileTreeExample,
  "log-viewer": LogViewerExample,
  "property-panel": PropertyPanelExample,
};
