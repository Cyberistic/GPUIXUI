/**
 * Guards `source` against the page list its transform was compiled from (plan
 * 524). `src/lib/source.ts` becomes one `import.meta.glob`, and Vitest's
 * filesystem module cache is keyed by that module's content — so a page added
 * without editing `source.ts` left the cached file list behind. Measured: 15 of
 * 94 pages, with every source-based guard still green.
 */
import * as Arr from "effect/Array";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { source } from "@/lib/source";

const content = new URL("../../content/docs/", import.meta.url);

const mdxFiles = (directory: URL, prefix = ""): ReadonlyArray<string> =>
  Arr.flatMap(readdirSync(directory, { withFileTypes: true }), (entry) =>
    entry.isDirectory()
      ? mdxFiles(
          new URL(`${entry.name}/`, directory),
          `${prefix}${entry.name}/`,
        )
      : entry.name.endsWith(".mdx")
        ? [`${prefix}${entry.name}`]
        : [],
  );

describe("source completeness", () => {
  it("lists every page that exists on disk, and nothing else", () => {
    const onDisk = mdxFiles(content);
    const compiled = Arr.map(source.getPages(), (page) => page.data.info.path);
    const missing = Arr.filter(onDisk, (file) => !compiled.includes(file));
    const extra = Arr.filter(compiled, (file) => !onDisk.includes(file));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    expect(compiled).toHaveLength(onDisk.length);
  });
});
