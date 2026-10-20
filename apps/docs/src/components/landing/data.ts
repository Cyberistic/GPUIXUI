export interface Platform {
  readonly id: "macos" | "windows" | "linux";
  readonly label: string;
  readonly chrome: "mac" | "win" | "lnx";
}

export const platforms = [
  { id: "macos", label: "macOS", chrome: "mac" },
  { id: "windows", label: "Windows 11", chrome: "win" },
  { id: "linux", label: "Linux / Arch", chrome: "lnx" },
] as const satisfies readonly Platform[];

export const repo = "https://github.com/Cyberistic/GPUIXUI";

export const navLinks = [
  { label: "Lineage", href: "#lineage" },
  { label: "Defaults", href: "#platforms" },
  { label: "Code", href: "#code" },
  { label: "Docs", href: "/docs" },
] as const;

export const attribution = [
  "shadcn/ui",
  "base-gpui",
  "adabraka-ui",
  "GPUI Kit",
  "Omarchy",
] as const;
