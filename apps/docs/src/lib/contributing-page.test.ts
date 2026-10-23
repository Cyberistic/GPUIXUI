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
});
