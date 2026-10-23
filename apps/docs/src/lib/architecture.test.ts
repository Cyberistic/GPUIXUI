import { readFileSync, readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PackageGraph } from "../components/docs/package-graph";
import { PackageTable } from "../components/docs/package-table";
import { packageGraph } from "../lib/package-graph-data";

/**
 * The architecture page is the map of the workspace, so it has to name every
 * package and the dependencies each manifest declares.
 *
 * The table used to be hand-written and drifted the first time a package gained
 * a dependency (`@gpuixui/editor` → `@gpuixui/dock` while the page still taught
 * the old edges). It is generated from the manifests now, so this guard reads
 * the rendered table and the manifests on disk: a package that is not printed,
 * a dependency the row omits, and a dependency the row invents each fail by
 * name.
 *
 * The direction diagram was the same drift one layer up: it named neither
 * `@gpuixui/dock` nor `@gpuixui/media`, and nothing checked the page's own
 * "the graph is acyclic" claim. The diagram is now data the page renders, and
 * this suite closes both graphs over the manifests — a missing edge, an
 * invented edge, a curated name with no package and a cycle each fail by name.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A manifest's `name`, or `undefined` when the JSON has none. */
const manifestName = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  return typeof value.name === "string" ? value.name : undefined;
};

/** The `@gpuixui/*` names a manifest declares in `dependencies`, sorted. */
const workspaceDependencies = (value: unknown): ReadonlyArray<string> => {
  if (!isRecord(value) || !isRecord(value.dependencies)) return [];
  return Object.keys(value.dependencies)
    .filter((name) => name.startsWith("@gpuixui/"))
    .toSorted();
};

/** The `pages` array of a Fumadocs `meta.json`, or an empty list. */
const metaPages = (json: string): ReadonlyArray<string> => {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value) || !Array.isArray(value.pages)) return [];
  return value.pages.filter((page): page is string => typeof page === "string");
};

/** Every workspace package's manifest, keyed by the name the table prints. */
const manifests = new Map(
  readdirSync(new URL("packages/", root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const value: unknown = JSON.parse(
        read(`packages/${entry.name}/package.json`),
      );
      const name = manifestName(value);
      return name === undefined
        ? []
        : [[name, workspaceDependencies(value)] as const];
    }),
);

const page = read("apps/docs/content/docs/architecture.mdx");

/** The generated table's markup. */
const rendered = renderToStaticMarkup(createElement(PackageTable));

/** The rendered direction diagram. */
const diagram = renderToStaticMarkup(createElement(PackageGraph));

/** The table's body rows, as cell text: package, responsibility, dependencies. */
const rows = (): ReadonlyArray<ReadonlyArray<string>> =>
  rendered
    .split("<tr")
    .slice(2)
    .map((row) =>
      row
        .split("<td")
        .slice(1)
        .map((cell) =>
          cell
            .replace(/^[^>]*>/, "")
            .replace(/<\/td>.*$/, "")
            .trim(),
        ),
    );

/** One arrow: `to` may import `from`. */
type Edge = readonly [from: string, to: string];

/** The arrows a chain list draws, one per adjacent pair. */
const edgesOf = (
  layers: ReadonlyArray<ReadonlyArray<string>>,
): ReadonlyArray<Edge> =>
  layers.flatMap((layer) =>
    layer.flatMap((to, index) => {
      const from = layer[index - 1];
      return from === undefined ? [] : [[from, to] as const];
    }),
  );

/** The arrows the manifests declare, dependency first. */
const declaredEdges: ReadonlyArray<Edge> = [...manifests].flatMap(
  ([name, dependencies]) =>
    dependencies.map((dependency) => [dependency, name] as const),
);

