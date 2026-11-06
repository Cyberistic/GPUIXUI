import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  namedImports,
  publishedNames,
  unresolvedImports,
} from "./doc-snippets.test-util";

const registry = readFileSync(
  new URL("../components/docs/blocks.tsx", import.meta.url),
  "utf8",
);

const sourceBlocks = (): ReadonlyArray<{ name: string; source: string }> => {
  const entries = [
    ...registry.matchAll(/name: "([a-z0-9-]+)",\n[\s\S]*?source: (\w+),/g),
  ];
  return entries.map((match) => ({
    name: match[1] ?? "",
    source: match[2] ?? "",
  }));
};

const sourceText = (constant: string): string | undefined => {
  const declared = new RegExp(
    `const ${constant} = \`([\\s\\S]*?)\`;`,
    "m",
  ).exec(registry);
  if (declared?.[1] !== undefined) return declared[1];

  const raw = new RegExp(`import ${constant} from "([^"]+)\\?raw"`).exec(
    registry,
  );
  if (raw?.[1] !== undefined) {
    const path = new URL(`../components/docs/${raw[1]}`, import.meta.url);
    return existsSync(path) ? readFileSync(path, "utf8") : undefined;
  }

  const imported = new RegExp(
    `import \\{[\\s\\S]*?\\b${constant}\\b[\\s\\S]*?\\} from "(\\./[^"]+)"`,
  ).exec(registry);
  if (imported?.[1] === undefined) return undefined;
  const module = imported[1].replace("./", "");
  const candidates = [".tsx", ".ts"].map(
    (extension) => `../components/docs/${module}${extension}`,
  );
  const path = candidates.find((candidate) =>
    existsSync(new URL(candidate, import.meta.url)),
  );
  if (path === undefined) return undefined;
  const file = readFileSync(new URL(path, import.meta.url), "utf8");
  return new RegExp(`const ${constant} = \`([\\s\\S]*?)\`;`, "m").exec(
    file,
  )?.[1];
};

describe("a block's copyable source", () => {
  it("registers a source constant for every block", () => {
    const blocks = sourceBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    const missing = blocks
      .map((block) => block.name)
      .filter((name) => name === "");
    expect(missing).toEqual([]);
  });

  it("imports only names the workspace publishes", () => {
    const blocks = sourceBlocks();
    const published = publishedNames();
    const broken = blocks.flatMap((block) => {
      const source = sourceText(block.source);
      expect(source, `${block.name} has no readable source`).toBeDefined();
      return unresolvedImports(namedImports([source ?? ""]), published).map(
        (problem) => `${block.name}: ${problem}`,
      );
    });
    expect(broken).toEqual([]);
  });

  it("prints a recipe, not an empty Code tab", () => {
    const blocks = sourceBlocks();
    const empty = blocks
      .filter((block) => (sourceText(block.source) ?? "").trim().length < 80)
      .map((block) => block.name);
    expect(empty, "a block's Code tab prints almost nothing").toEqual([]);
  });
});
