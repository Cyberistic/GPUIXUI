import { describe, expect, it } from "vitest";
import {
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_INTERACTION,
} from "../../preview/scenes";
import { liveSceneRows } from "./live-scenes";
import {
  sceneInstructionHits,
  sceneInstructionRank,
  scenesIndexEntry,
} from "./scene-search";
import { search } from "./search";

/**
 * The bug guarded (plan 582): every gesture instruction is rendered React from
 * `preview/scenes.ts`, so the MDX index never contained it. Measured at
 * `79cf1acc`: `wheel up` returned Radio group and Button group, `press end`
 * returned Extending, `type a name` returned Typography, and `live scene`
 * returned the maintainer guide. Each query below names the page that shows
 * the scene; removing the scene documents makes them fail by query.
 */

const gestureScenes = LIVE_SCENES.filter(
  (scene) => SCENE_GESTURE[scene] !== undefined,
);

const rows = liveSceneRows();

describe("scene search documents", () => {
  it("lists every scene in the one generated document", () => {
    const content = scenesIndexEntry.index.content;
    expect(LIVE_SCENES.filter((scene) => !content.includes(scene))).toEqual([]);
    expect(scenesIndexEntry.index.url).toBe("/docs/previews");
  });

  it("carries the instruction and the derived gesture", () => {
    const content = scenesIndexEntry.index.content;
    const wrong = gestureScenes.flatMap((scene) => {
      const row = rows.find((entry) => entry.scene === scene);
      const interaction = SCENE_INTERACTION[scene] ?? "";
      return content.includes(interaction) &&
        content.includes(row?.gesture ?? "")
        ? []
        : [`${scene}: ${interaction}`];
    });
    expect(wrong).toEqual([]);
  });

  it("synthesizes a candidate at the page that mounts the scene", () => {
    const missing = gestureScenes.flatMap((scene) => {
      const row = rows.find((entry) => entry.scene === scene);
      const hit = sceneInstructionHits(row?.interaction ?? "").find(
        (candidate) => candidate.content === row?.title,
      );
      return hit?.url === row?.href ? [] : [`${scene}: ${hit?.url ?? "none"}`];
    });
    expect(missing).toEqual([]);
  });

  it("does not add a second document at a component page", () => {
    expect(scenesIndexEntry.index.url.startsWith("/docs/components/")).toBe(
      false,
    );
  });

  it("ranks a phrase only when its meaningful words all match", () => {
    const instruction = "Click the region field to open its list.";
    expect(sceneInstructionRank(instruction, "click the")).toBe(undefined);
    expect(sceneInstructionRank(instruction, "click region")).toBe(3);
    expect(sceneInstructionRank(instruction, "region list")).toBe(3);
    expect(sceneInstructionRank(instruction, "region zzz")).toBe(undefined);
    expect(sceneInstructionRank(undefined, "click region")).toBe(undefined);
  });
});

describe("a gesture reaches its scene", { timeout: 120_000 }, () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ["right click", "/docs/components/context-menu"],
    ["wheel up", "/docs/components/message-scroller"],
    ["press end", "/docs/components/slider"],
    ["type a name", "/docs/components/text-input"],
    ["type the workspace name", "/docs/patterns/confirmation-flow"],
    ["open the palette", "/docs/patterns/command-palette"],
    ["live scene", "/docs/previews"],
  ];

  it.each(cases)("%s → %s", async (query, url) => {
    const results = await search(query);
    expect(results[0]?.url).toBe(url);
  });

  it("lists the page once, even when its record and scene match", async () => {
    const results = await search("type a name");
    expect(
      results.filter((result) => result.url === "/docs/components/text-input"),
    ).toHaveLength(1);
  });

  it("keeps the name rules the scene documents do not touch", async () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["button", "/docs/components/button"],
      ["modal", "/docs/components/dialog"],
      ["focus ring", "/docs/tokens-api#functions"],
    ];
    const measured = await Promise.all(
      cases.map(async ([query, expected]) => ({
        query,
        expected,
        actual: (await search(query))[0]?.url,
      })),
    );
    expect(measured.filter((entry) => entry.actual !== entry.expected)).toEqual(
      [],
    );
  });
});
