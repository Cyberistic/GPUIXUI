import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The dismissal contract on the pages the site serves.
 *
 * A dismissed surface — a dialog, a drawer, a toast card, a menu or a
 * navigation panel — stays painted for its exit window and the seam's shield
 * takes the presses. The runtime's **Tab order** is decided element by element,
 * so neither `pointerEvents` nor a covered box removes a descendant's stop: a
 * control the library paints inside a ghost has to drop its own stop, while
 * content the consumer composes keeps its stop until the runtime publishes an
 * inherited `inert`.
 *
 * The components workstream measured the defect and taught it on the
 * **package** pages, and on the six surfaces below the site's curated page
 * keeps the same URL, so the package files are shadowed and never served. A
 * reader of the canonical page was taught the paint and not the keyboard
 * window. This guard holds the page the site *serves* to the painters' own
 * flags, and derives the window it prints from the painter's timing.
 */

const repo = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repo), "utf8");

const levels = read("packages/motion/src/timing.ts");
const presence = read("packages/components/src/internal/presence.tsx");
const toastStore = read("packages/components/src/toast/store.ts");

/** One surface whose own controls drop their stop while it ghosts. */
interface DismissingSurface {
  readonly name: string;
  /** The page the site serves: the curated file when it shadows the package's. */
  readonly page: string;
  /** The package page the curated one shadows when the site serves it. */
  readonly packagePage: string;
  /** The painters that own the element and its stop. */
  readonly painters: ReadonlyArray<string>;
  /** The source fragments that prove the flag exists, one per painter. */
  readonly flags: ReadonlyArray<string>;
  /** How the painter names its exit timing. */
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
    // The palette's field is the one control the library paints inside the
    // dialog; the rows are highlighted, never focused, so they have no stop.
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

/**
 * The page the site serves for a surface: the curated one when it shadows the
 * package's file, the package one otherwise.
 */
const served = (page: string, packagePage: string): string => {
  const curated = `apps/docs/content/docs/components/${page}`;
  return existsSync(new URL(curated, repo)) ? read(curated) : read(packagePage);
};

const servedPage = (surface: DismissingSurface): string =>
  served(surface.page, surface.packagePage);

/** The millisecond duration a motion level names, from the package's table. */
const levelMs = (level: string): number | undefined => {
  const table = /export const motionLevels = \{([\s\S]*?)\} as const/.exec(
    levels,
  )?.[1];
  const entry = new RegExp(`\\b${level}: (\\d+)`).exec(table ?? "");
  return entry === null ? undefined : Number(entry[1]);
};

/** The exit duration a painter hands its presence hook. */
const windowMs = (surface: DismissingSurface): number | undefined => {
  if (surface.window.kind === "explicit") return surface.window.milliseconds;
  const source = read(surface.window.source);
  const named = new RegExp(
    `useSurfaceTiming\\("${surface.window.level}"\\)`,
  ).exec(source);
  return named === null ? undefined : levelMs(surface.window.level);
};

/** The store's own default depth, so the page's bound is the code's. */
const defaultDepth = (): number | undefined => {
  const match = /const DEFAULT_MAX = (\d+);/.exec(toastStore);
  return match === null ? undefined : Number(match[1]);
};

describe("the pages that document a dismissed surface", () => {
  it("reads the mechanism out of the seam before holding the pages", () => {
    // The contract this guard teaches is the seam's two halves: the shield
    // takes a press, and the stop has to be dropped by the control because the
    // runtime decides the Tab order element by element.
    expect(presence).toContain("PresenceShield");
    expect(presence).toContain("Tab order");
    expect(presence).toContain("inherited `inert`");
  });

  it("derives the own-control stop from the seam's one rule", () => {
    // A surface's own control reads `presenceTabStop`, so the `-1` is defined
    // once instead of copied per painter — the guard follows the seam rather
    // than one spelling of its result.
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

    // The windows are not one number: a modal owns the window (320), a menu
    // arrives faster (200) and a notice leaves on its own pair (180).
    expect(new Set(surfaces.map((surface) => windowMs(surface))).size).toBe(3);
  });

  it("teaches the keyboard window on every page the site serves", () => {
    expect(
      surfaces.flatMap((surface) => {
        const text = servedPage(surface);
        const ms = windowMs(surface);
        const gaps: Array<string> = [];

        if (!/tab order/i.test(text)) gaps.push("tab order");
        if (!text.includes("`inert`")) gaps.push("inherited inert");
        if (ms === undefined || !text.includes(`${ms} ms`))
          gaps.push(`${String(ms)} ms`);

        return gaps.map((gap) => `${surface.page}: ${gap}`);
      }),
    ).toEqual([]);
  });

  it("keeps the modal's own close control out of its body's scroller", () => {
    // The control is painted in the box around the scroller, so a body longer
    // than the surface scrolls under it — the behaviour suites hold the geometry
    // and the page names the rule.
    expect(
      ["dialog", "drawer"].flatMap((name) => {
        const text = served(
          `${name}.mdx`,
          `packages/components/docs/${name}.mdx`,
        );
        const cites = text.includes(`src/behaviour/${name}.test.tsx`);
        return /scroller/i.test(text) && cites ? [] : [name];
      }),
    ).toEqual([]);
  });

  it("teaches the bound the toast store keeps, and the history it cannot", () => {
    const depth = defaultDepth();
    const text = served("toast.mdx", "packages/components/docs/toast.mdx");

    expect(depth).toBe(3);
    expect(text).toContain(`${String(depth)} cards`);
    expect(text.toLowerCase()).toContain("history");
  });
});
