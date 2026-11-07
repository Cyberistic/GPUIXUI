import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  namedImports,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";
import { repoRoot } from "./public-symbols-source";

const read = (path: string): string => readRepo(path);

const page = read("apps/docs/content/docs/getting-started/index.mdx");
const snippets = typescriptSnippets(page);
const imports = namedImports(snippets);

const proseWords = (): number =>
  page
    .split("---")
    .slice(2)
    .join("---")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+.*$/gm, "")
    .replace(/`[^`]*`/g, "")
    .split(/\s+/)
    .filter((word) => /[A-Za-z]/.test(word)).length;

describe("the guide", () => {
  it("is the page after the introduction", () => {
    expect(page.startsWith("---\n")).toBe(true);
    expect(page).toMatch(/^title: Guide$/m);
    expect(page).toMatch(/^description: \S+/m);
    expect(page).toMatch(/^description: .{1,60}$/m);

    const meta = JSON.parse(read("apps/docs/content/docs/meta.json")) as {
      pages: ReadonlyArray<string>;
    };

    expect(meta.pages.indexOf("getting-started")).toBe(
      meta.pages.indexOf("introduction") + 1,
    );
  });

  it("imports only names the packages publish", () => {
    expect(snippets.length).toBeGreaterThanOrEqual(2);
    expect(imports.length).toBeGreaterThanOrEqual(5);
    expect(unresolvedImports(imports)).toEqual([]);
  });

  it("installs through the registry, not the workspace protocol", () => {
    expect(page).toContain("npx shadcn@latest add @sudokw/primitives-button");
    expect(page).toContain('"jsxImportSource": "@gpuix/react"');
    expect(page).not.toContain("@workspace:*");
  });

  it("asks a reader for no repository toolchain", () => {
    expect(page).not.toMatch(/\bnub\b/);
    expect(page).not.toMatch(/\bbun\b/);
    expect(page).not.toContain(".node-version");
  });

  it("teaches the one element render takes", () => {
    const prose = page.replace(/\s+/g, " ");
    expect(prose).toContain("`render` takes **one** element");
    expect(prose).toContain("paints only its last child");
  });

  it("names the binding build a host without a prebuilt binary needs", () => {
    expect(page).toContain(
      "apps/playground/README.md#the-binding-on-this-host",
    );
    expect(
      existsSync(
        join(repoRoot, "apps/playground/scripts/build-native-binding.sh"),
      ),
    ).toBe(true);
  });

  it("keeps the prose short", () => {
    expect(proseWords()).toBeLessThan(60);
  });
});
