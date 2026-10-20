import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { capabilities } from "@/lib/capabilities";

/**
 * Guards the performance page (plan 605).
 *
 * The bug being prevented is a docs page that remembers what the probes
 * measure. Measured 2026-10-20: `performance`, `benchmark`, `fps`, `frame rate`
 * and `10k rows` returned nothing or List, and the virtualisation facts lived
 * in three fragments (Data display, the capability matrix, List's limitation).
 * A page that repeats "5,000 rows" is right until a scenario changes its size,
 * and a page that promises a frame rate has no source at all.
 *
 * Every count here is read from the shipped scenario source, so the page cannot
 * outlive the probe. `node:fs`/`node:path` are deliberate at this vitest
 * boundary, like `component-api-tables.test.ts`.
 */
const appDirectory = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const page = readFileSync(
  join(appDirectory, "content/docs/performance.mdx"),
  "utf8",
);

const scenarioSource = (file: string): string =>
  readFileSync(join(repoRoot, "apps/playground/src/scenarios", file), "utf8");

/** The row count a probe declares; a missing declaration is a failed guard. */
const declaredRows = (file: string): number => {
  const match = /^const ROWS = (\d+);$/m.exec(scenarioSource(file));
  expect(match, `${file} declares const ROWS`).not.toBeNull();
  return Number(match?.[1] ?? Number.NaN);
};

const withThousands = (value: number): string =>
  Str.replace(/\B(?=(\d{3})+(?!\d))/g, ",")(String(value));

/** The capability keys the page's matrix renders, in source order. */
const matrixCapabilities = (): ReadonlyArray<string> => {
  const attribute =
    /<CapabilityMatrix only=\{\[([^\]]*)\]/.exec(page)?.[1] ?? "";
  return [...attribute.matchAll(/"([^"]+)"/g)].map((match) => match[1] ?? "");
};

describe("performance page", () => {
  it("states the row counts the scenarios declare", () => {
    const listRows = declaredRows("virtual-list.tsx");
    const tableRows = declaredRows("virtual-table.tsx");

    expect(page).toContain(`${withThousands(listRows)} rows`);
    expect(page).toContain(`${withThousands(tableRows)} rows`);
  });

  it("cites only scenarios the capability matrix proves", () => {
    const cited = [
      "virtual-list-window",
      "virtualized-table",
      "tree-view",
      "log-viewer",
    ] as const;
    const proven = new Set(capabilities.flatMap((entry) => entry.scenarios));

    expect(cited.filter((id) => !page.includes(id))).toEqual([]);
    expect(cited.filter((id) => !proven.has(id))).toEqual([]);
  });

  it("renders every capability its cited probes prove", () => {
    const cited = new Set([
      "virtual-list-window",
      "virtualized-table",
      "tree-view",
      "log-viewer",
    ]);
    const expected = capabilities
      .filter((entry) => entry.scenarios.some((id) => cited.has(id)))
      .map((entry) => entry.capability);

    expect(matrixCapabilities()).toEqual(expected);
  });

  it("states the measurements it does not have", () => {
    const section =
      /## What is not measured\n([\s\S]*?)\n## /.exec(page)?.[1] ?? "";

    expect(section.length).toBeGreaterThan(0);
    expect(section.toLowerCase()).toContain("frame");
    expect(section.toLowerCase()).toContain("memory");
    expect(section.toLowerCase()).toContain("startup");
  });

  it("claims no duration it cannot measure", () => {
    expect(page.match(/\b\d+(?:\.\d+)?\s?(?:fps|ms)\b/gi)).toEqual(null);
  });

  it("links the evidence it reports and the pages that continue it", () => {
    const links = [
      "/docs/data-display",
      "/docs/capabilities",
      "/docs/native-testing",
      "/docs/components/list",
      "/docs/components/message-scroller",
      "/docs/roadmap",
    ];

    expect(links.filter((url) => !page.includes(url))).toEqual([]);
  });
});
