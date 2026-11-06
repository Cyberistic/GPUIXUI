import {
  landingPlatformLabel,
  landingPlatformOrder,
  type LandingPlatform,
} from "../../lib/platform";

export interface Platform {
  readonly id: LandingPlatform;
  readonly label: string;
  readonly chrome: "mac" | "win" | "lnx";
}

const chromeOf: Readonly<Record<LandingPlatform, Platform["chrome"]>> = {
  macos: "mac",
  windows: "win",
  linux: "lnx",
};

export const platforms = landingPlatformOrder.map((id) => ({
  id,
  label: landingPlatformLabel(id),
  chrome: chromeOf[id],
})) satisfies ReadonlyArray<Platform>;

export type OmarchyIcon = "palette" | "terminal" | "code" | "gpu";

export interface OmarchyCard {
  readonly icon: OmarchyIcon;
  readonly title: string;
  readonly body: string;
}

export const omarchyCards: ReadonlyArray<OmarchyCard> = [
  {
    icon: "palette",
    title: "Follows your theme in Omarchy",
    body: "The palette comes from your Omarchy theme, so the window matches the rest of the desktop.",
  },
  {
    icon: "terminal",
    title: "Your apps in the terminal",
    body: "The terminal surface is a first-class block: the same tree draws in kitty or Ghostty.",
  },
  {
    icon: "code",
    title: "shadcn and React syntax",
    body: "The same component code, with no new API to learn.",
  },
  {
    icon: "gpu",
    title: "Everything on the GPU",
    body: "Rendering, motion and text all run on the GPU.",
  },
];

export const repo = "https://github.com/Cyberistic/GPUIXUI";

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

export const countWord = (count: number): string =>
  countWords[count] ?? String(count);

export const landingLookCount = platforms.length;

export const navLinks = [
  { label: "Docs", href: "/introduction" },
  { label: "Blocks", href: "/blocks/all" },
] as const;
