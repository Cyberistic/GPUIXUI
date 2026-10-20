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
  { label: "Platforms", href: "#platforms" },
  { label: "Library", href: "#library" },
  { label: "Proof", href: "#proof" },
  { label: "Docs", href: "/docs" },
] as const;

/** Tier 2 — composition and feedback. Every row is `done` in `COMPONENTS.md`. */
export const shippingComponents = [
  "Cards",
  "Badges",
  "Avatars",
  "Alerts",
  "Lists",
  "Empty states",
  "Inline validation",
  "Toasts",
  "Dialogs",
  "Confirmation dialogs",
  "Popovers",
  "Dropdown menus",
  "Context menus",
  "Command menus",
  "Tabs",
  "Accordions",
  "Collapsible sections",
  "Breadcrumbs",
  "Pagination",
  "Search inputs",
  "Comboboxes",
  "Date pickers",
  "Time pickers",
  "Message scroller",
  "Fieldset",
  "Form",
  "Navigation menu",
  "Preview card",
  "Drawer",
  "Stepper",
  "Timeline",
  "Color picker",
  "Tag input",
  "Mention input",
  "Hotkey recorder",
  "Countdown",
  "Carousel",
  "Inline edit",
  "Keyboard shortcuts",
] as const satisfies readonly string[];

export interface AiSurface {
  readonly name: string;
  readonly status: "done" | "planned";
  readonly note?: string;
  readonly blurb: string;
}

export const aiSurfaces: readonly AiSurface[] = [
  {
    name: "Message scroller",
    status: "done",
    blurb:
      "Pinned and unread chat following — the reader's offset survives a streamed row.",
  },
  {
    name: "Chat",
    status: "planned",
    note: "plan 207",
    blurb:
      "Composer with attachments, submit/stop, and idle / streaming / error states.",
  },
  {
    name: "Message row",
    status: "planned",
    note: "plan 207",
    blurb:
      "User and assistant variants with markdown, tool calls and streaming.",
  },
];

export const roadmapTiers = [
  { name: "Tier 1", detail: "foundational primitives" },
  { name: "Tier 3", detail: "data presentation" },
  { name: "Tier 4", detail: "desktop workspace" },
  { name: "Tier 5", detail: "specialised" },
] as const;

export const attribution = [
  "shadcn/ui",
  "base-gpui",
  "adabraka-ui",
  "GPUI Kit",
  "Omarchy",
] as const;
