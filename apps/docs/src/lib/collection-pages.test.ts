import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionHasPages, collectionPages } from "./collection-pages";
import {
  packageCollections,
  type PackageCollection,
} from "./collection-routes";

/**
 * The seam a mounted collection reads its pages through.
 *
 * The site mounts a collection **before** its package writes
 * `packages/<name>/docs`: the package owns the Markdown and the site owns the
 * route, so the package cannot write the directory until the route exists. A
 * raw `readdirSync` throws `ENOENT` in that state and takes the whole docs build
 * with it — which is why every reader goes through `collectionPages`. Nothing
 * fails when a package has not written its pages yet; what fails is a package
 * that wrote a directory with no page in it (held in `package-docs.test.ts`).
 */

const root = new URL("../../../../", import.meta.url);

/** A mounted collection whose package has not written its pages yet. */
const unwritten: PackageCollection = {
  origin: "data",
  dir: "packages/not-yet-shipped/docs",
  packageName: "@gpuixui/not-yet-shipped",
  route: "/docs/not-yet-shipped",
  section: "Data display",
  kind: "data surface",
};

describe("a mounted collection's pages", () => {
  it("serves no page for a directory its package has not written", () => {
    // The fixture is a state, not a guess: if the directory ever exists the
    // premise of this case is gone and it has to be re-read.
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
