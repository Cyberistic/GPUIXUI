/**
 * The Appearance pane's sample data: the looks it offers and its sections.
 */
import type { IconName } from "@gpuixui/icons";
import type { PlatformName } from "@gpuixui/tokens";

/** The looks the pane offers, in the order it shows them. */
export const looks = [
  { value: "darwin", label: "macOS" },
  { value: "win32", label: "Windows" },
  { value: "linux", label: "Linux" },
] as const satisfies ReadonlyArray<{ value: PlatformName; label: string }>;

export type Look = (typeof looks)[number]["value"];

export const sections: ReadonlyArray<readonly [IconName, string]> = [
  ["settings", "General"],
  ["sun", "Appearance"],
  ["bell", "Notifications"],
  ["volume-2", "Sound"],
  ["shield", "Privacy"],
];
