import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readRepo } from "./doc-snippets.test-util";
import { manifest, runsIn, undeclaredRuns } from "./page-commands.test-util";
import { repoRoot } from "./public-symbols-source";

/**
 * `/docs/contributing` is where a reader who wants to add a component lands, so
 * its commands have to run and its checklist has to match the one the
 * repository gates on. It printed six `nub run` commands that nothing checked,
 * and its "What a component ships with" list stopped at the inventory row —
 * never the native-runtime verification `COMPONENTS.md` and `AGENTS.md` both
 * require before a row may move to `done`. A contributor following the page
 * would have called a component finished without ever opening a window.
 *
 * The reader for `nub run …` commands is shared with the installation page
 * (`page-commands.test-util.ts`), so a renamed script fails both pages by name.
 */

const page = readRepo("apps/docs/content/docs/contributing.mdx");
const root = manifest("package.json");

/** The body of one `##` heading, up to the next one. */
const section = (source: string, heading: string): string => {
  const start = source.indexOf(`## ${heading}`);
  if (start < 0) return "";
  const rest = source.slice(start + heading.length + 3);
  const end = rest.search(/^## /m);
  return (end < 0 ? rest : rest.slice(0, end)).toLowerCase();
};

const checklist = section(page, "What a component ships with");
const writing = section(page, "Write the page");

/** The files this repository keeps under `apps/docs`. */
const appFile = (path: string): string => readRepo(`apps/docs/${path}`);

describe("the contributing page", () => {
  it("pins the toolchain the repository pins", () => {
    const nodeVersion = readRepo(".node-version").trim();
    const manager = root.devEngines?.packageManager;

    expect(nodeVersion.length).toBeGreaterThan(0);
    expect(page).toContain(nodeVersion);
    expect(manager?.name).toBeDefined();
    expect(page).toContain(manager?.name ?? "");
  });

  it("runs only scripts the manifests declare", () => {
    // A silent zero would pass the check below without reading anything.
    expect(runsIn(page).length).toBeGreaterThanOrEqual(5);

    expect(undeclaredRuns(page)).toEqual([]);
  });

  it("stages through the script and the tree rule the repository keeps", () => {
    // The page and `AGENTS.md` §6 teach one convention; a path that moved would
    // send a contributor to a script that is not there.
    const agents = readRepo("AGENTS.md");

    expect(existsSync(join(repoRoot, "scripts/swarm-commit.sh"))).toBe(true);
    expect(agents).toContain("workspaces/<workstream>/");
    expect(agents).toContain("agent/<workstream>");
    expect(page).toContain("scripts/swarm-commit.sh");
    expect(page).toContain("workspaces/<workstream>/");
    expect(page).toContain("agent/<workstream>");
  });

  it("names files and page shapes the repository has", () => {
    expect(page).toContain("packages/<package>/docs/<component>.mdx");
    expect(page).toContain("COMPONENTS.md");

    const componentPages = readdirSync(join(repoRoot, "packages"), {
      withFileTypes: true,
    }).flatMap((pkg) => {
      const dir = join(repoRoot, "packages", pkg.name, "docs");
      if (!pkg.isDirectory() || !existsSync(dir)) return [];
      return readdirSync(dir).filter((name) => name.endsWith(".mdx"));
    });

    // The checklist's page shape is only real while the packages ship pages in
    // it; a floor, so a scan that stopped matching cannot pass.
    expect(componentPages.length).toBeGreaterThanOrEqual(50);
    expect(readRepo("COMPONENTS.md").length).toBeGreaterThan(0);
  });

  it("lists the deliverables the inventory gates on", () => {
    // `COMPONENTS.md`'s preamble is the contract: code, a test, an example, a
    // docs page and a verified interaction in the real runtime. The page is the
    // public copy of it, so a deliverable dropped from either is reported.
    const contract = readRepo("COMPONENTS.md")
      .split("\n\n")
      .find((paragraph) => paragraph.includes("may only move to `done`"));
    expect(contract).toBeDefined();

    const required = ["test", "example", "docs", "runtime"];
    const gate = (contract ?? "").toLowerCase();

    expect(required.filter((word) => !gate.includes(word))).toEqual([]);
    expect(required.filter((word) => !checklist.includes(word))).toEqual([]);
    expect(checklist).toContain("inventory row");
  });

  it("teaches the page contract both guards enforce", () => {
    // A contributor following the page writes its Markdown from the sections it
    // names; the package guard requires `## API` and an accessibility or
    // limitations section, and the curated template requires four sections in
    // order. The page said nothing about either, so the only copy of the rule
    // was the policy file a contributor was never sent to.
    expect(writing.length).toBeGreaterThan(200);

    const packageGuard = appFile("src/lib/package-page-template.test.ts");
    const curatedGuard = appFile("src/lib/component-page.test.ts");

    expect(
      ["## api", "## limitations", "## accessibility"].flatMap((heading) =>
        writing.includes(heading) ? [] : [heading],
      ),
    ).toEqual([]);
    expect(packageGuard).toContain('heading === "API"');
    expect(packageGuard).toContain("Accessibility");

    expect(
      ["installation", "usage", "api reference", "limitations"].flatMap(
        (name) =>
          writing.includes(name) && curatedGuard.toLowerCase().includes(name)
            ? []
            : [name],
      ),
    ).toEqual([]);
  });

  it("names the preview registry and the guard that holds both directions", () => {
    // A preview is registered in one file and mounted by name from the page.
    // The page now teaches the two steps, so the paths have to be the ones the
    // site actually has.
    expect(writing).toContain(
      "apps/docs/src/components/docs/demos.tsx".toLowerCase(),
    );
    expect(writing).toContain("<componentpreview");
    expect(appFile("src/components/docs/demos.tsx")).toContain(
      "export const demos",
    );
    expect(appFile("src/components/docs/component-preview.tsx")).toContain(
      "ComponentPreview",
    );

    const registryGuard = appFile("src/lib/component-preview.test.ts");
    expect(registryGuard).toContain("are mounted by a page");
    expect(registryGuard).toContain("name a registered demo on every page");
  });

  it("names the blocks a page must not write by hand", () => {
    // Each strip is generated, so a page that restates one drifts. The page
    // lists them; the files behind them have to exist, and the mount has to be
    // on the frame rather than on the author.
    const strips = [
      ["keyboard", "src/components/docs/keyboard-strip.tsx"],
      ["related", "src/components/docs/related-strip.tsx"],
      ["source accordion", "src/components/docs/package-source.tsx"],
    ] as const;

    expect(
      strips.flatMap(([label, path]) =>
        writing.includes(label) && existsSync(join(repoRoot, "apps/docs", path))
          ? []
          : [`${label}: ${path}`],
      ),
    ).toEqual([]);

    expect(appFile("src/lib/docs-view.tsx")).toContain("<KeyboardStrip");
    expect(appFile("src/lib/docs-view.tsx")).toContain("<RelatedStrip");
  });

  it("sends the reader to the policy the template lives in", () => {
    // The policy is the long form; a contributor who needs the reasoning has to
    // be able to reach it from the page, and the file has to still carry the
    // template table.
    expect(writing).toContain("preview-strategy.md");
    const policy = readRepo("docs/preview-strategy.md");
    expect(policy).toContain("## The component page template");
    expect(policy).toContain("labelled browser approximation (strategy 3)");
  });
});
