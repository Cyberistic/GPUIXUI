import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./examples.tsx", import.meta.url), "utf8");

const componentRegistry = readFileSync(
  new URL("../../../../packages/components/examples/index.ts", import.meta.url),
  "utf8",
);

const filesRegistry = readFileSync(
  new URL("../../../../packages/files/examples/index.ts", import.meta.url),
  "utf8",
);

const screenIds = (registry: string): ReadonlyArray<string> =>
  Arr.fromIterable(registry.matchAll(/^  "?([a-z0-9-]+)"?:/gm)).map(
    (match) => match[1] ?? "",
  );

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const components = readFileSync(
  new URL("../../../../.agents/slop/COMPONENTS.md", import.meta.url),
  "utf8",
);

const galleryRow = (() => {
  const start = components.indexOf("| Native theme gallery |");
  const end = components.indexOf("\n", start);
  return start === -1 ? "" : components.slice(start, end);
})();

const gallerySection = (() => {
  const start = readme.indexOf("## The example gallery");
  const end = readme.indexOf("\n## ", start + 1);
  return start === -1 || end === -1 ? "" : readme.slice(start, end);
})();

const provenBullet = (() => {
  const start = readme.indexOf("- Every shipped example the docs quote");
  const end = readme.indexOf("\n- ", start + 1);
  return start === -1 || end === -1 ? "" : readme.slice(start, end);
})();

const perPageSource = (() => {
  const start = source.indexOf("yield* Effect.forEach(");
  const end = source.indexOf("{ concurrency: 1 }", start);
  return start === -1 || end === -1 ? "" : source.slice(start, end);
})();

const sites = (text: string): number =>
  text.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
] as const;

describe("the example gallery's header", () => {
  it("does not pin the registry size in prose", () => {
    expect(source).not.toMatch(/\b\d+\s+(?:screens|examples)\b/i);
  });

  it("reports the size from the registry", () => {
    expect(source).toContain("of=${Arr.length(exampleIds)}");
  });
});

describe("the example gallery's README section", () => {
  it("does not pin the registry size or a total derived from it", () => {
    expect(gallerySection).not.toBe("");
    expect(gallerySection).not.toMatch(
      /\b\d+\s+(?:screens?|examples?|checks?)\b/i,
    );
    expect(gallerySection).not.toMatch(/of=\d+/);

    expect(gallerySection).not.toMatch(/expected \d+, got \d+/);
    expect(provenBullet).not.toBe("");
    expect(provenBullet).not.toMatch(
      /\b\d+\s+(?:screens?|examples?|checks?)\b/i,
    );
  });

  it("states the per-page shape the probe actually asserts", () => {
    const perPage = sites(perPageSource);
    expect(perPage).toBeGreaterThan(1);
    expect(gallerySection).toContain(`${WORDS[perPage]} checks per page`);
    expect(provenBullet).toContain(`${WORDS[perPage]} checks per page`);

    const wholeRun = sites(source) - perPage;
    expect(wholeRun).toBeGreaterThan(0);
    expect(wholeRun).toBeLessThan(WORDS.length);
    expect(gallerySection).toContain(`${WORDS[wholeRun]} checks for the run`);
  });

  it("holds the two negative controls to the probe's own message", () => {
    expect(gallerySection).toContain(
      "`no-such-example lays out a height of its own`",
    );
    expect(gallerySection).toContain("`no two examples paint the same screen`");
    expect(source).toContain('"no two examples paint the same screen"');
    expect(source).toContain("`${id} lays out a height of its own`");
  });
});

describe("the example gallery's inventory row", () => {
  it("does not pin the suite's size in its evidence", () => {
    expect(galleryRow).not.toBe("");
    expect(galleryRow).not.toMatch(/\b\d+\s+(?:headless\s+)?scenarios?\b/i);
    expect(galleryRow).not.toMatch(
      /\b\d+\s+(?:shipped\s+)?(?:component\s+)?examples?\b/i,
    );
    expect(galleryRow).toContain("full headless suite");
    expect(galleryRow).toContain("every registered component example");
  });
});

describe("the example gallery's registry", () => {
  it("merges the shell package's three examples under the docs' ids", () => {
    expect(source).toContain('from "@gpuixui/shell/examples"');
    expect(source).toContain("AppMenuExample");
    expect(source).toContain("StatusBarExample");
    expect(source).toContain("ToolbarExample");
    expect(source).toContain('"app-menu": AppMenuExample');
    expect(source).toContain('"status-bar": StatusBarExample');
    expect(source).toContain("toolbar: ToolbarExample");
    expect(source).toContain("...componentExamples");
    expect(source).toContain("...shellExamples");
  });

  it("merges the files package's three screens too", () => {
    expect(source).toContain('from "@gpuixui/files/examples"');
    expect(source).toContain("...fileExamples");

    expect(
      Arr.sort(Arr.fromIterable(screenIds(filesRegistry)), Order.String),
    ).toEqual(["file-tree", "log-viewer", "property-panel"]);
  });

  it("gives the merged ids no name the components registry already uses", () => {
    const componentIds = Arr.fromIterable(
      componentRegistry.matchAll(/^  "([a-z0-9-]+)":/gm),
    ).map((match) => match[1] ?? "");

    expect(Arr.length(componentIds)).toBeGreaterThan(30);
    const merged = [
      "app-menu",
      "status-bar",
      "toolbar",
      ...screenIds(filesRegistry),
    ];
    expect(merged).toHaveLength(6);
    expect(Arr.intersection(componentIds, merged)).toEqual([]);
  });
});
