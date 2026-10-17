import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import { LIVE_SCENES, SCENE_TEXT } from "../../../preview/scenes";

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

const interactionScenes = new Map([
  ["tabs", "tabs"],
  ["dropdown-menu", "dropdown-menu"],
  ["dialog", "dialog"],
]);

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
});
