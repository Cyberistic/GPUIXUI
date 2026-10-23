import { readFileSync, readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PackageTable } from "../components/docs/package-table";

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

  it("draws the arrows in the direction the manifests allow", () => {
    // `data` builds on components; components builds on primitives. A graph
    // that omits either reads as licence to import the other way.
    expect(page).toContain("primitives ──▶ components ──▶ data");
    expect(page).not.toContain("does not depend on `@gpuixui/primitives`");
  });
});
