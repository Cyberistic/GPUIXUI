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

/**
 * The Filtering controls page and its preview.
 *
 * `packages/data/docs/table-filtering.mdx` is the page the site mounts, and the
 * drawing comes from `package-preview.ts`, so nothing type-checks the Markdown:
 * a prop the field adds can ship undocumented and a printed default can drift
 * from the constant the field reads. The cases below hold the page's `## API`
 * table to `TableFilterFieldProps` in both directions, the two printed defaults
 * to the constants `field.tsx` declares, and the drawing to the field's blank
 * rules and its literal match.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("packages/data/docs/table-filtering.mdx");
const field = read("packages/data/src/filter/field.tsx");

/** The props `TableFilterFieldProps` declares, optionality stripped. */
const declaredProps = (): ReadonlyArray<string> => {
  const block =
    field.split("export interface TableFilterFieldProps {")[1]?.split("}")[0] ??
    "";
  return [...block.matchAll(/readonly (\w+)\??:/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

/** The prop rows the page's `## API` table prints. */
const documentedProps = (): ReadonlyArray<string> => {
  const start = page.indexOf("## API");
  const end = page.indexOf("\n## ", start + 1);
  return [
    ...page
      .slice(start, end === -1 ? undefined : end)
      .matchAll(/^\| `(\w+)` \|/gm),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
};

/** A constant's string value, read from the module that declares it. */
const constant = (name: string): string =>
  new RegExp(`export const ${name} = "([^"]*)";`).exec(field)?.[1] ?? "";

/** The services a query keeps, so a failure names the record it dropped. */
const matchingServices = (query: string): ReadonlyArray<string> =>
  Arr.map(matchingRows(query), (row) => row.service);

describe("the filtering controls page", () => {
  it("documents every prop the field declares, and no other", () => {
    // Bug guarded: the page is Markdown the site mounts, so a prop the field
    // adds reaches a reader only if this table moves with the type. `testId` is
    // the handle an automation host locates the input by, and it is the row a
    // page is easiest to forget.
    const declared = declaredProps();
    const documented = documentedProps();

    expect(field).toContain("export interface TableFilterFieldProps {");
    expect(declared).toContain("testId");
    expect(declared.filter((prop) => !documented.includes(prop))).toEqual([]);
    expect(documented.filter((prop) => !declared.includes(prop))).toEqual([]);
  });

  it("prints the defaults the field actually reads", () => {
    // The page prints both defaults twice — as the table's Default column and
    // in the prose — and the values are the module's own, so renaming one moves
    // the page with it.
    const label = constant("DEFAULT_FILTER_LABEL");
    const hint = constant("DEFAULT_FILTER_PLACEHOLDER");

    expect(label).toBe("Filter rows");
    expect(hint).toBe("Filter…");
    // The field reads both through the blank-aware helpers, which is what makes
    // a blank value the default rather than a field named "".
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

  it("teaches the match the table owns, not one the field invents", () => {
    // The field owns no query and narrows nothing: `field.tsx` says the match is
    // the grid's, literal and case-insensitive. A page that taught a pattern
    // syntax would send a reader looking for one the table does not accept.
    expect(field).toContain("The query is matched literally");
    expect(field).toContain("no pattern syntax, and case is ignored");
    expect(page).toContain("matched literally");
    expect(page).toContain("no pattern syntax, and case is ignored");
  });

  it("mounts the drawing the site serves for the page", () => {
    // The preview row and the registry are two files; a row naming a demo no
    // page registers throws in the browser rather than failing a build.
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
    // The drawing narrows with the grid's rule, so a reader comparing the
    // preview with the shipped table sees the same records.
    expect(matchingServices("")).toEqual(
      Arr.map(FILTER_ROWS, (row) => row.service),
    );
    expect(matchingServices("   ")).toEqual(
      Arr.map(FILTER_ROWS, (row) => row.service),
    );
    expect(matchingServices("PROD")).toEqual(["reports", "media", "billing"]);
    expect(matchingServices("gate")).toEqual(["gateway"]);
    // A pattern is not a pattern: the whole text is the needle.
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
});
