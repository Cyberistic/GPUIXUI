import type { IconName } from "@gpuixui/icons";

export const looks = ["luna", "aero"] as const;
export type DesktopLook = (typeof looks)[number];

export interface Shortcut {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;

  readonly tint: string;
}

export const user = { name: "Gon Freecss", title: "Rookie Hunter" } as const;

export const shortcuts: ReadonlyArray<Shortcut> = [
  {
    id: "license",
    label: "Hunter License",
    icon: "badge-check",
    tint: "#2F6FD6",
  },
  { id: "greed", label: "Greed Island", icon: "folder", tint: "#E3A82B" },
  { id: "arena", label: "Heavens Arena", icon: "grid", tint: "#3A9A4A" },
  { id: "mail", label: "Hunter Mail", icon: "mail", tint: "#7A5BD6" },
  { id: "bin", label: "Recycle Bin", icon: "trash", tint: "#6B7A8C" },
];

export interface Program {
  readonly label: string;
  readonly detail?: string;
  readonly icon: IconName;
  readonly tint: string;
}

export const pinned: ReadonlyArray<Program> = [
  {
    label: "Hunter Site",
    detail: "The Association",
    icon: "external-link",
    tint: "#2F6FD6",
  },
  {
    label: "Hunter Mail",
    detail: "Killua, Kurapika, Leorio",
    icon: "mail",
    tint: "#7A5BD6",
  },
];

export const recent: ReadonlyArray<Program> = [
  { label: "Greed Island", icon: "folder", tint: "#E3A82B" },
  { label: "Nen Trainer", icon: "sparkles", tint: "#D6533A" },
  { label: "Heavens Arena", icon: "grid", tint: "#3A9A4A" },
  { label: "Yorknew Auction", icon: "credit-card", tint: "#2B8C9E" },
  { label: "Kanban", icon: "list", tint: "#5A6B7D" },
];

export const places: ReadonlyArray<Program> = [
  { label: "Hunter License", icon: "badge-check", tint: "#2F6FD6" },
  { label: "My Nen Notes", icon: "file-text", tint: "#E3A82B" },
  { label: "Spell Cards", icon: "image", tint: "#3A9A4A" },
  { label: "Whale Island", icon: "home", tint: "#2B8C9E" },
  { label: "Control Panel", icon: "settings", tint: "#5A6B7D" },
  { label: "Search", icon: "search", tint: "#5A6B7D" },
];

export interface FolderItem {
  readonly name: string;
  readonly kind: "folder" | "file";
}

export const greedIsland: ReadonlyArray<FolderItem> = [
  { name: "Spell Cards", kind: "folder" },
  { name: "Restricted Slots", kind: "folder" },
  { name: "Bisky's Gems", kind: "folder" },
  { name: "Ging's Letter.txt", kind: "file" },
  { name: "Save Data.dat", kind: "file" },
  { name: "Book.ini", kind: "file" },
];

export const windows = ["explorer", "license"] as const;
export type WindowId = (typeof windows)[number];

export const titles: Readonly<Record<WindowId, string>> = {
  explorer: "Greed Island",
  license: "Hunter License Properties",
};

export const clock = { time: "9:41 AM", date: "10/31/2026" } as const;
