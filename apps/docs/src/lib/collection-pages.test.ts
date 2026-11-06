import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionHasPages, collectionPages } from "./collection-pages";
import {
  packageCollections,
  type PackageCollection,
} from "./collection-routes";

const root = new URL("../../../../", import.meta.url);

const unwritten: PackageCollection = {
  origin: "data",
  dir: "packages/not-yet-shipped/docs",
  packageName: "@gpuixui/not-yet-shipped",
  route: "/not-yet-shipped",
  section: "Data display",
  kind: "data surface",
};

describe("a mounted collection's pages", () => {
  it("serves no page for a directory its package has not written", () => {
    expect(existsSync(new URL(`${unwritten.dir}/`, root))).toBe(false);

    expect(collectionPages(root, unwritten)).toEqual([]);
    expect(collectionHasPages(root, unwritten)).toBe(false);
  });

  it("serves the Markdown its package wrote, and nothing else", () => {
    const data = packageCollections.find(
      (collection) => collection.dir === "packages/data/docs",
    );
    expect(data, "the data collection is not mounted").toBeDefined();
    if (data === undefined) return;

    const dir = new URL(`${data.dir}/`, root);
    const onDisk = readdirSync(dir).filter((name) => name.endsWith(".mdx"));

    expect(onDisk.length).toBeGreaterThan(0);
    expect(collectionPages(root, data)).toEqual(onDisk);
    expect(collectionHasPages(root, data)).toBe(true);
  });
});
