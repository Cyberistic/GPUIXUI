import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import {
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_INTERACTION,
  SCENE_LABEL,
  SCENE_PAGE,
} from "../../preview/scenes";
import { liveSceneRows } from "./live-scenes";

/**
 * The bug guarded (plan 582): the row list lived inside the React table, so
 * the search index could not read the gesture a scene documents. Moving it to
 * a plain module is only safe if the list stays derived from
 * `preview/scenes.ts` and matches what the page renders.
 */

const rows = liveSceneRows();

describe("liveSceneRows", () => {
  it("returns one row per registered scene, in contract order", () => {
    expect(rows.map((row) => row.scene)).toEqual([...LIVE_SCENES]);
    expect(new Set(rows.map((row) => row.scene)).size).toBe(LIVE_SCENES.length);
  });

  it("links every scene to the page that mounts it", () => {
    expect(rows.filter((row) => row.href === null)).toEqual([]);

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

  it("states the exact instruction the page prints", () => {
    const gestures = LIVE_SCENES.filter(
      (scene) => SCENE_GESTURE[scene] !== undefined,
    );
    const missing = gestures.filter(
      (scene) => (SCENE_INTERACTION[scene] ?? "").length === 0,
    );
    expect(missing).toEqual([]);

    const wrong = gestures.flatMap((scene) => {
      const row = rows.find((entry) => entry.scene === scene);
      return row?.interaction === SCENE_INTERACTION[scene]
        ? []
        : [`${scene}: ${row?.interaction ?? "no row"}`];
    });
    expect(wrong).toEqual([]);
  });

  it("says a scene without a gesture mounts in its documented state", () => {
    const staticRows = rows.filter(
      (row) => SCENE_GESTURE[row.scene] === undefined,
    );
    expect(staticRows.length).toBeGreaterThan(0);
    expect(
      staticRows.filter(
        (row) => row.interaction !== "Mounts in the state it documents.",
      ),
    ).toEqual([]);
    expect(staticRows.filter((row) => row.gesture !== "")).toEqual([]);
  });

  it("derives the reader's gesture words from the automation steps", () => {
    const gesture = (scene: (typeof LIVE_SCENES)[number]): string =>
      rows.find((row) => row.scene === scene)?.gesture ?? "";

    expect(gesture("context-menu")).toBe("right click");
    expect(gesture("slider")).toBe("press end");
    expect(gesture("text-input")).toBe("type");
    expect(gesture("message-scroller")).toBe("wheel up");
    expect(gesture("form")).toBe("click type type click");
  });

  it("names every composed scene", () => {
    const composed = rows.filter((row) => row.kind === "composed");
    expect(composed.length).toBeGreaterThan(0);
    expect(
      composed.filter(
        (row) =>
          !SCENE_LABEL.some(
            (label) => label.scene === row.scene && label.title === row.title,
          ),
      ),
    ).toEqual([]);
  });
});
