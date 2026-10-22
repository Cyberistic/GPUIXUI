import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The architecture page is the map of the workspace, so it has to name every
 * package. A package added without a row is a map that sends a reader to a
 * place that does not exist — and nothing else in the build would notice, since
 * the page is prose.
 *
 * The map's second claim is the direction of the arrows: which packages a
 * package may import. It was prose beside a table and had drifted in both
 * directions — `@gpuixui/components` listed `tokens, tw, keyboard` while its
 * manifest declares five more, among them `@gpuixui/primitives` for the
 * published `hint` subpath, and a paragraph under the table still said the two
 * packages do not depend on each other. A reader planning a package reads the
 * table to know what is allowed, so the column is held to the manifests.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** A manifest's `name`, or `undefined` when the JSON has none. */
const manifestName = (json: string): string | undefined => {
  const value: unknown = JSON.parse(json);
  if (typeof value !== "object" || value === null || !("name" in value)) {
    return undefined;
  }
  return typeof value.name === "string" ? value.name : undefined;
};

/** The `pages` array of a Fumadocs `meta.json`, or an empty list. */
const metaPages = (json: string): ReadonlyArray<string> => {
  const value: unknown = JSON.parse(json);
  if (typeof value !== "object" || value === null || !("pages" in value)) {
    return [];
  }
  const { pages } = value;
  return Array.isArray(pages)
    ? pages.filter((page): page is string => typeof page === "string")
    : [];
};

/** The workspace packages a manifest declares in `dependencies`. */
const workspaceDependencies = (json: string): ReadonlyArray<string> => {
  const value: unknown = JSON.parse(json);
  const dependencies =
    typeof value === "object" && value !== null && "dependencies" in value
      ? value.dependencies
      : undefined;
  if (typeof dependencies !== "object" || dependencies === null) return [];
  return Object.keys(dependencies)
    .filter((name) => name.startsWith("@gpuixui/"))
    .toSorted();
};

const packages = readdirSync(new URL("packages/", root), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const name = manifestName(read(`packages/${entry.name}/package.json`));
    return name === undefined ? [] : [name];
  });

/** Every package's manifest, keyed by the name the page prints. */
const manifests = new Map(
  readdirSync(new URL("packages/", root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const json = read(`packages/${entry.name}/package.json`);
      const name = manifestName(json);
      return name === undefined
        ? []
        : [[name, workspaceDependencies(json)] as const];
    }),
);

const page = read("apps/docs/content/docs/architecture.mdx");

/** One row of the package table: its name and the "Depends on" cell. */
const rows = (): ReadonlyArray<{
  readonly name: string;
  readonly depends: ReadonlyArray<string>;
}> => {
  const start = page.indexOf("## The packages");
  const end = page.indexOf("\n## ", start + 1);
  return page
    .slice(start, end === -1 ? undefined : end)
    .split("\n")
    .flatMap((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      const [empty, name, , depends] = cells;
      if (empty !== "" || !name?.startsWith("`@gpuixui/")) return [];
      return [
        {
          name: name.replaceAll("`", ""),
          depends: [...(depends ?? "").matchAll(/`([^`]+)`/g)].map((match) =>
            (match[1] ?? "").startsWith("@gpuixui/")
              ? (match[1] ?? "")
              : `@gpuixui/${match[1]}`,
          ),
        },
      ];
    });
};

describe("the architecture page", () => {
  it("names every workspace package, so the map cannot fall behind", () => {
    expect(packages.length).toBeGreaterThanOrEqual(10);

    expect(packages.filter((name) => !page.includes(name))).toEqual([]);
  });

  it("sits in the sidebar after Installation", () => {
    const pages = metaPages(read("apps/docs/content/docs/meta.json"));

    expect(pages).toContain("architecture");
    expect(pages.indexOf("architecture")).toBeGreaterThan(
      pages.indexOf("installation"),
    );
  });

  it("states the dependency each package's manifest declares", () => {
    const table = rows();

    // A floor: a table that stopped being parsed would otherwise pass empty.
    expect(table.length).toBeGreaterThanOrEqual(manifests.size);

    const drifted = table.flatMap((row) => {
      const declared = manifests.get(row.name);
      if (declared === undefined) return [`${row.name}: no manifest`];
      const printed = row.depends.toSorted();
      return printed.join(",") === declared.join(",")
        ? []
        : [
            `${row.name}: page says [${printed.join(", ")}], manifest declares [${declared.join(", ")}]`,
          ];
    });

    expect(drifted).toEqual([]);
  });

  it("draws the arrows in the direction the manifests allow", () => {
    // `data` builds on components; components builds on primitives. A graph
    // that omits either reads as licence to import the other way.
    expect(page).toContain("primitives ──▶ components ──▶ data");
    expect(page).not.toContain("does not depend on `@gpuixui/primitives`");
  });
});
