import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  namedImports,
  publishedNames,
  unresolvedImports,
} from "./doc-snippets.test-util";

/**
 * A block's copyable source is code the reader pastes into their own app.
 *
 * The MDX snippet walk (`page-snippets.test.ts`) reads fenced code on a page, and
 * a block's recipe is not a fence: it lives in `blocks.tsx` as a `source` string
 * rendered into the Code tab, so a renamed export in `@gpuixui/*` would leave
 * every block teaching a broken import while the build stayed green. This walks
 * the registry instead — every block's source is resolved against the entry
 * point's own source, and a block with an empty source fails, because a Code tab
 * that prints nothing is the same lie as a wrong import.
 */

const registry = readFileSync(
  new URL("../components/docs/blocks.tsx", import.meta.url),
  "utf8",
);

/** The `source` a block's entry passes, read from the registry's own text. */
const sourceBlocks = (): ReadonlyArray<{ name: string; source: string }> => {
  const entries = [
    ...registry.matchAll(/name: "([a-z0-9-]+)",\n[\s\S]*?source: (\w+),/g),
  ];
  return entries.map((match) => ({
    name: match[1] ?? "",
    source: match[2] ?? "",
  }));
};

/**
 * The value a named source constant holds, or `undefined` when the registry
 * imports it from another module (the dashboard's lives in `dashboard.tsx`).
 */
const sourceText = (constant: string): string | undefined => {
  const declared = new RegExp(
    `const ${constant} = \`([\\s\\S]*?)\`;`,
    "m",
  ).exec(registry);
  if (declared?.[1] !== undefined) return declared[1];

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
