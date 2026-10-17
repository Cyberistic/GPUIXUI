import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { apiDrift, missingPartSources } from "./component-meta/contract";
import { generator } from "./lib/type-table-generator";
import { components } from "./component-meta/registry";

/**
 * Guards every file a page pulls in at build time: `<include>` source and
 * `<auto-type-table>` prop tables (plans 414 and 415). The interesting failures
 * are silent: a component source is renamed and a page keeps pointing at the old
 * path, a `#region` marker is deleted, an author writes `<include … />` the way
 * JSX is normally written (Fumadocs skips it, so the page loses its source), or
 * a type-table `name` is a typo — which generates an empty table and no error.
 *
 * `node:fs`/`node:path` are deliberate here: this is a vitest boundary reading
 * real files, like `content.test.ts` and `registry.test.ts`, and there is no
 * Effect runtime in `apps/docs` (plan 411 §5).
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const contentRoot = fileURLToPath(new URL("../content/docs", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

/** Every page the site owns, as a `content/docs`-relative path. */
const walkPages = (dir: string, prefix = ""): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) return walkPages(join(dir, entry.name), path);
    return entry.name.endsWith(".mdx") ? [path] : [];
  });

const pages = walkPages(contentRoot);

const readPage = (page: string): string =>
  readFileSync(join(contentRoot, page), "utf8");

const pageDirectory = (page: string): string =>
  dirname(join(contentRoot, page));

const hasAttribute = (attributes: string, name: string): boolean =>
  new RegExp(`(?:^|\\s)${name}(?:\\s|=|$)`).test(attributes);

const attribute = (attributes: string, name: string): string | undefined =>
  attributes.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];

/** The directory a relative reference resolves from. */
const baseFor = (attributes: string, page: string): string =>
  hasAttribute(attributes, "cwd") ? appRoot : pageDirectory(page);

interface Violation {
  readonly page: string;
  readonly detail: string;
}

const report = (violations: ReadonlyArray<Violation>): ReadonlyArray<string> =>
  violations.map(({ page, detail }) => `${page}: ${detail}`);

/* ------------------------------------------------------------------ includes */

const includeBody = /<include\b([^>]*)>([\s\S]*?)<\/include>/g;
const selfClosingInclude = /<include\b[^>]*\/>/g;

/**
 * The region start markers Fumadocs' `remarkInclude` accepts, mirrored from
 * `fumadocs-mdx`'s `remark-include-*.js` so this guard cannot reject a marker
 * the build accepts.
 */
