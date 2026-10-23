import { describe, expect, it } from "vitest";
import {
  buildPackageGraph,
  packageOrder,
  packageResponsibilities,
  parsePackageManifest,
  type PackageManifest,
} from "./package-graph";
import { readPackageGraph, readPackageManifests } from "./package-graph-source";
import { repoRoot } from "./public-symbols-source";

/**
 * The model behind the architecture page's package table.
 *
 * A manifest says a package's name and its dependencies; it cannot say where
 * the row belongs or what the package is for. Those two lists are curated, so
 * this suite proves a new package is reported rather than dropped, and that no
 * curated entry outlives the package it names.
 */

const manifest = (
  name: string,
  dependencies: ReadonlyArray<string> = [],
  description = "",
): PackageManifest => ({ name, description, dependencies });

describe("the package manifest parse", () => {
  it("keeps a named manifest and only the workspace dependencies, sorted", () => {
    expect(
      parsePackageManifest({
        name: "@gpuixui/a",
        dependencies: {
          react: "^19.2.0",
          "@gpuixui/z": "workspace:*",
          "@gpuixui/b": "workspace:*",
        },
      }),
    ).toEqual({
      name: "@gpuixui/a",
      description: "",
      dependencies: ["@gpuixui/b", "@gpuixui/z"],
    });
  });

  it("refuses a value that is not a named manifest", () => {
    expect(parsePackageManifest("nope")).toBeUndefined();
    expect(parsePackageManifest({ dependencies: {} })).toBeUndefined();
  });
});

describe("the package graph", () => {
  it("prints the curated order and appends a package it does not place", () => {
    const graph = buildPackageGraph([
      manifest("@gpuixui/tokens"),
      manifest("@gpuixui/new"),
    ]);

    expect(graph.packages.map((row) => row.name)).toEqual([
      "@gpuixui/tokens",
      "@gpuixui/new",
    ]);
    expect(graph.unordered).toEqual(["@gpuixui/new"]);
  });

  it("uses a package's own description until its sentence is curated", () => {
    const curated = buildPackageGraph([manifest("@gpuixui/tokens")]);
    expect(curated.packages[0]?.responsibility).toBe(
      packageResponsibilities["@gpuixui/tokens"],
    );
    expect(curated.uncatalogued).toEqual([]);

    const described = buildPackageGraph([
      manifest("@gpuixui/new", [], "A new package."),
    ]);
    expect(described.packages[0]?.responsibility).toBe("A new package.");
    expect(described.uncatalogued).toEqual(["@gpuixui/new"]);

    const silent = buildPackageGraph([manifest("@gpuixui/new")]);
    expect(silent.packages[0]?.responsibility).toBe("Not described yet.");
  });
});

describe("the shipped workspace", () => {
  const manifests = readPackageManifests(repoRoot);
  const names = new Set(manifests.map((entry) => entry.name));

  it("places and describes every package it ships", () => {
    expect(manifests.length).toBeGreaterThanOrEqual(10);

    const graph = readPackageGraph(repoRoot);
    expect(graph.uncatalogued).toEqual([]);
    expect(graph.unordered).toEqual([]);
    expect(graph.packages.length).toBe(manifests.length);
  });

  it("keeps no curated entry for a package that no longer exists", () => {
    expect(packageOrder.filter((name) => !names.has(name))).toEqual([]);
    expect(
      Object.keys(packageResponsibilities).filter((name) => !names.has(name)),
    ).toEqual([]);
  });
});
