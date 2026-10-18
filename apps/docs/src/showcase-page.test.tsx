import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { bySlug } from "@/component-meta/registry";
import { deniesLiveSurface } from "@/lib/live-surface-truth";
import {
  isLiveScene,
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_PAGE,
  SCENE_TEXT,
} from "../preview/scenes";
import { SHOWCASE_SLUGS, ShowcaseComponents } from "./components/showcase";

/**
 * Guards the showcase page (plan 560). The failure this catches is a page that
 * promises a composed screen and loses one of its halves: the live scene is not
 * registered, the page stops mounting it, a component it names has no page, or
 * the smoke looks for the scene on a URL that does not exist.
 *
 * `node:fs` reads real files at the test boundary, as in `content.test.ts` and
 * `scene-contract.test.ts`; the docs app has no Effect runtime.
 */

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const page = read("../content/docs/showcase.mdx");
const Sidebar = Schema.Struct({ pages: Schema.Array(Schema.String) });
const sidebar = Schema.decodeUnknownSync(Schema.fromJsonString(Sidebar))(
  read("../content/docs/meta.json"),
);
const sceneViews = read("../preview/scene-views.tsx");
const smoke = read("../scripts/smoke-live-preview.ts");
const landing = read("./components/landing.tsx");

describe("showcase page", () => {
  it("is a real page in the sidebar with its own copy", () => {
    expect(page).toMatch(/^title: Showcase$/m);
    expect(page).toMatch(/^description: .+$/m);
    expect(sidebar.pages).toContain("showcase");
  });

  it("mounts the live scene the preview project ships", () => {
    expect(page).toContain('<LiveSurface scene="showcase"');
    expect(isLiveScene("showcase")).toBe(true);
    expect(LIVE_SCENES).toContain("showcase");
    expect(SCENE_TEXT.showcase.length).toBeGreaterThan(0);
    expect(sceneViews).toContain(SCENE_TEXT.showcase);
    expect(SCENE_GESTURE.showcase).toBeUndefined();
  });

  it("names only delivered components and links their real pages", () => {
    const missing = SHOWCASE_SLUGS.filter(
      (slug) =>
        bySlug.get(slug)?.status === undefined ||
        bySlug.get(slug)?.status === "planned",
    );
    expect(missing).toEqual([]);

    const html = renderToStaticMarkup(<ShowcaseComponents />);
    const unlinked = SHOWCASE_SLUGS.filter(
      (slug) => !html.includes(`href="/docs/components/${slug}"`),
    );
    expect(unlinked).toEqual([]);
  });

  it("is driven by the live-surface smoke on its own URL", () => {
    expect(SCENE_PAGE.showcase).toBe("/docs/showcase");
    expect(smoke).toContain("SCENE_PAGE");
  });

  it("maps every scene override to a page that exists", () => {
    const dangling = Object.entries(SCENE_PAGE).flatMap(([scene, path]) =>
      path === undefined ||
      !existsSync(
        new URL(
          `../content/docs/${path.replace(/^\/docs\//, "")}.mdx`,
          import.meta.url,
        ),
      )
        ? [`${scene}: ${path}`]
        : [],
    );
    expect(dangling).toEqual([]);
  });

  it("is reachable from the landing page and does not deny the live surface", () => {
    expect(landing).toContain('href="/docs/showcase"');
    expect(deniesLiveSurface(page)).toBe(false);
  });
});
