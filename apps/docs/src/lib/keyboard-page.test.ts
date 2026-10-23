import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/docs/keyboard` documents `@gpuixui/keyboard`, and its React row named
 * `CommandRegistryProvider` and `useCommandRegistry` without the specifier they
 * live at: the root entry point exports neither, so a reader who copied the one
 * import the page showed got `does not export CommandRegistryProvider`. The
 * package has published `@gpuixui/keyboard/react` since the provider landed.
 *
 * The page now states the specifier and carries a snippet that resolves; this
 * guard reads the package's `exports` map and the values its React module
 * declares, so a new entry point or a renamed hook fails until the page names
 * it. It also holds the warning to the truth: the root index must still omit
 * the provider, because the sentence would be wrong the day it re-exported one.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** A record, narrowed without asserting a shape. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const manifest: unknown = JSON.parse(read("packages/keyboard/package.json"));
const exportsMap =
  isRecord(manifest) && isRecord(manifest["exports"]) ? manifest["exports"] : {};

/** `.` → `@gpuixui/keyboard`; `./react` → `@gpuixui/keyboard/react`. */
const entryPoints = Object.keys(exportsMap)
  .map((key) => (key === "." ? "@gpuixui/keyboard" : `@gpuixui/keyboard/${key.slice(2)}`))
  .toSorted();

const reactValues = [
  ...read("packages/keyboard/src/react.tsx").matchAll(
    /^export (?:function|const) (\w+)/gm,
  ),
].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

const rootEntry = read("packages/keyboard/src/index.ts");

const page = read("apps/docs/content/docs/keyboard.mdx").replace(/\s+/g, " ");

describe("the keyboard page", () => {
  it("names every entry point the package publishes", () => {
    const missing = entryPoints.filter(
      (entry) => !page.includes(`\`${entry}\``),
    );

    expect(entryPoints).toEqual([
      "@gpuixui/keyboard",
      "@gpuixui/keyboard/react",
    ]);
    expect(missing).toEqual([]);
  });

  it("names every value the React module declares", () => {
    const missing = reactValues.filter(
      (name) => !page.includes(`\`${name}\``),
    );

    expect(reactValues.length).toBeGreaterThanOrEqual(2);
    expect(missing).toEqual([]);
  });

  it("warns that the root does not re-export them, while it does not", () => {
    // Bug guarded: the page's only snippet imported from the root.
    expect(rootEntry).not.toContain("CommandRegistryProvider");
    expect(page).toContain("does not re-export them");
    expect(page).toContain("@gpuixui/keyboard/react");
  });
});
