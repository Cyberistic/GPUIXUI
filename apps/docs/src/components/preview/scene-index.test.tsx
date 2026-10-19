import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import {
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_INTERACTION,
  SCENE_LABEL,
  SCENE_PAGE,
} from "../../../preview/scenes";
import { LiveSceneIndex, liveSceneRows } from "./scene-index";

/**
 * The bug guarded: `/docs/previews` promised "the full list of scenes and
 * gestures" and satisfied it with two raw GitHub links to
 * `docs/preview-strategy.md`, which the default branch does not serve (measured
 * 404). The page itself listed no scene, so a new scene changed nothing a
 * reader could see or a test could fail on.
 *
 * Every row is derived from `preview/scenes.ts`; this suite compares the
 * rendered page with that contract in both directions.
 */

const page = readFileSync(
  fileURLToPath(new URL("../../../content/docs/previews.mdx", import.meta.url)),
  "utf8",
);

const rows = liveSceneRows();
const html = renderToStaticMarkup(<LiveSceneIndex />);
const renderedScenes = [...html.matchAll(/data-live-scene="([^"]+)"/g)].flatMap(
  (match) => (match[1] === undefined ? [] : [match[1]]),
);

describe("live scene index", () => {
  it("renders one row per registered scene, in the contract's order", () => {
    expect(renderedScenes).toEqual([...LIVE_SCENES]);
    expect(new Set(renderedScenes).size).toBe(LIVE_SCENES.length);
  });

  it("links every scene to the page that mounts it", () => {
    const missing = rows.filter((row) => row.href === null);
    expect(missing.map((row) => row.scene)).toEqual([]);

    const wrong = rows.flatMap((row) => {
      const record = components.find(
        (component) => component.liveScene === row.scene,
      );
      const expected =
        record === undefined
          ? SCENE_PAGE[row.scene]
          : `/docs/components/${record.slug}`;
      return row.href === expected ? [] : [`${row.scene}: ${row.href ?? ""}`];
    });
    expect(wrong).toEqual([]);
  });

  it("states the gesture every gesture scene needs, from the reader table", () => {
    const gestures = LIVE_SCENES.filter(
      (scene) => SCENE_GESTURE[scene] !== undefined,
    );
    const missing = gestures.filter(
      (scene) => (SCENE_INTERACTION[scene] ?? "").length === 0,
    );
    expect(missing).toEqual([]);

    const wrong = gestures.flatMap((scene) => {
      const row = rows.find((entry) => entry.scene === scene);
      if (row === undefined) return [`${scene}: no row`];
      return row.interaction === SCENE_INTERACTION[scene]
        ? []
        : [`${scene}: ${row.interaction}`];
    });
    expect(wrong).toEqual([]);
  });

  it("says a scene without a gesture mounts in its documented state", () => {
    const noGesture = rows.filter(
      (row) => SCENE_GESTURE[row.scene] === undefined,
    );
    expect(noGesture.length).toBeGreaterThan(0);
    expect(
      noGesture.filter(
        (row) => row.interaction !== "Mounts in the state it documents.",
      ),
    ).toEqual([]);
  });

  it("names every composed scene and states the derived split", () => {
    const composed = LIVE_SCENES.filter(
      (scene) => !components.some((component) => component.liveScene === scene),
    );
    expect(composed.length).toBeGreaterThan(0);
    const unnamed = composed.filter(
      (scene) =>
        SCENE_PAGE[scene] === undefined ||
        !SCENE_LABEL.some((label) => label.scene === scene),
    );
    expect(unnamed).toEqual([]);

    expect(html).toContain(
      `${rows.length} live scenes ship today: ${rows.filter((row) => row.kind === "record").length} run on a component page and ${composed.length} are composed pages`,
    );
  });

  it("is the page's list, and the page no longer links the 404", () => {
    expect(page).toContain("## Every live scene");
    expect(page).toContain("<LiveSceneIndex />");
    expect(page).not.toContain("blob/master/docs/preview-strategy.md");
    expect(page).toContain("[Live scenes](/docs/component-pages#live-scenes)");
  });
});
