import type { IconName } from "@gpuixui/icons";

/** A menu the bar can open. The first one is the app's own menu. */
export interface Menu {
  readonly title: string;
  readonly items: ReadonlyArray<string>;
}

export const menus: ReadonlyArray<Menu> = [
  {
    title: "File",
    items: ["New Window", "Open…", "Close", "Save", "Export as PDF…"],
  },
  {
    title: "Edit",
    items: ["Undo", "Redo", "Cut", "Copy", "Paste", "Select All"],
  },
  {
    title: "View",
    items: ["Show Sidebar", "Show Inspector", "Enter Full Screen"],
  },
  { title: "Go", items: ["Back", "Forward", "Recents", "Home"] },
  { title: "Window", items: ["Minimise", "Zoom", "Bring All to Front"] },
  { title: "Help", items: ["App Support", "Release Notes"] },
];

/** A dock tile: the app, its glyph, and whether it is running. */
export interface DockApp {
  readonly label: string;
  readonly icon: IconName;
  readonly running: boolean;
}

export const dock: ReadonlyArray<DockApp> = [
  { label: "Finder", icon: "folder", running: true },
  { label: "Editor", icon: "code", running: false },
  { label: "Terminal", icon: "terminal", running: false },
  { label: "Mail", icon: "mail", running: true },
  { label: "Music", icon: "volume-2", running: false },
  { label: "Calendar", icon: "calendar", running: false },
  { label: "Settings", icon: "settings", running: false },
];

/** The menu-bar height and the dock's geometry, in points. */
export const BAR_HEIGHT = 28;
export const DOCK = { tile: 44, gap: 10, pad: 10, bottom: 12 } as const;
