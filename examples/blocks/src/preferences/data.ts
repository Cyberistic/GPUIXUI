/** The preferences block's panes, as System Settings lists them. */

import type { IconName } from "@gpuixui/icons";

export interface Pane {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly group: "Account" | "System";
}

export const panes: ReadonlyArray<Pane> = [
  {
    id: "license",
    label: "Hunter License",
    icon: "badge-check",
    group: "Account",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "bell",
    group: "System",
  },
  { id: "appearance", label: "Appearance", icon: "sun", group: "System" },
  {
    id: "privacy",
    label: "Privacy & Security",
    icon: "shield",
    group: "System",
  },
  { id: "storage", label: "Storage", icon: "database", group: "System" },
];
