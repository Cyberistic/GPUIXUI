import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repo = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repo), "utf8");

const levels = read("packages/motion/src/timing.ts");
const presence = read("packages/components/src/internal/presence.tsx");
const toastStore = read("packages/components/src/toast/store.ts");

interface DismissingSurface {
  readonly name: string;

  readonly page: string;

  readonly packagePage: string;

  readonly painters: ReadonlyArray<string>;

  readonly flags: ReadonlyArray<string>;

  readonly window: ExitWindow;
}

type ExitWindow =
  | { readonly kind: "level"; readonly level: string; readonly source: string }
  | {
      readonly kind: "explicit";
      readonly milliseconds: number;
      readonly source: string;
    };

const surfaces: ReadonlyArray<DismissingSurface> = [
  {
    name: "Dialog",
    page: "dialog.mdx",
    packagePage: "packages/components/docs/dialog.mdx",
    painters: ["packages/components/src/dialog.tsx"],
    flags: ["presenceTabStop(presence.present)"],
    window: {
      kind: "level",
      level: "slow",
      source: "packages/components/src/dialog.tsx",
    },
  },
  {
    name: "Command menu",
    page: "command-menu.mdx",
    packagePage: "packages/components/docs/command-menu.mdx",
    painters: ["packages/components/src/command-menu.tsx"],

    flags: ["presenceTabStop(present)"],
    window: {
      kind: "level",
      level: "slow",
      source: "packages/components/src/dialog.tsx",
    },
  },
  {
    name: "Drawer",
    page: "drawer.mdx",
    packagePage: "packages/components/docs/drawer.mdx",
    painters: ["packages/components/src/drawer.tsx"],
    flags: ["presenceTabStop(presence.present)"],
    window: {
      kind: "level",
      level: "slow",
      source: "packages/components/src/drawer.tsx",
    },
  },
  {
    name: "Toast",
    page: "toast.mdx",
    packagePage: "packages/components/docs/toast.mdx",
    painters: ["packages/components/src/toast/viewport.tsx"],
    flags: ["presenceTabStop(present && slot.interactive)"],
    window: {
      kind: "explicit",
      milliseconds: 180,
      source: "packages/components/src/toast/viewport.tsx",
    },
  },
  {
    name: "Navigation menu",
    page: "navigation-menu.mdx",
    packagePage: "packages/components/docs/navigation-menu.mdx",
    painters: ["packages/components/src/navigation-menu.tsx"],
    flags: ["tabIndex={leaving ? -1 : tabIndex}"],
    window: {
      kind: "level",
      level: "normal",
      source: "packages/components/src/navigation-menu.tsx",
    },
  },
  {
    name: "Dropdown menu",
    page: "dropdown-menu.mdx",
    packagePage: "packages/components/docs/dropdown-menu.mdx",
    painters: [
      "packages/components/src/menu/item.tsx",
      "packages/components/src/menu/surface.tsx",
    ],
    flags: [
      "tabIndex={disabled || leaving ? -1 : 0}",
      "<MenuLeaving.Provider value={leaving}>",
    ],
    window: {
      kind: "level",
      level: "normal",
      source: "packages/components/src/dropdown-menu.tsx",
    },
  },
  {
    name: "Context menu",
    page: "context-menu.mdx",
    packagePage: "packages/components/docs/context-menu.mdx",
    painters: [
      "packages/components/src/menu/item.tsx",
      "packages/components/src/context-menu.tsx",
    ],
    flags: [
      "tabIndex={disabled || leaving ? -1 : 0}",
      "leaving={!presence.present}",
    ],
    window: {
      kind: "level",
      level: "normal",
      source: "packages/components/src/context-menu.tsx",
    },
  },
];

const levelMs = (level: string): number | undefined => {
  const table = /export const motionLevels = \{([\s\S]*?)\} as const/.exec(
    levels,
  )?.[1];
  const entry = new RegExp(`\\b${level}: (\\d+)`).exec(table ?? "");
  return entry === null ? undefined : Number(entry[1]);
};

const windowMs = (surface: DismissingSurface): number | undefined => {
  if (surface.window.kind === "explicit") return surface.window.milliseconds;
  const source = read(surface.window.source);
  const named = new RegExp(
    `useSurfaceTiming\\("${surface.window.level}"\\)`,
  ).exec(source);
  return named === null ? undefined : levelMs(surface.window.level);
};

const defaultDepth = (): number | undefined => {
  const match = /const DEFAULT_MAX = (\d+);/.exec(toastStore);
  return match === null ? undefined : Number(match[1]);
};

describe("the pages that document a dismissed surface", () => {
  it("derives the own-control stop from the seam's one rule", () => {
    const start = presence.indexOf("export const presenceTabStop");
    const rule = presence.slice(start, start + 400);

    expect(rule).toContain("tabIndex: -1");
    expect(rule).not.toContain("tabIndex: 0");
  });

  it("finds every painter's own flag and exit window", () => {
    expect(
      surfaces.flatMap((surface) => {
        const sources = surface.painters.map((path) => read(path));
        const missing = surface.flags.filter(
          (flag) => !sources.some((source) => source.includes(flag)),
        );
        const ms = windowMs(surface);
        return missing.length === 0 && ms !== undefined
          ? []
          : [`${surface.name}: ${missing.join(", ")} (${String(ms)})`];
      }),
    ).toEqual([]);

    expect(new Set(surfaces.map((surface) => windowMs(surface))).size).toBe(3);
  });

  it("keeps the toast store's depth", () => {
    expect(defaultDepth()).toBe(3);
  });
});
