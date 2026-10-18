import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bySlug, components } from "./component-meta/registry";
import { exportedNames } from "./lib/source-exports";

/**
 * Guards the Phase F truth pass over the component pages (plan 424).
 *
 * The failure mode is a page that still builds: a source file moved, a planned
 * package was renamed, or an author left "coming soon" in shipped prose. None of
 * those break MDX, the sidebar or the build, so nothing else notices.
 */
const pageDirectory = fileURLToPath(
  new URL("../content/docs/components/", import.meta.url),
);
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const pages = readdirSync(pageDirectory).filter(
  (file) => file.endsWith(".mdx") && file !== "index.mdx",
);

const readPage = (page: string): string =>
  readFileSync(join(pageDirectory, page), "utf8");

/** Repo-relative paths the prose names in backticks. */
const pathPattern = /`((?:packages|apps|examples|docs|LICENSES)\/[^`\s]+)`/g;

/**
 * A path that does not exist may still be an honest plan when the owning
 * directory's README registers it — that is the repository's rule for planned
 * files (`packages/README.md` lists `data-grid`).
 */
const registered = (path: string): boolean => {
  const [head, child] = path.split("/");
  const readme = join(repoRoot, head ?? "", "README.md");
  if (!existsSync(readme)) return false;
  const text = readFileSync(readme, "utf8");
  return text.includes(path) || (child !== undefined && text.includes(child));
};

const namedPaths = pages.flatMap((page) =>
  [...readPage(page).matchAll(pathPattern)].map((match) => ({
    page,
    path: match[1] ?? "",
  })),
);

const placeholder = /\b(coming soon|TBD|TODO|FIXME)\b/i;

const placeholderPages = pages.filter((page) =>
  placeholder.test(readPage(page)),
);

/** Every named export a package's source declares, across its `.ts(x)` files. */
const packageExports: Readonly<Record<string, ReadonlyArray<string>>> = {
  primitives: exportedNames(join(repoRoot, "packages/primitives/src")),
  icons: exportedNames(join(repoRoot, "packages/icons/src")),
  components: exportedNames(join(repoRoot, "packages/components/src")),
};

/** The names a page imports from a GPUixUI package in its usage snippet. */
const pageImports = (
  page: string,
): ReadonlyArray<{
  readonly page: string;
  readonly package: string;
  readonly name: string;
}> => {
  const body = readPage(page);
  return [
    ...body.matchAll(/import\s+\{([^}]+)\}\s+from\s+"@gpuixui\/(\w+)"/g),
  ].flatMap((match) => {
    const packageName = match[2] ?? "";
    return (match[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name) => ({ page, package: packageName, name }));
  });
};

describe("inventory features the pages must not deny", () => {
  /**
   * `master` grew the components after plan 425 wrote the 22 original Tier 2
   * pages — list multi-select, submenus, type-ahead, accordion header keys, toast
   * actions and corrected floating placement (plan 463). A page keeps building
   * while telling the reader a shipped feature does not exist, so each entry
   * pairs the evidence the page must now document with the denial that must not
   * survive. `COMPONENTS.md` and the component's own `docs/*.mdx` are the source
   * of truth; the pages are the copy that drifted.
   *
   * The same denials guard the record: `<ComponentState>` renders
   * `record.limitations` above the page body (plan 465), so a record that still
   * denies the feature contradicts the prose directly beneath it.
   */
  const shippedFeatures: ReadonlyArray<{
    readonly slug: string;
    readonly evidence: RegExp;
    readonly denial: RegExp;
  }> = [
    {
      slug: "list",
      evidence: /selectionMode="multiple"/,
      denial: /no multi-select/i,
    },
    {
      slug: "list",
      evidence: /textValue/,
      denial: /\bno [^.\n]*type-ahead/i,
    },
    {
      slug: "accordion",
      evidence: /between enabled headers/i,
      denial: /no arrow-key/i,
    },
    {
      slug: "dropdown-menu",
      evidence: /DropdownMenuSubContent/,
      denial: /no [^.;\n]{0,40}submenus/i,
    },
    {
      slug: "dropdown-menu",
      evidence: /type-ahead/i,
      denial: /no type-ahead/i,
    },
    {
      slug: "dropdown-menu",
      evidence: /does not flip/i,
      denial: /\bGPUix[^.;\n]{0,60}\bflips\b/i,
    },
    {
      slug: "context-menu",
      evidence: /ContextMenuSubContent/,
      denial: /no [^.;\n]{0,40}submenus/i,
    },
    {
      slug: "context-menu",
      evidence: /Shift\+F10/,
      denial: /no keyboard path/i,
    },
    {
      slug: "command-menu",
      evidence: /subsequence/i,
      denial: /case-insensitive substring|no fuzzy matching/i,
    },
    {
      slug: "toast",
      evidence: /onAction/,
      denial: /no pause-on-hover/i,
    },
    {
      slug: "popover",
      evidence: /does not flip/i,
      denial: /\bGPUix[^.;\n]{0,60}\bflips\b/i,
    },
    {
      slug: "combobox",
      evidence: /does not flip/i,
      denial: /\bGPUix[^.;\n]{0,60}\bflips\b/i,
    },
  ];

  it("documents the shipped feature on its page", () => {
    const missing = shippedFeatures
      .filter(({ slug, evidence }) => !evidence.test(readPage(`${slug}.mdx`)))
      .map(({ slug, evidence }) => `${slug}: no ${String(evidence)}`);
    expect(missing).toEqual([]);
  });

  it("does not deny a feature its inventory row ships", () => {
    const denied = shippedFeatures
      .filter(({ slug, denial }) => denial.test(readPage(`${slug}.mdx`)))
      .map(({ slug, denial }) => `${slug}: still denies ${String(denial)}`);
    expect(denied).toEqual([]);
  });

  it("does not deny it from the record's limitations", () => {
    const denied = shippedFeatures.flatMap(({ slug, denial }) => {
      const record = bySlug.get(slug);
      if (record === undefined) return [`${slug}: no record`];
      return record.limitations
        .filter((limitation) => denial.test(limitation))
        .map((limitation) => `${slug}: still denies "${limitation}"`);
    });
    expect(denied).toEqual([]);
  });
});

describe("component page truth", () => {
  it("covers every delivered component, so the guard cannot pass on an empty directory", () => {
    const delivered = components.filter(
      (component) => component.status !== "planned",
    ).length;
    expect(pages.length).toBe(delivered);
  });

  it("names only paths that exist or are registered as planned", () => {
    const missing = namedPaths
      .filter(
        ({ path }) => !existsSync(resolve(repoRoot, path)) && !registered(path),
      )
      .map(({ page, path }) => `${page}: missing ${path}`);
    expect(missing).toEqual([]);
  });

  it("ships no placeholder prose", () => {
    expect(placeholderPages).toEqual([]);
  });

  it("imports only names the packages actually export", () => {
    const missing = pages
      .flatMap(pageImports)
      .filter(
        ({ package: packageName, name }) =>
          !(packageExports[packageName] ?? []).includes(name),
      )
      .map(
        ({ page, package: packageName, name }) =>
          `${page}: ${name} is not exported by @gpuixui/${packageName}`,
      );
    expect(missing).toEqual([]);
  });
});