/** Every arrow a set of edges implies, transitively, as `from -> to` strings. */
const closureOf = (edges: ReadonlyArray<Edge>): ReadonlySet<string> => {
  const out = new Map<string, ReadonlyArray<string>>();
  for (const [from, to] of edges) {
    out.set(from, [...(out.get(from) ?? []), to]);
  }

  const pairs = new Set<string>();
  for (const from of out.keys()) {
    const seen = new Set<string>();
    const queue = [...(out.get(from) ?? [])];
    while (queue.length > 0) {
      const to = queue.pop();
      if (to === undefined || seen.has(to)) continue;
      seen.add(to);
      pairs.add(`${from} -> ${to}`);
      queue.push(...(out.get(to) ?? []));
    }
  }
  return pairs;
};

describe("the architecture page", () => {
  it("prints the generated package table, not a hand-kept copy", () => {
    expect(page).toContain("<PackageTable />");
    expect(page).toContain("read from each package's manifest");
    expect(page).not.toContain("| Package | Responsibility |");
  });

  it("names every workspace package, however a manifest spells it", () => {
    // A floor, so a scan that stopped matching cannot pass.
    expect(manifests.size).toBeGreaterThanOrEqual(10);

    const printed = rows().map((cells) => cells[0]);
    expect(printed.toSorted()).toEqual([...manifests.keys()].toSorted());
  });

  it("states the dependency each package's manifest declares", () => {
    const drifted = rows().flatMap(([name = "", , dependencies = ""]) => {
      const declared = manifests.get(name);
      if (declared === undefined) return [`${name}: no manifest`];
      const printed =
        dependencies === "—" || dependencies === ""
          ? []
          : dependencies.split(",").map((cell) => cell.trim());
      return printed.join(",") === declared.join(",")
        ? []
        : [
            `${name}: table says [${printed.join(", ")}], manifest declares [${declared.join(", ")}]`,
          ];
    });

    expect(drifted).toEqual([]);
  });

  it("sits in the sidebar after Installation", () => {
    const pages = metaPages(read("apps/docs/content/docs/meta.json"));

    expect(pages).toContain("architecture");
    expect(pages.indexOf("architecture")).toBeGreaterThan(
      pages.indexOf("installation"),
    );
  });

  it("draws the direction the manifests allow, as they allow it", () => {
    const drawn = edgesOf(packageGraph.direction);
    const invented = drawn.filter(([from, to]) => {
      const declared = manifests.get(to);
      return declared === undefined || !declared.includes(from);
    });
    expect(invented.map(([from, to]) => `${to} -> ${from}`)).toEqual([]);

    const declaredClosure = closureOf(declaredEdges);
    const drawnClosure = closureOf(drawn);
    expect(
      [...declaredClosure].filter((pair) => !drawnClosure.has(pair)).toSorted(),
    ).toEqual([]);
    expect(
      [...drawnClosure].filter((pair) => !declaredClosure.has(pair)).toSorted(),
    ).toEqual([]);
  });

  it("keeps the graph acyclic, as the page claims", () => {
    const cycles = [...closureOf(declaredEdges)].filter((pair) => {
      const [from, to] = pair.split(" -> ");
      return from === to;
    });

    expect(cycles).toEqual([]);
    expect(page).toContain("the graph is acyclic");
  });

  it("names every package in the diagram, and says which stand alone", () => {
    const drawn = new Set(edgesOf(packageGraph.direction).flat());
    const alone = packageGraph.packages
      .map((row) => row.name)
      .filter((name) => !drawn.has(name));

    expect(packageGraph.standalone).toEqual(alone);
    expect(diagram).toContain("──▶");
    for (const name of packageGraph.packages
      .map((row) => row.name)
      .filter((name) => drawn.has(name))) {
      expect(diagram).toContain(name);
    }
    for (const name of alone) expect(diagram).toContain(name);
    expect(diagram).toContain(
      `${alone.join(", ")} ${alone.length === 1 ? "stands" : "stand"} alone`,
    );
    expect(page).toContain("<PackageGraph />");
  });

  it("draws a chain the page's own rendering carries", () => {
    for (const layer of packageGraph.direction) {
      expect(diagram).toContain(layer.join(" ──▶ "));
    }
  });
});
