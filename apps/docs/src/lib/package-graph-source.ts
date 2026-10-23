import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildPackageGraph,
  parsePackageManifest,
  type PackageGraph,
  type PackageManifest,
} from "./package-graph.ts";

/**
 * The workspace package manifests, read for the architecture page.
 *
 * Node-only, and deliberately so: this runs inside the Vite plugin, once, at
 * build time. The page receives the graph as data (`package-graph-data.ts`) and
 * never imports this module, so the browser bundle carries no filesystem call.
 */

/**
 * Every manifest under `packages/`, in directory order.
 *
 * A directory without a package manifest is not a package this table can
 * describe, so it is skipped; a manifest that is not readable as JSON fails the
 * build rather than printing a package with a guessed name.
 */
export const readPackageManifests = (
  root: string,
): ReadonlyArray<PackageManifest> => {
  const packages = join(root, "packages");
  return readdirSync(packages, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const manifest = parsePackageManifest(
        JSON.parse(
          readFileSync(join(packages, entry.name, "package.json"), "utf8"),
        ),
      );
      return manifest === undefined ? [] : [manifest];
    });
};

/** The architecture page's table, read from the manifests under `root`. */
export const readPackageGraph = (root: string): PackageGraph =>
  buildPackageGraph(readPackageManifests(root));