const regionStart = [
  /^\s*\/\/\s*#?region\b\s*(.*?)\s*$/,
  /^\s*<!--\s*#?region\b\s*(.*?)\s*-->/,
  /^\s*\/\*\s*#?region\b\s*(.*?)\s*\*\//,
  /^\s*#[rR]egion\b\s*(.*?)\s*$/,
  /^\s*(?:--|::|@?REM)\s*#region\b\s*(.*?)\s*$/,
  /^\s*#pragma\s+region\b\s*(.*?)\s*$/,
  /^\s*\(\*\s*#region\b\s*(.*?)\s*\*\)/,
];

const hasRegion = (source: string, region: string): boolean =>
  source
    .split("\n")
    .some((line) =>
      regionStart.some((marker) => marker.exec(line)?.[1] === region),
    );

interface Include {
  readonly page: string;
  /** Absolute paths the page pulls in through this tag. */
  readonly targets: ReadonlyArray<string>;
  /** `renders nothing` — Fumadocs skips the tag, so the page silently loses it. */
  readonly silent: ReadonlyArray<Violation>;
  readonly broken: ReadonlyArray<Violation>;
}

const readInclude = (page: string, tag: RegExpMatchArray): Include => {
  const specifier = (tag[2] ?? "").trim();
  if (specifier.length === 0) {
    return {
      page,
      targets: [],
      silent: [{ page, detail: "include with an empty body renders nothing" }],
      broken: [],
    };
  }
  const hash = specifier.indexOf("#");
  const path = hash === -1 ? specifier : specifier.slice(0, hash);
  const region = hash === -1 ? undefined : specifier.slice(hash + 1);
  const target = resolve(baseFor(tag[1] ?? "", page), path);
  if (!existsSync(target)) {
    return {
      page,
      targets: [target],
      silent: [],
      broken: [{ page, detail: `include target does not exist: ${specifier}` }],
    };
  }
  return {
    page,
    targets: [target],
    silent: [],
    broken:
      region !== undefined && !hasRegion(readFileSync(target, "utf8"), region)
        ? [
            {
              page,
              detail: `include region "${region}" not found in ${specifier}`,
            },
          ]
        : [],
  };
};

const includes = pages.flatMap((page) =>
  [...readPage(page).matchAll(includeBody)].map((tag) =>
    readInclude(page, tag),
  ),
);

const selfClosing: ReadonlyArray<Violation> = pages.flatMap((page) =>
  [...readPage(page).matchAll(selfClosingInclude)].map((tag) => ({
    page,
    detail: `self-closing include renders nothing: ${tag[0].trim()}`,
  })),
);

/* -------------------------------------------------------------- type tables */

const autoTypeTable = /<auto-type-table\b([^>]*?)\/?>/g;

interface TypeTable {
  readonly page: string;
  readonly attributes: string;
}

const typeTables: ReadonlyArray<TypeTable> = pages.flatMap((page) =>
  [...readPage(page).matchAll(autoTypeTable)].map((tag) => ({
    page,
    attributes: tag[1] ?? "",
  })),
);

const typeTableViolations: ReadonlyArray<Violation> = typeTables.flatMap(
  (table) => {
    const path = attribute(table.attributes, "path");
    if (path === undefined) {
      return [{ page: table.page, detail: "auto-type-table without a path" }];
    }
    const target = resolve(baseFor(table.attributes, table.page), path);
    return existsSync(target)
      ? []
      : [
          {
            page: table.page,
            detail: `auto-type-table target does not exist: ${path}`,
          },
        ];
  },
);

const targetsOn = (page: string): ReadonlyArray<string> =>
  includes
    .filter((include) => include.page === page)
    .flatMap((include) => include.targets);

describe("content references", () => {
  it("resolves every include to a real file, and every region inside it", () => {
    expect(report(includes.flatMap((include) => include.broken))).toEqual([]);
  });

  it("never renders a silent include", () => {
    expect(
      report([
        ...selfClosing,
        ...includes.flatMap((include) => include.silent),
      ]),
    ).toEqual([]);
  });

  it("resolves every auto-type-table to a real file", () => {
    expect(report(typeTableViolations)).toEqual([]);
  });

  it("generates a table with props from every auto-type-table on a page", async () => {
    const empty = await Promise.all(
      typeTables.map(async (table) => {
        const path = attribute(table.attributes, "path");
        const name = attribute(table.attributes, "name");
        if (path === undefined || name === undefined) return [];
        const docs = await generator.generateDocumentation(
          { path: resolve(baseFor(table.attributes, table.page), path) },
          name,
        );
        return docs.flatMap((doc) => doc.entries).length > 0
          ? []
          : [{ page: table.page, detail: `${name} generated no props` }];
      }),
    );
    expect(report(empty.flat())).toEqual([]);
  });

  it("declares in the registry exactly the props types a page generates", () => {
    const drift = components.flatMap((component) =>
      apiDrift(
        component,
        typeTables
          .filter((table) => table.page === `components/${component.slug}.mdx`)
          .flatMap((table) => attribute(table.attributes, "name") ?? []),
      ).map((detail) => ({ page: `components/${component.slug}.mdx`, detail })),
    );
    expect(report(drift)).toEqual([]);
  });

  it("shows the real source on every finished component's page", () => {
    const missing = components
      .filter((component) => component.status !== "planned")
      .flatMap((component) => {
        const page = `components/${component.slug}.mdx`;
        const shown =
          component.sourcePath !== null &&
          targetsOn(page).includes(resolve(repoRoot, component.sourcePath));
        return shown
          ? []
          : [
              {
                page,
                detail:
                  component.sourcePath === null
                    ? "the record has no sourcePath"
                    : `${component.sourcePath} is not included`,
              },
            ];
      });
    expect(report(missing)).toEqual([]);
  });

  it("shows every compound part's real source, not just the entry file", () => {
    const missing = components
      .filter((component) => component.parts.length > 0)
      .flatMap((component) => {
        const page = `components/${component.slug}.mdx`;
        return missingPartSources(component, targetsOn(page), (sourcePath) =>
          resolve(repoRoot, sourcePath),
        ).map((detail) => ({ page, detail }));
      });
    expect(report(missing)).toEqual([]);
  });
});
