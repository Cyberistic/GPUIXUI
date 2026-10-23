import {
  landingPlatformLabel,
  landingPlatformOrder,
  type LandingPlatform,
} from "../../lib/platform";

export interface Platform {
  readonly id: LandingPlatform;
  readonly label: string;
  readonly chrome: "mac" | "win" | "lnx";
  readonly wall: "mac" | "win" | "lnx" | "omarchy";
}

/** The chrome each desktop wears; Omarchy is a Linux desktop. */
const chromeOf: Readonly<Record<LandingPlatform, Platform["chrome"]>> = {
  macos: "mac",
  windows: "win",
  linux: "lnx",
  omarchy: "lnx",
};

/** The wallpaper each desktop paints; Omarchy has its own Tokyo Night scene. */
const wallOf: Readonly<Record<LandingPlatform, Platform["wall"]>> = {
  macos: "mac",
  windows: "win",
  linux: "lnx",
  omarchy: "omarchy",
};

export const platforms = landingPlatformOrder.map((id) => ({
  id,
  label: landingPlatformLabel(id),
  chrome: chromeOf[id],
  wall: wallOf[id],
})) satisfies ReadonlyArray<Platform>;

export const repo = "https://github.com/Cyberistic/GPUIXUI";

/** The numbers a heading prints as words, so a count cannot drift from its list. */
const countWords = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
] as const;

/** A count as the word a landing heading prints it, e.g. `3` → `"Three"`. */
export const countWord = (count: number): string =>
  countWords[count] ?? String(count);

/** The desktops the deck shows; the hero and the terminal sample print it. */
export const landingLookCount = platforms.length;

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
