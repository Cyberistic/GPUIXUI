/**
 * AppMenu example: a File / Edit / View menu bar with accelerator labels.
 * `mod` renders ⌘ on macOS and Ctrl elsewhere; the app binds the chords.
 */

import { AppMenu } from "../src/app-menu/app-menu.js";
import type { AppMenuEntry } from "../src/app-menu/app-menu.js";

const MENUS: ReadonlyArray<AppMenuEntry> = [
  {
    id: "file",
    label: "File",
    items: [
      { id: "new", label: "New file", accelerator: "mod+n" },
      { id: "open", label: "Open…", accelerator: "mod+o" },
      { id: "save", label: "Save", accelerator: "mod+s" },
      { id: "quit", label: "Quit", accelerator: "mod+q" },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    items: [
      { id: "undo", label: "Undo", accelerator: "mod+z" },
      { id: "redo", label: "Redo", accelerator: "mod+shift+z" },
      { id: "find", label: "Find", accelerator: "mod+f" },
    ],
  },
  {
    id: "view",
    label: "View",
    items: [
      { id: "toggle-sidebar", label: "Toggle sidebar", accelerator: "mod+b" },
      { id: "zoom-in", label: "Zoom in", accelerator: "mod+=" },
      { id: "zoom-out", label: "Zoom out", accelerator: "mod+-" },
    ],
  },
];

/** The editor's in-window menu bar. */
export const AppMenuExample = () => <AppMenu label="Editor" menus={MENUS} />;
