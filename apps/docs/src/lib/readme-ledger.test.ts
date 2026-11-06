import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { packageCollections } from "./collection-routes";

const appDir = fileURLToPath(new URL("../../", import.meta.url));
const ledger = readFileSync(join(appDir, "README.md"), "utf8").split("\n");

const listed = (path: string): boolean =>
  ledger.some((line) => {
    const entry = line.trimStart();
    return entry.startsWith(path) && /^(?:$|\s)/.test(entry.slice(path.length));
  });

const walk = (
  dir: string,
  keep: (name: string) => boolean,
): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, keep);
    return keep(entry.name) ? [relative(appDir, full)] : [];
  });

const pages = walk(join(appDir, "content/docs"), (name) =>
  name.endsWith(".mdx"),
).map((path) => path.slice("content/docs/".length));

const modules = [
  ...walk(join(appDir, "src"), (name) => /\.(?:ts|tsx|css)$/.test(name)),
  ...walk(join(appDir, "plugins"), (name) => name.endsWith(".ts")),
].filter(
  (path) =>
    path !== "src/routeTree.gen.ts" &&
    path !== "src/lib/sidebar-pages.test-util.ts" &&
    !path.includes(".test."),
);

describe("the apps/docs ledger", () => {
  it("names every page the site ships", () => {
    expect(pages.length).toBeGreaterThanOrEqual(20);
    expect(pages.filter((page) => !listed(page))).toEqual([]);
  });

  it("names every module the site is built from", () => {
    expect(modules.length).toBeGreaterThanOrEqual(50);
    expect(modules.filter((module) => !listed(module))).toEqual([]);
  });

  it("names each row once, not once per pass that touched it", () => {
    const rows = (path: string): number =>
      ledger.filter((line) => {
        const entry = line.trimStart();
        return (
          entry.startsWith(path) && /^(?:$|\s)/.test(entry.slice(path.length))
        );
      }).length;

    expect([...modules, ...pages].filter((path) => rows(path) !== 1)).toEqual(
      [],
    );
  });

  it("points at the preview policy it tells a contributor to read", () => {
    expect(ledger.join("\n")).toContain("docs/preview-strategy.md");
    const policy = readFileSync(
      new URL("../../../../docs/preview-strategy.md", import.meta.url),
      "utf8",
    );

    expect(policy).toContain("## The strategy");
  });

  it("says the sidebar offers platforms and the theme page owns the picker", () => {
    const readme = ledger.join("\n");

    expect(readme).toContain("## The platform switch and the authored looks");
    expect(readme).toContain("no look group");
    expect(readme).toContain("`retroStyles`");
    expect(readme).toContain("look-picker.tsx");
    expect(readme).not.toContain("**Look** offers");
  });

  it("keeps every curated line on the page the site actually serves", () => {
    const curated = ledger.filter((line) =>
      /^\s*components\/[a-z0-9-]+\.mdx/.test(line),
    );
    const button =
      curated.find((line) => line.includes("components/button.mdx")) ?? "";
    const page = readFileSync(
      new URL("../../content/docs/components/button.mdx", import.meta.url),
      "utf8",
    );

    expect(curated.length).toBeGreaterThanOrEqual(30);
    expect(curated.filter((line) => line.includes("package page"))).toEqual([]);
    expect(page).toContain("## API reference");
    expect(button).toContain("API");
  });

  it("describes the search index without a count the collections outgrew", () => {
    const search =
      ledger.find((line) => line.includes("src/routes/api/search.ts")) ?? "";

    expect(packageCollections.length).toBeGreaterThan(4);
    expect(search).toContain("every mounted collection");
    expect(search).not.toMatch(/\b(four|three|nine)\b/);
  });
});
