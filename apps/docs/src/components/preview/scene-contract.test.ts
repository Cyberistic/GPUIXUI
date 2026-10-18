import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import { LIVE_SCENES, SCENE_TEXT } from "../../../preview/scenes";
import { NO_LIVE_SCENE } from "./gaps";

/**
 * Guards the live-scene contract (plan 456) at the two points it can drift
 * silently: the smoke check looks for text the view no longer renders, and an
 * interaction record loses its `liveScene` and falls back to a weaker tier.
 *
 * The view itself cannot be imported here — it is JSX against the GPUix runtime
 * — so the guard reads the real source file, like `content-references.test.ts`.
 */

const viewSource = readFileSync(
  fileURLToPath(new URL("../../../preview/scene-views.tsx", import.meta.url)),
  "utf8",
);

const mainSource = readFileSync(
  fileURLToPath(new URL("../../../preview/main.tsx", import.meta.url)),
  "utf8",
);

const interactionScenes = new Map([
  ["tabs", "tabs"],
  ["dropdown-menu", "dropdown-menu"],
  ["dialog", "dialog"],
  ["popover", "popover"],
  ["command-menu", "command-menu"],
  ["confirm-dialog", "confirm-dialog"],
]);

const pagesDirectory = new URL(
  "../../../content/docs/components/",
  import.meta.url,
);

/** The page source for a slug, or an empty string when no page exists yet. */
const pageBody = (slug: string): string => {
  const file = new URL(`${slug}.mdx`, pagesDirectory);
  return existsSync(fileURLToPath(file))
    ? readFileSync(fileURLToPath(file), "utf8")
    : "";
};

/** Whether a component page renders a tier-A illustration. */
const hasIllustration = (slug: string): boolean =>
  pageBody(slug).includes("<ComponentPreview");

describe("live scene table", () => {
  it("has a unique key for every scene", () => {
    expect(new Set(LIVE_SCENES).size).toBe(LIVE_SCENES.length);
  });

  it("gives every scene a non-empty string to look for", () => {
    const missing = LIVE_SCENES.filter(
      (scene) =>
        typeof SCENE_TEXT[scene] !== "string" || SCENE_TEXT[scene].length === 0,
    );
    expect(missing).toEqual([]);
  });

  it("keeps every expectation in the view that renders it", () => {
    const stale = LIVE_SCENES.filter(
      (scene) => !viewSource.includes(SCENE_TEXT[scene]),
    ).map((scene) => `${scene}: ${SCENE_TEXT[scene]}`);
    expect(stale).toEqual([]);
  });
});

describe("interaction records", () => {
  it("declare the live scene that documents them", () => {
    const wrong = [...interactionScenes].flatMap(([slug, scene]) => {
      const record = components.find((entry) => entry.slug === slug);
      return record?.liveScene === scene
        ? []
        : [`${slug}: ${record?.liveScene}`];
    });
    expect(wrong).toEqual([]);
  });

  it("use the scene key as the page slug the smoke derives", () => {
    const wrong = components.flatMap((entry) =>
      entry.liveScene === null || entry.liveScene === entry.slug
        ? []
        : [`${entry.slug}: ${entry.liveScene}`],
    );
    expect(wrong).toEqual([]);
  });

  it("leave a delivered page without live or illustrated preview only for a measured reason", () => {
    const gaps = components.flatMap((entry) =>
      entry.sourcePath !== null &&
      entry.liveScene === null &&
      !hasIllustration(entry.slug)
        ? [entry.slug]
        : [],
    );
    expect(gaps.toSorted()).toEqual([...NO_LIVE_SCENE.keys()].toSorted());
  });

  it("never tell a reader a page with a scene cannot render it live", () => {
    const denied = components.flatMap((entry) =>
      entry.liveScene !== null &&
      /cannot render (?:it|this component) live/i.test(pageBody(entry.slug))
        ? [entry.slug]
        : [],
    );
    expect(denied).toEqual([]);
  });
});

describe("scene theme", () => {
  /**
   * The bug this guards (measured 2026-10-18): a scene using
   * `@gpuixui/components` painted its light fallback inside a dark docs page,
   * because primitives and components read two different theme contexts. The
   * surface therefore needs **both** providers, and both must receive the
   * resolved theme, or a dark page shows light Tabs and Popovers again.
   */
  it("puts the surface inside both theme providers with the same theme", () => {
    const tokens = mainSource.indexOf("<TokensThemeProvider theme={theme}>");
    const primitives = mainSource.indexOf("<ThemeProvider theme={theme}>");
    const surface = mainSource.indexOf("<LiveSurface");
    expect(tokens).toBeGreaterThanOrEqual(0);
    expect(primitives).toBeGreaterThanOrEqual(0);
    expect(tokens).toBeLessThan(surface);
    expect(primitives).toBeLessThan(surface);
    expect(mainSource.indexOf("</TokensThemeProvider>")).toBeGreaterThan(
      surface,
    );
    expect(mainSource.indexOf("</ThemeProvider>")).toBeGreaterThan(surface);
  });
});
