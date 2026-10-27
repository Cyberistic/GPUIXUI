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

/** The chrome each desktop wears; the wallpaper is the same picture. */
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

/** A glyph the Omarchy strip draws beside its claim. */
export type OmarchyIcon = "palette" | "terminal" | "code" | "gpu";

export interface OmarchyCard {
  readonly icon: OmarchyIcon;
  readonly title: string;
  readonly body: string;
}

/**
 * What Omarchy means for a GPUIxUI app, in the strip under the deck.
 *
 * Omarchy is not a fourth look: it is the Desktop where the look comes from your
 * own theme, and these four lines are the whole claim — a theme follower, a
 * terminal surface, shadcn/React syntax, and a GPU renderer.
 */
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

/** The desktops the deck shows; the hero and the editor sample print it. */
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
