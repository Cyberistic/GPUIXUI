import { describe, expect, it } from "vitest";
import {
  filterProjects,
  matchesProject,
  type SearchableProject,
} from "../../../preview/patterns/project-browser-logic";

/**
 * The bugs guarded: the live gesture types lower-case `atlas`, so a
 * case-sensitive filter would leave all six rows on screen and the scene's
 * claimed filter would do nothing; a name-only haystack would hide a project a
 * reader searches for by what it does; and an untrimmed query would hide every
 * row after a stray space. These tests fail when any of those three rules is
 * removed, and the scene contract cannot catch them without a GPUix window.
 */
const atlas: SearchableProject = {
  name: "Atlas",
  description: "Design tokens and the component library",
};
const beacon: SearchableProject = {
  name: "Beacon",
  description: "Release automation and smoke reports",
};
const archive: SearchableProject = {
  name: "Archive",
  description: "Library of the first prototype",
};
const projects: ReadonlyArray<SearchableProject> = [atlas, beacon, archive];

describe("project browser filter", () => {
  it("keeps every project for a blank query", () => {
    expect(filterProjects(projects, "")).toEqual(projects);
    expect(filterProjects(projects, "   ")).toEqual(projects);
  });

  it("matches a capitalised name from a lower-case query", () => {
    expect(matchesProject(atlas, "atlas")).toBe(true);
    expect(filterProjects(projects, "atlas").map((p) => p.name)).toEqual([
      "Atlas",
    ]);
  });

  it("matches a word that appears only in the description", () => {
    expect(matchesProject(beacon, "release")).toBe(true);
    expect(filterProjects(projects, "release").map((p) => p.name)).toEqual([
      "Beacon",
    ]);
  });

  it("ignores surrounding whitespace", () => {
    expect(filterProjects(projects, "  atlas  ").map((p) => p.name)).toEqual([
      "Atlas",
    ]);
  });

  it("returns no rows for a query nothing matches", () => {
    expect(filterProjects(projects, " zzz ")).toEqual([]);
  });

  it("keeps the input order when several rows match", () => {
    expect(filterProjects(projects, "library").map((p) => p.name)).toEqual([
      "Atlas",
      "Archive",
    ]);
  });
});
