import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { packagePreviews } from "@/lib/package-preview";
import { demos } from "./demos";
import {
  FILTER_ROWS,
  TableFilterDemo,
  filterHint,
  filterLabel,
  matchingRows,
} from "./table-filter-demo";

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("packages/data/docs/table-filtering.mdx");
const field = read("packages/data/src/filter/field.tsx");

const declaredProps = (): ReadonlyArray<string> => {
  const block =
    field.split("export interface TableFilterFieldProps {")[1]?.split("}")[0] ??
    "";
  return [...block.matchAll(/readonly (\w+)\??:/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

const documentedProps = (): ReadonlyArray<string> => {
  const start = page.indexOf("## API");
  const end = page.indexOf("\n## ", start + 1);
  return [
    ...page
      .slice(start, end === -1 ? undefined : end)
      .matchAll(/^\| `(\w+)` \|/gm),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
};

const constant = (name: string): string =>
  new RegExp(`export const ${name} = "([^"]*)";`).exec(field)?.[1] ?? "";

const matchingServices = (query: string): ReadonlyArray<string> =>
  Arr.map(matchingRows(query), (row) => row.service);

describe("the filtering controls page", () => {
  it("documents every prop the field declares, and no other", () => {
    const declared = declaredProps();
    const documented = documentedProps();

    expect(field).toContain("export interface TableFilterFieldProps {");
    expect(declared).toContain("testId");
    expect(declared.filter((prop) => !documented.includes(prop))).toEqual([]);
    expect(documented.filter((prop) => !declared.includes(prop))).toEqual([]);
  });

  it("prints the defaults the field actually reads", () => {
    const label = constant("DEFAULT_FILTER_LABEL");
    const hint = constant("DEFAULT_FILTER_PLACEHOLDER");

    expect(label).toBe("Filter rows");
    expect(hint).toBe("Filter…");

    expect(field).toContain(
      "spokenText(Option.fromNullishOr(label), DEFAULT_FILTER_LABEL)",
    );
    expect(field).toContain(
      "visibleCopy(placeholder) ?? DEFAULT_FILTER_PLACEHOLDER",
    );

    expect(page).toContain(`| \`label\` | \`string\` | \`${label}\` |`);
    expect(page).toContain(`| \`placeholder\` | \`string\` | \`${hint}\` |`);
    expect(page).toContain("a blank name reads as the default");
    expect(page).toContain("a blank hint reads as the default");
  });

  it("mounts the drawing the site serves for the page", () => {
    const mounted = packagePreviews.filter(
      (row) => row.origin === "data" && row.path === "table-filtering.mdx",
    );

    expect(mounted.map((row) => row.demo)).toEqual(["table-filter-demo"]);
    expect(demos["table-filter-demo"]).toBeDefined();
    expect(demos["table-filter-demo"]?.source).toContain("TableFilterField");
  });
});

describe("the filtering controls preview", () => {
  it("reads a blank name and hint as the field's defaults", () => {
    expect(filterLabel(undefined)).toBe("Filter rows");
    expect(filterLabel("")).toBe("Filter rows");
    expect(filterLabel("   ")).toBe("Filter rows");
    expect(filterLabel("  Find a service ")).toBe("Find a service");
    expect(filterHint(undefined)).toBe("Filter…");
    expect(filterHint("")).toBe("Filter…");
    expect(filterHint("   ")).toBe("Filter…");
    expect(filterHint(" Search services ")).toBe(" Search services ");
  });

  it("narrows literally and ignores case", () => {
    expect(matchingServices("")).toEqual(
      Arr.map(FILTER_ROWS, (row) => row.service),
    );
    expect(matchingServices("   ")).toEqual(
      Arr.map(FILTER_ROWS, (row) => row.service),
    );
    expect(matchingServices("PROD")).toEqual(["reports", "media", "billing"]);
    expect(matchingServices("gate")).toEqual(["gateway"]);

    expect(matchingServices("rep.*")).toEqual([]);
    expect(matchingServices("healthy")).toEqual([
      "reports",
      "media",
      "gateway",
    ]);
  });

  it("paints the default name and hint, and the rows the query keeps", () => {
    const markup = renderToStaticMarkup(<TableFilterDemo />);

    expect(markup).toContain('aria-label="Filter rows"');
    expect(markup).toContain('placeholder="Filter…"');
    expect(markup).toContain(
      `${FILTER_ROWS.length} of ${FILTER_ROWS.length} rows`,
    );
    expect(markup).toContain("reports");
  });

  it("draws the field and the rows in the library's own shapes", () => {
    const markup = renderToStaticMarkup(<TableFilterDemo />);
    expect(markup).toContain('class="gx-dfield gx-dfield-sm"');
    expect(markup).toContain('class="gx-dt"');
    expect(markup).toContain('class="gx-badge gx-badge-sm');
    expect(markup).not.toContain("<table");
  });

  it("narrows on the field's own edit and reports the rows it keeps", () => {
    const source = read("apps/docs/src/components/docs/table-filter-demo.tsx");

    expect(source).toContain(
      "onChange={(event) => setQuery(event.target.value)}",
    );
    expect(source).toContain("{rows.length} of {FILTER_ROWS.length} rows");
  });
});
