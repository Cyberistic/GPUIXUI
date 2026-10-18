import { describe, expect, it } from "vitest";
import { plainNote } from "./roadmap-note";
import { roadmapTargets } from "./roadmap.generated";
import { roadmapSearchEntry } from "./roadmap-search";
import { search } from "./search";

/**
 * Guards the roadmap's search document (plan 518). The page renders its rows
 * React from `roadmap.generated.ts`, so the MDX index never sees a target name —
 * `Resizable split panes` would return nothing. The failures worth catching are
 * a dropped document, a target absent from the content, and a promotion that
 * steals a plain word from the page that owns it (the rule plan 504 measured).
 */

const content = roadmapSearchEntry.index.content ?? "";

describe("the roadmap is indexed", () => {
  it("names every target, status and support value", () => {
    const missing = roadmapTargets.flatMap((target) => [
      ...(content.includes(target.name) ? [] : [target.name]),
      ...(content.includes(target.status) ? [] : [target.status]),
      ...(content.includes(target.support) ? [] : [target.support]),
      ...(content.includes(plainNote(target.note)) ? [] : [target.name]),
    ]);
    expect(missing).toEqual([]);
  });

  it("promotes exactly the multiword names", () => {
    const expected = roadmapTargets
      .map((target) => target.name)
      .filter((name) => name.includes(" "));
    expect(roadmapSearchEntry.names).toEqual(expected);
    expect(roadmapSearchEntry.names).not.toContain("Tables");
  });
});

describe("roadmap search", { timeout: 120_000 }, () => {
  it("finds the roadmap from a tracked target name", async () => {
    const results = await search("Resizable split panes", 5);
    expect(results[0]?.url).toBe("/docs/roadmap");
  });

  it("returns a single-word target in the results without promoting it", async () => {
    const results = await search("Toolbars", 5);
    expect(results.some((result) => result.url === "/docs/roadmap")).toBe(true);
  });

  it("does not invent a target", async () => {
    expect(await search("zzzznosuchtarget", 5)).toEqual([]);
  });
});
