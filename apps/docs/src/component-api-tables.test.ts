import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generator } from "@/lib/type-table-generator";
import { malformedTypeTables, typeTableTargets } from "@/lib/type-tables";

/**
 * Guards plan 581: every generated props table on a component page renders at
 * least one row from the file the page names.
 *
 * The bug being guarded is silent. `fumadocs-typescript` returns an empty
 * document set for a name it cannot find, so a renamed type — or a part props
 * type whose file moved — leaves the page heading with no table. The build,
 * the crawl and `content-references.test.ts` still pass: that guard proves the
 * page's type *names* equal the record's `api`, not that the path + name pair
 * resolves. Measured while writing this plan: pointing `ToastViewportProps` at
 * `toast/provider.tsx` instead of `toast/viewport.tsx` returns zero rows, and
 * so does documenting `MenuGroupProps` from either menu entry file instead of
 * `menu/item.tsx`.
 *
 * `node:fs`/`node:path` are deliberate here: this is a vitest boundary reading
 * real content with the app's own generator, like `content-references.test.ts`.
 */
const appDirectory = fileURLToPath(new URL("../", import.meta.url));
const componentDirectory = join(appDirectory, "content/docs/components");

const pages = readdirSync(componentDirectory)
  .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
  .map((file) => {
    const text = readFileSync(join(componentDirectory, file), "utf8");
    return {
      file,
      malformed: malformedTypeTables(text),
      targets: typeTableTargets(text).map((target) => ({
        ...target,
        path: resolve(appDirectory, "content/docs/components", target.path),
      })),
    };
  });

const tables = pages.flatMap((page) =>
  page.targets.map((target) => ({ file: page.file, ...target })),
);

/** One generator call per distinct file + type; pages repeat types rarely. */
const unique = [
  ...new Map(
    tables.map((table) => [`${table.path}\0${table.name}`, table]),
  ).values(),
];

const describeTable = (table: {
  file: string;
  name: string;
  path: string;
}): string => `${table.file} → ${table.name} (${table.path})`;

describe("component API tables", () => {
  it("finds the real page and table set", () => {
    expect(pages.length).toBeGreaterThan(60);
    expect(tables.length).toBeGreaterThan(140);
  });

  it("declares a path and a type on every table tag", () => {
    expect(
      pages.flatMap((page) =>
        page.malformed.map((tag) => `${page.file}: ${tag}`),
      ),
    ).toEqual([]);
  });

  it("resolves every table to a file that exists", () => {
    expect(
      tables
        .filter((table) => !existsSync(table.path))
        .map((table) => `${describeTable(table)} does not exist`),
    ).toEqual([]);
  });

  it("renders at least one row for every table", async () => {
    const rows = await Promise.all(
      unique.map(async (table) => ({
        table,
        count: (
          await generator.generateDocumentation(
            { path: table.path },
            table.name,
          )
        ).flatMap((doc) => doc.entries).length,
      })),
    );

    expect(
      rows
        .filter(({ count }) => count === 0)
        .map(
          ({ table }) =>
            `${describeTable(table)} renders no rows: the file does not declare that type`,
        ),
    ).toEqual([]);
  });
});
