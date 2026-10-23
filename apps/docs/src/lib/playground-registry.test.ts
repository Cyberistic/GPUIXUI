import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  capabilityGroups,
  capabilityLabel,
  playgroundSuites,
  readProbes,
} from "./playground-registry";

/**
 * The playground catalogue, held to the registries it is read from.
 *
 * `/docs/playground` is the only page that tells a reader what the companion
 * native app can prove, and it is generated: a probe added to the playground has
 * to appear on the page, and a page row has to name a probe the runners print
 * with `--list`. The registries are read here with a line reader — a different
 * algorithm from the source parser in the module — so a regex that matched too
 * little or too much fails instead of agreeing with itself.
 */

const root = new URL("../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

interface Triple {
  readonly id: string;
  readonly title: string;
  readonly capability: string;
}

/** The title literal after a `title:` line, unescaped or `undefined`. */
const literal = (line: string | undefined): string | undefined => {
  const text = line?.trim() ?? "";
  if (!text.startsWith('"') || !text.endsWith('",')) return undefined;
  return text.slice(1, -2).replace(/\\(["\\])/g, "$1");
};

/** Read one registry entry at a time, by line, in file order. */
const triples = (source: string): ReadonlyArray<Triple> => {
  const lines = source.split("\n");
  const out: Triple[] = [];

  lines.forEach((line, index) => {
    const id = /^\s*id: "([^"]+)",$/.exec(line)?.[1];
    if (id === undefined) return;

    const titleLine = lines[index + 1];
    const afterColon = titleLine?.trim().slice("title:".length).trim() ?? "";
    const title =
      afterColon === "" ? literal(lines[index + 2]) : literal(afterColon);
    const capability = /^\s*capability: "([^"]+)",$/.exec(
      lines[index + 2] ?? "",
    )?.[1];
    const shift = afterColon === "" ? 1 : 0;

    if (title === undefined) return;
    out.push({
      id,
      title,
      capability:
        capability ??
        /^\s*capability: "([^"]+)",$/.exec(
          lines[index + 2 + shift] ?? "",
        )?.[1] ??
        "",
    });
  });

  return out;
};

/** The suites, in the order the page prints them. */
const suites = playgroundSuites;

describe("the playground catalogue's source", () => {
  it("reads every entry the three registries declare", () => {
    const declared = suites.map((suite) => ({
      suite: suite.name,
      source: triples(read(suite.source)),
    }));

    expect(declared.filter((entry) => entry.source.length === 0)).toEqual([]);
    expect(declared.map((entry) => [entry.suite, entry.source])).toEqual(
      suites.map((suite) => [suite.name, suite.probes]),
    );
    // Floors, so a walk that stopped reading cannot pass on an empty list.
    expect(
      suites.find((suite) => suite.name === "Live probes")?.probes.length,
    ).toBeGreaterThanOrEqual(100);
    expect(
      suites.find((suite) => suite.name === "Headless scenarios")?.probes
        .length,
    ).toBeGreaterThanOrEqual(40);
  });

  it("has no entry the parser could not read or declared twice", () => {
    expect(suites.flatMap((suite) => suite.problems)).toEqual([]);
    expect(
      suites.flatMap((suite) => {
        const seen = new Set<string>();
        return suite.probes.flatMap((probe) => {
          if (seen.has(probe.id)) return [`${suite.name}: ${probe.id} twice`];
          seen.add(probe.id);
          return [];
        });
      }),
    ).toEqual([]);
  });

  it("names its registry and the host it needs", () => {
    expect(suites.map((suite) => suite.host)).toEqual([
      "offscreen renderer",
      "real window",
      "pty",
    ]);
    expect(
      suites.flatMap((suite) =>
        existsSync(new URL(suite.source, root))
          ? []
          : [`${suite.source} does not exist`],
      ),
    ).toEqual([]);
  });

  it("reports a shape it cannot read instead of dropping the entry", () => {
    const broken = readProbes(
      [
        "export const registry = [",
        "  {",
        '    id: "read-me",',
        "    title:",
        '      "A title the parser reads",',
        '    capability: "layout",',
        "  },",
        '  { id: "no-title", capability: "focus" },',
        "];",
      ].join("\n"),
    );

    expect(broken.probes.map((probe) => probe.id)).toEqual(["read-me"]);
    expect(broken.problems).toEqual([
      "`no-title` is declared but not read as id/title/capability",
    ]);
  });
});

describe("the capability groups", () => {
  it("covers every probe once, in first-appearance group order", () => {
    const probes = suites.flatMap((suite) => suite.probes);
    const groups = capabilityGroups(probes);
    const flat = groups.flatMap((group) => group.probes);

    expect(flat.length).toBe(probes.length);
    expect(new Set(flat.map((probe) => probe.id))).toEqual(
      new Set(probes.map((probe) => probe.id)),
    );
    expect(groups.map((group) => group.capability)).toEqual(
      probes.reduce<ReadonlyArray<string>>(
        (names, probe) =>
          names.includes(probe.capability)
            ? names
            : [...names, probe.capability],
        [],
      ),
    );
  });

  it("labels a kebab-case capability for a reader", () => {
    expect(capabilityLabel("virtual-list")).toBe("Virtual list");
    expect(capabilityLabel("focus")).toBe("Focus");
  });
});

describe("the playground page", () => {
  const page = read("apps/docs/content/docs/playground.mdx");
  const meta: unknown = JSON.parse(read("apps/docs/content/docs/meta.json"));
  const record = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
  const sidebarPages = record(meta) ? meta["pages"] : undefined;
  const manifest: unknown = JSON.parse(read("package.json"));
  const playgroundManifest: unknown = JSON.parse(
    read("apps/playground/package.json"),
  );

  const scriptsOf = (value: unknown): Record<string, unknown> => {
    if (!record(value)) return {};
    const scripts = value["scripts"];
    return record(scripts) ? scripts : {};
  };

  it("mounts the generated catalogue and lists it in the sidebar", () => {
    expect(page).toContain(
      'import { PlaygroundScenarios } from "@/components/docs/playground-scenarios"',
    );
    expect(page).toContain("<PlaygroundScenarios />");
    expect(Array.isArray(sidebarPages) ? sidebarPages : []).toContain(
      "playground",
    );
  });

  it("prints the commands the manifests and runners define", () => {
    // The app command is the root script, not a string typed twice.
    expect(scriptsOf(manifest)["dev:playground"]).toBe(
      "nub run --filter playground dev",
    );
    expect(page).toContain("nub run dev:playground");

    // The scoped runners are the files the build emits, and the build script
    // is what makes them.
    expect(scriptsOf(playgroundManifest).build).toContain("tsconfig.build");
    expect(existsSync(new URL("apps/playground/src/smoke/run.ts", root))).toBe(
      true,
    );
    expect(existsSync(new URL("apps/playground/src/live/run.ts", root))).toBe(
      true,
    );
    expect(page).toContain("apps/playground/dist/smoke/run.js --only <id>");
    expect(page).toContain("apps/playground/dist/live/run.js --only <id>");
    expect(page).toContain("--list");
  });

  it("sends a reader to the record and the test lane beside it", () => {
    expect(page).toContain("(/docs/testing)");
    expect(page).toContain("(/docs/runtime)");
    expect(page).toContain("release gate");
    expect(page).toContain("apps/playground/README.md");
  });
});
