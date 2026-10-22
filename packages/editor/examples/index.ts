/**
 * The example registry: `id → example`, for the **native** playground.
 *
 * The browser docs site must not render these as live components: they are
 * GPUix host elements, not DOM. The docs pages carry the same source as a code
 * block.
 */

import type { ComponentType } from "react";
import { CodeEditorExample } from "./code-editor.example.js";
import { DiffViewerExample } from "./diff-viewer.example.js";
import { SearchReplaceExample } from "./search-replace.example.js";

/** Every example, by the id a docs page and the playground both use. */
export const examples: Readonly<Record<string, ComponentType>> = {
  "code-editor": CodeEditorExample,
  "diff-viewer": DiffViewerExample,
  "search-replace": SearchReplaceExample,
};
