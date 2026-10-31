/** The welcome window's steps: what the Hunter License app sets up first. */

import type { IconName } from "@gpuixui/icons";

export interface Feature {
  readonly icon: IconName;
  readonly title: string;
  readonly line: string;
}

export const steps: ReadonlyArray<{
  readonly title: string;
  readonly features: ReadonlyArray<Feature>;
}> = [
  {
    title: "Welcome, Hunter",
    features: [
      {
        icon: "badge-check",
        title: "Your license",
        line: "Open restricted sites and public records.",
      },
      {
        icon: "lock",
        title: "Locked to you",
        line: "Touch ID guards it, every time.",
      },
      {
        icon: "sparkles",
        title: "Nen ready",
        line: "Track your training with Wing.",
      },
    ],
  },
  {
    title: "Bring your binder",
    features: [
      {
        icon: "folder-open",
        title: "Import cards",
        line: "Pick the folder your Greed Island binder lives in.",
      },
    ],
  },
  {
    title: "All set",
    features: [
      {
        icon: "success",
        title: "You are registered",
        line: "Netero signed your license.",
      },
    ],
  },
];
