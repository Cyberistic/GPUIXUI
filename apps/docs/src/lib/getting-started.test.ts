import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  namedImports,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";
import {
  manifest,
  runsIn,
  undeclaredRuns,
  workspaceManifests,
} from "./page-commands.test-util";
import { repoRoot } from "./public-symbols-source";

/**
 * The guide is the one page a reader copies from, so its code has to be the
 * library's code.
 *
 * Every snippet is prose as far as the build is concerned: a renamed export, a
 * renamed manifest script or an unlisted state value would still render, and the
 * reader would copy something that does not run. This guard reads the page and
 * holds each claim to the workspace: the imports to the symbols the packages
 * publish, the run command to the root manifest, and the install targets to the
 * workspace's own packages.
 */

const read = (path: string): string => readRepo(path);

const page = read("apps/docs/content/docs/getting-started/index.mdx");
const snippets = typescriptSnippets(page);
const imports = namedImports(snippets);

/** `nub add @gpuixui/<name>@workspace:*` targets. */
const added: ReadonlyArray<string> = [
  ...page.matchAll(/nub add (@gpuixui\/[a-z-]+)@workspace:\*/g),
].map((match) => match[1] ?? "");

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
    // The parser must see the snippets; a silent zero would pass every check.
    expect(snippets.length).toBeGreaterThanOrEqual(2);
    expect(imports.length).toBeGreaterThanOrEqual(5);
    expect(unresolvedImports(imports)).toEqual([]);
  });

  it("adds only packages the workspace ships", () => {
    expect(added.length).toBeGreaterThanOrEqual(1);

    const shipped = new Set(workspaceManifests.map((entry) => entry.name));
    expect(added.filter((name) => !shipped.has(name))).toEqual([]);
  });

  it("runs only scripts the manifests declare", () => {
    expect(runsIn(page).length).toBeGreaterThanOrEqual(2);

    expect(undeclaredRuns(page)).toEqual([]);
    expect(page).toContain("nub run dev:playground");
  });

  it("teaches the one element render takes", () => {
    // The first page a reader writes a root on: a fragment at the root paints
    // only its last child and reports nothing, so `<><Toolbar /><Body /></>`
    // loses the toolbar silently (docs/gpuix-capabilities.md, "Render root").
    const prose = page.replace(/\s+/g, " ");
    expect(prose).toContain("`render` takes **one** element");
    expect(prose).toContain("paints only its last child");
  });

  it("names the binding build a host without a prebuilt binary needs", () => {
    // The binding is native, so a host with no binary for it installs cleanly
    // and exits `2` before a component paints. The guide sends that host to the
    // recipe that exists rather than restating a target table that would drift.
    const script = "apps/playground/README.md#the-binding-on-this-host";

    expect(page).toContain(script);
    expect(
      existsSync(
        join(repoRoot, "apps/playground/scripts/build-native-binding.sh"),
      ),
    ).toBe(true);
  });

  it("names the four rules and where each is proven", () => {
    [
      "**Effect first.**",
      "**Semantic roles only.**",
      "**The runtime is the limit.**",
      "**Every fix lands with a test**",
    ].forEach((rule) => expect(page).toContain(rule));

    expect(page).toContain("docs/gpuix-capabilities.md");
    expect(page).toContain("/reference");
    expect(page).toContain("**Build prompt**");
  });

  it("pins the toolchain the repository pins", () => {
    const nodeVersion = readRepo(".node-version").trim();
    const manager = manifest("package.json").devEngines?.packageManager;

    expect(nodeVersion.length).toBeGreaterThan(0);
    expect(page).toContain(nodeVersion);
    expect(page).toContain(manager?.name ?? "");
  });
});
