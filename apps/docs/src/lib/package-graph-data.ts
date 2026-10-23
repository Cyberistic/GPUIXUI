import graph from "virtual:gpuixui-package-graph";
import type { PackageGraph } from "./package-graph";

/**
 * The package graph, read at build time.
 *
 * The Vite plugin (`plugins/package-graph-plugin.ts`) reads every manifest once
 * and serves the result as a module, so the page cannot fall behind a
 * dependency it did not print.
 */
export const packageGraph: PackageGraph = graph;
