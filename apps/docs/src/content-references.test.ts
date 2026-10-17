import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { components } from "./component-meta/registry";

/**
 * Guards every file a page pulls in at build time: `<include>` source and
 * `<auto-type-table>` prop tables (plan 414). The interesting failures are
 * silent: a component source is renamed and a page keeps pointing at the old
 * path, a `#region` marker is deleted, or an author writes `<include … />` the
 * way JSX is normally written — which Fumadocs skips, so the page silently
 * loses its source. The first two also fail `docs build`, deeply; the
 * self-closing tag nothing catches at all.
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

const includeBody = /<include\b([^>]*)>([\s\S]*?)<\/include>/g;
const selfClosingInclude = /<include\b[^>]*\/>/g;
const autoTypeTable = /<auto-type-table\b([^>]*?)\/?>/g;

const hasAttribute = (attributes: string, name: string): boolean =>
  new RegExp(`(?:^|\\s)${name}(?:\\s|=|$)`).test(attributes);

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

interface Violation {
  readonly kind: "include" | "region" | "silent" | "auto-type-table";
  readonly detail: string;
}

interface Reference {
  /** Absolute paths this page pulls in through `<include>`. */
  readonly targets: ReadonlyArray<string>;
  readonly violations: ReadonlyArray<Violation>;
}

const silent = (detail: string): Violation => ({ kind: "silent", detail });

const readInclude = (
  pageDirectory: string,
  tag: RegExpMatchArray,
): Reference => {
  const specifier = (tag[2] ?? "").trim();
  if (specifier.length === 0) {
    return {
      targets: [],
      violations: [silent("include with an empty body renders nothing")],
    };
  }
  const hash = specifier.indexOf("#");
  const path = hash === -1 ? specifier : specifier.slice(0, hash);
  const region = hash === -1 ? undefined : specifier.slice(hash + 1);
  const base = hasAttribute(tag[1] ?? "", "cwd") ? appRoot : pageDirectory;
  const target = resolve(base, path);
  if (!existsSync(target)) {
    return {
      targets: [target],
      violations: [
        {
          kind: "include",
          detail: `include target does not exist: ${specifier}`,
        },
      ],
    };
  }
  return {
    targets: [target],
    violations:
      region !== undefined && !hasRegion(readFileSync(target, "utf8"), region)
        ? [
            {
              kind: "region",
              detail: `include region "${region}" not found in ${specifier}`,
            },
          ]
        : [],
  };
};

const readAutoTypeTable = (
  pageDirectory: string,
  tag: RegExpMatchArray,
): ReadonlyArray<Violation> => {
  const path = (tag[1] ?? "").match(/\bpath="([^"]+)"/)?.[1];
  if (path === undefined) {
    return [
      {
        kind: "auto-type-table",
        detail: `auto-type-table without a path: ${tag[0].trim()}`,
      },
    ];
  }
  return existsSync(resolve(pageDirectory, path))
    ? []
    : [
        {
          kind: "auto-type-table",
          detail: `auto-type-table target does not exist: ${path}`,
        },
      ];
};

const analyse = (page: string): Reference => {
  const source = readFileSync(join(contentRoot, page), "utf8");
  const pageDirectory = dirname(join(contentRoot, page));
  const includes = [...source.matchAll(includeBody)].map((tag) =>
    readInclude(pageDirectory, tag),
  );
  return {
    targets: includes.flatMap((include) => include.targets),
    violations: [
      ...[...source.matchAll(selfClosingInclude)].map((tag) =>
        silent(`self-closing include renders nothing: ${tag[0].trim()}`),
      ),
      ...includes.flatMap((include) => include.violations),
      ...[...source.matchAll(autoTypeTable)].flatMap((tag) =>
        readAutoTypeTable(pageDirectory, tag),
      ),
    ],
  };
};

const analyses = pages.map((page) => ({ page, ...analyse(page) }));

const report = (
  kinds: ReadonlyArray<Violation["kind"]>,
): ReadonlyArray<string> =>
  analyses.flatMap(({ page, violations }) =>
    violations
      .filter((violation) => kinds.includes(violation.kind))
      .map((violation) => `${page}: ${violation.detail}`),
  );

describe("content references", () => {
  it("resolves every include to a real file, and every region inside it", () => {
    expect(report(["include", "region"])).toEqual([]);
  });

  it("never renders a silent include", () => {
    expect(report(["silent"])).toEqual([]);
  });

  it("resolves every auto-type-table to a real file", () => {
    expect(report(["auto-type-table"])).toEqual([]);
  });

  it("shows the real source on every finished component's page", () => {
    const missing = components
      .filter((component) => component.status !== "planned")
      .flatMap((component) => {
        const page = `components/${component.slug}.mdx`;
        const analysis = analyses.find((entry) => entry.page === page);
        const shown =
          analysis !== undefined &&
          component.sourcePath !== null &&
          analysis.targets.includes(resolve(repoRoot, component.sourcePath));
        return shown
          ? []
          : [
              `${page}: ${
                component.sourcePath ?? "no sourcePath in the record"
              } is not included`,
            ];
      });
    expect(missing).toEqual([]);
  });
});
