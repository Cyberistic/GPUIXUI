/**
 * Toolbar example: grouped actions with a `max` that overflows the tail into
 * the ellipsis menu.
 */

import { Toolbar } from "../src/toolbar/toolbar.js";
import type { ToolbarAction } from "../src/toolbar/toolbar.js";

const ACTIONS: ReadonlyArray<ToolbarAction> = [
  { id: "open", label: "Open", icon: "file", group: "file" },
  { id: "save", label: "Save", icon: "download", group: "file" },
  { id: "copy", label: "Copy", icon: "copy", group: "edit" },
  { id: "link", label: "Link", icon: "link", group: "edit" },
  { id: "image", label: "Image", icon: "image", group: "insert" },
  { id: "list", label: "List", icon: "list", group: "insert" },
  { id: "code", label: "Code", icon: "code", group: "insert" },
];

/** The document toolbar: three groups, the last overflowing behind the ellipsis. */
export const ToolbarExample = () => (
  <Toolbar label="Document" max={5} actions={ACTIONS} />
);
