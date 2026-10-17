import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generator } from "./lib/type-table-generator";

/**
 * Guards the tokens API reference (plan 447). The bug it exists for is silent:
 * a helper is exported from `@gpuixui/tokens` — or a theme shape gains a field —
 * and the site's API page never learns about it, so a consumer cannot find the
 * function they are meant to call. The type tables are generated, so the shapes
 * cannot drift; the function list is prose, so this test ties it to the source.
 *
 * `node:fs`/`node:url` are deliberate here, as in `content-references.test.ts`:
 * a vitest boundary reading real files, and `apps/docs` has no Effect runtime
 * (plan 411 §5).
 */
const pageUrl = new URL("../content/docs/tokens-api.mdx", import.meta.url);
const page = readFileSync(pageUrl, "utf8");

/** The public modules of `@gpuixui/tokens`; example and test files are not API. */
const modules = ["color", "elevation", "platforms", "styles", "theme", "react"];

const exportedFunctions = modules.flatMap((module) => {
  const source = readFileSync(
    new URL(`../../../packages/tokens/src/${module}.ts`, import.meta.url),
    "utf8",
  );
  return [
    ...source.matchAll(/^export function (\w+)/gm),
    ...source.matchAll(/^export const (\w+) = \(/gm),
  ].map((match) => match[1]);
});

const attribute = (attributes: string, name: string): string | undefined =>
  new RegExp(`${name}="([^"]+)"`).exec(attributes)?.[1];

const autoTypeTables = [...page.matchAll(/<auto-type-table\b([^>]*?)\/?>/g)]
  .map((tag) => tag[1] ?? "")
  .map((attributes) => ({
    url: new URL(attribute(attributes, "path") ?? "", pageUrl),
    name: attribute(attributes, "name"),
  }));

describe("tokens API page", () => {
  it("lists every exported function", () => {
    expect(exportedFunctions).toEqual(
      expect.arrayContaining([
        "createTheme",
        "extendTheme",
        "statusTone",
        "focusRing",
        "useTheme",
      ]),
    );
    const undocumented = exportedFunctions.filter(
      (name) => !page.includes(`\`${name}\``),
    );
    expect(undocumented).toEqual([]);
  });

  it("generates every type table it renders", async () => {
    expect(autoTypeTables.map((table) => table.name)).toEqual(
      expect.arrayContaining(["ThemeConfig", "Theme"]),
    );
    for (const table of autoTypeTables) {
      const [doc] = await generator.generateDocumentation(
        { path: fileURLToPath(table.url) },
        table.name ?? "",
      );
      expect(
        doc?.entries.length,
        `${table.name} resolved to no props`,
      ).toBeGreaterThan(0);
    }
  });

  it("does not reprint token values", () => {
    expect(page.match(/#[0-9a-f]{6}\b/gi) ?? []).toEqual([]);
  });
});
