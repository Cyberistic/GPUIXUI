import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import { exportedNames } from "../lib/source-exports";
import { registryViolations } from "./contract";
import { components } from "./registry";
import { decodeComponentMeta } from "./schema";

/**
 * Guards the component registry (plan 411). The interesting failure is a
 * record that decodes but lies — a `done` component with no GPUix proof, a
 * `related` link to nothing, or an inventory that disagrees with
 * `COMPONENTS.md`. Each check returns the violations it found so the
 * assertion is a claim about the repository, not about a stubbed value.
 */

const root = new URL("../../../../", import.meta.url);
const pagesDirectory = new URL("apps/docs/content/docs/components/", root);
const componentsMarkdown = readFileSync(
  fileURLToPath(new URL("COMPONENTS.md", root)),
  "utf8",
);

const decodeSidebar = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ pages: Schema.Array(Schema.String) })),
);

const normalize = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const tierRows = (heading: string): readonly string[] => {
  const section = componentsMarkdown
    .split(`## ${heading}`)[1]
    ?.split("\n## ")[0];
  if (section === undefined) return [];
  return section.split("\n").flatMap((line) => {
    const name = line.match(/^\|\s*([^|]+?)\s*\|/)?.[1];
    return name === undefined ||
      name === "Component" ||
      normalize(name).length === 0
      ? []
      : [name];
  });
};

describe("component registry", () => {
  it("decodes every entry through the schema", () => {
    const decoded = components.map((entry) => decodeComponentMeta(entry));
    expect(decoded).toHaveLength(components.length);
  });

  it("has unique slugs and titles", () => {
    const slugs = new Set(components.map((entry) => entry.slug));
    const titles = new Set(components.map((entry) => entry.title));
    expect(slugs.size).toBe(components.length);
    expect(titles.size).toBe(components.length);
  });

  it("keeps every related link resolvable", () => {
    const slugs = new Set(components.map((entry) => entry.slug));
    const dangling = components.flatMap((entry) =>
      entry.related
        .filter((related) => !slugs.has(related))
        .map((related) => `${entry.slug} -> ${related}`),
    );
    expect(dangling).toEqual([]);
  });

  it("keeps status and GPUix support coherent", () => {
    const violations = components.flatMap((entry) => {
      const problems: string[] = [];
      if (entry.status === "done" && entry.gpuix !== "yes")
        problems.push(`${entry.slug}: done requires gpuix "yes"`);
      if (entry.status === "unsupported" && entry.gpuix !== "no")
        problems.push(`${entry.slug}: unsupported requires gpuix "no"`);
      if (entry.status === "unsupported" && entry.limitations.length === 0)
        problems.push(`${entry.slug}: unsupported requires a limitation`);
      if (
        (entry.status === "wip" || entry.status === "done") &&
        entry.sourcePath === null
      )
        problems.push(`${entry.slug}: ${entry.status} requires a sourcePath`);
      return problems;
    });
    expect(violations).toEqual([]);
  });

  it("orders entries by tier then group so grouping stays correct", () => {
    const key = (entry: (typeof components)[number]) =>
      `${entry.tier}:${entry.group}`;
    const outOfOrder = components.flatMap((entry, index) => {
      const previous = components[index - 1];
      return previous !== undefined && key(previous) > key(entry)
        ? [entry.slug]
        : [];
    });
    expect(outOfOrder).toEqual([]);
  });

  it("agrees with COMPONENTS.md for the delivered tiers", () => {
    const inventory = new Set(
      [
        ...tierRows("Tier 1 — foundational"),
        ...tierRows("Tier 2 — composition and feedback"),
      ].map(normalize),
    );
    const registry = new Set(components.map((entry) => normalize(entry.title)));
    const missingFromRegistry = [...inventory].filter(
      (name) => !registry.has(name),
    );
    const missingFromInventory = [...registry].filter(
      (name) => !inventory.has(name),
    );
    expect({ missingFromRegistry, missingFromInventory }).toEqual({
      missingFromRegistry: [],
      missingFromInventory: [],
    });
  });

  it("has a page and source for every finished component", () => {
    const incomplete = components
      .filter((entry) => entry.status !== "planned")
      .filter(
        (entry) =>
          !existsSync(new URL(`${entry.slug}.mdx`, pagesDirectory)) ||
          entry.sourcePath === null ||
          !existsSync(new URL(entry.sourcePath, root)),
      )
      .map((entry) => entry.slug);
    expect(incomplete).toEqual([]);
  });

  it("keeps the components sidebar in step with the pages that exist", () => {
    const sidebar = decodeSidebar(
      readFileSync(new URL("meta.json", pagesDirectory), "utf8"),
    );
    const expected = [
      "index",
      ...components
        .filter((entry) => entry.status !== "planned")
        .map((entry) => entry.slug),
    ];
    expect(sidebar.pages).toEqual(expected);
  });
});

/**
 * The compound/workspace rules (plan 427 §3). No such record exists yet, so the
 * fixtures below are the only way these contracts can fail before the first
 * data-grid or docking page — and they use real package files, not invented
 * paths.
 */
describe("compound record contract", () => {
  const base: (typeof components)[number] = {
    slug: "demo",
    title: "Demo",
    tier: "3",
    group: "data",
    status: "planned",
    gpuix: "unverified",
    summary: "A demo record.",
    packageName: "@gpuixui/components",
    sourcePath: null,
    parts: [],
    pattern: "static",
    persistence: null,
    dependencies: [],
    related: [],
    playgroundScreen: null,
    screenshots: [],
    limitations: [],
  };

  const root = fileURLToPath(new URL("../../../../", import.meta.url));
  const exportCache = new Map<string, ReadonlyArray<string>>();
  const isExported = (packageName: string, name: string): boolean => {
    const directory = join(
      root,
      "packages",
      packageName.replace("@gpuixui/", ""),
      "src",
    );
    const names =
      exportCache.get(directory) ??
      (existsSync(directory) ? exportedNames(directory) : []);
    exportCache.set(directory, names);
    return names.includes(name);
  };

  it("leaves the new fields at their defaults on every existing record", () => {
    const wrong = components
      .filter(
        (entry) =>
          entry.pattern !== "static" ||
          entry.parts.length > 0 ||
          entry.persistence !== null,
      )
      .map((entry) => entry.slug);
    expect(wrong).toEqual([]);
  });

  it("holds every real record to the compound contract", () => {
    expect(registryViolations(components, isExported)).toEqual([]);
  });

  it("requires a playground screen on a workspace record", () => {
    expect(
      registryViolations(
        [{ ...base, pattern: "workspace", playgroundScreen: null }],
        () => true,
      ),
    ).toEqual(["demo: a workspace pattern requires a playgroundScreen"]);
  });

  it("rejects a part the package does not export", () => {
    expect(
      registryViolations(
        [
          {
            ...base,
            parts: [
              {
                name: "NotARealExport",
                sourcePath: "packages/components/src/card.tsx",
              },
            ],
          },
        ],
        isExported,
      ),
    ).toEqual(["demo: NotARealExport is not exported by @gpuixui/components"]);
  });

  it("accepts a real part and a workspace record with a screen", () => {
    expect(
      registryViolations(
        [
          {
            ...base,
            pattern: "workspace",
            playgroundScreen: "Workspace gallery",
            parts: [
              { name: "Card", sourcePath: "packages/components/src/card.tsx" },
            ],
          },
        ],
        isExported,
      ),
    ).toEqual([]);
  });
});
